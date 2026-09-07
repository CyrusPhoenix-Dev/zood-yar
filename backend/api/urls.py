"""
App-level urls.py — lives at yourproject/api/urls.py
Everything here is already prefixed with /api/ by the project-level
urls.py include(), so paths below don't repeat "api/".

No public phone/email OTP login endpoints exist — login is username +
password only (/api/token/). Phone/email OTP exists solely as an
authenticated in-profile verification flow, and covers both verifying
the number/email already on file and switching to + verifying a new
one (EditPhonePage.jsx / EditEmail.jsx).
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    CreateUserView,
    UserProfileView,
    ChangePhoneRequestOtpView,
    ChangePhoneConfirmView,
    ChangeEmailRequestOtpView,
    ChangeEmailConfirmView,
    ChangePasswordView,
    ForgotPasswordRequestView,
    ForgotPasswordConfirmView,
    AvailabilitySlotListCreateView,
    AvailabilitySlotDeleteView,
    CounselorBookingsView,
    CounselorNoteListCreateView,
    CounselorNoteDetailView,
    ReviewCreateView,
    PublicCounselorListView,
    PublicCounselorDirectoryView,
    CounselorDetailView,
    CounselorReviewListView,
    ReviewableBookingView,
    MyBookingsView,
    CounselorPublicSlotsView,
    MockPaymentView,
    BookSlotView,
    SpecialtyListView,
)
from .support_views import MyTicketListCreateView, TicketDetailView, TicketReplyCreateView

urlpatterns = [
    # ===== Auth: username/password (the only login method) =====
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # ===== Registration =====
    path("user/register/", CreateUserView.as_view(), name="user_register"),

    # ===== Profile: get/update the logged-in user's own data =====
    path("user/profile/", UserProfileView.as_view(), name="user_profile"),

    # ===== Client: my own session history =====
    path("user/bookings/", MyBookingsView.as_view(), name="my_bookings"),

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

    # ===== Profile: verify/change phone (authenticated, OTP) =====
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

    # ===== Profile: verify/change email (authenticated, OTP) =====
    path(
        "user/change-email/request-otp/",
        ChangeEmailRequestOtpView.as_view(),
        name="change_email_request",
    ),
    path(
        "user/change-email/confirm/",
        ChangeEmailConfirmView.as_view(),
        name="change_email_confirm",
    ),

    # ===== Counselor: availability calendar =====
    path(
        "counselor/slots/",
        AvailabilitySlotListCreateView.as_view(),
        name="counselor_slots",
    ),
    path(
        "counselor/slots/<int:pk>/",
        AvailabilitySlotDeleteView.as_view(),
        name="counselor_slot_delete",
    ),

    # ===== Counselor: client bookings ("record of users") =====
    path("counselor/bookings/", CounselorBookingsView.as_view(), name="counselor_bookings"),

    # ===== Counselor: private per-client notes =====
    path("counselor/notes/", CounselorNoteListCreateView.as_view(), name="counselor_notes"),
    path(
        "counselor/notes/<int:pk>/",
        CounselorNoteDetailView.as_view(),
        name="counselor_note_detail",
    ),

    # ===== Reviews (authenticated — a client rating a completed session) =====
    path("reviews/", ReviewCreateView.as_view(), name="review_create"),

    # ===== Public: top counselors (no login required) =====
    path("counselors/top/", PublicCounselorListView.as_view(), name="public_top_counselors"),

    # ===== Public: full searchable/filterable directory =====
    path("counselors/", PublicCounselorDirectoryView.as_view(), name="public_counselor_directory"),

    # ===== Public: one counselor's full profile + their reviews =====
    path("counselors/<int:pk>/", CounselorDetailView.as_view(), name="counselor_detail"),
    path(
        "counselors/<int:pk>/reviews/",
        CounselorReviewListView.as_view(),
        name="counselor_reviews",
    ),

    # ===== Authenticated: can the current user review this counselor? =====
    path(
        "counselors/<int:pk>/reviewable-booking/",
        ReviewableBookingView.as_view(),
        name="reviewable_booking",
    ),

    # ===== Public: one counselor's open slots (for the booking page) =====
    path(
        "counselors/<int:pk>/slots/",
        CounselorPublicSlotsView.as_view(),
        name="counselor_public_slots",
    ),

    # ===== Booking flow =====
    # PLACEHOLDER — replace with real Zarinpal integration later.
    path("payments/mock/", MockPaymentView.as_view(), name="mock_payment"),
    path("slots/<int:pk>/book/", BookSlotView.as_view(), name="book_slot"),

    # ===== Public: specialty categories (drives the filter checkboxes) =====
    path("specialties/", SpecialtyListView.as_view(), name="specialty_list"),
    # ===== Support tickets (any logged-in role) =====
    path("support/tickets/", MyTicketListCreateView.as_view(), name="my_tickets"),
    path("support/tickets/<int:pk>/", TicketDetailView.as_view(), name="ticket_detail"),
    path(
        "support/tickets/<int:pk>/reply/",
        TicketReplyCreateView.as_view(),
        name="ticket_reply",
    ),
]
