from django.contrib.auth import get_user_model
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

from .models import OtpCode
from .sms import send_otp_sms
from .emails import send_otp_email
from .serializers import UserSerializer, UserProfileSerializer

User = get_user_model()


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


class SendPhoneOtpView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        phone = request.data.get("phone", "").strip()
        if not phone:
            return Response(
                {"phone": ["این فیلد الزامی است"]}, status=status.HTTP_400_BAD_REQUEST
            )

        user = User.objects.filter(phone=phone).first()
        otp = OtpCode.generate(
            destination=phone, channel=OtpCode.Channel.PHONE, user=user
        )

        if not send_otp_sms(phone, otp.code):
            return Response(
                {"detail": "ارسال پیامک ناموفق بود. دوباره تلاش کنید"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({"detail": "کد ارسال شد"}, status=status.HTTP_200_OK)


class VerifyPhoneOtpView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        phone = request.data.get("phone", "").strip()
        code = request.data.get("code", "").strip()

        otp = (
            OtpCode.objects.filter(
                destination=phone, channel=OtpCode.Channel.PHONE, is_used=False
            )
            .order_by("-created_at")
            .first()
        )

        if not otp or not otp.verify(code):
            return Response(
                {"detail": "کد نامعتبر یا منقضی شده است"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(phone=phone).first()
        if user is None:
            return Response(
                {
                    "detail": "حسابی با این شماره یافت نشد",
                    "requires_registration": True,
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if not user.is_phone_verified:
            user.is_phone_verified = True
            user.save(update_fields=["is_phone_verified"])

        refresh = RefreshToken.for_user(user)
        return Response(
            {"access": str(refresh.access_token), "refresh": str(refresh)},
            status=status.HTTP_200_OK,
        )


class ChangePhoneRequestOtpView(APIView):
    """Authenticated — only a logged-in user can request a code to
    claim a new phone number for their own account. Separate from
    SendPhoneOtpView (the public login endpoint) on purpose: that one
    is reachable by anyone and tied to an *existing* number; this one
    requires auth and is tied to a *new* number someone is claiming."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        phone = request.data.get("phone", "").strip()
        if not phone:
            return Response(
                {"phone": ["این فیلد الزامی است"]}, status=status.HTTP_400_BAD_REQUEST
            )

        if phone == request.user.phone:
            return Response(
                {"phone": ["این شماره در حال حاضر شماره فعال شماست"]},
                status=status.HTTP_400_BAD_REQUEST,
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
            {"detail": "شماره تلفن با موفقیت به‌روزرسانی شد"}, status=status.HTTP_200_OK
        )


class SendEmailOtpView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        if not email:
            return Response(
                {"email": ["این فیلد الزامی است"]}, status=status.HTTP_400_BAD_REQUEST
            )

        user = User.objects.filter(email=email).first()
        otp = OtpCode.generate(
            destination=email, channel=OtpCode.Channel.EMAIL, user=user
        )

        # TODO: send otp.code via Django's email backend / a transactional
        # email service (SendGrid, Mailgun, SES). Logged here for testing.
        print(f"[DEV ONLY] OTP for {email}: {otp.code}")

        return Response({"detail": "کد ارسال شد"}, status=status.HTTP_200_OK)


class VerifyEmailOtpView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        code = request.data.get("code", "").strip()

        otp = (
            OtpCode.objects.filter(
                destination=email, channel=OtpCode.Channel.EMAIL, is_used=False
            )
            .order_by("-created_at")
            .first()
        )

        if not otp or not otp.verify(code):
            return Response(
                {"detail": "کد نامعتبر یا منقضی شده است"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(email=email).first()
        if user is None:
            return Response(
                {
                    "detail": "حسابی با این ایمیل یافت نشد",
                    "requires_registration": True,
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if not user.is_email_verified:
            user.is_email_verified = True
            user.save(update_fields=["is_email_verified"])

        refresh = RefreshToken.for_user(user)
        return Response(
            {"access": str(refresh.access_token), "refresh": str(refresh)},
            status=status.HTTP_200_OK,
        )


# ===========================
# EMAIL VERIFICATION
# Same pattern as phone above — authenticated, profile-only. No UI
# built for this yet (EditPhonePage.jsx has no email equivalent page
# yet) but the backend is ready for when that's built.
# ===========================
class ChangeEmailRequestOtpView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        if not email:
            return Response(
                {"email": ["این فیلد الزامی است"]}, status=status.HTTP_400_BAD_REQUEST
            )

        if email == request.user.email:
            return Response(
                {"email": ["این ایمیل در حال حاضر ایمیل فعال شماست"]},
                status=status.HTTP_400_BAD_REQUEST,
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
            {"detail": "ایمیل با موفقیت به‌روزرسانی شد"}, status=status.HTTP_200_OK
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
