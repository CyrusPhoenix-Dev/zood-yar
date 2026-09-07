import random
from datetime import timedelta

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator
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
        BANNED = "banned", "بلاک شده"

    username = models.CharField(max_length=200, unique=True)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, blank=True)
    national_id = models.CharField("کد ملی", max_length=20, unique=True, blank=True, null=True)
    avatar = models.ImageField("عکس پروفایل", upload_to="user_avatars/", blank=True, null=True)

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

    def get_full_name(self):
        full_name = f"{self.first_name} {self.last_name}".strip()
        return full_name or self.username

    def get_short_name(self):
        return self.first_name or self.username

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
class Specialty(models.Model):
    """The counseling categories from ServicesPage (family, marriage,
    individual, etc.) — a real model instead of a hardcoded string list,
    so they're consistent between what's advertised on the services
    page and what counselors can actually be filtered/found by."""
    slug = models.SlugField(unique=True)
    label = models.CharField(max_length=100)

    class Meta:
        verbose_name_plural = "Specialties"

    def __str__(self):
        return self.label


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
    specialties = models.ManyToManyField(Specialty, related_name="counselors", blank=True)
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


class Booking(models.Model):
    """Created the moment a client reserves an AvailabilitySlot. This
    is the missing link that turns "is_booked = True" into an actual
    record of *who* booked it — without this, a counselor has no way
    to know which client is coming to a given slot."""
    slot = models.OneToOneField(
        AvailabilitySlot, on_delete=models.CASCADE, related_name="booking"
    )
    client = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="bookings"
    )
    # Placeholder for a real payment gateway transaction ID (Zarinpal,
    # etc.) once that's wired in — currently holds a mock reference
    # from the local always-succeeds payment simulation.
    payment_reference = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        # Keep the slot's is_booked flag in sync with the existence of
        # a real booking, rather than trusting two places to agree.
        is_new = self._state.adding
        super().save(*args, **kwargs)
        if is_new:
            self.slot.is_booked = True
            self.slot.save(update_fields=["is_booked"])

    def __str__(self):
        return f"{self.client} → {self.slot}"


class CounselorNote(models.Model):
    """Private notes a counselor keeps about a specific client — never
    visible to the client themselves, never visible to other
    counselors. One counselor can only see/edit notes they wrote about
    their own clients."""
    counselor = models.ForeignKey(
        Counselor, on_delete=models.CASCADE, related_name="client_notes"
    )
    client = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="counselor_notes"
    )
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.counselor} note on {self.client}"


class Review(models.Model):
    """One review per completed booking — the OneToOneField itself
    enforces "a client can only review a given session once" at the
    database level, not just in application logic."""
    booking = models.OneToOneField(
        Booking, on_delete=models.CASCADE, related_name="review"
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment = models.TextField(blank=True)
    is_approved = models.BooleanField(
        "تایید شده برای نمایش عمومی", default=False
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.booking.client} → {self.booking.slot.counselor}: {self.rating}★"


class SupportTicket(models.Model):
    """Open to every logged-in user regardless of role — a regular
    client and a counselor use the exact same ticket system."""

    class Status(models.TextChoices):
        PENDING = "pending", "در انتظار بررسی"
        IN_PROGRESS = "in_progress", "در حال بررسی"
        RESOLVED = "resolved", "پاسخ داده شد"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="support_tickets")
    subject = models.CharField(max_length=200)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"#{self.id} — {self.subject} ({self.user})"


class TicketReply(models.Model):
    """A message in the back-and-forth on a ticket — either from the
    ticket's own owner, or from staff responding to it."""
    ticket = models.ForeignKey(SupportTicket, on_delete=models.CASCADE, related_name="replies")
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="ticket_replies")
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Reply on #{self.ticket_id} by {self.sender}"
