import uuid
from datetime import datetime

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Avg, Count, F, Q
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

from .token_serializers import CustomTokenObtainPairSerializer

from .models import OtpCode, AvailabilitySlot, Booking, Counselor, CounselorNote, Review, Specialty
from .sms import send_otp_sms
from .emails import send_otp_email
from .serializers import UserSerializer, UserProfileSerializer
from .counselor_serializers import (
    AvailabilitySlotSerializer,
    BookingClientSerializer,
    CounselorNoteSerializer,
    ReviewSerializer,
    CounselorReviewSerializer,
    PublicCounselorSerializer,
    SpecialtySerializer,
)

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
    """Registration. Does NOT touch is_phone_verified/is_email_verified
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


# ===========================
# EMAIL VERIFICATION (profile-only — mirrors phone above exactly)
# ===========================
class ChangeEmailRequestOtpView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        if not email:
            return Response(
                {"email": ["این فیلد الزامی است"]}, status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(email=email).exclude(pk=request.user.pk).exists():
            return Response(
                {"email": ["این ایمیل قبلا ثبت شده است"]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        otp = OtpCode.generate(
            destination=email,
            channel=OtpCode.Channel.EMAIL,
            purpose=OtpCode.Purpose.VERIFY,
            user=request.user,
        )

        if not send_otp_email(email, otp.code):
            return Response(
                {"detail": "ارسال ایمیل ناموفق بود. دوباره تلاش کنید"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({"detail": "کد ارسال شد"}, status=status.HTTP_200_OK)


class ChangeEmailConfirmView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        code = request.data.get("code", "").strip()

        otp = (
            OtpCode.objects.filter(
                destination=email,
                channel=OtpCode.Channel.EMAIL,
                purpose=OtpCode.Purpose.VERIFY,
                user=request.user,
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

        if User.objects.filter(email=email).exclude(pk=request.user.pk).exists():
            return Response(
                {"email": ["این ایمیل قبلا ثبت شده است"]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request.user.email = email
        request.user.is_email_verified = True
        request.user.save(update_fields=["email", "is_email_verified"])

        return Response(
            {"detail": "ایمیل با موفقیت تایید شد"}, status=status.HTTP_200_OK
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

        if user and user.email:
            otp = OtpCode.generate(
                destination=user.email,
                channel=OtpCode.Channel.EMAIL,
                purpose=OtpCode.Purpose.PASSWORD_RESET,
                user=user,
            )
            send_otp_email(user.email, otp.code)

        return Response(
            {"detail": "در صورت وجود حساب، کد بازیابی به ایمیل ثبت‌شده ارسال شد"},
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
                destination=user.email,
                channel=OtpCode.Channel.EMAIL,
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
    serializer_class = AvailabilitySlotSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        now = timezone.localtime()
        today = now.date()
        current_time = now.time()

        return AvailabilitySlot.objects.filter(
            counselor_id=self.kwargs["pk"],
            is_booked=False,
        ).filter(
            Q(date__gt=today) |
            Q(date=today, start_time__gt=current_time)
        ).order_by("date", "start_time")


class MockPaymentView(APIView):
    """PLACEHOLDER — simulates a payment gateway with no real money
    involved, since Zarinpal isn't wired up yet. Always succeeds.
    Replace this entire view with a real Zarinpal request/callback
    flow later; the booking view below only cares that it receives
    *a* reference string back, so swapping this out shouldn't require
    changing BookSlotView at all."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        reference = f"MOCK-{uuid.uuid4().hex[:12]}"
        return Response(
            {"success": True, "reference": reference}, status=status.HTTP_200_OK
        )


class BookSlotView(APIView):
    """Authenticated. Creates the actual Booking. Locks the slot row
    (select_for_update) and re-checks is_booked inside the transaction
    — without this, two clients hitting "book" on the same slot at
    almost the same moment could both succeed, double-booking it."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        payment_reference = request.data.get("payment_reference", "").strip()
        if not payment_reference:
            return Response(
                {"detail": "تایید پرداخت یافت نشد"}, status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            try:
                slot = AvailabilitySlot.objects.select_for_update().get(pk=pk)
            except AvailabilitySlot.DoesNotExist:
                return Response(
                    {"detail": "زمان مورد نظر یافت نشد"}, status=status.HTTP_404_NOT_FOUND
                )

            if slot.is_booked:
                return Response(
                    {"detail": "این زمان لحظاتی پیش توسط شخص دیگری رزرو شد"},
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

            booking = Booking.objects.create(
                slot=slot, client=request.user, payment_reference=payment_reference
            )

        return Response(
            {"detail": "رزرو با موفقیت انجام شد", "booking_id": booking.id},
            status=status.HTTP_201_CREATED,
        )


class IsCounselor(permissions.BasePermission):
    """Only lets through users who actually have a Counselor profile —
    a regular client user, even if authenticated, gets a 403 on every
    view in this file."""

    def has_permission(self, request, view):
        return hasattr(request.user, "counselor_profile")


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
        )

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
    """Public — the full profile page for one counselor. Uses the same
    annotated queryset as the listing views, so rating/booking counts
    stay consistent everywhere they're shown."""

    serializer_class = PublicCounselorSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return Counselor.objects.filter(is_verified=True).annotate(
            rating_avg=Avg(
                "availability_slots__booking__review__rating",
                filter=Q(availability_slots__booking__review__is_approved=True),
            ),
            booking_count=Count("availability_slots__booking", distinct=True),
        )


class CounselorReviewListView(generics.ListAPIView):
    """Public — every review left for this counselor, most recent
    first. Anyone can read reviews; only someone with a completed,
    unreviewed booking can write one (see ReviewableBookingView +
    ReviewCreateView)."""

    serializer_class = CounselorReviewSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return Review.objects.filter(
            booking__slot__counselor_id=self.kwargs["pk"], is_approved=True
        ).select_related("booking__client").order_by("-created_at")


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
                    "doctor": counselor.user.get_full_name() or counselor.user.username,
                    "avatar": request.build_absolute_uri(counselor.user.avatar.url)
                    if counselor.user.avatar
                    else None,
                    "date": booking.slot.date,
                    "time": booking.slot.start_time,
                    "price": counselor.session_price,
                    "session_number": session_numbers[booking.id],
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
                    "availability_slots__booking__review__rating",
                    filter=Q(availability_slots__booking__review__is_approved=True),
                ),
                booking_count=Count("availability_slots__booking", distinct=True),
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
        queryset = Counselor.objects.filter(is_verified=True).annotate(
            rating_avg=Avg(
                "availability_slots__booking__review__rating",
                filter=Q(availability_slots__booking__review__is_approved=True),
            ),
            booking_count=Count("availability_slots__booking", distinct=True),
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

        return queryset.order_by(F("rating_avg").desc(nulls_last=True), "-booking_count")


class SpecialtyListView(generics.ListAPIView):
    """Public — the real list of specialty categories, so the frontend
    filter checkboxes can be driven by actual backend data instead of
    a hardcoded list that could drift out of sync with what admins
    have actually created."""

    queryset = Specialty.objects.all()
    serializer_class = SpecialtySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None
