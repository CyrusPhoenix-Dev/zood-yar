import { useState, useEffect, useRef } from "react";
import { Phone, ShieldCheck, ArrowRight } from "lucide-react";
import api from "../api";
import { translateApiError } from "../utils/apiErrors";
import "../styles/PhoneAuth.css";

const RESEND_SECONDS = 60;

function EditPhonePage() {
  const [currentPhone, setCurrentPhone] = useState(null); // null while loading
  const [step, setStep] = useState("loading"); // "loading" | "current" | "new" | "code" | "done"
  const [newPhone, setNewPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const codeInputRef = useRef(null);

  // Fetch the real, currently-saved phone number on mount — this is
  // what was missing before: the page previously showed a hardcoded
  // placeholder value instead of the logged-in user's actual data.
  useEffect(() => {
    let isMounted = true;

    api
      .get("/api/user/profile/")
      .then((res) => {
        if (!isMounted) return;
        setCurrentPhone(res.data.phone || "");
        setStep("current");
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(translateApiError(err));
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

  const isValidPhone = (value) => /^09\d{9}$/.test(value.trim());

  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!isValidPhone(newPhone)) {
      setError("شماره تلفن معتبر نیست (مثال: 09121234567)");
      return;
    }
    if (newPhone === currentPhone) {
      setError("این شماره در حال حاضر شماره فعال شماست");
      return;
    }
    setError("");
    setLoading(true);
    try {
      // TODO: confirm endpoint — authenticated action, separate from
      // the public login-OTP endpoint. `api` already attaches the
      // Authorization header automatically.
      await api.post("/api/user/change-phone/request-otp/", { phone: newPhone });
      setStep("code");
      setSecondsLeft(RESEND_SECONDS);
    } catch (err) {
      setError(translateApiError(err));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (code.trim().length !== 5) {
      setError("کد ارسال‌شده باید ۵ رقم باشد");
      return;
    }
    setError("");
    setLoading(true);
    try {
      // TODO: confirm endpoint
      await api.post("/api/user/change-phone/confirm/", { phone: newPhone, code });
      setCurrentPhone(newPhone); // reflect the change immediately, no refetch needed
      setStep("done");
    } catch (err) {
      setError(translateApiError(err));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (secondsLeft > 0 || loading) return;
    setError("");
    setLoading(true);
    try {
      await api.post("/api/user/change-phone/request-otp/", { phone: newPhone });
      setSecondsLeft(RESEND_SECONDS);
    } catch (err) {
      setError(translateApiError(err));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChange = () => {
    setStep("new");
    setNewPhone("");
    setError("");
  };

  const handleEditNumber = () => {
    setStep("new");
    setCode("");
    setError("");
    setSecondsLeft(0);
  };

  if (step === "loading") {
    return (
      <div className="edit-phone-page">
        <div className="edit-phone-content">
          <p className="edit-phone-status">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-phone-page">

      <div className="edit-phone-content">
        <div className="edit-phone-card">
          <h1 className="edit-phone-card__title">ویرایش شماره تلفن</h1>

          {step === "current" && (
            <>
              <div className="edit-phone-current">
                <span className="edit-phone-current__icon-wrap">
                  <Phone size={18} />
                </span>
                <div>
                  <p className="edit-phone-current__label">شماره فعلی</p>
                  <p className="edit-phone-current__value" dir="ltr">
                    {currentPhone || "ثبت نشده"}
                  </p>
                </div>
              </div>
              {error && <p className="edit-phone-error">{error}</p>}
              <button
                type="button"
                className="edit-phone-card__button"
                onClick={handleStartChange}
              >
                تغییر شماره تلفن
              </button>
            </>
          )}

          {step === "new" && (
            <form onSubmit={handleSendCode} noValidate>
              <p className="edit-phone-card__description">
                شماره تلفن جدید خود را وارد کنید. کد تایید برای آن پیامک
                می‌شود.
              </p>

              <div className="edit-phone-field">
                <label htmlFor="newPhone" className="edit-phone-field__label">
                  شماره تلفن جدید
                </label>
                <div className="edit-phone-input-wrap">
                  <Phone size={18} className="edit-phone-input-icon" />
                  <input
                    id="newPhone"
                    type="tel"
                    inputMode="numeric"
                    className="edit-phone-input"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="09121234567"
                  />
                </div>
              </div>

              {error && <p className="edit-phone-error">{error}</p>}

              <button type="submit" className="edit-phone-card__button" disabled={loading}>
                {loading ? "در حال ارسال..." : "ارسال کد تایید"}
              </button>
            </form>
          )}

          {step === "code" && (
            <form onSubmit={handleVerifyCode} noValidate>
              <button type="button" className="edit-phone-back" onClick={handleEditNumber}>
                <ArrowRight size={16} />
                ویرایش شماره
              </button>

              <p className="edit-phone-card__description">
                کد ۵ رقمی ارسال‌شده به <strong dir="ltr">{newPhone}</strong> را
                وارد کنید.
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
                {loading ? "در حال بررسی..." : "تایید و ذخیره"}
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
          )}

          {step === "done" && (
            <div className="edit-phone-success">
              <span className="edit-phone-success__icon-wrap">
                <ShieldCheck size={28} />
              </span>
              <p className="edit-phone-success__text">
                شماره تلفن شما با موفقیت به‌روزرسانی و تایید شد.
              </p>
              <p className="edit-phone-success__value" dir="ltr">
                {newPhone}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EditPhonePage;
