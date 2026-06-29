from datetime import date, timedelta, datetime
import uuid
from typing import Dict, List, Tuple
from django.utils import timezone
from users.models import User
from ..models import (
    Roster, RosterAssignment, StaffProfile, LeaveRequest, 
    ShiftTemplate, Conflict, ClinicalRole, RosterRule, Availability
)

class RosterGeneratorService:
    """
    Service responsible for roster generation.
    Enforces a prevention-first constraint validation algorithm.
    """

    def generate(self, start_date: date, end_date: date, requirements: Dict[str, Dict[str, int]]) -> Tuple[Roster, List[RosterAssignment]]:
        """
        Generates shifts for staff members over a specified period.
        """
        # Create Roster Draft
        roster_name = f"Roster ({start_date} to {end_date})"
        roster = Roster.objects.create(
            name=roster_name,
            start_date=start_date,
            end_date=end_date,
            status='Draft'
        )

        # Get eligible active staff profiles (exclude managers)
        staff_profiles = StaffProfile.objects.exclude(user__role='manager').select_related('user')
        
        # Load rules
        rules = RosterRule.objects.first()
        if not rules:
            rules = RosterRule.objects.create()

        # Load templates
        templates = self._get_or_create_templates()

        # 1. Preload approved leaves in range
        approved_leaves = list(LeaveRequest.objects.filter(
            status='Approved',
            start_date__lte=end_date,
            end_date__gte=start_date
        ))
        leaves_by_staff = {staff.id: [] for staff in staff_profiles}
        for l in approved_leaves:
            if l.staff_id in leaves_by_staff:
                leaves_by_staff[l.staff_id].append(l)

        # 2. Preload availabilities
        availabilities = list(Availability.objects.filter(staff__in=staff_profiles))
        availability_by_staff = {a.staff_id: a for a in availabilities}

        # 3. Preload existing database assignments in range [start_date - 7 days, end_date + 7 days]
        existing_assignments = list(RosterAssignment.objects.filter(
            shift_date__range=[start_date - timedelta(days=7), end_date + timedelta(days=7)]
        ).select_related('shift'))

        assignments_by_staff = {staff.id: [] for staff in staff_profiles}
        for s in existing_assignments:
            if s.staff_id in assignments_by_staff:
                assignments_by_staff[s.staff_id].append(s)

        # 4. Initialize shift count tracker to measure workload
        shift_count_by_staff = {staff.id: 0 for staff in staff_profiles}
        for staff in staff_profiles:
            shift_count_by_staff[staff.id] = sum(
                1 for s in assignments_by_staff[staff.id] 
                if start_date <= s.shift_date <= end_date
            )
        
        current_day = start_date
        created_shifts = []

        while current_day <= end_date:
            day_name = current_day.strftime('%a')
            
            # Find who is on leave on current_day
            on_leave_staff_ids = set()
            for staff in staff_profiles:
                for leave in leaves_by_staff.get(staff.id, []):
                    if leave.start_date <= current_day <= leave.end_date:
                        on_leave_staff_ids.add(staff.id)
                        break

            # Track who is already assigned on this day across all rosters
            assigned_today_ids = set()
            for staff in staff_profiles:
                for s in assignments_by_staff[staff.id]:
                    if s.shift_date == current_day:
                        assigned_today_ids.add(staff.id)
                        break

            for s_type in ['morning', 'evening', 'night']:
                template = templates.get(s_type)
                if not template:
                    continue
                    
                reqs = requirements.get(s_type, {})
                
                # Fill quotas for Doctors, Nurses, and Support Staff
                for role_name, quota in reqs.items():
                    db_role = self._normalize_role_name(role_name)

                    # Get candidates matching clinical role who aren't on leave or already assigned today
                    candidates = [
                        staff for staff in staff_profiles 
                        if staff.role == db_role 
                        and staff.id not in on_leave_staff_ids 
                        and staff.id not in assigned_today_ids
                    ]

                    # Sort candidates by least assigned shifts during the target generation period
                    candidates.sort(key=lambda s: shift_count_by_staff[s.id])

                    assigned_count = 0
                    for staff in candidates:
                        if assigned_count >= quota:
                            break

                        # Validate all rules and constraints in-memory
                        if not self._validate_constraints_in_memory(staff.id, current_day, template, assignments_by_staff, availability_by_staff, rules):
                            continue

                        shift = RosterAssignment.objects.create(
                            roster=roster,
                            staff=staff,
                            shift=template,
                            shift_date=current_day,
                            start_time=template.start_time,
                            end_time=template.end_time,
                            duration_hours=template.duration_hours,
                            status='Scheduled'
                        )
                        created_shifts.append(shift)
                        
                        # Update trackers
                        assignments_by_staff[staff.id].append(shift)
                        shift_count_by_staff[staff.id] += 1
                        assigned_today_ids.add(staff.id)
                        assigned_count += 1

                    # If quota could not be met, create a Warning conflict for understaffing
                    if assigned_count < quota:
                        Conflict.objects.create(
                            roster=roster,
                            conflict_type='Understaffed_Shift',
                            message=f"Understaffed shift: Assigned {assigned_count} out of {quota} required {role_name}s for {s_type.capitalize()} shift on {current_day}.",
                            severity='Warning',
                            date=current_day,
                            status='Open'
                        )

            current_day += timedelta(days=1)

        return roster, created_shifts

    def _validate_constraints_in_memory(self, staff_id: uuid.UUID, current_day: date, template: ShiftTemplate, assignments_by_staff: dict, availability_by_staff: dict, rules: RosterRule) -> bool:
        """
        Prevention-first validation rules. Returns True if candidate shift is valid for staff.
        """
        # Candidate times
        cand_start = datetime.combine(current_day, template.start_time)
        cand_end = cand_start + timedelta(hours=float(template.duration_hours))

        staff_shifts = assignments_by_staff.get(staff_id, [])

        # 1. Overlap & Rest Period check
        rest_hours = float(rules.minimum_rest_hours)
        for shift in staff_shifts:
            s_start = datetime.combine(shift.shift_date, shift.start_time)
            s_end = s_start + timedelta(hours=float(shift.duration_hours))

            # Overlap check
            if cand_start < s_end and s_start < cand_end:
                return False

            # Rest Period Check
            if s_end <= cand_start:
                rest_diff = (cand_start - s_end).total_seconds() / 3600.0
                if rest_diff < rest_hours:
                    return False
            elif cand_end <= s_start:
                rest_diff = (s_start - cand_end).total_seconds() / 3600.0
                if rest_diff < rest_hours:
                    return False

        # 2. Availability Check
        day_name = current_day.strftime('%a')
        avail = availability_by_staff.get(staff_id)
        if avail:
            if day_name not in avail.available_days:
                return False

        # 3. Workload limits
        cand_dur = float(template.duration_hours)
        
        # Daily hours limit
        daily_hours = sum(float(s.duration_hours) for s in staff_shifts if s.shift_date == current_day)
        if daily_hours + cand_dur > float(rules.max_hours_per_day):
            return False

        # Weekly hours limit
        monday = current_day - timedelta(days=current_day.weekday())
        sunday = monday + timedelta(days=6)
        weekly_hours = sum(float(s.duration_hours) for s in staff_shifts if monday <= s.shift_date <= sunday)
        if weekly_hours + cand_dur > float(rules.max_hours_per_week):
            return False

        # Consecutive days limit
        work_dates = {s.shift_date for s in staff_shifts}
        work_dates.add(current_day)
        
        run_len = 1
        check_date = current_day - timedelta(days=1)
        while check_date in work_dates:
            run_len += 1
            check_date -= timedelta(days=1)
        check_date = current_day + timedelta(days=1)
        while check_date in work_dates:
            run_len += 1
            check_date += timedelta(days=1)
            
        if run_len > rules.max_consecutive_days:
            return False

        # Night shifts limit per week
        if template.shift_type == 'night':
            weekly_nights = sum(1 for s in staff_shifts if monday <= s.shift_date <= sunday and s.shift and s.shift.shift_type == 'night')
            if weekly_nights + 1 > rules.max_night_per_week:
                return False

        return True

    def _normalize_role_name(self, role_name: str) -> str:
        """Maps frontend role descriptors to backend ClinicalRole values."""
        if role_name in ['Doctors', 'Doctor']:
            return ClinicalRole.DOCTOR
        elif role_name in ['Nurses', 'Nurse']:
            return ClinicalRole.NURSE
        elif role_name in ['Staff', 'Support Staff']:
            return ClinicalRole.SUPPORT_STAFF
        return ClinicalRole.NURSE

    def _get_or_create_templates(self) -> Dict[str, ShiftTemplate]:
        """Loads existing ShiftTemplates or creates defaults if missing."""
        templates = {}
        for s_type in ['morning', 'evening', 'night']:
            template = ShiftTemplate.objects.filter(shift_type=s_type).first()
            if not template:
                if s_type == 'morning':
                    start_t, end_t, dur = '07:00:00', '15:00:00', 8.0
                elif s_type == 'evening':
                    start_t, end_t, dur = '15:00:00', '23:00:00', 8.0
                else:
                    start_t, end_t, dur = '23:00:00', '07:00:00', 8.0
                template = ShiftTemplate.objects.create(
                    name=f"{s_type.capitalize()} Shift",
                    start_time=start_t,
                    end_time=end_t,
                    duration_hours=dur,
                    shift_type=s_type,
                    color='#3B82F6' if s_type == 'morning' else '#8B5CF6' if s_type == 'evening' else '#1E293B'
                )
            templates[s_type] = template
        return templates
