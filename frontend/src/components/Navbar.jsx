import { useState, useEffect } from "react";
import { Menu, X, User, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router";
import api from "../api";
import { useAuthStatus } from "../hooks/useAuthStatus";

import "../styles/Navbar.css";

const navLinks = [
  { label: "خانه", href: "/" },
  { label: "درباره ما", href: "/aboutus" },
  { label: "تماس با ما", href: "/contactus" },
  { label: "مشاوران", href: "/moshaverin" },
  { label: "خدمات", href: "/services" },
];

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [avatar, setAvatar] = useState(null);
  const isAuthenticated = useAuthStatus();
  const navigate = useNavigate();

  // Fetch just enough profile data for the avatar whenever auth status
  // flips to true — not on every render, only when it actually changes.
  useEffect(() => {
    if (!isAuthenticated) {
      setAvatar(null);
      return;
    }

    let isMounted = true;
    api
      .get("/api/user/profile/")
      .then((res) => {
        if (isMounted) setAvatar(res.data.avatar || null);
      })
      .catch(() => {
        // Silently ignore — a failed avatar fetch shouldn't break the
        // navbar; it just falls back to the placeholder icon.
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  const handleLogout = () => {
    localStorage.clear();
    window.dispatchEvent(new Event("authchange"));
    setIsMenuOpen(false);
    navigate("/login");
  };

  return (
    <header className="navbar">
      {/* ===== TOP ROW: logo + auth actions ===== */}
      <div className="navbar__top">
        <div className="navbar__top-inner">
          <Link to="/" className="navbar__logo">
            زودیار
          </Link>

          <div className="navbar__auth-actions">
            {isAuthenticated ? (
              <>
                <Link to="/profile" className="navbar__avatar-link" aria-label="پروفایل">
                  {avatar ? (
                    <img src={avatar} alt="" className="navbar__avatar-img" />
                  ) : (
                    <span className="navbar__avatar-fallback">
                      <User size={18} />
                    </span>
                  )}
                </Link>
                <button
                  type="button"
                  className="navbar__btn navbar__btn--ghost"
                  onClick={handleLogout}
                >
                  <LogOut size={16} />
                  خروج
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="navbar__btn navbar__btn--ghost">
                  ورود
                </Link>
                <Link to="/register" className="navbar__btn navbar__btn--primary">
                  ثبت‌نام
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className="navbar__menu-toggle"
            onClick={() => setIsMenuOpen((v) => !v)}
            aria-label={isMenuOpen ? "بستن منو" : "باز کردن منو"}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* ===== BOTTOM ROW: nav links ===== */}
      <nav className={`navbar__bottom ${isMenuOpen ? "navbar__bottom--open" : ""}`}>
        <ul className="navbar__links">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                to={link.href}
                className="navbar__link"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Auth actions repeat inside the mobile dropdown since the top
            row's are hidden on small screens to save space. */}
        <div className="navbar__mobile-auth">
          {isAuthenticated ? (
            <>
              <Link
                to="/profile"
                className="navbar__btn navbar__btn--ghost"
                onClick={() => setIsMenuOpen(false)}
              >
                {avatar ? (
                  <img src={avatar} alt="" className="navbar__mobile-avatar-img" />
                ) : (
                  <User size={16} />
                )}
                پروفایل
              </Link>
              <button
                type="button"
                className="navbar__btn navbar__btn--primary"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                خروج
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="navbar__btn navbar__btn--ghost"
                onClick={() => setIsMenuOpen(false)}
              >
                ورود
              </Link>
              <Link
                to="/register"
                className="navbar__btn navbar__btn--primary"
                onClick={() => setIsMenuOpen(false)}
              >
                ثبت‌نام
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
