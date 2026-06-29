from datetime import date, timedelta
from typing import Dict, List, Tuple
from django.utils import timezone
from users.models import User
from ..models import (
    Roster, RosterAssignment, StaffProfile, LeaveRequest, 
    ShiftTemplate, Conflict, ClinicalRole
)

class RosterGeneratorService:
    """
    Service responsible for roster generation.
    Currently implements a greedy assignment scheduling logic and provides
    hooks for an advanced scheduling algorithm.
    """

    def generate(self, start_date: date, end_date: date, requirements: Dict[str, Dict[str, int]]) -> Tuple[Roster, List[RosterAssignment]]:
        """
        Generates shifts for staff members over a specified period.
        
        TODO: Replace this greedy algorithm with a constraint-satisfaction based solver 
        (e.g., OR-Tools CP-SAT or Genetic Algorithm) to satisfy fairness and complex rules.
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

            for s_type in ['morning', 'evening', 'night']:
                template = templates.get(s_type)
                if not template:
                    continue
                    
                reqs = requirements.get(s_type, {})
                
                # Fill quotas for Doctors, Nurses, and Support Staff
                for role_name, quota in reqs.items():
                    db_role = self._normalize_role_name(role_name)

                    # Find eligible staff members matching clinical role who aren't on leave or double-booked
                    eligible_staff = staff_profiles.filter(
                        role=db_role
                    ).exclude(
                        id__in=on_leave_staff_ids
                    ).exclude(
                        id__in=assigned_today
                    )

                    # Greedy assignment
                    assigned_count = 0
                    for staff in eligible_staff:
                        if assigned_count >= quota:
                            break

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

            current_day += timedelta(days=1)

        # Generate a log conflict message for feedback
        Conflict.objects.create(
            roster=roster,
            conflict_type='Understaffed_Shift' if len(created_shifts) < 10 else 'Double_Booking',
            message=f"Roster successfully generated. Created {len(created_shifts)} assignments.",
            severity='Info',
            date=start_date,
            status='Open'
        )

        return roster, created_shifts

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
