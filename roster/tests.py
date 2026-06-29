from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from roster.models import Roster, StaffProfile, ShiftTemplate, ClinicalRole, ShiftType, ActivityLog, Conflict, RosterAssignment
from roster.services.conflict_detector import ConflictDetectorService

User = get_user_model()

class RosterAPITests(APITestCase):

    def setUp(self):
        # Create a manager user
        self.manager = User.objects.create_user(
            email='manager@medroster.health',
            username='manager@medroster.health',
            password='medroster123',
            role='manager',
            full_name='Manager Sarah'
        )
        # Create some shift templates
        self.morning_temp = ShiftTemplate.objects.create(
            name='Morning Shift',
            shift_type=ShiftType.MORNING,
            start_time='07:00:00',
            end_time='15:00:00',
            duration_hours=8.0
        )
        self.evening_temp = ShiftTemplate.objects.create(
            name='Evening Shift',
            shift_type=ShiftType.EVENING,
            start_time='15:00:00',
            end_time='23:00:00',
            duration_hours=8.0
        )

    def test_health_check(self):
        url = reverse('health-check')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'healthy')

    def test_roster_list_requires_auth(self):
        url = reverse('roster-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_roster_list_after_auth(self):
        self.client.force_authenticate(user=self.manager)
        url = reverse('roster-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_conflict_and_activity_logging(self):
        self.client.force_authenticate(user=self.manager)
        
        # 1. Trigger Roster Generation via API
        url = reverse('roster-generate-roster')
        req_data = {
            'startDate': '2026-07-13',
            'endDate': '2026-07-19',
            'requirements': {
                'morning': {'Doctor': 1, 'Nurse': 1},
                'evening': {'Doctor': 1, 'Nurse': 1},
                'night': {'Doctor': 1, 'Nurse': 1}
            }
        }
        res = self.client.post(url, req_data, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        # Verify ActivityLog entry was recorded
        log_entry = ActivityLog.objects.filter(action='Roster_Generated').first()
        self.assertIsNotNone(log_entry)
        self.assertIn("Roster generated successfully", log_entry.message)

        # 2. Test Conflict Detector
        # Create a new roster draft and intentionally assign overlapping shifts to create a real Double Booking
        roster = Roster.objects.create(
            name="Conflict Test Roster",
            start_date="2026-07-20",
            end_date="2026-07-26",
            status="Draft"
        )
        # Find a staff profile
        staff = StaffProfile.objects.exclude(user__role='manager').first()
        if staff:
            # Create two overlapping assignments for the same staff on same day
            s1 = RosterAssignment.objects.create(
                roster=roster,
                staff=staff,
                shift=self.morning_temp,
                shift_date="2026-07-20",
                start_time=self.morning_temp.start_time,
                end_time=self.morning_temp.end_time,
                duration_hours=self.morning_temp.duration_hours,
                status="Scheduled"
            )
            # Second shift starting at 08:00 (overlaps morning shift 07:00-15:00)
            s2 = RosterAssignment.objects.create(
                roster=roster,
                staff=staff,
                shift=self.morning_temp,
                shift_date="2026-07-20",
                start_time="08:00:00",
                end_time="16:00:00",
                duration_hours=8.0,
                status="Scheduled"
            )

            # Detect conflicts
            detector = ConflictDetectorService()
            conflicts = detector.detect_conflicts(roster)
            
            # Verify double booking is recorded as Critical
            db_conflict = Conflict.objects.filter(conflict_type='Double_Booking', roster=roster).first()
            self.assertIsNotNone(db_conflict)
            self.assertEqual(db_conflict.severity, 'Critical')
            self.assertIn("multiple overlapping shifts", db_conflict.message)
