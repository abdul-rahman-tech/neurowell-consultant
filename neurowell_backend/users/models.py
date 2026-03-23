from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin

class UserManager(BaseUserManager):
    def create_user(self, email, password, role, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, role=role, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault('role', 'admin')
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = (
        ('patient', 'Patient'),
        ('psychiatrist', 'Psychiatrist'),
        ('admin', 'Admin'),
    )
    email      = models.EmailField(unique=True)
    role       = models.CharField(max_length=20, choices=ROLE_CHOICES)
    is_active  = models.BooleanField(default=True)
    is_staff   = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return f"{self.email} ({self.role})"


class Patient(models.Model):
    user              = models.OneToOneField(User, on_delete=models.CASCADE, related_name='patient_profile')
    full_name         = models.CharField(max_length=100)
    date_of_birth     = models.DateField(null=True, blank=True)
    phone             = models.CharField(max_length=20, blank=True)
    address           = models.TextField(blank=True)
    emergency_contact = models.CharField(max_length=100, blank=True)
    emergency_phone   = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return self.full_name


class Psychiatrist(models.Model):
    user             = models.OneToOneField(User, on_delete=models.CASCADE, related_name='psychiatrist_profile')
    full_name        = models.CharField(max_length=100)
    specialization   = models.CharField(max_length=100)
    experience_years = models.IntegerField(default=0)
    consultation_fee = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    bio              = models.TextField(blank=True)
    reg_number       = models.CharField(max_length=50, blank=True)
    is_verified      = models.BooleanField(default=False)

    def __str__(self):
        return self.full_name