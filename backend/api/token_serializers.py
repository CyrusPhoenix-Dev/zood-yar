"""
token_serializers.py — lives in your api app.
"""
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Adds role and ban_reason as custom claims directly on the
    access token. This is what lets the frontend detect a ban and show
    the reason right after login, with no extra API call — which
    matters because every OTHER authenticated endpoint now correctly
    rejects a banned user's token (see authentication.py)."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["ban_reason"] = user.ban_reason if user.role == user.Role.BANNED else ""
        return token


# ===========================
# VIEW — add this to views.py
# ===========================
"""
from rest_framework_simplejwt.views import TokenObtainPairView
from .token_serializers import CustomTokenObtainPairSerializer


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
"""
