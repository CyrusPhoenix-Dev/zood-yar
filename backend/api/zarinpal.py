"""Real Zarinpal v4 integration. Amounts throughout this module are
Rial — every caller must convert from Toman (×10) before calling in."""

import requests
from django.conf import settings

_URLS = {
    True: {  # sandbox
        "request": "https://sandbox.zarinpal.com/pg/v4/payment/request.json",
        "verify": "https://sandbox.zarinpal.com/pg/v4/payment/verify.json",
        "startpay": "https://sandbox.zarinpal.com/pg/StartPay/",
    },
    False: {  # production
        "request": "https://api.zarinpal.com/pg/v4/payment/request.json",
        "verify": "https://api.zarinpal.com/pg/v4/payment/verify.json",
        "startpay": "https://www.zarinpal.com/pg/StartPay/",
    },
}


def _urls():
    return _URLS[settings.ZARINPAL_SANDBOX]


def request_payment(amount_rial, description, callback_url, mobile=None):
    payload = {
        "merchant_id": settings.ZARINPAL_MERCHANT_ID,
        "amount": amount_rial,
        "description": description,
        "callback_url": callback_url,
    }
    if mobile:
        payload["metadata"] = {"mobile": mobile}

    resp = requests.post(_urls()["request"], json=payload, timeout=15)
    resp.raise_for_status()
    data = resp.json().get("data", {})

    if data.get("code") == 100:
        return {
            "success": True,
            "authority": data["authority"],
            "pay_url": _urls()["startpay"] + data["authority"],
        }
    return {"success": False, "errors": resp.json().get("errors")}


def verify_payment(amount_rial, authority):
    payload = {
        "merchant_id": settings.ZARINPAL_MERCHANT_ID,
        "amount": amount_rial,
        "authority": authority,
    }
    resp = requests.post(_urls()["verify"], json=payload, timeout=15)
    resp.raise_for_status()
    data = resp.json().get("data", {})

    # 100 = fresh verify, 101 = already verified (Zarinpal calls the
    # callback more than once sometimes) — both count as success.
    if data.get("code") in (100, 101):
        return {"success": True, "ref_id": data["ref_id"]}
    return {"success": False, "errors": resp.json().get("errors")}
