from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from roster.models import Roster, StaffProfile, ShiftTemplate, ClinicalRole, ShiftType

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
        ShiftTemplate.objects.create(
            name='Morning Shift',
            shift_type=ShiftType.MORNING,
            start_time='07:00:00',
            end_time='15:00:00',
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
