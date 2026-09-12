from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.forms import UserChangeForm, UserCreationForm
from .models import SupportTicket, TicketReply
from .models import Review

from .models import (
    User,
    OtpCode,
    Counselor,
    CounselorCertificate,
    AvailabilitySlot,
)


# ===========================
# CUSTOM FORMS
# UserAdmin's default form/add_form point at Django's built-in
# auth.User model, not this project's custom User. Since AUTH_USER_MODEL
# is swapped, those default forms are broken — they must be overridden
# to point at the real model, or admin will error out on add/edit.
# ===========================
class CustomUserChangeForm(UserChangeForm):
    class Meta(UserChangeForm.Meta):
        model = User


class CustomUserCreationForm(UserCreationForm):
    class Meta(UserCreationForm.Meta):
        model = User
        fields = ("username", "first_name", "last_name", "phone")


# ===========================
# USER
# ===========================
@admin.register(User)
class CustomUserAdmin(UserAdmin):
    form = CustomUserChangeForm
    add_form = CustomUserCreationForm

    ordering = ("username",)

    list_display = (
        "username",
        "first_name",
        "last_name",
        "role",
        "is_phone_verified",
        "is_active",
        "date_joined",
    )

    list_filter = ("role", "is_active", "is_staff", "is_phone_verified",)

    search_fields = (
        "username",
        "first_name",
        "last_name",
        "phone",
        "national_id",
    )

    fieldsets = (
        (None, {"fields": ("username", "password")}),
        (
            "اطلاعات شخصی",
            {"fields": ("first_name", "last_name", "phone", "national_id",)},
        ),
        (
            "وضعیت تایید",
            {"fields": ("is_phone_verified",)},
        ),
        (
            "دسترسی‌ها",
            {
                "fields": (
                    "is_active",
                    "role",
                    "ban_reason",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("تاریخ‌های مهم", {"fields": ("last_login", "date_joined")}),
    )

    # username is required (USERNAME_FIELD) — must be present here or
    # the "add user" form breaks.
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "username",
                    "first_name",
                    "last_name",
                    "phone",
                    "password1",
                    "password2",
                    "is_active",
                ),
            },
        ),
    )


# ===========================
# OTP CODE
# Registered for local-dev visibility and spotting abuse patterns once
# live. All fields read-only — rows should only ever be created/mutated
# by OtpCode.generate()/verify(), never hand-edited.
# ===========================
@admin.register(OtpCode)
class OtpCodeAdmin(admin.ModelAdmin):
    list_display = (
        "destination",
        "channel",
        "purpose",
        "code",
        "attempts",
        "is_used",
        "created_at",
        "expires_at",
    )
    list_filter = ("channel", "purpose", "is_used")
    search_fields = ("destination",)
    readonly_fields = (
        "user",
        "channel",
        "purpose",
        "destination",
        "code",
        "attempts",
        "is_used",
        "created_at",
        "expires_at",
    )
    ordering = ("-created_at",)

    def has_add_permission(self, request):
        return False


# ===========================
# COUNSELOR
# ===========================
class CounselorCertificateInline(admin.TabularInline):
    """Certificate uploads shown directly on the Counselor edit page,
    rather than needing to jump to a separate admin section."""
    model = CounselorCertificate
    extra = 1


class AvailabilitySlotInline(admin.TabularInline):
    model = AvailabilitySlot
    extra = 0
    fields = ("date", "start_time", "end_time", "is_booked")
    # is_booked should only ever change via the real booking flow —
    # not hand-edited in admin, which could create a mismatch between
    # this flag and an actual booking record.
    readonly_fields = ("is_booked",)


@admin.register(Counselor)
class CounselorAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "license_number",
        "degree",
        "is_verified",
        "session_price",
        "created_at",
    )
    list_filter = ("is_verified", "degree")
    search_fields = (
        "user__username",
        "user__first_name",
        "user__last_name",
        "license_number",
        "nezam_number",
    )
    # Avoids rendering a dropdown of every single user in the system —
    # requires User.search_fields above to be set for this to work.
    autocomplete_fields = ("user",)
    inlines = [CounselorCertificateInline, AvailabilitySlotInline]

    actions = ["mark_verified"]

    @admin.action(description="تایید مشاوران انتخاب‌شده")
    def mark_verified(self, request, queryset):
        updated = queryset.update(is_verified=True)
        self.message_user(request, f"{updated} مشاور تایید شد")


# ===========================
# AVAILABILITY SLOT
# Registered separately too, for browsing/searching slots across all
# counselors at once — the inline above only shows one counselor's
# slots at a time from inside their own Counselor page.
# ===========================
@admin.register(AvailabilitySlot)
class AvailabilitySlotAdmin(admin.ModelAdmin):
    list_display = ("counselor", "date", "start_time", "end_time", "is_booked")
    list_filter = ("is_booked", "date")
    search_fields = ("counselor__user__username",)
    date_hierarchy = "date"

class TicketReplyInline(admin.TabularInline):
    model = TicketReply
    extra = 1
    # sender is NOT shown as an editable field at all — it's set
    # automatically in SupportTicketAdmin.save_formset below, to
    # whoever is logged into admin and submitting the reply. Marking
    # it readonly instead (the earlier version) broke adding NEW
    # replies: readonly displays an existing value but can't set one
    # for a row that doesn't exist yet, so it was submitting as NULL
    # and hitting the not-null constraint.
    exclude = ("sender",)
    readonly_fields = ("created_at",)


@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display = ("id", "subject", "user", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("subject", "message", "user__username")
    inlines = [TicketReplyInline]

    def save_formset(self, request, form, formset, change):
        instances = formset.save(commit=False)
        for instance in instances:
            if isinstance(instance, TicketReply) and not instance.pk:
                instance.sender = request.user
            instance.save()
        formset.save_m2m()

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("id", "booking", "rating", "is_approved", "created_at")
    list_filter = ("is_approved", "rating")
    search_fields = ("booking__client__username", "booking__slot__counselor__user__username")
    actions = ["approve_reviews", "reject_reviews"]

    @admin.action(description="تایید نظرات انتخاب‌شده")
    def approve_reviews(self, request, queryset):
        updated = queryset.update(is_approved=True)
        self.message_user(request, f"{updated} نظر تایید شد")

    @admin.action(description="رد نظرات انتخاب‌شده")
    def reject_reviews(self, request, queryset):
        updated = queryset.update(is_approved=False)
        self.message_user(request, f"{updated} نظر رد/پنهان شد")
