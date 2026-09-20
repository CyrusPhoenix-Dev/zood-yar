import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router";
import api from "../api";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import { translateApiError } from "../utils/apiErrors";

import "../styles/Register.css";

const PHONE_REGEX = /^09\d{9}$/;

function RegisterForm() {
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const validate = () => {
    const errors = [];

    if (!username.trim()) {
      errors.push("نام کاربری الزامی است");
    }
    if (!firstName.trim() || !lastName.trim()) {
      errors.push("لطفا نام و نام خانوادگی را وارد کنید");
    }
    if (!PHONE_REGEX.test(phone.trim())) {
      errors.push("شماره تلفن معتبر نیست (مثال: 09121234567)");
    }
    if (password.length < 8) {
      errors.push("رمز عبور باید حداقل ۸ کاراکتر باشد");
    }
    if (password !== confirmPassword) {
      errors.push("رمز عبور و تکرار آن یکسان نیستند");
    }
    if (!acceptedTerms) {
      errors.push("برای ثبت‌نام باید قوانین و مقررات را بپذیرید");
    }

    return errors;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors([]);
    setLoading(true);
    try {
      const res = await api.post("/api/user/register/", {
        username,
        first_name: firstName,
        last_name: lastName,
        phone,
        password,
      });
      localStorage.setItem(ACCESS_TOKEN, res.data.access);
      localStorage.setItem(REFRESH_TOKEN, res.data.refresh);
      window.dispatchEvent(new Event("authchange"));
      navigate("/verify-phone");
    } catch (err) {
      console.error(err.response?.data || err);
      setErrors([translateApiError(err)]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="register-form" onSubmit={handleSubmit} noValidate>
      <h1 className="register-form__title">ساخت حساب کاربری</h1>

      <div className="register-form__field">
        <label htmlFor="username" className="register-form__label">
          نام کاربری
        </label>
        <input
          id="username"
          type="text"
          autoComplete="username"
          className="register-form__input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="مثلا: sina_ardestani"
        />
      </div>

      <div className="register-form__row">
        <div className="register-form__field">
          <label htmlFor="firstName" className="register-form__label">
            نام
          </label>
          <input
            id="firstName"
            type="text"
            autoComplete="given-name"
            className="register-form__input"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>

        <div className="register-form__field">
          <label htmlFor="lastName" className="register-form__label">
            نام خانوادگی
          </label>
          <input
            id="lastName"
            type="text"
            autoComplete="family-name"
            className="register-form__input"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
      </div>
      <div className="register-form__field">
        <label htmlFor="phone" className="register-form__label">
          شماره تلفن
        </label>
        <input
          id="phone"
          type="tel"
          autoComplete="tel"
          className="register-form__input"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="09xxxxxxxxx"
        />
      </div>

      <div className="register-form__field">
        <label htmlFor="password" className="register-form__label">
          رمز عبور
        </label>
        <div className="register-form__password-wrapper">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            className="register-form__input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="حداقل ۸ کاراکتر"
          />
          <button
            type="button"
            className="register-form__toggle-visibility"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "پنهان کردن رمز عبور" : "نمایش رمز عبور"}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div className="register-form__field">
        <label htmlFor="confirmPassword" className="register-form__label">
          تکرار رمز عبور
        </label>
        <div className="register-form__password-wrapper">
          <input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            className="register-form__input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
      </div>
      <div className="register-form__field">
        <label className="register-form__checkbox-label">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
          />
          <span>
            <a href="/terms" target="_blank" rel="noopener noreferrer">
              قوانین و مقررات
            </a>{" "}
            و{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer">
              حریم خصوصی
            </a>{" "}
            را مطالعه کرده و می‌پذیرم
          </span>
        </label>
      </div>

      {errors.length > 0 && (
        <ul className="register-form__error-list">
          {errors.map((msg, i) => (
            <li key={i} className="register-form__error">{msg}</li>
          ))}
        </ul>
      )}
      
      <button type="submit" className="register-form__button" disabled={loading}>
        {loading ? "در حال ثبت‌نام..." : "ثبت‌نام"}
      </button>
    </form>
  );
}

export default RegisterForm;
