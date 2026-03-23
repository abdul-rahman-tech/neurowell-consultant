from django.urls import path
from . import views

urlpatterns = [
    path('analytics/',                    views.analytics,                 name='analytics'),
    path('doctors/',                      views.all_doctors,               name='all-doctors'),
    path('doctors/<int:pk>/toggle/',      views.toggle_doctor_status,      name='toggle-doctor'),
    path('patients/',                     views.all_patients,              name='all-patients'),
    path('appointments/',                 views.all_appointments,          name='all-appointments'),
    path('appointments/<int:pk>/status/', views.update_appointment_status, name='admin-update-status'),
]