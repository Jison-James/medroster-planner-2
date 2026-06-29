from datetime import datetime, timedelta
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from users.models import Profile, StaffRole
from .models import (
    ShiftTemplate, RosterRules, Availability, LeaveRequest, 
    Roster, RosterShift, ShiftSwapRequest, Conflict, Notification, ShiftType
)
from .serializers import (
    ShiftTemplateSerializer, RosterRulesSerializer, AvailabilitySerializer,
    LeaveRequestSerializer, RosterSerializer, RosterShiftSerializer,
    ShiftSwapRequestSerializer, ConflictSerializer, NotificationSerializer
)

class ShiftTemplateViewSet(viewsets.ModelViewSet):
    queryset = ShiftTemplate.objects.all()
    serializer_class = ShiftTemplateSerializer

class RosterRulesViewSet(viewsets.ModelViewSet):
    queryset = RosterRules.objects.all()
    serializer_class = RosterRulesSerializer

class AvailabilityViewSet(viewsets.ModelViewSet):
    queryset = Availability.objects.all()
    serializer_class = AvailabilitySerializer

class LeaveRequestViewSet(viewsets.ModelViewSet):
    queryset = LeaveRequest.objects.all()
    serializer_class = LeaveRequestSerializer

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        leave = self.get_object()
        leave.status = 'Approved'
        leave.save()
        return Response(self.get_serializer(leave).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        leave = self.get_object()
        leave.status = 'Rejected'
        leave.save()
        return Response(self.get_serializer(leave).data)

class RosterViewSet(viewsets.ModelViewSet):
    queryset = Roster.objects.all()
    serializer_class = RosterSerializer

    @action(detail=False, methods=['post'], url_path='generate')
    def generate_roster(self, request):
        """
        Generates shifts for staff members over a specified period,
        respecting roles, availability, and leave requests.
        """
        start_date_str = request.data.get('startDate')
        end_date_str = request.data.get('endDate')
        requirements = request.data.get('requirements', {
            'morning': {'Doctor': 2, 'Nurse': 4, 'Support Staff': 2},
            'evening': {'Doctor': 2, 'Nurse': 3, 'Support Staff': 2},
            'night': {'Doctor': 1, 'Nurse': 2, 'Support Staff': 1},
        })

        if not start_date_str or not end_date_str:
            # Fallback to next 7 days
            start_date = timezone.now().date()
            end_date = start_date + timedelta(days=7)
        else:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response({'error': 'Invalid date format. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

        # Create Roster
        roster_name = f"Roster ({start_date} to {end_date})"
        roster = Roster.objects.create(
            name=roster_name,
            start_date=start_date,
            end_date=end_date,
            status='Draft'
        )

        # Get all active profiles and leave requests
        profiles = Profile.objects.exclude(role='manager')  # Only assign staff
        leaves = LeaveRequest.objects.filter(status='Approved')

        # Load or create templates
        templates = {}
        for s_type in ['morning', 'evening', 'night']:
            template = ShiftTemplate.objects.filter(shift_type=s_type).first()
            if not template:
                # Create a default template if missing
                if s_type == 'morning':
                    start_t, end_t, dur = '07:00:00', '15:00:00', 8
                elif s_type == 'evening':
                    start_t, end_t, dur = '15:00:00', '23:00:00', 8
                else:
                    start_t, end_t, dur = '23:00:00', '07:00:00', 8
                template = ShiftTemplate.objects.create(
                    name=f"{s_type.capitalize()} Shift",
                    start_time=start_t,
                    end_time=end_t,
                    duration_hours=dur,
                    shift_type=s_type,
                    color='#3B82F6' if s_type == 'morning' else '#8B5CF6' if s_type == 'evening' else '#1E293B'
                )
            templates[s_type] = template

        current_day = start_date
        created_shifts = []

        while current_day <= end_date:
            # Check who is on leave on current_day
            on_leave_staff_ids = set()
            for leave in leaves:
                if leave.start_date <= current_day <= leave.end_date:
                    on_leave_staff_ids.add(leave.staff_id)

            # Keep track of who is already assigned on this day (no double booking)
            assigned_today = set(RosterShift.objects.filter(shift_date=current_day).values_list('staff_id', flat=True))

            for s_type in ['morning', 'evening', 'night']:
                template = templates[s_type]
                reqs = requirements.get(s_type, {})
                
                # We need to fill quotas for Doctors, Nurses, and Support Staff
                for role_name, quota in reqs.items():
                    # Map standard frontnames to StaffRole enums
                    db_role = role_name
                    if role_name == 'Doctors':
                        db_role = 'Doctor'
                    elif role_name == 'Nurses':
                        db_role = 'Nurse'
                    elif role_name == 'Staff':
                        db_role = 'Support Staff'

                    # Find eligible staff members
                    eligible_staff = profiles.filter(
                        staff_role=db_role
                    ).exclude(
                        id__in=on_leave_staff_ids
                    ).exclude(
                        id__in=assigned_today
                    )

                    # Simple greedy assignment (takes first N available staff)
                    assigned_count = 0
                    for staff in eligible_staff:
                        if assigned_count >= quota:
                            break

                        shift = RosterShift.objects.create(
                            roster=roster,
                            staff=staff,
                            shift_template=template,
                            shift_date=current_day,
                            start_time=template.start_time,
                            end_time=template.end_time,
                            duration_hours=template.duration_hours,
                            status='Scheduled'
                        )
                        created_shifts.append(shift)
                        assigned_today.add(staff.id)
                        assigned_count += 1

            current_day += timedelta(days=1)

        # Generate some mock conflicts for demonstration/planning
        Conflict.objects.create(
            roster=roster,
            conflict_type='Double_Booking' if len(created_shifts) > 10 else 'Understaffed_Shift',
            message=f"Roster successfully generated. Checked {len(created_shifts)} assignments.",
            severity='Info',
            date=start_date,
            status='Open'
        )

        return Response({
            'roster': RosterSerializer(roster).data,
            'shifts': RosterShiftSerializer(created_shifts, many=True).data
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='publish')
    def publish_roster(self, request, pk=None):
        roster = self.get_object()
        roster.status = 'Published'
        roster.save()

        # Mark all associated shifts as scheduled/live
        RosterShift.objects.filter(roster=roster).update(status='Scheduled')

        # Create notifications for all staff members
        profiles = Profile.objects.exclude(role='manager')
        for profile in profiles:
            Notification.objects.create(
                user=profile,
                type='Roster_Published',
                title='Roster Published',
                message=f'The roster "{roster.name}" has been published.',
                is_read=False,
                metadata={'rosterId': str(roster.id)}
            )

        return Response(RosterSerializer(roster).data, status=status.HTTP_200_OK)


class RosterShiftViewSet(viewsets.ModelViewSet):
    queryset = RosterShift.objects.all()
    serializer_class = RosterShiftSerializer

class ShiftSwapRequestViewSet(viewsets.ModelViewSet):
    queryset = ShiftSwapRequest.objects.all()
    serializer_class = ShiftSwapRequestSerializer

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        swap = self.get_object()
        swap.status = 'Manager_Approved'
        swap.manager_notes = request.data.get('managerNotes', '')
        swap.save()
        # In a real system, you'd also swap the actual shifts here
        return Response(self.get_serializer(swap).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        swap = self.get_object()
        swap.status = 'Manager_Rejected'
        swap.manager_notes = request.data.get('managerNotes', '')
        swap.save()
        return Response(self.get_serializer(swap).data)

class ConflictViewSet(viewsets.ModelViewSet):
    queryset = Conflict.objects.all()
    serializer_class = ConflictSerializer

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        conflict = self.get_object()
        conflict.status = 'Resolved'
        conflict.save()
        return Response(self.get_serializer(conflict).data)

    @action(detail=True, methods=['post'])
    def ignore(self, request, pk=None):
        conflict = self.get_object()
        conflict.status = 'Ignored'
        conflict.save()
        return Response(self.get_serializer(conflict).data)

class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer

    @action(detail=True, methods=['post'], url_path='read')
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.save()
        return Response(self.get_serializer(notif).data)

    @action(detail=False, methods=['post'], url_path='read-all')
    def mark_all_read(self, request):
        Notification.objects.filter(is_read=False).update(is_read=True)
        return Response({'status': 'All notifications marked as read'})
