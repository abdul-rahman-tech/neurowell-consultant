from django.urls import path
from . import views

urlpatterns = [
    path('register/',              views.register_patient,       name='register'),
    path('register/psychiatrist/', views.register_psychiatrist,  name='register-psychiatrist'),
    path('login/',                 views.login_user,             name='login'),
    path('patient/profile/',       views.patient_profile,        name='patient-profile'),
    path('psychiatrist/profile/',  views.psychiatrist_profile,   name='psychiatrist-profile'),
    path('doctors/',               views.public_doctors_list,    name='public-doctors'),
]