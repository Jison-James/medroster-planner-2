from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ShiftTemplateViewSet, RosterRulesViewSet, AvailabilityViewSet,
    LeaveRequestViewSet, RosterViewSet, RosterShiftViewSet,
    ShiftSwapRequestViewSet, ConflictViewSet, NotificationViewSet
)

router = DefaultRouter()
router.register(r'templates', ShiftTemplateViewSet, basename='shifttemplate')
router.register(r'rules', RosterRulesViewSet, basename='rosterrules')
router.register(r'availability', AvailabilityViewSet, basename='availability')
router.register(r'leave-requests', LeaveRequestViewSet, basename='leaverequest')
router.register(r'rosters', RosterViewSet, basename='roster')
router.register(r'shifts', RosterShiftViewSet, basename='rostershift')
router.register(r'swap-requests', ShiftSwapRequestViewSet, basename='shiftswaprequest')
router.register(r'conflicts', ConflictViewSet, basename='conflict')
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
]
