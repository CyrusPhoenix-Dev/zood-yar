import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import api from "../api";
import { translateApiError } from "../utils/apiErrors";
import "../styles/PhoneAuth.css";

const RESEND_SECONDS = 60;

function VerifyPhonePage() {
  const navigate = useNavigate();

  const [phone, setPhone] = useState(null); // null while loading profile
  const [step, setStep] = useState("loading"); // "loading" | "sending" | "code" | "error"
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const codeInputRef = useRef(null);

  // On landing here, fetch the phone already on file (set at
  // registration) and immediately send the first OTP — the user
  // shouldn't have to click anything to get their first code.
  useEffect(() => {
    let isMounted = true;

    api
      .get("/api/user/profile/")
      .then((res) => {
        if (!isMounted) return;
        const userPhone = res.data.phone || "";
        setPhone(userPhone);

        if (!userPhone) {
          // Shouldn't normally happen now that phone is required at
          // registration — but if an older account somehow has none,
          // there's nothing to verify here.
          setError("شماره تلفنی برای تایید ثبت نشده است");
          setStep("error");
          return;
        }

        setStep("sending");
        return api.post("/api/user/change-phone/request-otp/", { phone: userPhone });
      })
      .then((res) => {
        if (!isMounted || !res) return;
        setStep("code");
        setSecondsLeft(RESEND_SECONDS);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(translateApiError(err));
        setStep("error");
        console.error(err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  useEffect(() => {
    if (step === "code") codeInputRef.current?.focus();
  }, [step]);

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (code.trim().length !== 5) {
      setError("کد ارسال‌شده باید ۵ رقم باشد");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.post("/api/user/change-phone/confirm/", { phone, code });
      // is_phone_verified is now true on the backend — ProtectedRoute
      // will re-check the profile on the next navigation and let the
      // user through everywhere from here on.
      navigate("/Profile");
    } catch (err) {
      setError(translateApiError(err));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (secondsLeft > 0 || loading || !phone) return;
    setError("");
    setLoading(true);
    try {
      await api.post("/api/user/change-phone/request-otp/", { phone });
      setSecondsLeft(RESEND_SECONDS);
    } catch (err) {
      setError(translateApiError(err));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (step === "loading" || step === "sending") {
    return (
      <div className="edit-phone-page">
        <div className="edit-phone-content">
          <p className="edit-phone-status">در حال ارسال کد تایید...</p>
        </div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="edit-phone-page">
        <div className="edit-phone-content">
          <p className="edit-phone-status edit-phone-status--error">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-phone-page">
      <div className="edit-phone-content">
        <div className="edit-phone-card">
          <h1 className="edit-phone-card__title">تایید شماره تلفن</h1>

          <form onSubmit={handleVerifyCode} noValidate>
            <p className="edit-phone-card__description">
              کد ۵ رقمی ارسال‌شده به <strong dir="ltr">{phone}</strong> را وارد
              کنید تا بتوانید از حساب خود استفاده کنید.
            </p>

            <div className="edit-phone-field">
              <label htmlFor="code" className="edit-phone-field__label">
                کد تایید
              </label>
              <input
                ref={codeInputRef}
                id="code"
                type="text"
                inputMode="numeric"
                maxLength={5}
                className="edit-phone-input edit-phone-input--code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="•••••"
              />
            </div>

            {error && <p className="edit-phone-error">{error}</p>}

            <button type="submit" className="edit-phone-card__button" disabled={loading}>
              {loading ? "در حال بررسی..." : "تایید"}
            </button>

            <button
              type="button"
              className="edit-phone-resend"
              onClick={handleResend}
              disabled={secondsLeft > 0 || loading}
            >
              {secondsLeft > 0
                ? `ارسال مجدد کد (${secondsLeft.toLocaleString("fa-IR")} ثانیه)`
                : "ارسال مجدد کد"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default VerifyPhonePage;
