from rest_framework import serializers
from .models import User, Patient, Psychiatrist


class RegisterPatientSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model  = User
        fields = ['email', 'password']

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            role='patient'
        )
        Patient.objects.create(user=user, full_name='')
        return user


class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class PatientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Patient
        fields = '__all__'


class PsychiatristProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Psychiatrist
        fields = '__all__'


class RegisterPsychiatristSerializer(serializers.ModelSerializer):
    password         = serializers.CharField(write_only=True)
    full_name        = serializers.CharField()
    specialization   = serializers.CharField()
    experience_years = serializers.IntegerField()
    consultation_fee = serializers.DecimalField(max_digits=8, decimal_places=2)
    reg_number       = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model  = User
        fields = ['email', 'password', 'full_name', 'specialization', 'experience_years', 'consultation_fee', 'reg_number']

    def create(self, validated_data):
        full_name        = validated_data.pop('full_name')
        specialization   = validated_data.pop('specialization')
        experience_years = validated_data.pop('experience_years')
        consultation_fee = validated_data.pop('consultation_fee')
        reg_number       = validated_data.pop('reg_number', '')

        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            role='psychiatrist'
        )
        Psychiatrist.objects.create(
            user=user,
            full_name=full_name,
            specialization=specialization,
            experience_years=experience_years,
            consultation_fee=consultation_fee,
            reg_number=reg_number
        )
        return user