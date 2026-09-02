import random
from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.utils import timezone

from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        SUPER_ADMIN = "super_admin", "مدیر کل"
        ADMIN = "admin", "ادمین"
        MODERATOR = "moderator", "پشتیبان"
        USER = "user", "کاربر"
        COUNSELOR = "counselor", "خدمت دهنده"
        GUEST = "guest", "مهمان"

    username = models.CharField(max_length=200, unique=True)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, blank=True, unique=True)
    national_id = models.CharField("کد ملی", max_length=20, unique=True, blank=True, null=True)

    # Permanent flags — the fast, cheap "is this contact info confirmed
    # real" check. Flipped to True only when an OtpCode below is
    # successfully verified; never set directly anywhere else.
    is_phone_verified = models.BooleanField("تلفن تایید شده", default=False)
    is_email_verified = models.BooleanField("ایمیل تایید شده", default=False)

    is_staff = models.BooleanField(default=False)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.USER)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["email", "first_name", "last_name"]

    def __str__(self):
        return self.username


class OtpCode(models.Model):
    """Temporary verification codes for both phone and email OTP flows.
    One shared model, distinguished by `channel`, rather than two
    separate models — the send/verify/expire logic is identical for
    both, only which field it checks (phone vs email) differs."""

    class Channel(models.TextChoices):
        PHONE = "phone", "تلفن"
        EMAIL = "email", "ایمیل"

    class Purpose(models.TextChoices):
        LOGIN = "login", "ورود"
        VERIFY = "verify", "تایید حساب"
        PASSWORD_RESET = "password_reset", "بازیابی رمز عبور"

    CODE_LENGTH = 5
    EXPIRY_MINUTES = 5
    MAX_ATTEMPTS = 5

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="otp_codes", null=True, blank=True
    )
    channel = models.CharField(max_length=10, choices=Channel.choices)
    purpose = models.CharField(max_length=20, choices=Purpose.choices, default=Purpose.LOGIN)

    # The phone/email this code was sent to — stored directly, not just
    # looked up via `user`, since a code might be requested by someone
    # registering for the first time (no User row exists yet).
    destination = models.CharField(max_length=255)

    code = models.CharField(max_length=CODE_LENGTH)
    attempts = models.PositiveSmallIntegerField(default=0)
    is_used = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        indexes = [
            models.Index(fields=["destination", "channel", "is_used"]),
        ]

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(minutes=self.EXPIRY_MINUTES)
        super().save(*args, **kwargs)

    @classmethod
    def generate(cls, destination, channel, purpose=Purpose.LOGIN, user=None):
        """Creates a fresh code, invalidating any earlier unused codes
        for the same destination+channel+purpose so only the most
        recent one is ever valid — prevents an old code from a previous
        request still working after the user asked to resend."""
        cls.objects.filter(
            destination=destination, channel=channel, purpose=purpose, is_used=False
        ).update(is_used=True)

        code = "".join(random.choices("0123456789", k=cls.CODE_LENGTH))
        return cls.objects.create(
            user=user, destination=destination, channel=channel, purpose=purpose, code=code
        )

    def is_valid(self):
        return not self.is_used and self.attempts < self.MAX_ATTEMPTS and timezone.now() < self.expires_at

    def verify(self, submitted_code):
        """Returns True/False and records the attempt. Caller is
        responsible for actually flipping is_phone_verified /
        is_email_verified on the User once this returns True."""
        if not self.is_valid():
            return False

        self.attempts += 1
        if submitted_code != self.code:
            self.save(update_fields=["attempts"])
            return False

        self.is_used = True
        self.save(update_fields=["attempts", "is_used"])
        return True

    def __str__(self):
        return f"{self.get_channel_display()} → {self.destination} ({self.get_purpose_display()})"


# ===========================
# COUNSELOR
# ===========================
class Counselor(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="counselor_profile",
        limit_choices_to={"role": User.Role.COUNSELOR},
    )
    license_number = models.CharField("شماره پروانه", max_length=50, unique=True)
    nezam_number = models.CharField("شماره نظام", max_length=50, unique=True)
    degree = models.CharField("مدرک تحصیلی", max_length=100)
    bio = models.TextField("درباره من", blank=True)
    session_price = models.PositiveIntegerField("هزینه هر جلسه (تومان)", default=0)
    is_verified = models.BooleanField("تایید شده توسط ادمین", default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.user.get_full_name() or self.user.username


class CounselorCertificate(models.Model):
    """Separate model since a counselor may have multiple license/degree
    documents — one CharField couldn't hold more than one path anyway."""
    counselor = models.ForeignKey(Counselor, on_delete=models.CASCADE, related_name="certificates")
    image = models.ImageField(upload_to="counselor_certificates/")
    uploaded_at = models.DateTimeField(auto_now_add=True)


class AvailabilitySlot(models.Model):
    counselor = models.ForeignKey(Counselor, on_delete=models.CASCADE, related_name="availability_slots")
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_booked = models.BooleanField(default=False)

    class Meta:
        ordering = ["date", "start_time"]
        constraints = [
            models.UniqueConstraint(
                fields=["counselor", "date", "start_time"],
                name="unique_counselor_slot",
            )
        ]

    def clean(self):
        if self.start_time >= self.end_time:
            raise ValidationError("زمان پایان باید بعد از زمان شروع باشد")

    def __str__(self):
        return f"{self.counselor} — {self.date} {self.start_time}–{self.end_time}"
