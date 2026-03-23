from rest_framework import serializers
from .models import Appointment, SessionNote, Availability


class AppointmentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Appointment
        fields = '__all__'


class BookAppointmentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Appointment
        fields = ['psychiatrist', 'appt_date', 'appt_time', 'type', 'complaint', 'existing_conditions']

    def create(self, validated_data):
        patient = self.context['request'].user.patient_profile
        return Appointment.objects.create(patient=patient, **validated_data)


class SessionNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = SessionNote
        fields = '__all__'


class AvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model  = Availability
        fields = '__all__'