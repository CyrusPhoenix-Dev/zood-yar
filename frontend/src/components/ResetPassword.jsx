import { useState } from "react";
import { Eye, EyeOff, ShieldCheck, Lock } from "lucide-react";
import api from "../api";
import { translateApiError } from "../utils/apiErrors";
import "../styles/ResetPassword.css";

function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentPassword) {
      setError("رمز عبور فعلی را وارد کنید");
      return;
    }
    if (newPassword.length < 8) {
      setError("رمز عبور جدید باید حداقل ۸ کاراکتر باشد");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("رمز عبور جدید و تکرار آن یکسان نیستند");
      return;
    }
    if (newPassword === currentPassword) {
      setError("رمز عبور جدید نباید با رمز عبور فعلی یکسان باشد");
      return;
    }

    setError("");
    setSuccess(false);
    setLoading(true);
    try {
      await api.post("/api/user/change-password/", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      resetForm();
      setSuccess(true);
    } catch (err) {
      setError(translateApiError(err));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-password-page">

      <div className="change-password-content">
        <div className="change-password-card">
          <h1 className="change-password-card__title">تغییر رمز عبور</h1>

          <form onSubmit={handleSubmit} noValidate>
            <div className="change-password-field">
              <label htmlFor="currentPassword" className="change-password-field__label">
                رمز عبور فعلی
              </label>
              <div className="change-password-input-wrap">
                <Lock size={18} className="change-password-input-icon" />
                <input
                  id="currentPassword"
                  type={showCurrent ? "text" : "password"}
                  autoComplete="current-password"
                  className="change-password-input"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    setSuccess(false);
                  }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="change-password-toggle"
                  onClick={() => setShowCurrent((v) => !v)}
                  aria-label={showCurrent ? "پنهان کردن رمز عبور" : "نمایش رمز عبور"}
                  tabIndex={-1}
                >
                  {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="change-password-field">
              <label htmlFor="newPassword" className="change-password-field__label">
                رمز عبور جدید
              </label>
              <div className="change-password-input-wrap">
                <Lock size={18} className="change-password-input-icon" />
                <input
                  id="newPassword"
                  type={showNew ? "text" : "password"}
                  autoComplete="new-password"
                  className="change-password-input"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setSuccess(false);
                  }}
                  placeholder="حداقل ۸ کاراکتر"
                />
                <button
                  type="button"
                  className="change-password-toggle"
                  onClick={() => setShowNew((v) => !v)}
                  aria-label={showNew ? "پنهان کردن رمز عبور" : "نمایش رمز عبور"}
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="change-password-field">
              <label htmlFor="confirmPassword" className="change-password-field__label">
                تکرار رمز عبور جدید
              </label>
              <div className="change-password-input-wrap">
                <Lock size={18} className="change-password-input-icon" />
                <input
                  id="confirmPassword"
                  type={showNew ? "text" : "password"}
                  autoComplete="new-password"
                  className="change-password-input"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setSuccess(false);
                  }}
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && <p className="change-password-error">{error}</p>}
            {success && (
              <p className="change-password-success">
                <ShieldCheck size={16} />
                رمز عبور با موفقیت تغییر کرد
              </p>
            )}

            <button type="submit" className="change-password-button" disabled={loading}>
              {loading ? "در حال ذخیره..." : "تغییر رمز عبور"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ChangePasswordPage;
