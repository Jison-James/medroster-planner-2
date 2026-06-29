from django.contrib import admin
from .models import (
    ShiftTemplate, RosterRules, Availability, LeaveRequest, 
    Roster, RosterShift, ShiftSwapRequest, Conflict, Notification
)

admin.site.register(ShiftTemplate)
admin.site.register(RosterRules)
admin.site.register(Availability)
admin.site.register(LeaveRequest)
admin.site.register(Roster)
admin.site.register(RosterShift)
admin.site.register(ShiftSwapRequest)
admin.site.register(Conflict)
admin.site.register(Notification)
