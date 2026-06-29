from ...models import Roster, RosterAssignment, Conflict, RosterRule, Availability
from .assignment_validator import BaseAssignmentValidator
from .suggestion_engine import SuggestionEngine
from typing import List

class AvailabilityValidator(BaseAssignmentValidator):
    def validate(self, roster: Roster, assignment: RosterAssignment, other_assignments: List[RosterAssignment], rules: RosterRule) -> List[Conflict]:
        conflicts = []
        employee = assignment.staff
        if not employee:
            return conflicts

        date_val = assignment.shift_date
        day_name = date_val.strftime('%a')
        
        # Check availability
        avail = Availability.objects.filter(staff=employee).first()
        if avail and avail.available_days and day_name not in avail.available_days:
            conflict = Conflict(
                id=None,
                roster=roster,
                employee=employee,
                shift=assignment.shift,
                date=date_val,
                conflict_type='AVAILABILITY_VIOLATION',
                severity='Medium',
                status='Open'
            )
            SuggestionEngine.populate_details(conflict, assignment=assignment, meta={'day_name': day_name})
            conflicts.append(conflict)

        return conflicts
