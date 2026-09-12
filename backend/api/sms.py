from kavenegar import KavenegarAPI, APIException, HTTPException
from django.conf import settings

TEMPLATES = {
    "verify": "optzoodyar",
    "password_reset": "resetpassword",
}


def send_otp_sms(phone, code, purpose="verify"):
    """
    Send OTP using Kavenegar Verify/Lookup.
    `purpose` selects which Kavenegar template to use — templates
    themselves are configured/managed on Kavenegar's dashboard.
    """

    api = KavenegarAPI(settings.KAVENEGAR_API_KEY)

    params = {
        "receptor": phone,
        "template": TEMPLATES.get(purpose, TEMPLATES["verify"]),
        "token": code,
    }

    try:
        api.verify_lookup(params)
        return True

    except (APIException, HTTPException) as e:
        print(f"[SMS ERROR] Failed to send OTP to {phone}: {e}")
        return False
    
def send_booking_reminder_sms(phone, session_datetime, counselor_name):
    """Sent once, right after a client successfully books a slot.
    Uses Kavenegar's plain send endpoint, not verify_lookup/templates
    — templates' token fields reject non-ASCII content (Persian
    names fail with a 431 'invalid code structure' error), so the
    message is composed directly in Python instead."""
    api = KavenegarAPI(settings.KAVENEGAR_API_KEY)

    message = (
        f"سلام\n"
        f"شما یک جلسه برای {session_datetime} با مشاور {counselor_name} رزرو کرده اید.\n"
        f"زود یار"
    )

    params = {
        "receptor": phone,
        "sender": settings.KAVENEGAR_SENDER,
        "message": message,
    }

    try:
        api.sms_send(params)
        return True
    except (APIException, HTTPException) as e:
        print(f"[SMS ERROR] Failed to send booking reminder to {phone}: {e}")
        return False
        
def send_counselor_booking_notice_sms(phone, client_name, session_datetime):
    api = KavenegarAPI(settings.KAVENEGAR_API_KEY)

    message = (
        f"سلام\n"
        f"شما یک مراجع به نام {client_name} برای نوبت {session_datetime} دارید.\n"
        f"زود یار"
    )

    params = {
        "receptor": phone,
        "sender": settings.KAVENEGAR_SENDER,
        "message": message,
    }

    try:
        api.sms_send(params)
        return True
    except (APIException, HTTPException) as e:
        print(f"[SMS ERROR] Failed to send counselor booking notice to {phone}: {e}")
        return False