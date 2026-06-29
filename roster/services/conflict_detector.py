from typing import List
from ..models import Roster, RosterAssignment, Conflict, LeaveRequest

class ConflictDetectorService:
    """
    Service responsible for detecting shift scheduling conflicts.
    Identifies rule violations such as leave clashes, double bookings, etc.
    """

    def detect_conflicts(self, roster: Roster) -> List[Conflict]:
        """
        Scans all assignments in the roster and flags scheduling conflicts.
        """
        detected_conflicts = []
        assignments = RosterAssignment.objects.filter(roster=roster)
        
        # 1. Check for Double Bookings
        for assignment in assignments:
            overlaps = assignments.filter(
                staff=assignment.staff,
                shift_date=assignment.shift_date
            ).exclude(id=assignment.id)
            
            if overlaps.exists():
                conflict, created = Conflict.objects.get_or_create(
                    roster=roster,
                    staff=assignment.staff,
                    conflict_type='Double_Booking',
                    defaults={
                        'message': f"Double Booking detected for {assignment.staff.user.full_name} on {assignment.shift_date}.",
                        'severity': 'Critical',
                        'date': assignment.shift_date,
                        'shift_ids': [str(assignment.id)] + [str(o.id) for o in overlaps],
                        'status': 'Open'
                    }
                )
                detected_conflicts.append(conflict)

        # 2. Check for Leave Conflicts
        for assignment in assignments:
            leaves = LeaveRequest.objects.filter(
                staff=assignment.staff,
                status='Approved',
                start_date__lte=assignment.shift_date,
                end_date__gte=assignment.shift_date
            )
            
            for leave in leaves:
                conflict, created = Conflict.objects.get_or_create(
                    roster=roster,
                    staff=assignment.staff,
                    conflict_type='Leave_Conflict',
                    defaults={
                        'message': f"{assignment.staff.user.full_name} is scheduled on {assignment.shift_date} but is on approved leave.",
                        'severity': 'Critical',
                        'date': assignment.shift_date,
                        'shift_ids': [str(assignment.id)],
                        'status': 'Open'
                    }
                )
                detected_conflicts.append(conflict)

        # TODO: Add more checks based on RosterRule settings (e.g. min rest hours, weekly limit, night shifts)

        return detected_conflicts
