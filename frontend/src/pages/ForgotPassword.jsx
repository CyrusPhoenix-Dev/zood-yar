import { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import { User, Eye, EyeOff, ArrowRight } from "lucide-react";
import api from "../api";
import { translateApiError } from "../utils/apiErrors";
import "../styles/ForgotPassword.css";

const RESEND_SECONDS = 60;

function ForgotPasswordPage() {
  const [step, setStep] = useState("username"); // "username" | "reset" | "done"
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const codeInputRef = useRef(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  useEffect(() => {
    if (step === "reset") codeInputRef.current?.focus();
  }, [step]);

  const handleRequestCode = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("نام کاربری را وارد کنید");
      return;
    }
    setError("");
    setLoading(true);
    try {
      // Always succeeds from the client's point of view, regardless of
      // whether the username exists — the backend deliberately never
      // reveals that, to avoid leaking which usernames are registered.
      await api.post("/api/user/forgot-password/", { username });
      setStep("reset");
      setSecondsLeft(RESEND_SECONDS);
    } catch (err) {
      setError(translateApiError(err));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (secondsLeft > 0 || loading) return;
    setLoading(true);
    try {
      await api.post("/api/user/forgot-password/", { username });
      setSecondsLeft(RESEND_SECONDS);
    } catch (err) {
      setError(translateApiError(err));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (code.trim().length !== 5) {
      setError("کد ارسال‌شده باید ۵ رقم باشد");
      return;
    }
    if (newPassword.length < 8) {
      setError("رمز عبور باید حداقل ۸ کاراکتر باشد");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("رمز عبور و تکرار آن یکسان نیستند");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await api.post("/api/user/forgot-password/confirm/", {
        username,
        code,
        new_password: newPassword,
      });
      setStep("done");
    } catch (err) {
      setError(translateApiError(err));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password">
      <div className="forgot-password__form">
        {step === "username" && (
          <form onSubmit={handleRequestCode} noValidate>
            <Link to="/login" className="forgot-password__back">
              <ArrowRight size={16} />
              بازگشت به ورود
            </Link>

            <h1 className="forgot-password__title">بازیابی رمز عبور</h1>
            <p className="forgot-password__description">
              نام کاربری خود را وارد کنید تا کد بازیابی به ایمیل ثبت‌شده شما
              ارسال شود.
            </p>

            <div className="forgot-password__field">
              <label htmlFor="username" className="forgot-password__label">
                نام کاربری
              </label>
              <div className="forgot-password__input-wrap">
                <User size={18} className="forgot-password__input-icon" />
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  className="forgot-password__input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            {error && <p className="forgot-password__error">{error}</p>}

            <button type="submit" className="forgot-password__button" disabled={loading}>
              {loading ? "در حال ارسال..." : "ارسال کد بازیابی"}
            </button>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={handleResetPassword} noValidate>
            <button
              type="button"
              className="forgot-password__back"
              onClick={() => {
                setStep("username");
                setCode("");
                setError("");
                setSecondsLeft(0);
              }}
            >
              <ArrowRight size={16} />
              ویرایش نام کاربری
            </button>

            <h1 className="forgot-password__title">تعیین رمز عبور جدید</h1>
            <p className="forgot-password__description">
              کد ۵ رقمی ارسال‌شده به ایمیل ثبت‌شده حساب <strong dir="ltr">{username}</strong>{" "}
              را وارد کنید.
            </p>

            <div className="forgot-password__field">
              <label htmlFor="code" className="forgot-password__label">
                کد تایید
              </label>
              <input
                ref={codeInputRef}
                id="code"
                type="text"
                inputMode="numeric"
                maxLength={5}
                className="forgot-password__input forgot-password__input--no-icon forgot-password__input--code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="•••••"
              />
            </div>

            <div className="forgot-password__field">
              <label htmlFor="newPassword" className="forgot-password__label">
                رمز عبور جدید
              </label>
              <div className="forgot-password__input-wrap">
                <input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className="forgot-password__input forgot-password__input--no-icon"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="حداقل ۸ کاراکتر"
                />
                <button
                  type="button"
                  className="forgot-password__toggle-visibility"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "پنهان کردن رمز عبور" : "نمایش رمز عبور"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="forgot-password__field">
              <label htmlFor="confirmPassword" className="forgot-password__label">
                تکرار رمز عبور جدید
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="forgot-password__input forgot-password__input--no-icon"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {error && <p className="forgot-password__error">{error}</p>}

            <button type="submit" className="forgot-password__button" disabled={loading}>
              {loading ? "در حال ثبت..." : "تغییر رمز عبور"}
            </button>

            <button
              type="button"
              className="forgot-password__resend"
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
          <div className="forgot-password__done">
            <h1 className="forgot-password__title">رمز عبور تغییر کرد</h1>
            <p className="forgot-password__success">
              رمز عبور شما با موفقیت تغییر کرد. اکنون می‌توانید با رمز جدید
              وارد شوید.
            </p>
            <Link to="/login" className="forgot-password__button forgot-password__button--link">
              ورود به حساب کاربری
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
