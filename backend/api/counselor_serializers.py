"""
counselor_serializers.py — lives in your api app.
Kept separate from serializers.py since it's a genuinely different
concern (counselor-facing features), not because of any technical
requirement — merge into serializers.py if you'd rather keep one file.
"""

from datetime import datetime

from django.utils import timezone
from rest_framework import serializers

from .models import (
    AvailabilitySlot,
    Booking,
    Counselor,
    CounselorCertificate,
    CounselorGalleryImage,
    CounselorNote,
    Review,
    Specialty,
    ScheduleBreak,
    ScheduleWorkingDay,
    CounselorSchedule,
    Plan,
)


class SpecialtySerializer(serializers.ModelSerializer):
    class Meta:
        model = Specialty
        fields = ["id", "slug", "label"]


class CounselorSelfSerializer(serializers.ModelSerializer):
    specialties = serializers.PrimaryKeyRelatedField(
        queryset=Specialty.objects.all(), many=True, required=False
    )
    has_auto_generator_access = serializers.SerializerMethodField()
    has_voice_notes_access = serializers.SerializerMethodField()

    class Meta:
        model = Counselor
        fields = [
            "license_number",
            "nezam_number",
            "degree",
            "bio",
            "specialties",
            "session_price",
            "session_format",
            "years_of_experience",
            "city",
            "address",
            "slug",
            "is_verified",
            "has_auto_generator_access",
            "has_voice_notes_access",
        ]
        read_only_fields = [
            "is_verified",
            "has_auto_generator_access",
            "has_voice_notes_access",
        ]
        
    def get_has_voice_notes_access(self, obj):
        sub = obj.get_active_subscription()
        return bool(sub and sub.plan.tier != Plan.Tier.BRONZE)
    
    def get_has_auto_generator_access(self, obj):
        sub = obj.get_active_subscription()
        return bool(
            sub
            and sub.plan.tier in {Plan.Tier.SILVER, Plan.Tier.GOLD, Plan.Tier.COMPANY}
        )


class CounselorCertificateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CounselorCertificate
        fields = ["id", "image", "uploaded_at"]
        read_only_fields = ["id", "uploaded_at"]


class CounselorGalleryImageSerializer(serializers.ModelSerializer):
    """A single public-facing photo (of the counselor or their
    office). Unlike certificates, these are shown directly on the
    profile page — no admin review step."""

    class Meta:
        model = CounselorGalleryImage
        fields = ["id", "image", "uploaded_at"]
        read_only_fields = ["id", "uploaded_at"]


class AvailabilitySlotSerializer(serializers.ModelSerializer):
    # Only ever populated on the counselor's OWN calendar view
    # (AvailabilitySlotListCreateView) — the public booking-page view
    # (CounselorPublicSlotsView) only ever queries is_booked=False
    # slots, so a booked slot's client info never actually reaches an
    # anonymous visitor even though it uses the same serializer.
    booked_by = serializers.SerializerMethodField()

    class Meta:
        model = AvailabilitySlot
        fields = ["id", "date", "start_time", "end_time", "is_booked", "booked_by"]
        read_only_fields = ["is_booked"]

    def get_booked_by(self, obj):
        booking = (
            obj.bookings.filter(status=Booking.Status.PAID)
            .order_by("-created_at")
            .first()
        )
        if not booking:
            return None

        request = self.context.get("request")
        avatar_url = booking.client.avatar.url if booking.client.avatar else None
        if avatar_url and request:
            avatar_url = request.build_absolute_uri(avatar_url)

        return {
            "id": booking.id,
            "name": booking.client.get_full_name() or booking.client.username,
            "avatar": avatar_url,
            "phone": booking.client.phone,
        }

    def validate(self, data):
        if data["start_time"] >= data["end_time"]:
            raise serializers.ValidationError("زمان پایان باید بعد از زمان شروع باشد")
        return data


class BookingClientSerializer(serializers.ModelSerializer):
    """A booking as seen by the counselor — includes just enough of
    the client's info to identify them and reach out, not their full
    profile (national_id, etc. stay out of this)."""

    client_id = serializers.IntegerField(source="client.id", read_only=True)
    client_name = serializers.SerializerMethodField()
    client_avatar = serializers.ImageField(source="client.avatar", read_only=True)
    client_phone = serializers.CharField(source="client.phone", read_only=True)
    date = serializers.DateField(source="slot.date", read_only=True)
    start_time = serializers.TimeField(source="slot.start_time", read_only=True)
    end_time = serializers.TimeField(source="slot.end_time", read_only=True)

    class Meta:
        model = Booking
        fields = [
            "id",
            "client_id",
            "client_name",
            "client_avatar",
            "client_phone",
            "date",
            "start_time",
            "end_time",
            "created_at",
            "status",
        ]

    def get_client_name(self, obj):
        return obj.client.get_full_name() or obj.client.username


class CounselorNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = CounselorNote
        fields = ["id", "client", "text", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class CounselorReviewSerializer(serializers.ModelSerializer):
    """A review as shown publicly on a counselor's profile page — only
    the reviewer's first name, not full identity (last name, contact
    info), out of basic privacy courtesy toward the reviewing client."""

    reviewer_name = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = ["id", "rating", "comment", "created_at", "reviewer_name"]

    def get_reviewer_name(self, obj):
        return obj.booking.client.first_name or "کاربر"


class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ["id", "booking", "rating", "comment", "is_approved", "created_at"]
        read_only_fields = ["id", "is_approved", "created_at"]

    def validate_booking(self, booking):
        request = self.context["request"]

        if booking.client_id != request.user.id:
            # Deliberately vague — don't confirm/deny whether the
            # booking ID exists at all if it isn't this user's.
            raise serializers.ValidationError("این نوبت متعلق به شما نیست")

        if hasattr(booking, "review"):
            raise serializers.ValidationError("شما قبلا برای این جلسه نظر ثبت کرده‌اید")

        slot = booking.slot
        session_end = timezone.make_aware(datetime.combine(slot.date, slot.end_time))
        if timezone.now() < session_end:
            raise serializers.ValidationError(
                "امکان ثبت نظر تنها پس از پایان جلسه وجود دارد"
            )

        return booking


class PublicCounselorSerializer(serializers.ModelSerializer):
    """What an anonymous visitor sees on the counselor slider/listing
    — name, photo, bio, and the two real computed numbers (average
    rating, total completed bookings). No contact info, no internal
    fields (license number, verification status, etc.). Includes
    city (for directory filtering) and session_format (so a listing
    can show an online/in-person badge) but NOT the full address —
    that's reserved for the single-counselor detail page, see
    CounselorDetailSerializer below.

    `id` is deliberately left as the default (Counselor's own primary
    key), NOT the related User's id — every detail-side view
    (CounselorDetailView, CounselorReviewListView,
    ReviewableBookingView) looks up by Counselor.pk via the URL's
    <int:pk>, so this listing's id has to match that, not User.pk."""

    name = serializers.SerializerMethodField()
    avatar = serializers.ImageField(source="user.avatar", read_only=True)
    rating = serializers.SerializerMethodField()
    bookings = serializers.IntegerField(source="booking_count", read_only=True)
    specialties = SpecialtySerializer(many=True, read_only=True)

    class Meta:
        model = Counselor
        fields = [
            "id",
            "name",
            "avatar",
            "bio",
            "rating",
            "bookings",
            "session_price",
            "session_format",
            "years_of_experience",
            "city",
            "specialties",
            "slug",
        ]

    def get_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def get_rating(self, obj):
        # rating_avg comes from the queryset's .annotate() in the view
        # — None until at least one review exists, rounded to 1 decimal
        # for display rather than a long float.
        avg = getattr(obj, "rating_avg", None)
        return round(avg, 1) if avg is not None else None


class CounselorDetailSerializer(PublicCounselorSerializer):
    """The single-counselor profile page — everything the listing
    shows, plus the full address and gallery photos. Only used by
    CounselorDetailView, never by the listing/slider views, so neither
    leaks into a bulk response."""

    gallery_images = CounselorGalleryImageSerializer(many=True, read_only=True)

    class Meta(PublicCounselorSerializer.Meta):
        fields = PublicCounselorSerializer.Meta.fields + ["address", "gallery_images"]


class ScheduleBreakSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduleBreak
        fields = ["id", "start_time", "end_time"]

    def validate(self, data):
        if data["start_time"] >= data["end_time"]:
            raise serializers.ValidationError(
                "زمان پایان استراحت باید بعد از زمان شروع باشد"
            )
        return data


class ScheduleWorkingDaySerializer(serializers.ModelSerializer):
    breaks = ScheduleBreakSerializer(many=True, required=False)

    class Meta:
        model = ScheduleWorkingDay
        fields = ["id", "weekday", "is_enabled", "start_time", "end_time", "breaks"]

    def validate(self, data):
        if data.get("is_enabled"):
            start, end = data.get("start_time"), data.get("end_time")
            if not start or not end:
                raise serializers.ValidationError(
                    "روزهای فعال باید ساعت کاری داشته باشند"
                )
            if start >= end:
                raise serializers.ValidationError(
                    "زمان پایان باید بعد از زمان شروع باشد"
                )
        return data


class CounselorScheduleSerializer(serializers.ModelSerializer):
    working_days = ScheduleWorkingDaySerializer(many=True)

    class Meta:
        model = CounselorSchedule
        fields = ["id", "session_duration_minutes", "gap_minutes", "working_days"]

    def validate_session_duration_minutes(self, value):
        if value <= 0:
            raise serializers.ValidationError("مدت جلسه باید بیشتر از صفر باشد")
        return value

    def validate_gap_minutes(self, value):
        if value < 0:
            raise serializers.ValidationError("فاصله بین جلسات نمی‌تواند منفی باشد")
        return value

    def update(self, instance, validated_data):
        working_days_data = validated_data.pop("working_days", [])
        instance.session_duration_minutes = validated_data.get(
            "session_duration_minutes", instance.session_duration_minutes
        )
        instance.gap_minutes = validated_data.get("gap_minutes", instance.gap_minutes)
        instance.save()

        # Full replace of working-day config each save — simplest
        # correct approach, since the whole set is always sent together
        # from the frontend form (not partial per-day PATCHes).
        instance.working_days.all().delete()
        for wd_data in working_days_data:
            breaks_data = wd_data.pop("breaks", [])
            wd = ScheduleWorkingDay.objects.create(schedule=instance, **wd_data)
            for b in breaks_data:
                ScheduleBreak.objects.create(working_day=wd, **b)

        return instance


class SchedulePreviewRequestSerializer(serializers.Serializer):
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    work_on_holidays = serializers.BooleanField(default=False)

    def validate(self, data):
        if data["start_date"] > data["end_date"]:
            raise serializers.ValidationError(
                "تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد"
            )
        return data
