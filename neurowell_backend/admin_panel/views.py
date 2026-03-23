from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from users.models import User, Patient, Psychiatrist
from appointments.models import Appointment


def is_admin(user):
    return user.role == 'admin'


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def analytics(request):
    if not is_admin(request.user):
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

    data = {
        'total_patients':      Patient.objects.count(),
        'total_psychiatrists': Psychiatrist.objects.count(),
        'total_appointments':  Appointment.objects.count(),
        'pending_appointments':    Appointment.objects.filter(status='pending').count(),
        'confirmed_appointments':  Appointment.objects.filter(status='confirmed').count(),
        'completed_appointments':  Appointment.objects.filter(status='completed').count(),
        'cancelled_appointments':  Appointment.objects.filter(status='cancelled').count(),
    }
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def all_doctors(request):
    if not is_admin(request.user):
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

    doctors = Psychiatrist.objects.select_related('user').all()
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
            'email':           doc.user.email,
        })
    return Response(data)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def toggle_doctor_status(request, pk):
    if not is_admin(request.user):
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        doctor = Psychiatrist.objects.get(pk=pk)
        doctor.user.is_active = not doctor.user.is_active
        doctor.user.save()
        return Response({
            'message': f"Doctor status updated",
            'is_active': doctor.user.is_active
        })
    except Psychiatrist.DoesNotExist:
        return Response({'error': 'Doctor not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def all_patients(request):
    if not is_admin(request.user):
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

    patients = Patient.objects.select_related('user').all()
    data = []
    for p in patients:
        data.append({
            'id':        p.id,
            'full_name': p.full_name,
            'phone':     p.phone,
            'address':   p.address,
            'email':     p.user.email,
            'is_active': p.user.is_active,
        })
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def all_appointments(request):
    if not is_admin(request.user):
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

    appointments = Appointment.objects.select_related('patient', 'psychiatrist').all().order_by('-created_at')
    data = []
    for appt in appointments:
        data.append({
            'id':            appt.id,
            'patient':       appt.patient.full_name,
            'psychiatrist':  appt.psychiatrist.full_name,
            'appt_date':     str(appt.appt_date),
            'appt_time':     str(appt.appt_time),
            'type':          appt.type,
            'status':        appt.status,
            'complaint':     appt.complaint,
            'created_at':    str(appt.created_at),
        })
    return Response(data)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_appointment_status(request, pk):
    if not is_admin(request.user):
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

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