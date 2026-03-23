from django.urls import path
from . import views

urlpatterns = [
    path('book/',                          views.book_appointment,           name='book-appointment'),
    path('patient/',                       views.patient_appointments,       name='patient-appointments'),
    path('psychiatrist/',                  views.psychiatrist_appointments,  name='psychiatrist-appointments'),
    path('<int:pk>/status/',               views.update_appointment_status,  name='update-status'),
    path('<int:pk>/note/',                 views.add_session_note,           name='add-note'),
    path('psychiatrist/availability/',     views.manage_availability,        name='availability'),
]