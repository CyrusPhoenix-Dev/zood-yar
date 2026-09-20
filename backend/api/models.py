import random
from datetime import timedelta
from django.utils.text import slugify
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.utils import timezone
from .managers import UserManager
import os
import uuid
from django.db.models.signals import post_delete
from django.dispatch import receiver


def user_avatar_upload_path(instance, filename):
    """All profile avatars in one folder, renamed to the username."""
    ext = os.path.splitext(filename)[1]
    return f"user_avatars/{instance.username}{ext}"


def counselor_certificate_upload_path(instance, filename):
    """One folder per counselor, file named <username>_<uuid><ext> so
    multiple certificates for the same counselor never collide."""
    ext = os.path.splitext(filename)[1]
    username = instance.counselor.user.username
    unique = uuid.uuid4().hex[:8]
    return f"counselor_certificates/{username}/{username}_{unique}{ext}"


def counselor_gallery_upload_path(instance, filename):
    """Same pattern as certificates — one folder per counselor, unique
    filename per photo so multiple uploads never collide. Separate
    folder from certificates since these are public-facing self/room
    photos, not documents pending admin review."""
    ext = os.path.splitext(filename)[1]
    username = instance.counselor.user.username
    unique = uuid.uuid4().hex[:8]
    return f"counselor_gallery/{username}/{username}_{unique}{ext}"


def plan_image_upload_path(instance, filename):
    ext = os.path.splitext(filename)[1]
    unique = uuid.uuid4().hex[:8]
    return f"plan_images/{unique}{ext}"

def compute_subscription_dates(user, plan, billing_period):
    """started_at is always now (when this purchase happened). ends_at
    extends from the counselor's current subscription end date if
    they're renewing the SAME plan while it's still active — so
    renewing a few days early doesn't throw away the remaining paid
    time. Otherwise (expired, or no prior subscription) it starts
    fresh from now."""
    now = timezone.now()
    base = now
    counselor = getattr(user, 'counselor_profile', None)
    if counselor:
        current = counselor.get_active_subscription()
        if current and current.plan_id == plan.id and current.ends_at and current.ends_at > now:
            base = current.ends_at
    return now, base + timedelta(days=BILLING_PERIOD_DAYS[billing_period])



class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        SUPER_ADMIN = "super_admin", "مدیر کل"
        ADMIN = "admin", "ادمین"
        MODERATOR = "moderator", "پشتیبان"
        USER = "user", "کاربر"
        COUNSELOR = "counselor", "خدمت دهنده"
        GUEST = "guest", "مهمان"
        BANNED = "banned", "مسدود"

    class Gender(models.TextChoices):
        MALE = "male", "مرد"
        FEMALE = "female", "زن"

    username = models.CharField(max_length=200, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, blank=True)
    national_id = models.CharField(
        "کد ملی", max_length=20, unique=True, blank=True, null=True
    )
    avatar = models.ImageField(
        "عکس پروفایل",
        upload_to=user_avatar_upload_path,
        blank=True,
        null=True,
        default="user_avatars/avatar.svg",
    )
    ban_reason = models.TextField(
        "دلیل مسدودسازی",
        blank=True,
        help_text="در صورتی که نقش کاربر «مسدود» باشد، این فیلد الزامی است.",
    )

    # Additional client-facing profile info. Both optional (blank=True)
    # since existing users won't have these set yet, and there's no
    # requirement forcing every user to provide them at registration.
    birth_date = models.DateField("تاریخ تولد", null=True, blank=True)
    gender = models.CharField(
        "جنسیت", max_length=10, choices=Gender.choices, blank=True
    )

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
    REQUIRED_FIELDS = ["first_name", "last_name"]

    def get_full_name(self):
        full_name = f"{self.first_name} {self.last_name}".strip()
        return full_name or self.username

    def get_short_name(self):
        return self.first_name or self.username

    def clean(self):
        super().clean()
        if self.role == self.Role.BANNED and not self.ban_reason.strip():
            raise ValidationError(
                {"ban_reason": "برای مسدود کردن کاربر، ذکر دلیل الزامی است"}
            )

    def save(self, *args, **kwargs):
        if self.pk:
            old = User.objects.filter(pk=self.pk).only("avatar").first()
            if old and old.avatar and old.avatar.name != self.avatar.name:
                default_path = self._meta.get_field("avatar").default
                if old.avatar.name != default_path:
                    old.avatar.delete(save=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.username


class OtpCode(models.Model):
    """Temporary verification codes for both phone and email OTP flows.
    One shared model, distinguished by `channel`, rather than two
    separate models — the send/verify/expire logic is identical for
    both, only which field it checks (phone vs email) differs."""

    class Channel(models.TextChoices):
        PHONE = "phone", "تلفن"

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
    purpose = models.CharField(
        max_length=20, choices=Purpose.choices, default=Purpose.LOGIN
    )

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
            user=user,
            destination=destination,
            channel=channel,
            purpose=purpose,
            code=code,
        )

    def is_valid(self):
        return (
            not self.is_used
            and self.attempts < self.MAX_ATTEMPTS
            and timezone.now() < self.expires_at
        )

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
    PLAN_BRONZE = "bronze"
    PLAN_SILVER = "silver"
    PLAN_GOLD = "gold"
    PLAN_COMPANY = "company"
    PLAN_CHOICES = [
        (PLAN_BRONZE, "برنزی"),
        (PLAN_SILVER, "نقره‌ای"),
        (PLAN_GOLD, "طلایی"),
        (PLAN_COMPANY, "سازمانی"),
    ]

    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default=PLAN_BRONZE)
    plan_expires_at = models.DateTimeField(null=True, blank=True)

    @property
    def is_plan_active(self):
        return bool(self.plan_expires_at and self.plan_expires_at > timezone.now())

    def get_active_subscription(self):
        return (
            UserSubscription.objects.filter(
                user_id=self.user_id,
                status=UserSubscription.Status.ACTIVE,
                ends_at__gt=timezone.now(),
            )
            .order_by("-ends_at")
            .first()
        )

    def get_last_subscription_end(self):
        latest = (
            UserSubscription.objects.filter(user_id=self.user_id)
            .order_by("-ends_at")
            .first()
        )
        return latest.ends_at if latest else None

    class SessionFormat(models.TextChoices):
        ONLINE = "online", "آنلاین"
        IN_PERSON = "in_person", "حضوری"
        BOTH = "both", "آنلاین و حضوری"

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="counselor_profile",
        limit_choices_to={"role": User.Role.COUNSELOR},
    )
    license_number = models.CharField(
        "شماره پروانه", max_length=50, unique=True, null=True, blank=True
    )
    nezam_number = models.CharField(
        "شماره نظام", max_length=50, unique=True, null=True, blank=True
    )
    degree = models.CharField("مدرک تحصیلی", max_length=100, null=True, blank=True)
    bio = models.TextField("درباره من", blank=True)
    specialties = models.ManyToManyField(
        Specialty, related_name="counselors", blank=True
    )
    session_price = models.PositiveIntegerField("هزینه هر جلسه (تومان)", default=0)
    session_format = models.CharField(
        "نوع جلسه",
        max_length=10,
        choices=SessionFormat.choices,
        default=SessionFormat.ONLINE,
    )
    years_of_experience = models.PositiveIntegerField("سابقه کار (سال)", default=0)
    slug = models.SlugField(
        "لینک اختصاصی", max_length=150, unique=True, blank=True, allow_unicode=True
    )

    # Only meaningful when session_format includes in-person sessions —
    # both optional since an online-only counselor has no use for
    # either. city kept separate from the full address so it can be
    # used on its own for directory filtering later, without having
    # to parse a free-text address string.
    city = models.CharField("شهر", max_length=100, blank=True)
    address = models.TextField("آدرس کامل", blank=True)
    is_verified = models.BooleanField("تایید شده توسط ادمین", default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        # Only auto-generate once, when empty — if the counselor edits
        # it later (via CounselorSelfSerializer), it stays non-empty
        # from then on, so this never overwrites a manual choice, even
        # if their name changes afterward.
        if not self.slug:
            base = (
                slugify(
                    self.user.get_full_name() or self.user.username, allow_unicode=True
                )
                or f"counselor-{self.user_id}"
            )
            candidate = base
            counter = 2
            while Counselor.objects.filter(slug=candidate).exclude(pk=self.pk).exists():
                candidate = f"{base}-{counter}"
                counter += 1
            self.slug = candidate
        super().save(*args, **kwargs)

    def __str__(self):
        return self.user.get_full_name() or self.user.username

    is_purged = models.BooleanField(default=False)
    purged_at = models.DateTimeField(null=True, blank=True)

    def purge(self):
        if self.is_purged:
            return
        self.bio = ""
        self.license_number = None
        self.nezam_number = None
        self.degree = None
        self.address = ""
        self.city = ""
        self.certificates.all().delete()
        self.gallery_images.all().delete()
        self.is_purged = True
        self.purged_at = timezone.now()
        self.save()

        self.user.first_name = "کاربر"
        self.user.last_name = "حذف‌شده"
        self.user.phone = ""
        self.user.national_id = None
        self.user.save()


class CounselorCertificate(models.Model):
    """Separate model since a counselor may have multiple license/degree
    documents — one CharField couldn't hold more than one path anyway."""

    counselor = models.ForeignKey(
        Counselor, on_delete=models.CASCADE, related_name="certificates"
    )
    image = models.ImageField(upload_to=counselor_certificate_upload_path)
    uploaded_at = models.DateTimeField(auto_now_add=True)


class CounselorGalleryImage(models.Model):
    """Public-facing photos of the counselor themself or their office
    — shown on the full profile page, unlike certificates (which are
    private documents for admin review only). Capped at 6 per
    counselor; that limit is enforced in the view (perform_create),
    not here, since a model-level constraint can't easily express
    "count of related rows" without a signal or custom validation
    that would be more fragile than just checking it in the view
    where the request context already exists."""

    counselor = models.ForeignKey(
        Counselor, on_delete=models.CASCADE, related_name="gallery_images"
    )
    image = models.ImageField(upload_to=counselor_gallery_upload_path)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["uploaded_at"]


@receiver(post_delete, sender=CounselorGalleryImage)
def delete_gallery_image_file(sender, instance, **kwargs):
    if instance.image:
        instance.image.delete(save=False)


@receiver(post_delete, sender=CounselorCertificate)
def delete_certificate_file(sender, instance, **kwargs):
    if instance.image:
        instance.image.delete(save=False)


class AvailabilitySlot(models.Model):
    class Source(models.TextChoices):
        MANUAL = "manual", "دستی"
        GENERATED = "generated", "خودکار"

    counselor = models.ForeignKey(
        Counselor, on_delete=models.CASCADE, related_name="availability_slots"
    )
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_booked = models.BooleanField(default=False)
    source = models.CharField(
        max_length=10, choices=Source.choices, default=Source.MANUAL
    )

    class Meta:
        ordering = ["date", "start_time"]
        constraints = [
            models.UniqueConstraint(
                fields=["counselor", "date", "start_time"], name="unique_counselor_slot"
            )
        ]

    def clean(self):
        if self.start_time >= self.end_time:
            raise ValidationError("زمان پایان باید بعد از زمان شروع باشد")

    def __str__(self):
        return f"{self.counselor} — {self.date} {self.start_time}–{self.end_time}"


class Booking(models.Model):
    class Status(models.TextChoices):
        PAID = "paid", "پرداخت شده"
        CANCELLED_REFUNDED = "cancelled_refunded", "لغو شده - عودت وجه"
        CANCELLED_NO_REFUND = "cancelled_no_refund", "لغو شده - بدون عودت"

    slot = models.ForeignKey(
        AvailabilitySlot, on_delete=models.CASCADE, related_name="bookings"
    )
    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name="bookings")
    payment_reference = models.CharField(max_length=100, blank=True)
    # Snapshot of counselor.session_price at the moment of booking —
    # without this, earnings recalculate historical bookings at
    # whatever the counselor's CURRENT price is, which is wrong the
    # moment a counselor ever changes their rate.
    price_at_booking = models.PositiveIntegerField(default=0)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PAID
    )
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cancelled_bookings",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        if is_new:
            self.slot.is_booked = True
            self.slot.save(update_fields=["is_booked"])

    def __str__(self):
        return f"{self.client} → {self.slot}"


# models.py, near Booking
class Plan(models.Model):
    """A subscription plan shown in the 'پلن‌ها' section — managed
    from admin, same pattern as HeroSlide, so pricing/feature changes
    don't need a deploy. price_six_months/price_yearly are optional —
    leaving one blank hides that billing option on the frontend for
    this plan, so a plan can offer monthly-only if you want."""

    image = models.ImageField(upload_to=plan_image_upload_path)
    title = models.CharField(max_length=100)
    features = models.TextField(help_text="هر ویژگی در یک خط جداگانه")
    price = models.PositiveIntegerField("قیمت ماهانه (تومان)")
    price_six_months = models.PositiveIntegerField(
        "قیمت ۶ ماهه (تومان)",
        null=True,
        blank=True,
        help_text="خالی بگذارید تا این گزینه نمایش داده نشود",
    )
    price_yearly = models.PositiveIntegerField(
        "قیمت سالانه (تومان)",
        null=True,
        blank=True,
        help_text="خالی بگذارید تا این گزینه نمایش داده نشود",
    )
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_free = models.BooleanField(
        "رایگان",
        default=False,
        help_text="در صورت فعال بودن، این پلن بدون نیاز به پرداخت فعال می‌شود",
    )

    class Tier(models.TextChoices):
        BRONZE = "bronze", "برنزی"
        SILVER = "silver", "نقره‌ای"
        GOLD = "gold", "طلایی"
        COMPANY = "company", "سازمانی"

    tier = models.CharField(max_length=20, choices=Tier.choices, default=Tier.BRONZE)
    TIER_ORDER = {
        Tier.BRONZE: 0,
        Tier.SILVER: 1,
        Tier.GOLD: 2,
        Tier.COMPANY: 3,
    }
    class Meta:
        ordering = ["order", "created_at"]

    def price_for_period(self, period):
        if self.is_free:
            return 0
        return {
            BillingPeriod.MONTHLY: self.price,
            BillingPeriod.SIX_MONTHS: self.price_six_months,
            BillingPeriod.YEARLY: self.price_yearly,
        }.get(period)

    def save(self, *args, **kwargs):
        if self.pk:
            old = Plan.objects.filter(pk=self.pk).only("image").first()
            if old and old.image and old.image.name != self.image.name:
                old.image.delete(save=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


@receiver(post_delete, sender=Plan)
def delete_plan_image(sender, instance, **kwargs):
    if instance.image:
        instance.image.delete(save=False)


class BillingPeriod(models.TextChoices):
    MONTHLY = "monthly", "ماهانه"
    SIX_MONTHS = "six_months", "۶ ماهه"
    YEARLY = "yearly", "سالانه"


BILLING_PERIOD_DAYS = {
    BillingPeriod.MONTHLY: 30,
    BillingPeriod.SIX_MONTHS: 182,
    BillingPeriod.YEARLY: 365,
}


class UserSubscription(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "در انتظار پرداخت"
        ACTIVE = "active", "فعال"
        CANCELLED = "cancelled", "لغو شده"

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="subscriptions"
    )
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name="purchases")
    billing_period = models.CharField(
        max_length=20, choices=BillingPeriod.choices, default=BillingPeriod.MONTHLY
    )
    price_at_purchase = models.PositiveIntegerField()
    coupon = models.ForeignKey(
        "Coupon",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subscriptions",
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    started_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    @property
    def is_currently_active(self):
        return self.status == self.Status.ACTIVE and bool(self.ends_at) and self.ends_at > timezone.now()

    @property
    def display_status(self):
        if self.status == self.Status.ACTIVE and not self.is_currently_active:
            return "expired"
        return self.status

class PaymentTransaction(models.Model):
    """One row per payment attempt — created the moment a client is
    sent to the gateway, before we know if it succeeds. This is
    deliberately separate from Booking: a failed or abandoned Zarinpal
    payment never becomes a Booking, but it's still a real financial
    event worth recording (reconciliation, debugging "why didn't my
    payment go through" support tickets, fraud patterns, etc.)."""

    class Purpose(models.TextChoices):
        BOOKING = "booking", "رزرو نوبت"
        SUBSCRIPTION = "subscription", "خرید اشتراک"

    purpose = models.CharField(
        max_length=20, choices=Purpose.choices, default=Purpose.BOOKING
    )
    subscription = models.ForeignKey(
        UserSubscription,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions",
    )

    class Status(models.TextChoices):
        PENDING = "pending", "در انتظار پرداخت"
        SUCCESS = "success", "موفق"
        FAILED = "failed", "ناموفق"

    # Nullable — a transaction exists before a Booking does; only
    # gets linked once payment actually succeeds and the Booking is
    # created. SET_NULL so deleting a Booking (shouldn't happen, but
    # just in case) never deletes the financial record of what was
    # paid.
    booking = models.ForeignKey(
        Booking,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions",
    )
    client = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="payment_transactions"
    )
    slot = models.ForeignKey(
        AvailabilitySlot,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payment_transactions",
    )
    amount = models.PositiveIntegerField()

    # Zarinpal's two-stage reference: "authority" is issued when
    # payment is requested (before the user pays), "reference_id" is
    # only issued after a successful verify call. Both blank for the
    # current mock gateway, which has neither concept.
    authority = models.CharField(max_length=100, blank=True)
    reference_id = models.CharField(max_length=100, blank=True)

    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING
    )
    # Raw gateway response, for debugging a specific failed payment
    # without needing to reproduce it — optional, populate once
    # Zarinpal's actual response shape is known.
    gateway_response = models.JSONField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.client} — {self.amount} ({self.get_status_display()})"


REFUND_CUTOFF_DAYS = (
    3  # cancel ≥3 days before session start = refund; inside that window = no refund
)
BOOKING_PAYMENT_TIMEOUT_MINUTES = 15


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
    is_approved = models.BooleanField("تایید شده برای نمایش عمومی", default=False)
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
        CLOSED = "closed", "بسته شده"

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="support_tickets"
    )
    subject = models.CharField(max_length=200)
    message = models.TextField()
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"#{self.id} — {self.subject} ({self.user})"


class TicketReply(models.Model):
    """A message in the back-and-forth on a ticket — either from the
    ticket's own owner, or from staff responding to it."""

    ticket = models.ForeignKey(
        SupportTicket, on_delete=models.CASCADE, related_name="replies"
    )
    sender = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="ticket_replies"
    )
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Reply on #{self.ticket_id} by {self.sender}"


# ===========================
# RECURRING SCHEDULE
# ===========================
class CounselorSchedule(models.Model):
    """One recurring config per counselor. session_duration/gap live
    here (schedule-wide), not per-day — spec didn't ask for per-day
    duration variance, only per-day hours."""

    counselor = models.OneToOneField(
        Counselor, on_delete=models.CASCADE, related_name="schedule"
    )
    session_duration_minutes = models.PositiveIntegerField(default=45)
    gap_minutes = models.PositiveIntegerField(default=15)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Schedule for {self.counselor}"


class ScheduleWorkingDay(models.Model):
    class Weekday(models.IntegerChoices):
        SATURDAY = 0, "شنبه"
        SUNDAY = 1, "یکشنبه"
        MONDAY = 2, "دوشنبه"
        TUESDAY = 3, "سه‌شنبه"
        WEDNESDAY = 4, "چهارشنبه"
        THURSDAY = 5, "پنجشنبه"
        FRIDAY = 6, "جمعه"

    schedule = models.ForeignKey(
        CounselorSchedule, on_delete=models.CASCADE, related_name="working_days"
    )
    weekday = models.PositiveSmallIntegerField(choices=Weekday.choices)
    is_enabled = models.BooleanField(default=False)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["schedule", "weekday"], name="unique_schedule_weekday"
            )
        ]
        ordering = ["weekday"]

    def clean(self):
        if self.is_enabled:
            if not self.start_time or not self.end_time:
                raise ValidationError("روزهای فعال باید ساعت کاری داشته باشند")
            if self.start_time >= self.end_time:
                raise ValidationError("زمان پایان باید بعد از زمان شروع باشد")


class ScheduleBreak(models.Model):
    working_day = models.ForeignKey(
        ScheduleWorkingDay, on_delete=models.CASCADE, related_name="breaks"
    )
    start_time = models.TimeField()
    end_time = models.TimeField()

    def clean(self):
        if self.start_time >= self.end_time:
            raise ValidationError("زمان پایان استراحت باید بعد از زمان شروع باشد")
        wd = self.working_day
        if wd.start_time and wd.end_time:
            if self.start_time < wd.start_time or self.end_time > wd.end_time:
                raise ValidationError("زمان استراحت باید داخل بازه کاری باشد")


class ScheduleException(models.Model):
    """Stub for future exceptions (vacation, holiday, one-off hours).
    Not read by generation logic yet — table exists so adding that
    logic later doesn't require a schema change."""

    class Type(models.TextChoices):
        VACATION = "vacation", "مرخصی"
        HOLIDAY = "holiday", "تعطیل"
        BLOCKED = "blocked", "مسدود"
        CUSTOM_HOURS = "custom_hours", "ساعت خاص"

    counselor = models.ForeignKey(
        Counselor, on_delete=models.CASCADE, related_name="schedule_exceptions"
    )
    date = models.DateField()
    type = models.CharField(max_length=20, choices=Type.choices)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    note = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["date"]


class Holiday(models.Model):
    """Official (non-counselor-specific) holidays — Nowruz, religious
    observances, etc. Seeded via admin or a management command from an
    external source once per year, not fetched live at generation
    time. Shared across every counselor's schedule."""

    date = models.DateField(unique=True)
    name = models.CharField(max_length=200)

    class Meta:
        ordering = ["date"]

    def __str__(self):
        return f"{self.date} — {self.name}"


def hero_slide_upload_path(instance, filename):
    ext = os.path.splitext(filename)[1]
    unique = uuid.uuid4().hex[:8]
    return f"hero_slides/{unique}{ext}"


class HeroSlide(models.Model):
    """One slide in the homepage hero slider — managed entirely from
    admin so non-technical changes (swap a photo, reorder, retire a
    slide) don't need a code deploy."""

    image = models.ImageField(upload_to=hero_slide_upload_path)
    title = models.CharField(max_length=200, blank=True)
    subtitle = models.CharField(max_length=300, blank=True)
    link_url = models.CharField(max_length=300, blank=True)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "created_at"]

    def __str__(self):
        return self.title or f"Slide {self.pk}"

    def save(self, *args, **kwargs):
        if self.pk:
            old = HeroSlide.objects.filter(pk=self.pk).only("image").first()
            if old and old.image and old.image.name != self.image.name:
                old.image.delete(save=False)
        super().save(*args, **kwargs)


@receiver(post_delete, sender=HeroSlide)
def delete_hero_slide_image(sender, instance, **kwargs):
    if instance.image:
        instance.image.delete(save=False)


class Coupon(models.Model):
    """Reusable discount code — percentage off, entered by the user
    at checkout. Not tied to a specific plan; usable against any
    active plan unless you want per-plan restriction later."""

    code = models.CharField(max_length=50, unique=True)
    percent_off = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(100)]
    )
    is_active = models.BooleanField(default=True)
    # Optional cap — null means unlimited. Each use increments
    # times_used; enforced at purchase time.
    max_uses = models.PositiveIntegerField(null=True, blank=True)
    times_used = models.PositiveIntegerField(default=0)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_valid(self):
        if not self.is_active:
            return False
        if self.expires_at and timezone.now() > self.expires_at:
            return False
        if self.max_uses is not None and self.times_used >= self.max_uses:
            return False
        return True

    def __str__(self):
        return f"{self.code} (%{self.percent_off})"


class PlanSale(models.Model):
    """An automatic, time-bound discount on one specific Plan — no
    code needed, shown directly on the plan card while active.
    Supports either a flat amount off or a percentage off; the
    frontend always DISPLAYS a percentage badge regardless of which
    kind this is, computed from percent_off_display()."""

    class DiscountType(models.TextChoices):
        PERCENT = "percent", "درصدی"
        FLAT = "flat", "مبلغ ثابت"

    plan = models.ForeignKey(Plan, on_delete=models.CASCADE, related_name="sales")
    discount_type = models.CharField(max_length=10, choices=DiscountType.choices)
    percent_off = models.PositiveIntegerField(
        null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(100)]
    )
    amount_off = models.PositiveIntegerField(null=True, blank=True, help_text="تومان")
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-starts_at"]

    def clean(self):
        if self.discount_type == self.DiscountType.PERCENT and not self.percent_off:
            raise ValidationError("برای تخفیف درصدی، درصد را وارد کنید")
        if self.discount_type == self.DiscountType.FLAT and not self.amount_off:
            raise ValidationError("برای تخفیف مبلغ ثابت، مبلغ را وارد کنید")
        if self.starts_at >= self.ends_at:
            raise ValidationError("زمان پایان باید بعد از زمان شروع باشد")

    def is_currently_active(self):
        now = timezone.now()
        return self.is_active and self.starts_at <= now <= self.ends_at

    def discounted_price(self, original_price):
        if self.discount_type == self.DiscountType.PERCENT:
            return max(0, original_price - (original_price * self.percent_off // 100))
        return max(0, original_price - self.amount_off)

    def percent_off_display(self, original_price):
        """Always returns a percentage for the badge, even for a
        flat-amount sale — computed from the actual discount so the
        displayed number is honest, not a separate hand-entered field
        that could drift from the real math."""
        if self.discount_type == self.DiscountType.PERCENT:
            return self.percent_off
        if original_price <= 0:
            return 0
        return round((self.amount_off / original_price) * 100)

    def __str__(self):
        return f"{self.plan.title} — {self.get_discount_type_display()}"
