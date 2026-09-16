from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.forms import UserChangeForm, UserCreationForm
from .models import SupportTicket, TicketReply
from .models import Review
from django.utils.html import format_html

from .models import (
    User,
    OtpCode,
    Counselor,
    CounselorCertificate,
    CounselorGalleryImage,
    AvailabilitySlot,
    Specialty,
    PaymentTransaction,
    Booking,
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
            {"fields": ("first_name", "last_name", "phone", "national_id", "birth_date", "gender")},
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
# SPECIALTY
# The counselor category list (family, marriage, individual, etc.) —
# managed here instead of by hand-editing the DB, so new categories
# can be added/renamed through a normal admin form.
# ===========================
@admin.register(Specialty)
class SpecialtyAdmin(admin.ModelAdmin):
    list_display = ("id", "label", "slug")
    search_fields = ("label", "slug")
    prepopulated_fields = {"slug": ("label",)}


# ===========================
# COUNSELOR
# ===========================
class CounselorCertificateInline(admin.TabularInline):
    """Certificate uploads shown directly on the Counselor edit page,
    rather than needing to jump to a separate admin section."""
    model = CounselorCertificate
    extra = 1


class CounselorGalleryImageInline(admin.TabularInline):
    """Public-facing gallery photos — shown here too, mainly so an
    admin can remove an inappropriate upload without needing a
    separate moderation view. The 6-photo cap is enforced in the
    counselor-facing API view, not here — admin isn't bound by it."""
    model = CounselorGalleryImage
    extra = 0


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
        "years_of_experience",
        "session_format",
        "city",
        "is_verified",
        "session_price",
        "created_at",
    )
    list_filter = ("is_verified", "degree", "session_format", "city")
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
    inlines = [CounselorCertificateInline, CounselorGalleryImageInline, AvailabilitySlotInline]

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

STATUS_COLORS = {
    SupportTicket.Status.PENDING: "#f59e0b",
    SupportTicket.Status.IN_PROGRESS: "#3b82f6",
    SupportTicket.Status.RESOLVED: "#22c55e",
    SupportTicket.Status.CLOSED: "#9ca3af",
}

@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display = ("id", "subject", "user", "status_badge", "created_at")
    list_filter = ("status",)
    search_fields = ("subject", "message", "user__username")
    inlines = [TicketReplyInline]
    actions = ["mark_resolved"]

    def get_queryset(self, request):
        # Closed tickets are done, hide them from the default view so
        # the list isn't cluttered with resolved noise — still
        # reachable via the status filter in the sidebar.
        qs = super().get_queryset(request)
        if not request.GET.get("status__exact"):
            qs = qs.exclude(status=SupportTicket.Status.CLOSED)
        return qs

    def status_badge(self, obj):
        color = STATUS_COLORS.get(obj.status, "#000")
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display(),
        )
    status_badge.short_description = "وضعیت"

    def save_formset(self, request, form, formset, change):
        instances = formset.save(commit=False)
        for instance in instances:
            if isinstance(instance, TicketReply) and not instance.pk:
                instance.sender = request.user
        for instance in instances:
            instance.save()
        formset.save_m2m()

        # Same "staff reply moves ticket to in_progress" rule as
        # TicketReplyCreateView, applied here too so admin-side
        # replies get the same status behavior as API-side ones.
        ticket = form.instance
        if ticket.status == SupportTicket.Status.PENDING and instances:
            ticket.status = SupportTicket.Status.IN_PROGRESS
            ticket.save(update_fields=["status"])

    @admin.action(description="علامت‌گذاری به عنوان پاسخ داده شده")
    def mark_resolved(self, request, queryset):
        updated = queryset.update(status=SupportTicket.Status.RESOLVED)
        self.message_user(request, f"{updated} تیکت به‌روزرسانی شد")

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

@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = (
        "id", "client_name", "amount", "status",
        "authority", "reference_id", "booking", "created_at",
    )
    list_filter = ("status", "created_at")
    search_fields = (
        "client__username", "client__first_name", "client__last_name",
        "authority", "reference_id",
    )
    date_hierarchy = "created_at"
    ordering = ("-created_at",)
    readonly_fields = [f.name for f in PaymentTransaction._meta.fields]

    def has_add_permission(self, request):
        return False  # only created by the real payment flow

    def has_delete_permission(self, request, obj=None):
        return False  # financial record, keep even failed attempts

    def client_name(self, obj):
        return obj.client.get_full_name() or obj.client.username
    client_name.short_description = "کاربر"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("client", "booking")
    
@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    """Read-only financial ledger — money records shouldn't be
    hand-edited outside the real booking/cancellation flow, since a
    raw field edit here would desync status from the slot's is_booked
    state and skip refund-window logic, SMS notices, etc."""

    list_display = (
        "id",
        "client_name",
        "counselor_name",
        "session_datetime",
        "price_at_booking",
        "status",
        "payment_reference",
        "created_at",
    )
    list_filter = ("status", "slot__counselor", "created_at")
    search_fields = (
        "client__username",
        "client__first_name",
        "client__last_name",
        "slot__counselor__user__username",
        "payment_reference",
    )
    date_hierarchy = "created_at"
    ordering = ("-created_at",)

    readonly_fields = (
        "slot",
        "client",
        "payment_reference",
        "price_at_booking",
        "status",
        "cancelled_at",
        "cancelled_by",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            "client", "slot__counselor__user"
        )

    def client_name(self, obj):
        return obj.client.get_full_name() or obj.client.username
    client_name.short_description = "کاربر"

    def counselor_name(self, obj):
        counselor = obj.slot.counselor
        return counselor.user.get_full_name() or counselor.user.username
    counselor_name.short_description = "مشاور"

    def session_datetime(self, obj):
        return f"{obj.slot.date} {obj.slot.start_time.strftime('%H:%M')}"
    session_datetime.short_description = "زمان جلسه"
    

