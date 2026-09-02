from kavenegar import KavenegarAPI, APIException, HTTPException
from django.conf import settings


def send_otp_sms(phone, code):
    """
    Send OTP using Kavenegar Verify/Lookup.
    The template is managed by Kavenegar.
    """

    api = KavenegarAPI(settings.KAVENEGAR_API_KEY)

    params = {
        "receptor": phone,
        "template": "optzoodyar",
        "token": code,
    }

    try:
        api.verify_lookup(params)
        return True

    except (APIException, HTTPException) as e:
        print(f"[SMS ERROR] Failed to send OTP to {phone}: {e}")
        return False