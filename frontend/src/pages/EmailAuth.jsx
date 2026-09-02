import { useState, useEffect, useRef } from "react";
import { Mail, ShieldCheck, ArrowRight } from "lucide-react";
import api from "../api";
import { translateApiError } from "../utils/apiErrors";
import "../styles/EmailAuth.css"; // shared visual language with EditPhonePage — same card/step pattern

const RESEND_SECONDS = 60;

function EditEmail() {
  const [currentEmail, setCurrentEmail] = useState(null);
  const [step, setStep] = useState("loading"); // "loading" | "current" | "new" | "code" | "done"
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const codeInputRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    api
      .get("/api/user/profile/")
      .then((res) => {
        if (!isMounted) return;
        setCurrentEmail(res.data.email || "");
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

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!isValidEmail(newEmail)) {
      setError("ایمیل معتبر نیست");
      return;
    }
    if (newEmail === currentEmail) {
      setError("این ایمیل در حال حاضر ایمیل فعال شماست");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.post("/api/user/change-email/request-otp/", { email: newEmail });
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
      await api.post("/api/user/change-email/confirm/", { email: newEmail, code });
      setCurrentEmail(newEmail);
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
      await api.post("/api/user/change-email/request-otp/", { email: newEmail });
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
    setNewEmail("");
    setError("");
  };

  const handleEditEmail = () => {
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
          <h1 className="edit-phone-card__title">ویرایش ایمیل</h1>

          {step === "current" && (
            <>
              <div className="edit-phone-current">
                <span className="edit-phone-current__icon-wrap">
                  <Mail size={18} />
                </span>
                <div>
                  <p className="edit-phone-current__label">ایمیل فعلی</p>
                  <p className="edit-phone-current__value" dir="ltr">
                    {currentEmail || "ثبت نشده"}
                  </p>
                </div>
              </div>
              {error && <p className="edit-phone-error">{error}</p>}
              <button
                type="button"
                className="edit-phone-card__button"
                onClick={handleStartChange}
              >
                تغییر ایمیل
              </button>
            </>
          )}

          {step === "new" && (
            <form onSubmit={handleSendCode} noValidate>
              <p className="edit-phone-card__description">
                ایمیل جدید خود را وارد کنید. کد تایید برای آن ارسال می‌شود.
              </p>

              <div className="edit-phone-field">
                <label htmlFor="newEmail" className="edit-phone-field__label">
                  ایمیل جدید
                </label>
                <div className="edit-phone-input-wrap">
                  <Mail size={18} className="edit-phone-input-icon" />
                  <input
                    id="newEmail"
                    type="email"
                    className="edit-phone-input"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="email@example.com"
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
              <button type="button" className="edit-phone-back" onClick={handleEditEmail}>
                <ArrowRight size={16} />
                ویرایش ایمیل
              </button>

              <p className="edit-phone-card__description">
                کد ۵ رقمی ارسال‌شده به <strong dir="ltr">{newEmail}</strong> را
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
                ایمیل شما با موفقیت به‌روزرسانی و تایید شد.
              </p>
              <p className="edit-phone-success__value" dir="ltr">
                {newEmail}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EditEmail;
