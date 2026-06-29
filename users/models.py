import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser

class UserRole(models.TextChoices):
    MANAGER = 'manager', 'Manager'
    STAFF = 'staff', 'Staff'

class StaffRole(models.TextChoices):
    DOCTOR = 'Doctor', 'Doctor'
    NURSE = 'Nurse', 'Nurse'
    SUPPORT_STAFF = 'Support Staff', 'Support Staff'

class EmploymentType(models.TextChoices):
    FULL_TIME = 'Full-time', 'Full-time'
    PART_TIME = 'Part-time', 'Part-time'

class Profile(AbstractUser):
    """
    Maps to the 'profiles' table in the Postgres database.
    Integrates Django's authentication system with the custom schema,
    and includes support for frontend Staff Management properties.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name = models.TextField()
    email = models.EmailField(unique=True)
    
    # System role (manager vs staff)
    role = models.CharField(
        max_length=10, 
        choices=UserRole.choices, 
        default=UserRole.STAFF
    )
    
    # Staff clinical role (Doctor, Nurse, Support Staff)
    staff_role = models.CharField(
        max_length=20,
        choices=StaffRole.choices,
        default=StaffRole.NURSE
    )
    
    employee_id = models.TextField(unique=True, null=True, blank=True)
    phone = models.TextField(null=True, blank=True)
    avatar_color = models.TextField(default='#6366f1')
    department = models.TextField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[('Active', 'Active'), ('On Leave', 'On Leave'), ('Inactive', 'Inactive')],
        default='Active'
    )
    
    employment_type = models.CharField(
        max_length=20,
        choices=EmploymentType.choices,
        default=EmploymentType.FULL_TIME
    )
    joined_on = models.DateField(auto_now_add=True)

    # Set up username to use email
    username = models.CharField(max_length=150, unique=True, null=True, blank=True)

    class Meta:
        db_table = 'profiles'
        indexes = [
            models.Index(fields=['role'], name='idx_profiles_role'),
        ]

    def __str__(self):
        return f"{self.full_name} ({self.role})"
