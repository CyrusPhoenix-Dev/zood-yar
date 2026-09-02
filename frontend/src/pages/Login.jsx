import { useState } from "react";
import { Link, useNavigate } from "react-router";
import api from "../api";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import { translateApiError } from "../utils/apiErrors";
import "../styles/Login.css";

function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("لطفا نام کاربری و رمز عبور را وارد کنید");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/api/token/", { username, password });
      localStorage.setItem(ACCESS_TOKEN, res.data.access);
      localStorage.setItem(REFRESH_TOKEN, res.data.refresh);
      window.dispatchEvent(new Event("authchange"));
      navigate("/profile");
    } catch (err) {
      setError(translateApiError(err));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <h1 className="login-form__title">ورود به زودیار</h1>

      <div className="login-form__field">
        <label htmlFor="username" className="login-form__label">
          نام کاربری
        </label>
        <input
          id="username"
          type="text"
          autoComplete="username"
          className="login-form__input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="نام کاربری خود را وارد کنید"
        />
      </div>

      <div className="login-form__field">
        <div className="login-form__label-row">
          <label htmlFor="password" className="login-form__label">
            رمز عبور
          </label>
        </div>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className="login-form__input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>

      {error && <p className="login-form__error">{error}</p>}

      <button type="submit" className="login-form__button" disabled={loading}>
        {loading ? "در حال ورود..." : "ورود"}
      </button>
      <Link to="/forgotPassword" className="login-form__forgot-link">
        رمز عبور را فراموش کرده‌اید؟
      </Link>
    </form>

  );
}

export default LoginForm;
