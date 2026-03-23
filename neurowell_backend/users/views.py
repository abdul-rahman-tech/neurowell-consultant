from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import User, Patient, Psychiatrist
from .serializers import (
    RegisterPatientSerializer,
    RegisterPsychiatristSerializer,
    LoginSerializer,
    PatientProfileSerializer,
    PsychiatristProfileSerializer
)


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


@api_view(['POST'])
@permission_classes([AllowAny])
def register_patient(request):
    serializer = RegisterPatientSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        tokens = get_tokens_for_user(user)
        return Response({
            'message': 'Patient registered successfully',
            'tokens': tokens,
            'role': user.role
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        email    = serializer.validated_data['email']
        password = serializer.validated_data['password']
        user     = authenticate(request, username=email, password=password)
        if user is not None:
            tokens = get_tokens_for_user(user)
            return Response({
                'message': 'Login successful',
                'tokens': tokens,
                'role': user.role
            }, status=status.HTTP_200_OK)
        return Response({'error': 'Invalid email or password'}, status=status.HTTP_401_UNAUTHORIZED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def patient_profile(request):
    try:
        profile = request.user.patient_profile
    except Patient.DoesNotExist:
        return Response({'error': 'Patient profile not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = PatientProfileSerializer(profile)
        return Response(serializer.data)

    if request.method == 'PUT':
        serializer = PatientProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def psychiatrist_profile(request):
    try:
        profile = request.user.psychiatrist_profile
    except Psychiatrist.DoesNotExist:
        return Response({'error': 'Psychiatrist profile not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = PsychiatristProfileSerializer(profile)
        return Response(serializer.data)

    if request.method == 'PUT':
        serializer = PsychiatristProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
@api_view(['POST'])
@permission_classes([AllowAny])
def register_psychiatrist(request):
    serializer = RegisterPsychiatristSerializer(data=request.data)
    if serializer.is_valid():
        user   = serializer.save()
        tokens = get_tokens_for_user(user)
        return Response({
            'message': 'Psychiatrist registered successfully',
            'tokens':  tokens,
            'role':    user.role
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def public_doctors_list(request):
    doctors = Psychiatrist.objects.select_related('user').filter(user__is_active=True)
    data = []
    for doc in doctors:
        data.append({
            'id':              doc.id,
            'full_name':       doc.full_name,
            'specialization':  doc.specialization,
            'experience_years': doc.experience_years,
            'consultation_fee': str(doc.consultation_fee),
            'is_verified':     doc.is_verified,
            'is_active':       doc.user.is_active,
            'bio':             doc.bio,
        })
    return Response(data)