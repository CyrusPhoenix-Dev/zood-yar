import { useLocation, useNavigate, Link } from "react-router";
import { ShieldAlert } from "lucide-react";
import "../styles/BannedPage.css";

function BannedPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const reason = location.state?.reason;

  const handleLogout = () => {
    localStorage.clear();
    window.dispatchEvent(new Event("authchange"));
    navigate("/login");
  };

  return (
    <div className="banned-page">
      <div className="banned-card">
        <span className="banned-card__icon-wrap">
          <ShieldAlert size={32} />
        </span>

        <h1 className="banned-card__title">حساب کاربری شما مسدود شده است</h1>

        {reason && (
          <div className="banned-card__reason">
            <span className="banned-card__reason-label">دلیل مسدودسازی:</span>
            <p className="banned-card__reason-text">{reason}</p>
          </div>
        )}

        <p className="banned-card__text">
          برای اطلاعات بیشتر یا اعتراض به این تصمیم، لطفا با پشتیبانی تماس
          بگیرید.
        </p>

        <div className="banned-card__actions">
          <Link to="/support" className="banned-card__btn banned-card__btn--primary">
            تماس با پشتیبانی
          </Link>
          <button
            type="button"
            className="banned-card__btn banned-card__btn--ghost"
            onClick={handleLogout}
          >
            خروج از حساب کاربری
          </button>
        </div>
      </div>
    </div>
  );
}

export default BannedPage;
