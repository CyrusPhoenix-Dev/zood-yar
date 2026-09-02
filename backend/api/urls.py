"""
App-level urls.py — lives at yourproject/api/urls.py
Everything here is already prefixed with /api/ by the project-level
urls.py include(), so paths below don't repeat "api/".
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    CreateUserView,
    UserProfileView,
    SendPhoneOtpView,
    VerifyPhoneOtpView,
    SendEmailOtpView,
    VerifyEmailOtpView,
    ChangePhoneRequestOtpView,
    ChangePhoneConfirmView,
    ChangePasswordView,
    ForgotPasswordRequestView,
    ForgotPasswordConfirmView,
)

urlpatterns = [
    # ===== Auth: username/password =====
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    # ===== Registration =====
    path("user/register/", CreateUserView.as_view(), name="user_register"),
    # ===== Profile: get/update the logged-in user's own data =====
    path("user/profile/", UserProfileView.as_view(), name="user_profile"),
    # ===== Auth: phone OTP (public — login) =====
    path("user/send-otp/", SendPhoneOtpView.as_view(), name="send_phone_otp"),
    path("user/verify-otp/", VerifyPhoneOtpView.as_view(), name="verify_phone_otp"),
    # ===== Auth: email OTP (public — login) =====
    path("user/send-email-otp/", SendEmailOtpView.as_view(), name="send_email_otp"),
    path(
        "user/verify-email-otp/", VerifyEmailOtpView.as_view(), name="verify_email_otp"
    ),
    # ===== Profile: change password (authenticated) =====
    path("user/change-password/", ChangePasswordView.as_view(), name="change_password"),
    # ===== Forgot password (public — user isn't logged in yet) =====
    path(
        "user/forgot-password/",
        ForgotPasswordRequestView.as_view(),
        name="forgot_password_request",
    ),
    path(
        "user/forgot-password/confirm/",
        ForgotPasswordConfirmView.as_view(),
        name="forgot_password_confirm",
    ),
    # ===== Profile: change phone (authenticated) =====
    path(
        "user/change-phone/request-otp/",
        ChangePhoneRequestOtpView.as_view(),
        name="change_phone_request",
    ),
    path(
        "user/change-phone/confirm/",
        ChangePhoneConfirmView.as_view(),
        name="change_phone_confirm",
    ),
]
