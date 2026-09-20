import uuid
from datetime import datetime, timedelta
from django.db.models import Sum
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Avg, Count, F, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import redirect
from django.urls import reverse
from .zarinpal import request_payment, verify_payment
from .token_serializers import CustomTokenObtainPairSerializer
from django.conf import settings
from .permissions import HasAutoGeneratorAccess

from .models import (
    OtpCode,
    AvailabilitySlot,
    Booking,
    Counselor,
    CounselorCertificate,
    CounselorGalleryImage,
    CounselorNote,
    Review,
    Specialty,
    HeroSlide,
    UserSubscription,
    Plan,
    CounselorSchedule,
    ScheduleWorkingDay,
    ScheduleBreak,
    REFUND_CUTOFF_DAYS,
    BOOKING_PAYMENT_TIMEOUT_MINUTES,
    PaymentTransaction,
    Coupon,
    BillingPeriod,
    BILLING_PERIOD_DAYS,
    compute_subscription_dates,
)
from .sms import (
    send_otp_sms,
    send_booking_reminder_sms,
    send_counselor_booking_notice_sms,
)
from .serializers import (
    UserSerializer,
    UserProfileSerializer,
    serializers,
    HeroSlideSerializer,
    PlanSerializer,
    UserSubscriptionSerializer,
)
from .counselor_serializers import (
    AvailabilitySlotSerializer,
    BookingClientSerializer,
    CounselorNoteSerializer,
    CounselorSelfSerializer,
    CounselorCertificateSerializer,
    CounselorDetailSerializer,
    CounselorGalleryImageSerializer,
    ReviewSerializer,
    CounselorReviewSerializer,
    PublicCounselorSerializer,
    SpecialtySerializer,
)
from .counselor_serializers import (
    CounselorScheduleSerializer,
    SchedulePreviewRequestSerializer,
)
from .schedule_generation import generate_slots, get_holidays_in_range

User = get_user_model()


class CustomTokenObtainPairView(TokenObtainPairView):
    """Login. Deliberately does NOT check role here — a banned user
    can still log in and get a token, since that's the only way for
    them to ever learn *why* they're banned (the token itself carries
    role + ban_reason as custom claims). Every OTHER endpoint rejects
    a banned user's token — see authentication.py."""

    serializer_class = CustomTokenObtainPairSerializer


class UserProfileView(generics.RetrieveUpdateAPIView):
    """GET returns the logged-in user's own data. PATCH/PUT updates it.
    No pk/id in the URL — `get_object` always returns request.user, so
    there's no way for one user to fetch or edit another's profile by
    guessing an ID."""

    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class CreateUserView(generics.CreateAPIView):
    """Registration. Does NOT touch is_phone_verified
    — those stay False until the user actually verifies from their
    profile. Verification is never assumed just because someone typed
    a phone/email at signup."""

    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": serializer.data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


# ===========================
# PHONE VERIFICATION (profile-only — no login-OTP path exists)
# Covers both cases: verifying the phone number already on file, and
# switching to + verifying a brand new one. Same two endpoints handle
# both, since ChangePhoneRequestOtpView no longer rejects requesting a
# code for the current number.
# ===========================
class ChangePhoneRequestOtpView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        phone = request.data.get("phone", "").strip()
        if not phone:
            return Response(
                {"phone": ["این فیلد الزامی است"]}, status=status.HTTP_400_BAD_REQUEST
            )

        # Make sure no OTHER account already owns this number before
        # sending a code for it — otherwise two accounts could both
        # end up claiming the same phone.
        if User.objects.filter(phone=phone).exclude(pk=request.user.pk).exists():
            return Response(
                {"phone": ["این شماره تلفن قبلا ثبت شده است"]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        otp = OtpCode.generate(
            destination=phone,
            channel=OtpCode.Channel.PHONE,
            purpose=OtpCode.Purpose.VERIFY,
            user=request.user,
        )

        if not send_otp_sms(phone, otp.code):
            return Response(
                {"detail": "ارسال پیامک ناموفق بود. دوباره تلاش کنید"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({"detail": "کد ارسال شد"}, status=status.HTTP_200_OK)


class ChangePhoneConfirmView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        phone = request.data.get("phone", "").strip()
        code = request.data.get("code", "").strip()

        otp = (
            OtpCode.objects.filter(
                destination=phone,
                channel=OtpCode.Channel.PHONE,
                purpose=OtpCode.Purpose.VERIFY,
                user=request.user,  # extra safety: only the user who
                # requested this code can consume it
                is_used=False,
            )
            .order_by("-created_at")
            .first()
        )

        if not otp or not otp.verify(code):
            return Response(
                {"detail": "کد نامعتبر یا منقضی شده است"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Re-check uniqueness at confirm time too, in case someone else
        # claimed this number in the window between request and confirm.
        if User.objects.filter(phone=phone).exclude(pk=request.user.pk).exists():
            return Response(
                {"phone": ["این شماره تلفن قبلا ثبت شده است"]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request.user.phone = phone
        request.user.is_phone_verified = True
        request.user.save(update_fields=["phone", "is_phone_verified"])

        return Response(
            {"detail": "شماره تلفن با موفقیت تایید شد"}, status=status.HTTP_200_OK
        )


class ChangePasswordView(APIView):
    """Authenticated. Requires the current password as proof of intent
    — without this check, anyone with a stolen/left-open session token
    could lock the real owner out by silently swapping the password."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        current_password = request.data.get("current_password", "")
        new_password = request.data.get("new_password", "")

        if not request.user.check_password(current_password):
            return Response(
                {"current_password": ["رمز عبور فعلی اشتباه است"]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(new_password, user=request.user)
        except DjangoValidationError as e:
            return Response(
                {"new_password": list(e.messages)}, status=status.HTTP_400_BAD_REQUEST
            )

        request.user.set_password(new_password)
        request.user.save(update_fields=["password"])

        return Response(
            {"detail": "رمز عبور با موفقیت تغییر کرد"}, status=status.HTTP_200_OK
        )


class ForgotPasswordRequestView(APIView):
    """Public — the whole point is helping someone who can't log in.
    Always returns the same generic response whether the username
    exists or not, so this endpoint can't be used to check which
    usernames are registered (a real enumeration risk otherwise)."""

    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username", "").strip()
        user = User.objects.filter(username=username).first()

        if user and user.phone and user.is_phone_verified:
            otp = OtpCode.generate(
                destination=user.phone,
                channel=OtpCode.Channel.PHONE,
                purpose=OtpCode.Purpose.PASSWORD_RESET,
                user=user,
            )
            send_otp_sms(user.phone, otp.code, purpose="password_reset")

        return Response(
            {"detail": "در صورت وجود حساب، کد بازیابی به شماره تلفن ثبت‌شده ارسال شد"},
            status=status.HTTP_200_OK,
        )


class ForgotPasswordConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username", "").strip()
        code = request.data.get("code", "").strip()
        new_password = request.data.get("new_password", "")

        user = User.objects.filter(username=username).first()
        if not user:
            # Same generic error as "wrong code" — doesn't reveal
            # whether the username exists.
            return Response(
                {"detail": "کد نامعتبر یا منقضی شده است"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        otp = (
            OtpCode.objects.filter(
                destination=user.phone,
                channel=OtpCode.Channel.PHONE,
                purpose=OtpCode.Purpose.PASSWORD_RESET,
                user=user,
                is_used=False,
            )
            .order_by("-created_at")
            .first()
        )

        if not otp or not otp.verify(code):
            return Response(
                {"detail": "کد نامعتبر یا منقضی شده است"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as e:
            return Response(
                {"new_password": list(e.messages)}, status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.save(update_fields=["password"])

        return Response(
            {"detail": "رمز عبور با موفقیت تغییر کرد"}, status=status.HTTP_200_OK
        )


class CounselorPublicSlotsView(generics.ListAPIView):
    """Public — the open (unbooked, not-yet-past) slots for one
    counselor, what a client picks from on the booking page. Doesn't
    reuse AvailabilitySlotListCreateView (that one is for the
    counselor managing their own full calendar, booked included)."""

    serializer_class = AvailabilitySlotSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        today = timezone.localdate()
        return AvailabilitySlot.objects.filter(
            counselor_id=self.kwargs["pk"],
            is_booked=False,
            date__gte=today,
        ).order_by("date", "start_time")


class BookingPurchaseInitView(APIView):
    """Authenticated. Starts a real Zarinpal payment for one slot.
    Doesn't create the Booking yet — that only happens once payment
    verifies (see BookingVerifyView). Guards against double-booking
    during the payment window by checking for another PENDING
    transaction on the same slot within the last
    BOOKING_PAYMENT_TIMEOUT_MINUTES, not by flipping is_booked early —
    flipping it early would incorrectly block the slot forever if the
    client abandons checkout without ever returning."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        slot = get_object_or_404(AvailabilitySlot, pk=pk)

        if slot.is_booked:
            return Response(
                {"detail": "این زمان قبلا رزرو شده است"},
                status=status.HTTP_409_CONFLICT,
            )

        session_start = timezone.make_aware(
            datetime.combine(slot.date, slot.start_time)
        )
        if session_start <= timezone.now():
            return Response(
                {"detail": "امکان رزرو زمان‌های گذشته وجود ندارد"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        recent_cutoff = timezone.now() - timedelta(
            minutes=BOOKING_PAYMENT_TIMEOUT_MINUTES
        )
        in_progress = PaymentTransaction.objects.filter(
            slot=slot,
            purpose=PaymentTransaction.Purpose.BOOKING,
            status=PaymentTransaction.Status.PENDING,
            created_at__gte=recent_cutoff,
        ).exists()
        if in_progress:
            return Response(
                {
                    "detail": "این زمان در حال حاضر توسط شخص دیگری در حال رزرو است. کمی بعد دوباره تلاش کنید"
                },
                status=status.HTTP_409_CONFLICT,
            )

        callback_url = request.build_absolute_uri(reverse("booking_verify"))
        result = request_payment(
            amount_rial=slot.counselor.session_price * 10,
            description=f"رزرو نوبت با {slot.counselor.user.get_full_name() or slot.counselor.user.username}",
            callback_url=callback_url,
            mobile=request.user.phone or None,
        )

        if not result["success"]:
            return Response({"detail": "خطا در اتصال به درگاه پرداخت"}, status=502)

        PaymentTransaction.objects.create(
            client=request.user,
            slot=slot,
            amount=slot.counselor.session_price,
            authority=result["authority"],
            purpose=PaymentTransaction.Purpose.BOOKING,
        )

        return Response({"pay_url": result["pay_url"]})


class BookingVerifyView(APIView):
    """Public — Zarinpal redirects here directly, no auth header.
    Verifies, THEN creates the Booking — this is the one place a
    booking actually gets created for a real (non-mock) payment.
    Re-checks is_booked inside the same lock pattern BookSlotView used
    to use, since two payments could theoretically verify for the same
    slot in a tight race even with the pending-transaction guard above."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        authority = request.query_params.get("Authority")
        ok = request.query_params.get("Status") == "OK"

        payment_transaction = get_object_or_404(
            PaymentTransaction,
            authority=authority,
            purpose=PaymentTransaction.Purpose.BOOKING,
        )

        if payment_transaction.status != PaymentTransaction.Status.PENDING:
            # Zarinpal can hit the callback more than once — don't
            # double-create a Booking on a repeat call.
            return redirect(
                f"{settings.FRONTEND_URL}/profile?payment=already_processed"
            )

        result = (
            verify_payment(
                amount_rial=payment_transaction.amount * 10, authority=authority
            )
            if ok
            else {"success": False}
        )

        if not result["success"]:
            payment_transaction.status = PaymentTransaction.Status.FAILED
            payment_transaction.save(update_fields=["status"])
            return redirect(
                f"{settings.FRONTEND_URL}/CounselorProfile/{payment_transaction.slot.counselor.slug}?payment=failed"
            )

        with transaction.atomic():
            slot = AvailabilitySlot.objects.select_for_update().get(
                pk=payment_transaction.slot_id
            )

            if slot.is_booked:
                # Extremely unlikely given the guards above, but if it
                # happens, the payment succeeded and money moved — do
                # NOT silently drop it. Mark failed-but-paid so an
                # admin can see and manually refund via Zarinpal.
                payment_transaction.status = PaymentTransaction.Status.FAILED
                payment_transaction.gateway_response = {
                    "note": "slot became booked during verify race"
                }
                payment_transaction.save(update_fields=["status", "gateway_response"])
                return redirect(f"{settings.FRONTEND_URL}/profile?payment=conflict")

            booking = Booking.objects.create(
                slot=slot,
                client=payment_transaction.client,
                payment_reference=result["ref_id"],
                price_at_booking=payment_transaction.amount,
            )

        payment_transaction.status = PaymentTransaction.Status.SUCCESS
        payment_transaction.reference_id = result["ref_id"]
        payment_transaction.booking = booking
        payment_transaction.save(update_fields=["status", "reference_id", "booking"])

        session_datetime = (
            f"{slot.date.strftime('%Y/%m/%d')} {slot.start_time.strftime('%H:%M')}"
        )
        client = payment_transaction.client
        if client.phone and client.is_phone_verified:
            send_booking_reminder_sms(
                client.phone,
                session_datetime,
                slot.counselor.user.get_full_name() or slot.counselor.user.username,
            )
        counselor_user = slot.counselor.user
        if counselor_user.phone and counselor_user.is_phone_verified:
            send_counselor_booking_notice_sms(
                counselor_user.phone,
                client.get_full_name() or client.username,
                session_datetime,
            )

        return redirect(f"{settings.FRONTEND_URL}/profile?payment=success")


class IsCounselor(permissions.BasePermission):
    """Only lets through users who actually have a Counselor profile —
    a regular client user, even if authenticated, gets a 403 on every
    view in this file."""

    def has_permission(self, request, view):
        return hasattr(request.user, "counselor_profile")


class CounselorSelfView(generics.RetrieveUpdateAPIView):
    """The counselor's own professional info — 'ویرایش اطلاعات مشاور'.
    Same principle as UserProfileView: no pk in the URL, always
    resolves to the logged-in counselor's own row."""

    serializer_class = CounselorSelfSerializer
    permission_classes = [permissions.IsAuthenticated, IsCounselor]

    def get_object(self):
        return self.request.user.counselor_profile


class CounselorCertificateListCreateView(generics.ListCreateAPIView):
    """Upload/list license or degree document photos. is_verified
    stays False regardless of what's uploaded here — an admin still
    has to actually review the documents and flip it manually."""

    serializer_class = CounselorCertificateSerializer
    permission_classes = [permissions.IsAuthenticated, IsCounselor]

    def get_queryset(self):
        return CounselorCertificate.objects.filter(
            counselor=self.request.user.counselor_profile
        )

    def perform_create(self, serializer):
        serializer.save(counselor=self.request.user.counselor_profile)


COUNSELOR_GALLERY_MAX_IMAGES = 6


class CounselorGalleryListCreateView(generics.ListCreateAPIView):
    """Public-facing photos of the counselor or their office — shown
    directly on the profile page, unlike certificates. Capped at
    COUNSELOR_GALLERY_MAX_IMAGES; enforced here rather than the model,
    since the count check needs the request's counselor context."""

    serializer_class = CounselorGalleryImageSerializer
    permission_classes = [permissions.IsAuthenticated, IsCounselor]

    def get_queryset(self):
        return CounselorGalleryImage.objects.filter(
            counselor=self.request.user.counselor_profile
        )

    def perform_create(self, serializer):
        counselor = self.request.user.counselor_profile
        if counselor.gallery_images.count() >= COUNSELOR_GALLERY_MAX_IMAGES:
            raise serializers.ValidationError(
                {
                    "detail": f"حداکثر {COUNSELOR_GALLERY_MAX_IMAGES} عکس می‌توانید اضافه کنید"
                }
            )
        serializer.save(counselor=counselor)


class CounselorGalleryDeleteView(generics.DestroyAPIView):
    """Lets a counselor remove one of their own gallery photos —
    scoped to their own counselor_profile. File cleanup on delete is
    handled by the post_delete signal in models.py, which covers this
    view plus any other delete path (admin, cascade from Counselor
    deletion)."""

    serializer_class = CounselorGalleryImageSerializer
    permission_classes = [permissions.IsAuthenticated, IsCounselor]

    def get_queryset(self):
        return CounselorGalleryImage.objects.filter(
            counselor=self.request.user.counselor_profile
        )

    def perform_destroy(self, instance):
        # Delete the actual file from media/ too — the default
        # instance.delete() only removes the DB row and would
        # otherwise leave the image orphaned on disk forever.
        instance.image.delete(save=False)
        instance.delete()


class AvailabilitySlotListCreateView(generics.ListCreateAPIView):
    """GET: the logged-in counselor's own slots (their calendar).
    POST: create a new available slot for themselves.
    Scoped entirely to request.user.counselor_profile — there's no way
    to list or create slots for a different counselor."""

    serializer_class = AvailabilitySlotSerializer
    permission_classes = [permissions.IsAuthenticated, IsCounselor]

    def get_queryset(self):
        return AvailabilitySlot.objects.filter(
            counselor=self.request.user.counselor_profile
        ).prefetch_related("bookings__client")

    def perform_create(self, serializer):
        serializer.save(counselor=self.request.user.counselor_profile)


class AvailabilitySlotDeleteView(generics.DestroyAPIView):
    """Lets a counselor remove a slot they created — but only if
    nobody has booked it yet."""

    serializer_class = AvailabilitySlotSerializer
    permission_classes = [permissions.IsAuthenticated, IsCounselor]

    def get_queryset(self):
        return AvailabilitySlot.objects.filter(
            counselor=self.request.user.counselor_profile
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_booked:
            return Response(
                {"detail": "این زمان رزرو شده و قابل حذف نیست"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)


class CounselorBookingsView(generics.ListAPIView):
    """The counselor's "record of users" — every client who has ever
    booked a session with them, most recent first."""

    serializer_class = BookingClientSerializer
    permission_classes = [permissions.IsAuthenticated, IsCounselor]

    def get_queryset(self):
        return Booking.objects.filter(
            slot__counselor=self.request.user.counselor_profile
        ).select_related("client", "slot")


class CounselorNoteListCreateView(generics.ListCreateAPIView):
    """Notes a counselor has written about ONE specific client —
    ?client=<id> query param selects which client's notes to view.
    A counselor can only ever see/create notes tied to their own
    counselor_profile; there's no cross-counselor visibility."""

    serializer_class = CounselorNoteSerializer
    permission_classes = [permissions.IsAuthenticated, IsCounselor]

    def get_queryset(self):
        queryset = CounselorNote.objects.filter(
            counselor=self.request.user.counselor_profile
        )
        client_id = self.request.query_params.get("client")
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        return queryset

    def perform_create(self, serializer):
        # Only allow a note about a client who has actually booked
        # with this counselor — prevents writing notes about a
        # complete stranger who never engaged with them.
        client = serializer.validated_data["client"]
        has_booking = Booking.objects.filter(
            slot__counselor=self.request.user.counselor_profile, client=client
        ).exists()
        if not has_booking:
            raise PermissionDenied(
                "شما فقط می‌توانید برای کاربرانی که از شما نوبت گرفته‌اند یادداشت ثبت کنید"
            )
        serializer.save(counselor=self.request.user.counselor_profile)


class CounselorNoteDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Edit or delete one specific note — still scoped to the
    logged-in counselor's own notes only."""

    serializer_class = CounselorNoteSerializer
    permission_classes = [permissions.IsAuthenticated, IsCounselor]

    def get_queryset(self):
        return CounselorNote.objects.filter(
            counselor=self.request.user.counselor_profile
        )


class CounselorDetailView(generics.RetrieveAPIView):
    """Public — the full profile page for one counselor. Accepts
    either the shareable slug (used in public profile links) or the
    numeric pk (used internally — e.g. BookingPage only has the
    numeric Counselor.id, not the slug). Uses CounselorDetailSerializer
    (not the plain listing serializer) since this is the one place the
    full address and gallery photos should actually be shown — same
    annotated queryset as the listing views, so rating/booking counts
    stay consistent everywhere they're shown."""

    serializer_class = CounselorDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"

    def get_object(self):
        lookup_value = self.kwargs["slug"]
        queryset = self.filter_queryset(self.get_queryset())
        if lookup_value.isdigit():
            return get_object_or_404(queryset, pk=lookup_value)
        return get_object_or_404(queryset, slug=lookup_value)

    def get_queryset(self):
        return Counselor.objects.filter(is_verified=True, is_purged=False).annotate(
            rating_avg=Avg(
                "availability_slots__bookings__review__rating",
                filter=Q(availability_slots__bookings__review__is_approved=True),
            ),
            booking_count=Count(
                "availability_slots__bookings",
                filter=Q(availability_slots__bookings__status=Booking.Status.PAID),
                distinct=True,
            ),
        )


class CounselorReviewListView(generics.ListAPIView):
    """Public — every review left for this counselor, most recent
    first. Anyone can read reviews; only someone with a completed,
    unreviewed booking can write one (see ReviewableBookingView +
    ReviewCreateView)."""

    serializer_class = CounselorReviewSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return (
            Review.objects.filter(
                booking__slot__counselor_id=self.kwargs["pk"], is_approved=True
            )
            .select_related("booking__client")
            .order_by("-created_at")
        )


class MyBookingsView(APIView):
    """Authenticated. The client's own session history — what
    SessionRecordsPage.jsx displays. Computes session_number here
    (the Nth session with this specific counselor) since that's real
    logic depending on ordering across all of a client's bookings with
    one counselor, not just a plain field to serialize."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        bookings = (
            Booking.objects.filter(client=request.user)
            .select_related("slot", "slot__counselor", "slot__counselor__user")
            .order_by("slot__counselor_id", "slot__date", "slot__start_time")
        )

        # First pass, oldest-to-newest per counselor, to assign each
        # booking its correct sequential number for that counselor.
        session_numbers = {}
        counts = {}
        for booking in bookings:
            counselor_id = booking.slot.counselor_id
            counts[counselor_id] = counts.get(counselor_id, 0) + 1
            session_numbers[booking.id] = counts[counselor_id]

        # Second pass, most-recent-first for display.
        results = []
        for booking in sorted(
            bookings, key=lambda b: (b.slot.date, b.slot.start_time), reverse=True
        ):
            counselor = booking.slot.counselor
            results.append(
                {
                    "id": booking.id,
                    "counselor_id": counselor.id,
                    "doctor": counselor.user.get_full_name() or counselor.user.username,
                    "avatar": (
                        request.build_absolute_uri(counselor.user.avatar.url)
                        if counselor.user.avatar
                        else None
                    ),
                    "date": booking.slot.date,
                    "time": booking.slot.start_time,
                    "end_time": booking.slot.end_time,
                    "price": counselor.session_price,
                    "session_number": session_numbers[booking.id],
                    "status": booking.status,
                    "can_cancel": (
                        booking.status == Booking.Status.PAID
                        and timezone.make_aware(
                            datetime.combine(booking.slot.date, booking.slot.start_time)
                        )
                        > timezone.now()
                    ),
                }
            )

        return Response(results, status=status.HTTP_200_OK)


class ReviewableBookingView(APIView):
    """Authenticated. Tells the frontend: does the logged-in user have
    a completed session with this counselor that they haven't reviewed
    yet? If so, returns that booking's id so the review form knows
    exactly what to submit against. This is what makes "only people who
    actually had a session can review" enforceable in the UI, not just
    in the backend's final validation."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        now = timezone.now()
        candidate = (
            Booking.objects.filter(
                client=request.user,
                slot__counselor_id=pk,
                review__isnull=True,
            )
            .select_related("slot")
            .order_by("-slot__date", "-slot__start_time")
        )

        for booking in candidate:
            session_end = timezone.make_aware(
                datetime.combine(booking.slot.date, booking.slot.end_time)
            )
            if now >= session_end:
                return Response({"booking_id": booking.id}, status=status.HTTP_200_OK)

        return Response({"booking_id": None}, status=status.HTTP_200_OK)


class ReviewCreateView(generics.CreateAPIView):
    """A client rates/reviews a session after it's over. Validation
    (does this booking belong to me, has the session actually
    happened, have I already reviewed it) lives in the serializer's
    validate_booking — see ReviewSerializer."""

    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context


class PublicCounselorListView(generics.ListAPIView):
    """Public — no login required. Powers the "top counselors" slider
    on the homepage. Ranked by average rating first, then by number of
    completed bookings as a tiebreaker (and as the only signal at all
    for a counselor who has bookings but no reviews yet)."""

    serializer_class = PublicCounselorSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return (
            Counselor.objects.filter(is_verified=True)
            .annotate(
                rating_avg=Avg(
                    "availability_slots__bookings__review__rating",
                    filter=Q(availability_slots__bookings__review__is_approved=True),
                ),
                booking_count=Count(
                    "availability_slots__bookings",
                    filter=Q(availability_slots__bookings__status=Booking.Status.PAID),
                    distinct=True,
                ),
            )
            .order_by(
                F("rating_avg").desc(nulls_last=True),
                "-booking_count",
            )[:6]
        )


class CounselorDirectoryPagination(PageNumberPagination):
    page_size = 9
    page_size_query_param = "page_size"


class PublicCounselorDirectoryView(generics.ListAPIView):
    """Public — the full, searchable/filterable counselor directory
    (Moshaverin.jsx), distinct from the 6-item "top counselors" slider
    above. Supports:
      ?search=<name or bio text>
      ?specialty=<slug>        (repeatable: ?specialty=family&specialty=grief)
      ?min_rating=<number>
      ?page=<n>
    """

    serializer_class = PublicCounselorSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = CounselorDirectoryPagination

    def get_queryset(self):
        queryset = Counselor.objects.filter(is_verified=True, is_purged=False).annotate(
            rating_avg=Avg(
                "availability_slots__bookings__review__rating",
                filter=Q(availability_slots__bookings__review__is_approved=True),
            ),
            booking_count=Count(
                "availability_slots__bookings",
                filter=Q(availability_slots__bookings__status=Booking.Status.PAID),
                distinct=True,
            ),
        )

        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
                | Q(bio__icontains=search)
            )

        specialty_slugs = self.request.query_params.getlist("specialty")
        if specialty_slugs:
            queryset = queryset.filter(specialties__slug__in=specialty_slugs).distinct()

        min_rating = self.request.query_params.get("min_rating")
        if min_rating:
            try:
                queryset = queryset.filter(rating_avg__gte=float(min_rating))
            except ValueError:
                pass  # ignore a malformed min_rating rather than 500

        return queryset.order_by(
            F("rating_avg").desc(nulls_last=True), "-booking_count"
        )


class SpecialtyListView(generics.ListAPIView):
    """Public — the real list of specialty categories, so the frontend
    filter checkboxes can be driven by actual backend data instead of
    a hardcoded list that could drift out of sync with what admins
    have actually created."""

    queryset = Specialty.objects.all()
    serializer_class = SpecialtySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


class CounselorScheduleView(generics.RetrieveUpdateAPIView):
    serializer_class = CounselorScheduleSerializer
    permission_classes = [permissions.IsAuthenticated, IsCounselor]

    def get_object(self):
        schedule, _ = CounselorSchedule.objects.get_or_create(
            counselor=self.request.user.counselor_profile
        )
        return schedule


class SchedulePreviewView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCounselor]

    def post(self, request):
        serializer = SchedulePreviewRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        schedule = get_object_or_404(
            CounselorSchedule, counselor=request.user.counselor_profile
        )
        start_date = serializer.validated_data["start_date"]
        end_date = serializer.validated_data["end_date"]
        work_on_holidays = serializer.validated_data["work_on_holidays"]

        holidays = get_holidays_in_range(start_date, end_date)

        candidates = generate_slots(schedule, start_date, end_date, work_on_holidays)

        sample_dates = sorted(set(c["date"] for c in candidates))[:3]
        sample_days = [
            {
                "date": d,
                "slots": [
                    {"start_time": c["start_time"], "end_time": c["end_time"]}
                    for c in candidates
                    if c["date"] == d
                ],
            }
            for d in sample_dates
        ]

        return Response(
            {
                "count": len(candidates),
                "sample_days": sample_days,
                "holidays": holidays,  # [] if none in range — frontend only prompts when non-empty
            }
        )


class ScheduleGenerateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCounselor, HasAutoGeneratorAccess]

    def post(self, request):
        serializer = SchedulePreviewRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        counselor = request.user.counselor_profile
        schedule = get_object_or_404(CounselorSchedule, counselor=counselor)
        candidates = generate_slots(
            schedule,
            serializer.validated_data["start_date"],
            serializer.validated_data["end_date"],
            serializer.validated_data["work_on_holidays"],
        )

        existing = set(
            AvailabilitySlot.objects.filter(counselor=counselor).values_list(
                "date", "start_time"
            )
        )
        to_create = [
            AvailabilitySlot(
                counselor=counselor,
                date=c["date"],
                start_time=c["start_time"],
                end_time=c["end_time"],
                source=AvailabilitySlot.Source.GENERATED,
            )
            for c in candidates
            if (c["date"], c["start_time"]) not in existing
        ]

        AvailabilitySlot.objects.bulk_create(to_create, ignore_conflicts=True)

        return Response({"created": len(to_create)}, status=status.HTTP_201_CREATED)


class CancelBookingView(APIView):
    """Either the client or the counselor on a booking can cancel.
    Refund eligibility: ≥3 days before session start = refunded;
    inside that window = no refund. Counselor-initiated cancels
    always refund — not the client's fault if the counselor cancels.
    A session that has already started can no longer be cancelled by
    either side — at that point it either happened or didn't, and
    "cancelling" it after the fact would incorrectly reopen the slot
    and undo earnings for a session that was already delivered."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        with transaction.atomic():
            booking = get_object_or_404(
                Booking.objects.select_related(
                    "slot", "slot__counselor__user"
                ).select_for_update(),
                pk=pk,
            )

            is_client = request.user.id == booking.client_id
            is_counselor = request.user.id == booking.slot.counselor.user_id
            if not (is_client or is_counselor):
                raise PermissionDenied("شما اجازه لغو این نوبت را ندارید")

            if booking.status != Booking.Status.PAID:
                return Response(
                    {"detail": "این نوبت قبلا لغو شده است"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            session_start = timezone.make_aware(
                datetime.combine(booking.slot.date, booking.slot.start_time)
            )

            if session_start <= timezone.now():
                return Response(
                    {"detail": "این نوبت قبلا برگزار شده و قابل لغو نیست"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            days_notice = (session_start - timezone.now()).days
            refunded = is_counselor or days_notice >= REFUND_CUTOFF_DAYS

            booking.status = (
                Booking.Status.CANCELLED_REFUNDED
                if refunded
                else Booking.Status.CANCELLED_NO_REFUND
            )
            booking.cancelled_at = timezone.now()
            booking.cancelled_by = request.user
            booking.save(update_fields=["status", "cancelled_at", "cancelled_by"])

            booking.slot.is_booked = False
            booking.slot.save(update_fields=["is_booked"])

        return Response(
            {"detail": "نوبت لغو شد", "refunded": refunded}, status=status.HTTP_200_OK
        )


class CounselorEarningsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCounselor]

    def get(self, request):
        counselor = request.user.counselor_profile
        paid_bookings = Booking.objects.filter(
            slot__counselor=counselor, status=Booking.Status.PAID
        )
        total = paid_bookings.aggregate(total=Sum("price_at_booking"))["total"] or 0
        return Response(
            {
                "total_earnings": total,
                "paid_session_count": paid_bookings.count(),
            }
        )


class AvailabilitySlotBulkDeleteByDateView(APIView):
    """Deletes every UNBOOKED slot the counselor has on one date —
    booked slots are never touched, same rule as the single-slot
    delete endpoint. Returns counts so the frontend can tell the
    counselor if some slots on that day survived because they were
    booked."""

    permission_classes = [permissions.IsAuthenticated, IsCounselor]

    def delete(self, request, date):
        counselor = request.user.counselor_profile
        day_slots = AvailabilitySlot.objects.filter(counselor=counselor, date=date)

        booked_count = day_slots.filter(is_booked=True).count()
        deletable = day_slots.filter(is_booked=False)
        deleted_count = deletable.count()
        deletable.delete()

        return Response(
            {"deleted": deleted_count, "booked_remaining": booked_count},
            status=status.HTTP_200_OK,
        )


class AvailabilitySlotBulkDeleteByRangeView(APIView):
    """Deletes every UNBOOKED slot the counselor has within
    [start_date, end_date] inclusive — booked slots are never
    touched. Used for "delete this month" from the calendar."""

    permission_classes = [permissions.IsAuthenticated, IsCounselor]

    def delete(self, request):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        if not start_date or not end_date:
            return Response(
                {"detail": "start_date و end_date الزامی است"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        counselor = request.user.counselor_profile
        range_slots = AvailabilitySlot.objects.filter(
            counselor=counselor, date__gte=start_date, date__lte=end_date
        )

        booked_count = range_slots.filter(is_booked=True).count()
        deletable = range_slots.filter(is_booked=False)
        deleted_count = deletable.count()
        deletable.delete()

        return Response(
            {"deleted": deleted_count, "booked_remaining": booked_count},
            status=status.HTTP_200_OK,
        )


class PlanListView(generics.ListAPIView):
    """Public — active subscription plans for the پلن‌ها section."""

    serializer_class = PlanSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        return Plan.objects.filter(is_active=True).prefetch_related("sales")


class HeroSlideListView(generics.ListAPIView):
    serializer_class = HeroSlideSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        return HeroSlide.objects.filter(is_active=True)


class SubscriptionPurchaseInitView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, plan_id):
        plan = get_object_or_404(Plan, pk=plan_id, is_active=True)

        counselor = getattr(request.user, 'counselor_profile', None)
        if counselor:
            current_sub = counselor.get_active_subscription()
            if current_sub and plan.id != current_sub.plan_id:
                if Plan.TIER_ORDER[plan.tier] <= Plan.TIER_ORDER[current_sub.plan.tier]:
                    return Response(
                        {"detail": "امکان تغییر به پلن هم‌سطح یا پایین‌تر وجود ندارد"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        period = request.data.get("billing_period", BillingPeriod.MONTHLY)
        if period not in BillingPeriod.values:
            return Response({"detail": "بازه پرداخت نامعتبر است"}, status=400)

        base_price = plan.price_for_period(period)
        if base_price is None:
            return Response({"detail": "این پلن برای این بازه در دسترس نیست"}, status=400)

        active_sale = next((s for s in plan.sales.all() if s.is_currently_active()), None)
        price_after_sale = active_sale.discounted_price(base_price) if active_sale else base_price

        coupon = None
        coupon_code = request.data.get("coupon_code", "").strip().upper()
        final_price = price_after_sale

        if coupon_code:
            try:
                coupon = Coupon.objects.get(code__iexact=coupon_code)
            except Coupon.DoesNotExist:
                return Response({"detail": "کد تخفیف نامعتبر است"}, status=400)
            if not coupon.is_valid():
                return Response({"detail": "این کد تخفیف منقضی یا غیرفعال شده است"}, status=400)
            final_price = max(0, price_after_sale - (price_after_sale * coupon.percent_off // 100))

        subscription = UserSubscription.objects.create(
            user=request.user, plan=plan, billing_period=period,
            price_at_purchase=final_price, coupon=coupon,
        )

        if final_price <= 0:
            self._activate(subscription)
            if coupon:
                coupon.times_used = F("times_used") + 1
                coupon.save(update_fields=["times_used"])
            return Response({"pay_url": None, "free": True})

        callback_url = request.build_absolute_uri(reverse("subscription_verify"))
        result = request_payment(
            amount_rial=final_price * 10,
            description=f"خرید اشتراک {plan.title} ({dict(BillingPeriod.choices)[period]})",
            callback_url=callback_url,
            mobile=request.user.phone or None,
        )

        if not result["success"]:
            subscription.status = UserSubscription.Status.CANCELLED
            subscription.save(update_fields=["status"])
            return Response({"detail": "خطا در اتصال به درگاه پرداخت"}, status=502)

        PaymentTransaction.objects.create(
            client=request.user, amount=final_price, authority=result["authority"],
            purpose=PaymentTransaction.Purpose.SUBSCRIPTION, subscription=subscription,
        )

        return Response({"pay_url": result["pay_url"]})

    def _activate(self, subscription):
        started_at, ends_at = compute_subscription_dates(
            subscription.user, subscription.plan, subscription.billing_period
        )
        subscription.status = UserSubscription.Status.ACTIVE
        subscription.started_at = started_at
        subscription.ends_at = ends_at
        subscription.save(update_fields=["status", "started_at", "ends_at"])

class SubscriptionVerifyView(APIView):
    """Public — Zarinpal redirects the user's browser here directly
    after payment, no auth header present. Verifies, activates the
    subscription, then redirects into the React app with a query
    param the frontend reads to show success/failure."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        authority = request.query_params.get("Authority")
        ok = request.query_params.get("Status") == "OK"

        transaction = get_object_or_404(
            PaymentTransaction,
            authority=authority,
            purpose=PaymentTransaction.Purpose.SUBSCRIPTION,
        )

        if ok:
            result = verify_payment(
                amount_rial=transaction.amount * 10, authority=authority
            )
        else:
            result = {"success": False}

        if result["success"]:
            transaction.status = PaymentTransaction.Status.SUCCESS
            transaction.reference_id = result["ref_id"]
            transaction.save(update_fields=["status", "reference_id"])

            sub = transaction.subscription
            started_at, ends_at = compute_subscription_dates(sub.user, sub.plan, sub.billing_period)
            sub.status = UserSubscription.Status.ACTIVE
            sub.started_at = started_at
            sub.ends_at = ends_at
            sub.save(update_fields=["status", "started_at", "ends_at"])

            if sub.coupon:
                sub.coupon.times_used = F("times_used") + 1
                sub.coupon.save(update_fields=["times_used"])

            return redirect(f"{settings.FRONTEND_URL}/plans?payment=success")
        
        transaction.status = PaymentTransaction.Status.FAILED
        transaction.save(update_fields=["status"])
        if transaction.subscription:
            transaction.subscription.status = UserSubscription.Status.CANCELLED
            transaction.subscription.save(update_fields=["status"])

        return redirect(f"{settings.FRONTEND_URL}/plans?payment=failed")


class MySubscriptionsView(generics.ListAPIView):
    """Authenticated. The client's own purchase history — every
    subscription attempt, including pending/cancelled ones, not just
    active ones, so a failed payment isn't silently invisible to the
    person who tried to pay."""

    serializer_class = UserSubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserSubscription.objects.filter(user=self.request.user).select_related(
            "plan"
        )


class ApplyCouponView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        code = request.data.get("code", "").strip().upper()
        try:
            coupon = Coupon.objects.get(code__iexact=code)
        except Coupon.DoesNotExist:
            return Response({"detail": "کد تخفیف نامعتبر است"}, status=400)

        if not coupon.is_valid():
            return Response(
                {"detail": "این کد تخفیف منقضی یا غیرفعال شده است"}, status=400
            )

        return Response({"code": coupon.code, "percent_off": coupon.percent_off})
