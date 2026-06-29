from rest_framework import serializers
from .models import Profile
from roster.models import Availability

class ProfileSerializer(serializers.ModelSerializer):
    # CamelCase field mapping for frontend compatibility
    employeeId = serializers.CharField(source='employee_id', required=False, allow_null=True, allow_blank=True)
    name = serializers.CharField(source='full_name')
    avatarColor = serializers.CharField(source='avatar_color', default='#6366f1')
    employmentType = serializers.CharField(source='employment_type', default='Full-time')
    joinedOn = serializers.DateField(source='joined_on', read_only=True)
    
    # Custom fields populated from the Availability model
    availableDays = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    preferredShift = serializers.CharField(required=False, default='morning')
    preferredDaysOff = serializers.ListField(child=serializers.CharField(), required=False, default=list)

    # In staff management page, 'role' refers to 'Doctor', 'Nurse', 'Support Staff'
    # We serialize 'staff_role' as 'role' to match frontend expected type.
    role = serializers.CharField(source='staff_role', default='Nurse')
    systemRole = serializers.CharField(source='role', read_only=True)

    class Meta:
        model = Profile
        fields = [
            'id', 'employeeId', 'name', 'email', 'phone', 'role', 
            'department', 'status', 'joinedOn', 'employmentType', 
            'availableDays', 'preferredShift', 'preferredDaysOff', 
            'avatarColor', 'username', 'systemRole'
        ]
        extra_kwargs = {
            'username': {'required': False, 'allow_null': True, 'allow_blank': True}
        }

    def to_representation(self, instance):
        """
        Merge availability details from Availability model into the serialized Profile output.
        """
        representation = super().to_representation(instance)
        
        # Get the first availability record if it exists
        availability = instance.availabilities.first()
        if availability:
            representation['availableDays'] = availability.available_days
            representation['preferredShift'] = availability.preferred_shift or 'morning'
            representation['preferredDaysOff'] = availability.preferred_days_off
        else:
            # Fallbacks matching frontend defaults
            representation['availableDays'] = ["Mon", "Tue", "Wed", "Thu", "Fri"]
            representation['preferredShift'] = 'morning'
            representation['preferredDaysOff'] = ["Sat", "Sun"]
            
        return representation

    def create(self, validated_data):
        # Remove custom availability fields from validated_data so they don't break Profile.objects.create
        validated_data.pop('availableDays', None)
        validated_data.pop('preferredShift', None)
        validated_data.pop('preferredDaysOff', None)

        # Extract availability data from initial_data
        available_days = self.initial_data.get('availableDays', ["Mon", "Tue", "Wed", "Thu", "Fri"])
        preferred_shift = self.initial_data.get('preferredShift', 'morning')
        preferred_days_off = self.initial_data.get('preferredDaysOff', ["Sat", "Sun"])

        # Create Profile
        profile = super().create(validated_data)
        if not profile.username and profile.email:
            profile.username = profile.email
            profile.save()

        # Create corresponding Availability object
        Availability.objects.create(
            staff=profile,
            available_days=available_days,
            preferred_shift=preferred_shift,
            preferred_days_off=preferred_days_off
        )
        return profile

    def update(self, instance, validated_data):
        # Remove custom availability fields from validated_data so they don't break Profile.objects.update
        validated_data.pop('availableDays', None)
        validated_data.pop('preferredShift', None)
        validated_data.pop('preferredDaysOff', None)

        # Extract availability details if provided
        has_availability_data = any(k in self.initial_data for k in ['availableDays', 'preferredShift', 'preferredDaysOff'])
        
        profile = super().update(instance, validated_data)

        if has_availability_data:
            availability, created = Availability.objects.get_or_create(staff=profile)
            if 'availableDays' in self.initial_data:
                availability.available_days = self.initial_data['availableDays']
            if 'preferredShift' in self.initial_data:
                availability.preferred_shift = self.initial_data['preferredShift']
            if 'preferredDaysOff' in self.initial_data:
                availability.preferred_days_off = self.initial_data['preferredDaysOff']
            availability.save()

        return profile
