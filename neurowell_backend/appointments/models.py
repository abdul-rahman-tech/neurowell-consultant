from django.db import models
from users.models import Patient, Psychiatrist


class Appointment(models.Model):
    STATUS_CHOICES = (
        ('pending',   'Pending'),
        ('confirmed', 'Confirmed'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )

    TYPE_CHOICES = (
        ('video',      'Video Consultation'),
        ('in_person',  'In-Person'),
        ('phone',      'Phone Consultation'),
    )

    patient             = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='appointments')
    psychiatrist        = models.ForeignKey(Psychiatrist, on_delete=models.CASCADE, related_name='appointments')
    appt_date           = models.DateField()
    appt_time           = models.TimeField()
    type                = models.CharField(max_length=20, choices=TYPE_CHOICES, default='video')
    status              = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    complaint           = models.TextField(blank=True)
    existing_conditions = models.TextField(blank=True)
    created_at          = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.patient} → {self.psychiatrist} on {self.appt_date}"


class SessionNote(models.Model):
    appointment  = models.OneToOneField(Appointment, on_delete=models.CASCADE, related_name='session_note')
    notes        = models.TextField()
    prescription = models.TextField(blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Note for {self.appointment}"


class Availability(models.Model):
    DAY_CHOICES = (
        (0, 'Monday'),
        (1, 'Tuesday'),
        (2, 'Wednesday'),
        (3, 'Thursday'),
        (4, 'Friday'),
        (5, 'Saturday'),
        (6, 'Sunday'),
    )

    psychiatrist = models.ForeignKey(Psychiatrist, on_delete=models.CASCADE, related_name='availability')
    day_of_week  = models.IntegerField(choices=DAY_CHOICES)
    start_time   = models.TimeField()
    end_time     = models.TimeField()
    is_available = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.psychiatrist} - Day {self.day_of_week}"