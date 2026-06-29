from typing import Dict, List
from ..models import Roster, RosterAssignment

class RosterValidatorService:
    """
    Service responsible for validating rosters against hospital rules
    and compliance settings.
    """

    def validate(self, roster: Roster) -> List[Dict]:
        """
        Validates the roster assignments against the global constraints.
        Returns a list of compliance issues or errors.
        """
        issues = []
        
        # TODO: Implement strict validation checks:
        # - Check if any staff exceeds max hours per day/week/month
        # - Check if rest hours between shifts is respected
        # - Check consecutive working days limit
        
        return issues
