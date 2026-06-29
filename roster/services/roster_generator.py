from datetime import date, timedelta, datetime
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
        staff_profiles = StaffProfile.objects.exclude(user__role='manager')
        approved_leaves = LeaveRequest.objects.filter(status='Approved')

        # Load or create templates
        templates = self._get_or_create_templates()
        
        current_day = start_date
        created_shifts = []

        while current_day <= end_date:
            # Check who is on leave on current_day
            on_leave_staff_ids = set(
                approved_leaves.filter(
                    start_date__lte=current_day,
                    end_date__gte=current_day
                ).values_list('staff_id', flat=True)
            )

            # Track who is already assigned on this day to avoid double-bookings
            assigned_today = set()

            # Find staff who are already assigned to shifts on this day in any other roster
            already_assigned_staff_ids = set(
                RosterAssignment.objects.filter(
                    shift_date=current_day
                ).values_list('staff_id', flat=True)
            )

            for s_type in ['morning', 'evening', 'night']:
                template = templates.get(s_type)
                if not template:
                    continue
                    
                reqs = requirements.get(s_type, {})
                
                # Fill quotas for Doctors, Nurses, and Support Staff
                for role_name, quota in reqs.items():
                    db_role = self._normalize_role_name(role_name)

                    # Find eligible staff members matching clinical role who aren't on leave, double-booked today in this run, or already assigned in the database
                    eligible_staff = staff_profiles.filter(
                        role=db_role
                    ).exclude(
                        id__in=on_leave_staff_ids
                    ).exclude(
                        id__in=assigned_today
                    ).exclude(
                        id__in=already_assigned_staff_ids
                    )

                    # Greedy assignment with constraint checking
                    assigned_count = 0
                    for staff in eligible_staff:
                        if assigned_count >= quota:
                            break

                        # Validate all rules and constraints (Availability, Overlap, Rest, Workload, etc.)
                        if not self._validate_constraints(staff, current_day, template, created_shifts):
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
                        assigned_today.add(staff.id)
                        assigned_count += 1

                    # If quota could not be met due to lack of staff or leaves, create an actual Understaffed_Shift conflict
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

    def _validate_constraints(self, staff: StaffProfile, current_day: date, template: ShiftTemplate, created_shifts: List[RosterAssignment]) -> bool:
        """
        Prevention-first validation rules. Returns True if candidate shift is valid for staff.
        """
        # 1. Load Rules
        rules = RosterRule.objects.first()
        if not rules:
            rules = RosterRule.objects.create()

        # 2. Convert candidate times to datetime
        cand_start = datetime.combine(current_day, template.start_time)
        cand_end = cand_start + timedelta(hours=float(template.duration_hours))

        # 3. Collect existing assignments (both from DB and current run) in the surrounding range
        overlapping_db_shifts = list(RosterAssignment.objects.filter(
            staff=staff,
            shift_date__range=[current_day - timedelta(days=7), current_day + timedelta(days=7)]
        ))
        all_shifts = overlapping_db_shifts + [s for s in created_shifts if s.staff_id == staff.id]

        # 4. Check Overlapping Shift / Double Booking / Rest Period Checks
        for shift in all_shifts:
            s_start = datetime.combine(shift.shift_date, shift.start_time)
            s_end = s_start + timedelta(hours=float(shift.duration_hours))
            
            # Simple overlap check
            if cand_start < s_end and s_start < cand_end:
                return False

            # Rest Period Check
            rest_hours = float(rules.minimum_rest_hours)
            if s_end <= cand_start:
                rest_diff = (cand_start - s_end).total_seconds() / 3600.0
                if rest_diff < rest_hours:
                    return False
            elif cand_end <= s_start:
                rest_diff = (s_start - cand_end).total_seconds() / 3600.0
                if rest_diff < rest_hours:
                    return False

        # 5. Availability Check
        day_name = current_day.strftime('%a')
        avail = Availability.objects.filter(staff=staff).first()
        if avail:
            if day_name not in avail.available_days:
                return False

        # 6. Max Workload limits (Daily and Weekly)
        cand_dur = float(template.duration_hours)
        
        # Daily workload limit
        daily_hours = sum(float(s.duration_hours) for s in all_shifts if s.shift_date == current_day)
        if daily_hours + cand_dur > float(rules.max_hours_per_day):
            return False

        # Weekly workload limit
        monday = current_day - timedelta(days=current_day.weekday())
        sunday = monday + timedelta(days=6)
        weekly_hours = sum(float(s.duration_hours) for s in all_shifts if monday <= s.shift_date <= sunday)
        if weekly_hours + cand_dur > float(rules.max_hours_per_week):
            return False

        # Max consecutive days limit
        work_dates = {s.shift_date for s in all_shifts}
        work_dates.add(current_day)
        
        run_len = 1
        # count left
        check_date = current_day - timedelta(days=1)
        while check_date in work_dates:
            run_len += 1
            check_date -= timedelta(days=1)
        # count right
        check_date = current_day + timedelta(days=1)
        while check_date in work_dates:
            run_len += 1
            check_date += timedelta(days=1)
            
        if run_len > rules.max_consecutive_days:
            return False

        # Night shifts limit per week
        if template.shift_type == 'night':
            weekly_nights = sum(1 for s in all_shifts if monday <= s.shift_date <= sunday and s.shift and s.shift.shift_type == 'night')
            if weekly_nights + 1 > rules.max_night_per_week:
                return False

        # 7. Leave request check
        leaves = LeaveRequest.objects.filter(staff=staff, status='Approved')
        for leave in leaves:
            if leave.start_date <= current_day <= leave.end_date:
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
