"""
authentication.py — lives in your api app.

Enforces the ban at the authentication layer, not permissions — this
runs before ANY view's permission_classes are even checked, so it
covers every endpoint uniformly without needing to touch dozens of
individual views one by one.

One deliberate exception: support ticket endpoints stay reachable, so
a banned user can actually contact support about the ban, per the
requirement. Login (/api/token/) and refresh (/api/token/refresh/)
are also unaffected — they don't go through this class at all — so a
banned user can still obtain a token and see the ban banner.
"""
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed

# Path prefixes a banned user can still use. Keep this list short and
# deliberate — anything not listed here is blocked.
BANNED_ALLOWED_PATH_PREFIXES = ("/api/support/",)


class BanAwareJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        result = super().authenticate(request)
        if result is None:
            return None  # no token on this request — nothing to check

        user, validated_token = result

        if user.role == user.Role.BANNED and not request.path.startswith(
            BANNED_ALLOWED_PATH_PREFIXES
        ):
            raise AuthenticationFailed(
                {
                    "detail": "حساب شما مسدود شده است",
                    "banned": True,
                    "ban_reason": user.ban_reason,
                },
                code="user_banned",
            )

        return user, validated_token
