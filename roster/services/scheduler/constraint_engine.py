from datetime import date, datetime, timedelta
from ...models import StaffProfile, ShiftTemplate
from .context import ScheduleContext

class ConstraintEngine:
    def is_valid(self, staff: StaffProfile, current_day: date, template: ShiftTemplate, context: ScheduleContext) -> bool:
        if staff.status != 'Active':
            return False

        day_name = current_day.strftime('%a')
        avail = context.availability_by_staff.get(str(staff.id))
        if avail and avail.available_days:
            if day_name not in avail.available_days:
                return False

        leaves = context.leaves_by_staff.get(str(staff.id), [])
        for leave in leaves:
            if leave.start_date <= current_day <= leave.end_date:
                return False

        cand_start = datetime.combine(current_day, template.start_time)
        cand_end = cand_start + timedelta(hours=float(template.duration_hours))
        staff_shifts = context.assignments_by_staff.get(str(staff.id), [])

        rest_hours = float(context.rules.minimum_rest_hours)
        cand_dur = float(template.duration_hours)

        daily_hours = 0.0
        weekly_hours = 0.0
        monthly_hours = 0.0
        night_count_week = 0
        night_count_month = 0
        
        monday = current_day - timedelta(days=current_day.weekday())
        sunday = monday + timedelta(days=6)
        
        month_start = current_day.replace(day=1)
        next_month = month_start.replace(day=28) + timedelta(days=4)
        month_end = next_month - timedelta(days=next_month.day)

        work_dates = set()

        for shift in staff_shifts:
            s_date = shift.shift_date
            s_start = datetime.combine(s_date, shift.start_time)
            s_end = s_start + timedelta(hours=float(shift.duration_hours))
            s_dur = float(shift.duration_hours)

            if s_date == current_day:
                daily_hours += s_dur
                
            if cand_start < s_end and s_start < cand_end:
                return False

            if s_end <= cand_start:
                rest_diff = (cand_start - s_end).total_seconds() / 3600.0
                if rest_diff < rest_hours:
                    return False
            elif cand_end <= s_start:
                rest_diff = (s_start - cand_end).total_seconds() / 3600.0
                if rest_diff < rest_hours:
                    return False

            if monday <= s_date <= sunday:
                weekly_hours += s_dur
                if shift.shift and shift.shift.shift_type == 'night':
                    night_count_week += 1
                    
            if month_start <= s_date <= month_end:
                monthly_hours += s_dur
                if shift.shift and shift.shift.shift_type == 'night':
                    night_count_month += 1
                    
            work_dates.add(s_date)

        if daily_hours + cand_dur > float(context.rules.max_hours_per_day):
            return False

        if weekly_hours + cand_dur > float(context.rules.max_hours_per_week):
            return False

        if monthly_hours + cand_dur > float(context.rules.max_hours_per_month):
            return False

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
            
        if run_len > context.rules.max_consecutive_days:
            return False

        if template.shift_type == 'night':
            if night_count_week + 1 > context.rules.max_night_per_week:
                return False
            if night_count_month + 1 > context.rules.max_night_per_month:
                return False

        return True
