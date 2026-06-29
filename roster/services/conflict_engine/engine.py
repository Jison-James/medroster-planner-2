from ...models import Roster, RosterAssignment, Conflict, RosterRule
from .leave_validator import LeaveValidator
from .availability_validator import AvailabilityValidator
from .duplicate_validator import DuplicateValidator
from .rest_validator import RestValidator
from .overtime_validator import OvertimeValidator
from .consecutive_validator import ConsecutiveValidator
from .night_shift_validator import NightShiftValidator
from .coverage_validator import CoverageValidator
from django.db import transaction
from typing import List
from datetime import date

class ConflictEngineService:
    def __init__(self):
        self.validators = [
            LeaveValidator(),
            AvailabilityValidator(),
            DuplicateValidator(),
            RestValidator(),
            OvertimeValidator(),
            ConsecutiveValidator(),
            NightShiftValidator()
        ]
        self.coverage_validator = CoverageValidator()

    @transaction.atomic
    def run(self, roster: Roster):
        """
        Audits a generated roster. Resolves fixed conflicts and flags new ones.
        """
        # Load rules
        rules = RosterRule.objects.first()
        if not rules:
            rules = RosterRule.objects.create()

        # Load existing conflicts
        existing_conflicts = list(Conflict.objects.filter(roster=roster))
        
        # Load all assignments
        assignments = list(RosterAssignment.objects.filter(roster=roster).select_related('staff__user', 'shift'))
        
        # Run individual assignment validators
        detected_conflicts: List[Conflict] = []
        for a in assignments:
            other_assignments = [x for x in assignments if x.staff_id == a.staff_id]
            for validator in self.validators:
                res = validator.validate(roster, a, other_assignments, rules)
                detected_conflicts.extend(res)

        # Run coverage validator
        coverage_res = self.coverage_validator.validate(roster)
        detected_conflicts.extend(coverage_res)

        self._reconcile_conflicts(roster, existing_conflicts, detected_conflicts)

    @transaction.atomic
    def run_for_shift(self, roster: Roster, target_date: date, shift_type: str):
        """
        Revalidates conflicts on a specific date/shift after manual edit.
        """
        rules = RosterRule.objects.first()
        if not rules:
            rules = RosterRule.objects.create()

        # All conflicts on this date and shift
        existing_conflicts = list(Conflict.objects.filter(
            roster=roster,
            date=target_date,
            shift__shift_type=shift_type
        ))

        # Query all assignments for that date (and surrounding days to calculate weekly/monthly/consecutive)
        assignments = list(RosterAssignment.objects.filter(roster=roster).select_related('staff__user', 'shift'))
        
        # Identify assignments on this specific slot
        slot_assignments = [a for a in assignments if a.shift_date == target_date and a.shift and a.shift.shift_type == shift_type]

        detected_conflicts: List[Conflict] = []
        # Validate each assignment in this specific slot
        for a in slot_assignments:
            other_assignments = [x for x in assignments if x.staff_id == a.staff_id]
            for validator in self.validators:
                res = validator.validate(roster, a, other_assignments, rules)
                detected_conflicts.extend(res)

        # Validate coverage for this slot
        cov_res = self.coverage_validator.validate(roster)
        # Filter coverage conflicts to this specific slot
        slot_cov_res = [c for c in cov_res if c.date == target_date and c.shift and c.shift.shift_type == shift_type]
        detected_conflicts.extend(slot_cov_res)

        self._reconcile_conflicts(roster, existing_conflicts, detected_conflicts, slot_only=True)

    def _reconcile_conflicts(self, roster: Roster, existing_conflicts: List[Conflict], detected_conflicts: List[Conflict], slot_only=False):
        # We match conflicts by: date, shift_template, employee (if present), conflict_type
        # If an existing conflict matches a detected one, it is still active.
        # If it is NOT detected, it is resolved.
        # If a detected conflict is NOT in existing, we create it.
        
        # Helper to compute match key
        def make_key(c: Conflict):
            emp_id = str(c.employee.id) if c.employee else 'none'
            shift_id = str(c.shift.id) if c.shift else 'none'
            date_str = c.date.strftime('%Y-%m-%d') if c.date else 'none'
            return (date_str, shift_id, emp_id, c.conflict_type)

        detected_by_key = {make_key(c): c for c in detected_conflicts}
        existing_by_key = {make_key(c): c for c in existing_conflicts}

        to_create = []
        to_save = []

        # Find conflicts to resolve
        for key, existing in existing_by_key.items():
            # If it's already resolved or ignored, keep it as is
            if existing.status in ['Resolved', 'Ignored']:
                continue
                
            if key not in detected_by_key:
                existing.status = 'Resolved'
                existing.resolved = True
                to_save.append(existing)

        # Find new conflicts to create
        for key, detected in detected_by_key.items():
            if key not in existing_by_key:
                # Need to save the conflict instance to generate id
                to_create.append(detected)
            else:
                existing = existing_by_key[key]
                # If a resolved conflict is detected again, open it again
                if existing.status == 'Resolved':
                    existing.status = 'Open'
                    existing.resolved = False
                    existing.resolved_at = None
                    to_save.append(existing)

        if to_create:
            Conflict.objects.bulk_create(to_create)
            # Re-fetch to update planning_board_redirect with generated UUID if needed,
            # but since SuggestionEngine computes planning_board_redirect, let's update it with actual ID!
            # Since planning_board_redirect is like `/planning-board?date=...&conflict=uuid`,
            # we should update planning_board_redirect with the saved ID.
            created_instances = Conflict.objects.filter(roster=roster, status='Open')
            for c in created_instances:
                if c.planning_board_redirect and 'conflict=' not in c.planning_board_redirect:
                    c.planning_board_redirect += f"&conflict={c.id}"
                    c.save()

        if to_save:
            for c in to_save:
                c.save()
