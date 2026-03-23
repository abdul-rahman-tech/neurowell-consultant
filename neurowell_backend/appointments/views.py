from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Appointment, SessionNote, Availability
from .serializers import (
    AppointmentSerializer,
    BookAppointmentSerializer,
    SessionNoteSerializer,
    AvailabilitySerializer
)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def book_appointment(request):
    serializer = BookAppointmentSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        appointment = serializer.save()
        return Response({
            'message': 'Appointment booked successfully',
            'appointment': AppointmentSerializer(appointment).data
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def patient_appointments(request):
    try:
        patient      = request.user.patient_profile
        appointments = Appointment.objects.filter(patient=patient).order_by('-created_at')
        serializer   = AppointmentSerializer(appointments, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def psychiatrist_appointments(request):
    try:
        psychiatrist = request.user.psychiatrist_profile
        appointments = Appointment.objects.filter(psychiatrist=psychiatrist).order_by('-created_at')
        serializer   = AppointmentSerializer(appointments, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_appointment_status(request, pk):
    try:
        appointment = Appointment.objects.get(pk=pk)
        new_status  = request.data.get('status')
        if new_status not in ['pending', 'confirmed', 'completed', 'cancelled']:
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
        appointment.status = new_status
        appointment.save()
        return Response({'message': 'Status updated', 'status': appointment.status})
    except Appointment.DoesNotExist:
        return Response({'error': 'Appointment not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def manage_availability(request):
    try:
        psychiatrist = request.user.psychiatrist_profile
    except Exception:
        return Response({'error': 'Psychiatrist profile not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        availability = Availability.objects.filter(psychiatrist=psychiatrist)
        serializer   = AvailabilitySerializer(availability, many=True)
        return Response(serializer.data)

    if request.method == 'PUT':
        serializer = AvailabilitySerializer(data=request.data, many=True)
        if serializer.is_valid():
            Availability.objects.filter(psychiatrist=psychiatrist).delete()
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_session_note(request, pk):
    try:
        appointment = Appointment.objects.get(pk=pk)
        serializer  = SessionNoteSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(appointment=appointment)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Appointment.DoesNotExist:
        return Response({'error': 'Appointment not found'}, status=status.HTTP_404_NOT_FOUND)