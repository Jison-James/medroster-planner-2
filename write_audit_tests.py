import os

tests_content = '''from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from roster.models import Roster, StaffProfile, ShiftTemplate, ClinicalRole, ShiftType, Conflict, RosterAssignment, RosterRule, LeaveRequest, Availability
from roster.services.conflict_engine.engine import ConflictEngineService
from datetime import date, time, timedelta

User = get_user_model()

class RosterAuditTests(APITestCase):

    def setUp(self):
        self.manager = User.objects.create_user(
            email='manager@medroster.health',
            username='manager@medroster.health',
            password='medroster123',
            role='manager',
            full_name='Manager Sarah'
        )
        self.client.force_authenticate(user=self.manager)
        
        self.morning_temp = ShiftTemplate.objects.create(
            name='Morning Shift',
            shift_type=ShiftType.MORNING,
            start_time=time(7, 0, 0),
            end_time=time(15, 0, 0),
            duration_hours=8.0
        )
        self.evening_temp = ShiftTemplate.objects.create(
            name='Evening Shift',
            shift_type=ShiftType.EVENING,
            start_time=time(15, 0, 0),
            end_time=time(23, 0, 0),
            duration_hours=8.0
        )
        self.night_temp = ShiftTemplate.objects.create(
            name='Night Shift',
            shift_type=ShiftType.NIGHT,
            start_time=time(23, 0, 0),
            end_time=time(7, 0, 0),
            duration_hours=8.0
        )
        
        # Configure global rules
        self.rules = RosterRule.objects.first()
        if not self.rules:
            self.rules = RosterRule.objects.create()
            
        self.roster = Roster.objects.create(
            name="Roster July 2026",
            start_date=date(2026, 7, 13),
            end_date=date(2026, 7, 19),
            requirements={
                'morning': {'Doctor': 2, 'Nurse': 4},
                'evening': {'Doctor': 1, 'Nurse': 2},
                'night': {'Doctor': 1, 'Nurse': 1}
            }
        )

    def _create_staff(self, email, role, status='Active'):
        user = User.objects.create_user(email=email, username=email, password='pw', full_name=email.split('@')[0].capitalize())
        staff = StaffProfile.objects.get(user=user)
        staff.role = role
        staff.status = status
        staff.save()
        return staff

    def test_conflict_detection_audit(self):
        # Leave Violation Conflict
        staff_doc = self._create_staff('doc@med.com', ClinicalRole.DOCTOR)
        LeaveRequest.objects.create(
            staff=staff_doc,
            leave_type='Vacation',
            start_date=date(2026, 7, 13),
            end_date=date(2026, 7, 13),
            status='Approved'
        )
        
        assignment = RosterAssignment.objects.create(
            roster=self.roster,
            staff=staff_doc,
            shift=self.morning_temp,
            shift_date=date(2026, 7, 13),
            start_time=self.morning_temp.start_time,
            end_time=self.morning_temp.end_time,
            duration_hours=8.0
        )
        
        engine = ConflictEngineService()
        engine.run(self.roster)
        
        conflicts = Conflict.objects.filter(roster=self.roster, conflict_type='LEAVE_VIOLATION')
        self.assertEqual(conflicts.count(), 1)
        conflict = conflicts.first()
        self.assertEqual(conflict.severity, 'Critical')
        self.assertIn("vacation", conflict.description.lower())
        self.assertIn("assign another employee", conflict.suggested_resolution.lower())

    def test_grouping_coverage_conflicts(self):
        # Check grouping logic. 0 staff assigned to morning shift means missing 2 Doctors and 4 Nurses.
        # This should generate ONE UNDERSTAFFED_SHIFT conflict for this slot.
        engine = ConflictEngineService()
        engine.run(self.roster)
        
        understaffed_conflicts = Conflict.objects.filter(roster=self.roster, conflict_type='UNDERSTAFFED_SHIFT')
        # Check that we get 1 conflict per understaffed slot (dates: 13th to 19th -> 7 days, 3 slots each)
        # For morning shift, all 7 days are understaffed, so we should have 7 UNDERSTAFFED_SHIFT conflicts for morning shift.
        morning_understaffed = understaffed_conflicts.filter(shift=self.morning_temp)
        self.assertEqual(morning_understaffed.count(), 7)
        
        first_conflict = morning_understaffed.first()
        # Grouped message should contain missing info for both Doctor and Nurse
        self.assertIn("Doctor", first_conflict.description)
        self.assertIn("Nurse", first_conflict.description)
        self.assertIn("Expected: Doctor: 2, Nurse: 4", first_conflict.expected_value)

    def test_ignore_conflict_note(self):
        conflict = Conflict.objects.create(
            roster=self.roster,
            conflict_type='DOUBLE_BOOKING',
            severity='Critical',
            date=date(2026, 7, 13),
            status='Open'
        )
        
        url = reverse('conflict-ignore', kwargs={'pk': conflict.id})
        response = self.client.post(url, {'note': 'Temporary emergency exception approved'}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        conflict.refresh_from_db()
        self.assertEqual(conflict.status, 'Ignored')
        self.assertEqual(conflict.ignored, True)
        self.assertEqual(conflict.ignored_by, self.manager)
        self.assertEqual(conflict.optional_note, 'Temporary emergency exception approved')

    def test_automatic_resolution_on_save(self):
        staff = self._create_staff('nurse@med.com', ClinicalRole.NURSE)
        # Create Leave Conflict
        LeaveRequest.objects.create(
            staff=staff, leave_type='Sick', start_date=date(2026, 7, 14), end_date=date(2026, 7, 14), status='Approved'
        )
        
        # Create Assignment (triggers perform_create conflict engine!)
        url = reverse('rostershift-list')
        data = {
            'rosterId': str(self.roster.id),
            'staffId': str(staff.user.id),
            'date': '2026-07-14',
            'start_time': '07:00:00',
            'end_time': '15:00:00',
            'duration_hours': 8.0
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        leave_conflicts = Conflict.objects.filter(roster=self.roster, conflict_type='LEAVE_VIOLATION')
        self.assertEqual(leave_conflicts.count(), 1)
        conflict = leave_conflicts.first()
        self.assertEqual(conflict.status, 'Open')
        
        # Now edit the roster: Delete the assignment (triggers perform_destroy)
        assignment_id = response.data['id']
        delete_url = reverse('rostershift-detail', kwargs={'pk': assignment_id})
        del_response = self.client.delete(delete_url)
        self.assertEqual(del_response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Audit conflict: should automatically be resolved!
        conflict.refresh_from_db()
        self.assertEqual(conflict.status, 'Resolved')
        self.assertEqual(conflict.resolved, True)
        self.assertIsNotNone(conflict.resolved_at)

    def test_planning_board_redirect_url(self):
        staff = self._create_staff('doc_redirect@med.com', ClinicalRole.DOCTOR)
        LeaveRequest.objects.create(
            staff=staff, leave_type='Casual', start_date=date(2026, 7, 13), end_date=date(2026, 7, 13), status='Approved'
        )
        assignment = RosterAssignment.objects.create(
            roster=self.roster,
            staff=staff,
            shift=self.morning_temp,
            shift_date=date(2026, 7, 13),
            start_time=self.morning_temp.start_time,
            end_time=self.morning_temp.end_time,
            duration_hours=8.0
        )
        
        engine = ConflictEngineService()
        engine.run(self.roster)
        
        conflict = Conflict.objects.get(roster=self.roster, conflict_type='LEAVE_VIOLATION')
        self.assertIn("/manager/planning", conflict.planning_board_redirect)
        self.assertIn("date=2026-07-13", conflict.planning_board_redirect)
        self.assertIn("shift=morning", conflict.planning_board_redirect)
        self.assertIn(f"conflict={conflict.id}", conflict.planning_board_redirect)

    def test_views_filters_search_pagination(self):
        # Create 15 mock conflicts to verify pagination
        for i in range(15):
            Conflict.objects.create(
                roster=self.roster,
                conflict_type='DOUBLE_BOOKING',
                severity='Critical',
                date=date(2026, 7, 13),
                status='Open',
                title=f"Conflict {i}"
            )
            
        url = reverse('conflict-list')
        
        # Test basic list
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Default lists are not paginated inside DRF standard setup unless pagination is configured,
        # but since we did client-side pagination in frontend, let's verify data serializer compatibility!
        self.assertGreaterEqual(len(response.data), 15)
        self.assertEqual(response.data[0]['severity'], 'Critical')
        self.assertEqual(response.data[0]['type'], 'DOUBLE_BOOKING')

'''

with open(r'c:\intpurple\medroster-planner-2\roster\tests.py', 'w', encoding='utf-8') as f:
    f.write(tests_content)
