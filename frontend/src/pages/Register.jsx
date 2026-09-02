import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router";
import api from "../api";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import { translateApiError } from "../utils/apiErrors";

import "../styles/Register.css";

function RegisterForm() {
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validate = () => {
    if (!username.trim()) {
      return "نام کاربری الزامی است";
    }
    if (!firstName.trim() || !lastName.trim()) {
      return "لطفا نام و نام خانوادگی را وارد کنید";
    }
    if (!email.trim()) {
      return "ایمیل الزامی است";
    }
    if (password.length < 8) {
      return "رمز عبور باید حداقل ۸ کاراکتر باشد";
    }
    if (password !== confirmPassword) {
      return "رمز عبور و تکرار آن یکسان نیستند";
    }
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/api/user/register/", {
        username,
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
        password,
      });
      localStorage.setItem(ACCESS_TOKEN, res.data.access);
      localStorage.setItem(REFRESH_TOKEN, res.data.refresh);
      window.dispatchEvent(new Event("authchange"));
      navigate("/login");
    } catch (err) {
      console.error(err.response?.data || err);
      setError(translateApiError(err));
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
        <label htmlFor="email" className="register-form__label">
          ایمیل
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className="register-form__input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
        />
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

      {error && <p className="register-form__error">{error}</p>}

      <button type="submit" className="register-form__button" disabled={loading}>
        {loading ? "در حال ثبت‌نام..." : "ثبت‌نام"}
      </button>
    </form>
  );
}

export default RegisterForm;
