from rest_framework import serializers
from .models import (
    ShiftTemplate, RosterRules, Availability, LeaveRequest, 
    Roster, RosterShift, ShiftSwapRequest, Conflict, Notification
)

class ShiftTemplateSerializer(serializers.ModelSerializer):
    start = serializers.TimeField(source='start_time')
    end = serializers.TimeField(source='end_time')
    type = serializers.CharField(source='shift_type')

    class Meta:
        model = ShiftTemplate
        fields = ['id', 'name', 'start', 'end', 'type', 'color']


class RosterRulesSerializer(serializers.ModelSerializer):
    maxHoursPerDay = serializers.DecimalField(source='max_hours_per_day', max_digits=4, decimal_places=2)
    maxHoursPerWeek = serializers.DecimalField(source='max_hours_per_week', max_digits=5, decimal_places=2)
    maxHoursPerMonth = serializers.DecimalField(source='max_hours_per_month', max_digits=6, decimal_places=2)
    maxConsecutiveDays = serializers.IntegerField(source='max_consecutive_working_days')
    minRestHours = serializers.DecimalField(source='min_rest_hours_between_shifts', max_digits=4, decimal_places=2)
    maxNightsPerWeek = serializers.IntegerField(source='max_night_shifts_per_week')
    maxNightsPerMonth = serializers.IntegerField(source='max_night_shifts_per_month')
    equalShiftDistribution = serializers.BooleanField(source='equal_shift_distribution')
    equalWeekendDistribution = serializers.BooleanField(source='equal_weekend_distribution')
    equalNightDistribution = serializers.BooleanField(source='equal_night_distribution')
    balanceWorkload = serializers.BooleanField(source='balance_workload')

    class Meta:
        model = RosterRules
        fields = [
            'id', 'maxHoursPerDay', 'maxHoursPerWeek', 'maxHoursPerMonth', 
            'maxConsecutiveDays', 'minRestHours', 'maxNightsPerWeek', 
            'maxNightsPerMonth', 'equalShiftDistribution', 'equalWeekendDistribution', 
            'equalNightDistribution', 'balanceWorkload'
        ]


class AvailabilitySerializer(serializers.ModelSerializer):
    staffId = serializers.UUIDField(source='staff_id')
    availableDays = serializers.JSONField(source='available_days')
    preferredShift = serializers.CharField(source='preferred_shift', required=False, allow_null=True)
    preferredDaysOff = serializers.JSONField(source='preferred_days_off')

    class Meta:
        model = Availability
        fields = ['id', 'staffId', 'availableDays', 'preferredShift', 'preferredDaysOff', 'notes']


class LeaveRequestSerializer(serializers.ModelSerializer):
    staffId = serializers.UUIDField(source='staff_id')
    type = serializers.CharField(source='leave_type')
    startDate = serializers.DateField(source='start_date')
    endDate = serializers.DateField(source='end_date')
    totalDays = serializers.ReadOnlyField(source='total_days')
    submittedOn = serializers.DateField(source='submitted_on', read_only=True)

    class Meta:
        model = LeaveRequest
        fields = ['id', 'staffId', 'type', 'startDate', 'endDate', 'totalDays', 'reason', 'status', 'submittedOn']


class RosterSerializer(serializers.ModelSerializer):
    startDate = serializers.DateField(source='start_date')
    endDate = serializers.DateField(source='end_date')

    class Meta:
        model = Roster
        fields = ['id', 'name', 'startDate', 'endDate', 'status']


class RosterShiftSerializer(serializers.ModelSerializer):
    date = serializers.DateField(source='shift_date')
    staffId = serializers.UUIDField(source='staff_id')
    rosterId = serializers.UUIDField(source='roster_id')
    
    # We serialize shift as the type of the template or a fallback shift type name
    shift = serializers.SerializerMethodField()

    class Meta:
        model = RosterShift
        fields = ['id', 'rosterId', 'staffId', 'date', 'shift', 'start_time', 'end_time', 'duration_hours', 'notes', 'status']

    def get_shift(self, obj):
        if obj.shift_template:
            return obj.shift_template.shift_type
        # Fallback to morning/evening/night based on start time
        hour = obj.start_time.hour
        if 5 <= hour < 13:
            return 'morning'
        elif 13 <= hour < 21:
            return 'evening'
        else:
            return 'night'


class ShiftSwapRequestSerializer(serializers.ModelSerializer):
    staffId = serializers.UUIDField(source='requester_id')
    requestedStaffId = serializers.UUIDField(source='requested_staff_id')
    requesterShiftId = serializers.UUIDField(source='requester_shift_id')
    offeredShiftId = serializers.UUIDField(source='offered_shift_id', required=False, allow_null=True)
    managerNotes = serializers.CharField(source='manager_notes', required=False, allow_null=True, allow_blank=True)
    
    # Frontend matches currentShift / requestedShift properties
    currentShift = serializers.SerializerMethodField(read_only=True)
    requestedShift = serializers.SerializerMethodField(read_only=True)
    date = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ShiftSwapRequest
        fields = [
            'id', 'staffId', 'requestedStaffId', 'requesterShiftId', 'offeredShiftId', 
            'currentShift', 'requestedShift', 'date', 'reason', 'status', 'managerNotes'
        ]

    def get_currentShift(self, obj):
        if obj.requester_shift and obj.requester_shift.shift_template:
            return obj.requester_shift.shift_template.shift_type
        return 'night'

    def get_requestedShift(self, obj):
        if obj.offered_shift and obj.offered_shift.shift_template:
            return obj.offered_shift.shift_template.shift_type
        return 'morning'

    def get_date(self, obj):
        if obj.requester_shift:
            return obj.requester_shift.shift_date.strftime('%Y-%m-%d')
        return ''


class ConflictSerializer(serializers.ModelSerializer):
    rosterId = serializers.UUIDField(source='roster_id', required=False, allow_null=True)
    staffId = serializers.UUIDField(source='staff_id', required=False, allow_null=True)
    type = serializers.CharField(source='conflict_type')
    shiftIds = serializers.JSONField(source='shift_ids', required=False, default=list)

    class Meta:
        model = Conflict
        fields = ['id', 'rosterId', 'staffId', 'type', 'message', 'severity', 'shiftIds', 'date', 'status']


class NotificationSerializer(serializers.ModelSerializer):
    userId = serializers.UUIDField(source='user_id')
    read = serializers.BooleanField(source='is_read')
    timestamp = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = Notification
        fields = ['id', 'userId', 'type', 'title', 'message', 'read', 'action_url', 'metadata', 'timestamp']
