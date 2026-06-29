from datetime import datetime, timedelta
from typing import List
from ..models import Roster, RosterAssignment, Conflict, LeaveRequest, RosterRule, Availability

class ConflictDetectorService:
    """
    Service responsible for detecting shift scheduling conflicts.
    Identifies rule violations such as leave clashes, double bookings, availability, rest hours, etc.
    """

    def detect_conflicts(self, roster: Roster) -> List[Conflict]:
        """
        Scans all assignments in the roster and flags scheduling conflicts.
        """
        detected_conflicts = []
        assignments = RosterAssignment.objects.filter(roster=roster)
        rules = RosterRule.objects.first()
        if not rules:
            rules = RosterRule.objects.create()
        
        # Check conflicts for each assignment in this roster
        for assignment in assignments:
            staff = assignment.staff
            date_val = assignment.shift_date
            cand_start = datetime.combine(date_val, assignment.start_time)
            cand_end = cand_start + timedelta(hours=float(assignment.duration_hours))
            staff_name = staff.user.full_name or staff.email

            # 1. Double Booking Check (including shifts in any other roster)
            other_shifts = RosterAssignment.objects.filter(
                staff=staff,
                shift_date__range=[date_val - timedelta(days=1), date_val + timedelta(days=1)]
            ).exclude(id=assignment.id)

            overlapping_ids = []
            for o in other_shifts:
                o_start = datetime.combine(o.shift_date, o.start_time)
                o_end = o_start + timedelta(hours=float(o.duration_hours))
                if cand_start < o_end and o_start < cand_end:
                    overlapping_ids.append(str(o.id))

            if overlapping_ids:
                formatted_date = date_val.strftime("%d %B %Y")
                if formatted_date.startswith("0"):
                    formatted_date = formatted_date[1:]
                
                conflict, created = Conflict.objects.get_or_create(
                    roster=roster,
                    staff=staff,
                    conflict_type='Double_Booking',
                    date=date_val,
                    defaults={
                        'message': f"{staff_name} is assigned to multiple overlapping shifts on {formatted_date}.",
                        'severity': 'Critical',
                        'shift_ids': [str(assignment.id)] + overlapping_ids,
                        'status': 'Open'
                    }
                )
                detected_conflicts.append(conflict)

            # 2. Leave Conflict Check
            leaves = LeaveRequest.objects.filter(
                staff=staff,
                status='Approved',
                start_date__lte=date_val,
                end_date__gte=date_val
            )
            for leave in leaves:
                conflict, created = Conflict.objects.get_or_create(
                    roster=roster,
                    staff=staff,
                    conflict_type='Leave_Conflict',
                    date=date_val,
                    defaults={
                        'message': f"{staff_name} is scheduled on {date_val} but is on approved leave.",
                        'severity': 'Critical',
                        'shift_ids': [str(assignment.id)],
                        'status': 'Open'
                    }
                )
                detected_conflicts.append(conflict)

            # 3. Availability Violation Check
            day_name = date_val.strftime('%a')
            avail = Availability.objects.filter(staff=staff).first()
            if avail and day_name not in avail.available_days:
                conflict, created = Conflict.objects.get_or_create(
                    roster=roster,
                    staff=staff,
                    conflict_type='Availability_Violation',
                    date=date_val,
                    defaults={
                        'message': f"{staff_name} is scheduled on {date_val} ({day_name}) which is marked as unavailable.",
                        'severity': 'Warning',
                        'shift_ids': [str(assignment.id)],
                        'status': 'Open'
                    }
                )
                detected_conflicts.append(conflict)

            # 4. Rest Period Violation Check
            rest_hours = float(rules.minimum_rest_hours)
            for o in other_shifts:
                o_start = datetime.combine(o.shift_date, o.start_time)
                o_end = o_start + timedelta(hours=float(o.duration_hours))
                
                violates_rest = False
                viol_hours = 0.0
                if o_end <= cand_start:
                    rest_diff = (cand_start - o_end).total_seconds() / 3600.0
                    if rest_diff < rest_hours:
                        violates_rest = True
                        viol_hours = rest_diff
                elif cand_end <= o_start:
                    rest_diff = (o_start - cand_end).total_seconds() / 3600.0
                    if rest_diff < rest_hours:
                        violates_rest = True
                        viol_hours = rest_diff
                
                if violates_rest:
                    conflict, created = Conflict.objects.get_or_create(
                        roster=roster,
                        staff=staff,
                        conflict_type='Insufficient_Rest',
                        date=date_val,
                        defaults={
                            'message': f"{staff_name} has insufficient rest period ({viol_hours:.1f} hours) between shifts on {date_val}.",
                            'severity': 'Warning',
                            'shift_ids': [str(assignment.id), str(o.id)],
                            'status': 'Open'
                        }
                    )
                    detected_conflicts.append(conflict)

            # 5. Overtime / Max Shift Limit Exceeded
            monday = date_val - timedelta(days=date_val.weekday())
            sunday = monday + timedelta(days=6)
            weekly_hours = sum(float(s.duration_hours) for s in RosterAssignment.objects.filter(
                staff=staff,
                shift_date__range=[monday, sunday]
            ))
            if weekly_hours > float(rules.max_hours_per_week):
                conflict, created = Conflict.objects.get_or_create(
                    roster=roster,
                    staff=staff,
                    conflict_type='Overtime_Violation',
                    date=date_val,
                    defaults={
                        'message': f"{staff_name} has exceeded weekly shift limit of {rules.max_hours_per_week} hours (scheduled {weekly_hours} hours).",
                        'severity': 'Warning',
                        'shift_ids': [str(assignment.id)],
                        'status': 'Open'
                    }
                )
                detected_conflicts.append(conflict)

        return detected_conflicts
