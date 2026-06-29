import uuid
from django.db import models

from users.models import Profile

# ============================================================
# ENUMS / CHOICES
# ============================================================

class ShiftType(models.TextChoices):
    MORNING = 'morning', 'Morning'
    EVENING = 'evening', 'Evening'
    NIGHT = 'night', 'Night'
    CUSTOM = 'custom', 'Custom'

class LeaveType(models.TextChoices):
    SICK = 'Sick', 'Sick'
    CASUAL = 'Casual', 'Casual'
    VACATION = 'Vacation', 'Vacation'
    EMERGENCY = 'Emergency', 'Emergency'
    MATERNITY = 'Maternity', 'Maternity'

class LeaveStatus(models.TextChoices):
    PENDING = 'Pending', 'Pending'
    APPROVED = 'Approved', 'Approved'
    REJECTED = 'Rejected', 'Rejected'
    CANCELLED = 'Cancelled', 'Cancelled'

class SwapStatus(models.TextChoices):
    PENDING = 'Pending', 'Pending'
    ACCEPTED = 'Accepted', 'Accepted'
    REJECTED = 'Rejected', 'Rejected'
    CANCELLED = 'Cancelled', 'Cancelled'
    MANAGER_APPROVED = 'Manager_Approved', 'Manager Approved'
    MANAGER_REJECTED = 'Manager_Rejected', 'Manager Rejected'

class RosterStatus(models.TextChoices):
    DRAFT = 'Draft', 'Draft'
    PUBLISHED = 'Published', 'Published'
    ARCHIVED = 'Archived', 'Archived'

class ShiftStatus(models.TextChoices):
    SCHEDULED = 'Scheduled', 'Scheduled'
    COMPLETED = 'Completed', 'Completed'
    CANCELLED = 'Cancelled', 'Cancelled'
    SWAPPED = 'Swapped', 'Swapped'

class ConflictType(models.TextChoices):
    LEAVE_CONFLICT = 'Leave_Conflict', 'Leave Conflict'
    DOUBLE_BOOKING = 'Double_Booking', 'Double Booking'
    OVERTIME_VIOLATION = 'Overtime_Violation', 'Overtime Violation'
    UNDERSTAFFED_SHIFT = 'Understaffed_Shift', 'Understaffed Shift'
    INSUFFICIENT_REST = 'Insufficient_Rest', 'Insufficient Rest'

class ConflictSeverity(models.TextChoices):
    CRITICAL = 'Critical', 'Critical'
    WARNING = 'Warning', 'Warning'
    INFO = 'Info', 'Info'

class ConflictStatus(models.TextChoices):
    OPEN = 'Open', 'Open'
    RESOLVED = 'Resolved', 'Resolved'
    IGNORED = 'Ignored', 'Ignored'

class NotifType(models.TextChoices):
    LEAVE_APPROVED = 'Leave_Approved', 'Leave Approved'
    LEAVE_REJECTED = 'Leave_Rejected', 'Leave Rejected'
    SHIFT_CHANGED = 'Shift_Changed', 'Shift Changed'
    ROSTER_PUBLISHED = 'Roster_Published', 'Roster Published'
    SWAP_APPROVED = 'Swap_Approved', 'Swap Approved'
    SWAP_REJECTED = 'Swap_Rejected', 'Swap Rejected'
    CONFLICT_DETECTED = 'Conflict_Detected', 'Conflict Detected'

# ============================================================
# MODELS
# ============================================================

class ShiftTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.TextField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    duration_hours = models.DecimalField(max_digits=4, decimal_places=2)
    shift_type = models.CharField(max_length=20, choices=ShiftType.choices, default=ShiftType.MORNING)
    color = models.TextField(default='#3B82F6')

    class Meta:
        db_table = 'shift_templates'

    def __str__(self):
        return f"{self.name} ({self.start_time} - {self.end_time})"


class RosterRules(models.Model):
    max_hours_per_day = models.DecimalField(max_digits=4, decimal_places=2, default=12)
    max_hours_per_week = models.DecimalField(max_digits=5, decimal_places=2, default=48)
    max_hours_per_month = models.DecimalField(max_digits=6, decimal_places=2, default=176)
    max_consecutive_working_days = models.IntegerField(default=5)
    min_rest_hours_between_shifts = models.DecimalField(max_digits=4, decimal_places=2, default=11)
    max_night_shifts_per_week = models.IntegerField(default=3)
    max_night_shifts_per_month = models.IntegerField(default=10)
    equal_shift_distribution = models.BooleanField(default=True)
    equal_weekend_distribution = models.BooleanField(default=True)
    equal_night_distribution = models.BooleanField(default=True)
    balance_workload = models.BooleanField(default=True)

    class Meta:
        db_table = 'roster_rules'

    def save(self, *args, **kwargs):
        self.id = 1
        super().save(*args, **kwargs)

    def __str__(self):
        return "Global Roster Rules"


class Availability(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    staff = models.ForeignKey(Profile, on_delete=models.CASCADE, db_column='staff_id', related_name='availabilities')
    available_days = models.JSONField(default=list)
    preferred_shift = models.CharField(max_length=20, choices=ShiftType.choices, null=True, blank=True)
    preferred_days_off = models.JSONField(default=list)
    notes = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'availability'
        indexes = [
            models.Index(fields=['staff'], name='idx_avail_staff_id'),
        ]

    def __str__(self):
        return f"Availability for {self.staff.full_name}"


class LeaveRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    staff = models.ForeignKey(Profile, on_delete=models.CASCADE, db_column='staff_id', related_name='leave_requests')
    leave_type = models.CharField(max_length=20, choices=LeaveType.choices)
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=LeaveStatus.choices, default=LeaveStatus.PENDING)
    submitted_on = models.DateField(auto_now_add=True)

    @property
    def total_days(self):
        return (self.end_date - self.start_date).days + 1

    class Meta:
        db_table = 'leave_requests'
        indexes = [
            models.Index(fields=['staff'], name='idx_leave_staff_id'),
            models.Index(fields=['status'], name='idx_leave_status'),
            models.Index(fields=['start_date', 'end_date'], name='idx_leave_dates'),
        ]

    def __str__(self):
        return f"{self.staff.full_name} - {self.leave_type} ({self.status})"


class Roster(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.TextField()
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=RosterStatus.choices, default=RosterStatus.DRAFT)

    class Meta:
        db_table = 'rosters'
        indexes = [
            models.Index(fields=['status'], name='idx_rosters_status'),
            models.Index(fields=['start_date', 'end_date'], name='idx_rosters_dates'),
        ]

    def __str__(self):
        return self.name


class RosterShift(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    roster = models.ForeignKey(Roster, on_delete=models.CASCADE, db_column='roster_id', related_name='shifts')
    staff = models.ForeignKey(Profile, on_delete=models.CASCADE, db_column='staff_id', related_name='assigned_shifts')
    shift_template = models.ForeignKey(ShiftTemplate, on_delete=models.SET_NULL, null=True, blank=True, db_column='shift_template_id', related_name='instances')
    shift_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    duration_hours = models.DecimalField(max_digits=4, decimal_places=2)
    notes = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=ShiftStatus.choices, default=ShiftStatus.SCHEDULED)

    class Meta:
        db_table = 'roster_shifts'
        unique_together = ('staff', 'shift_date', 'start_time')
        indexes = [
            models.Index(fields=['roster'], name='idx_r_shifts_roster'),
            models.Index(fields=['staff'], name='idx_r_shifts_staff'),
            models.Index(fields=['shift_date'], name='idx_r_shifts_date'),
        ]

    def __str__(self):
        return f"{self.staff.full_name} - {self.shift_date} {self.start_time}"


class ShiftSwapRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    requester = models.ForeignKey(Profile, on_delete=models.CASCADE, db_column='requester_id', related_name='sent_swaps')
    requested_staff = models.ForeignKey(Profile, on_delete=models.CASCADE, db_column='requested_staff_id', related_name='received_swaps')
    requester_shift = models.ForeignKey(RosterShift, on_delete=models.CASCADE, db_column='requester_shift_id', related_name='swap_requests_as_primary')
    offered_shift = models.ForeignKey(RosterShift, on_delete=models.SET_NULL, null=True, blank=True, db_column='offered_shift_id', related_name='swap_requests_as_offer')
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=SwapStatus.choices, default=SwapStatus.PENDING)
    manager_notes = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'shift_swap_requests'
        indexes = [
            models.Index(fields=['requester'], name='idx_swaps_requester'),
            models.Index(fields=['requested_staff'], name='idx_swaps_requested'),
            models.Index(fields=['status'], name='idx_swaps_status'),
        ]

    def __str__(self):
        return f"Swap request from {self.requester.full_name} to {self.requested_staff.full_name}"


class Conflict(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    roster = models.ForeignKey(Roster, on_delete=models.CASCADE, null=True, blank=True, db_column='roster_id', related_name='conflicts')
    staff = models.ForeignKey(Profile, on_delete=models.SET_NULL, null=True, blank=True, db_column='staff_id', related_name='conflicts')
    conflict_type = models.CharField(max_length=50, choices=ConflictType.choices)
    message = models.TextField()
    severity = models.CharField(max_length=20, choices=ConflictSeverity.choices, default=ConflictSeverity.WARNING)
    shift_ids = models.JSONField(default=list)
    date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=ConflictStatus.choices, default=ConflictStatus.OPEN)

    class Meta:
        db_table = 'conflicts'
        indexes = [
            models.Index(fields=['roster'], name='idx_conflicts_roster'),
            models.Index(fields=['staff'], name='idx_conflicts_staff'),
            models.Index(fields=['status'], name='idx_conflicts_status'),
        ]

    def __str__(self):
        return f"{self.conflict_type} on {self.date}"


class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(Profile, on_delete=models.CASCADE, db_column='user_id', related_name='notifications')
    type = models.CharField(max_length=30, choices=NotifType.choices)
    title = models.TextField()
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    action_url = models.TextField(null=True, blank=True)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        indexes = [
            models.Index(fields=['user'], name='idx_notif_user'),
            models.Index(fields=['is_read'], name='idx_notif_is_read'),
            models.Index(fields=['created_at'], name='idx_notif_created'),
        ]

    def __str__(self):
        return f"Notification for {self.user.full_name}: {self.title}"
