from datetime import datetime, timedelta
from typing import List
from ...models import Roster, RosterAssignment, Conflict, LeaveRequest, RosterRule, Availability

class ConflictEngine:
    def detect_conflicts(self, roster: Roster, created_shifts: List[RosterAssignment]) -> List[Conflict]:
        detected_conflicts = []
        if not created_shifts:
            return detected_conflicts

        staff_ids = list(set(s.staff_id for s in created_shifts))
        start_date = roster.start_date
        end_date = roster.end_date

        rules = RosterRule.objects.first()
        if not rules:
            rules = RosterRule.objects.create()
            
        other_shifts_list = list(RosterAssignment.objects.filter(
            staff_id__in=staff_ids,
            shift_date__range=[start_date - timedelta(days=7), end_date + timedelta(days=7)]
        ))
        other_shifts_by_staff = {staff_id: [] for staff_id in staff_ids}
        for s in other_shifts_list:
            other_shifts_by_staff[s.staff_id].append(s)
            
        leaves = list(LeaveRequest.objects.filter(
            staff_id__in=staff_ids,
            status='Approved',
            start_date__lte=end_date,
            end_date__gte=start_date
        ))
        leaves_by_staff = {staff_id: [] for staff_id in staff_ids}
        for l in leaves:
            leaves_by_staff[l.staff_id].append(l)
            
        availabilities = list(Availability.objects.filter(staff_id__in=staff_ids))
        avail_by_staff = {a.staff_id: a for a in availabilities}
        
        staff_by_id = {s.staff_id: s.staff for s in created_shifts}

        for assignment in created_shifts:
            staff = staff_by_id[assignment.staff_id]
            date_val = assignment.shift_date
            cand_start = datetime.combine(date_val, assignment.start_time)
            cand_end = cand_start + timedelta(hours=float(assignment.duration_hours))
            staff_name = staff.user.full_name or staff.email

            staff_other_shifts = other_shifts_by_staff.get(staff.id, [])
            overlapping_ids = []
            for o in staff_other_shifts:
                if o.id == assignment.id or o.id is None:
                    continue
                o_start = datetime.combine(o.shift_date, o.start_time)
                o_end = o_start + timedelta(hours=float(o.duration_hours))
                if cand_start < o_end and o_start < cand_end:
                    overlapping_ids.append(str(o.id))

            if overlapping_ids:
                formatted_date = date_val.strftime("%d %B %Y").lstrip("0")
                detected_conflicts.append(Conflict(
                    roster=roster,
                    staff=staff,
                    conflict_type='Double_Booking',
                    date=date_val,
                    message=f"{staff_name} is assigned to multiple overlapping shifts on {formatted_date}.",
                    severity='Critical',
                    shift_ids=[str(assignment.id)] + overlapping_ids,
                    status='Open'
                ))

            staff_leaves = leaves_by_staff.get(staff.id, [])
            for leave in staff_leaves:
                if leave.start_date <= date_val <= leave.end_date:
                    detected_conflicts.append(Conflict(
                        roster=roster,
                        staff=staff,
                        conflict_type='Leave_Conflict',
                        date=date_val,
                        message=f"{staff_name} is scheduled on {date_val} but is on approved leave.",
                        severity='Critical',
                        shift_ids=[str(assignment.id)],
                        status='Open'
                    ))
                    break

            day_name = date_val.strftime('%a')
            avail = avail_by_staff.get(staff.id)
            if avail and avail.available_days and day_name not in avail.available_days:
                detected_conflicts.append(Conflict(
                    roster=roster,
                    staff=staff,
                    conflict_type='Availability_Violation',
                    date=date_val,
                    message=f"{staff_name} is scheduled on {date_val} ({day_name}) which is marked as unavailable.",
                    severity='Warning',
                    shift_ids=[str(assignment.id)],
                    status='Open'
                ))

            rest_hours = float(rules.minimum_rest_hours)
            for o in staff_other_shifts:
                if o.id == assignment.id:
                    continue
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
                    detected_conflicts.append(Conflict(
                        roster=roster,
                        staff=staff,
                        conflict_type='Insufficient_Rest',
                        date=date_val,
                        message=f"{staff_name} has insufficient rest period ({viol_hours:.1f} hours) between shifts on {date_val}.",
                        severity='Warning',
                        shift_ids=[str(assignment.id), str(o.id) if o.id else ""],
                        status='Open'
                    ))

            monday = date_val - timedelta(days=date_val.weekday())
            sunday = monday + timedelta(days=6)
            weekly_hours = sum(float(s.duration_hours) for s in staff_other_shifts if monday <= s.shift_date <= sunday)
            if weekly_hours > float(rules.max_hours_per_week):
                detected_conflicts.append(Conflict(
                    roster=roster,
                    staff=staff,
                    conflict_type='Overtime_Violation',
                    date=date_val,
                    message=f"{staff_name} has exceeded weekly shift limit of {rules.max_hours_per_week} hours (scheduled {weekly_hours} hours).",
                    severity='Warning',
                    shift_ids=[str(assignment.id)],
                    status='Open'
                ))

        return detected_conflicts
