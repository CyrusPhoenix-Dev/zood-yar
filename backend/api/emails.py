"""
emails.py — lives in your api app, next to sms.py.
Same pattern as sms.py: one place that owns "how do we send this,"
so views don't call Django's mail functions directly.
"""

from django.core.mail import send_mail
from django.conf import settings


def send_otp_email(email, code):
    """Sends the OTP code via email. Returns True on success, False on
    failure — callers should treat failure as "couldn't send" without
    exposing SMTP-specific error details to the end user."""
    try:
        send_mail(
            subject="کد تایید زودیار",
            message=f"کد تایید شما: {code}\n\nاین کد تا ۵ دقیقه دیگر معتبر است.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        return True
    except Exception as e:
        # TODO: replace with real logging once this runs somewhere
        # with log aggregation set up.
        print(f"[EMAIL ERROR] Failed to send OTP to {email}: {e}")
        return False
