import { Link } from "react-router";
import { SearchX, Home } from "lucide-react";
import "../styles/NotFound.css";

function NotFoundPage() {
  return (
    <section className="not-found">
      <div className="not-found__inner">
        <div className="not-found__icon-wrap">
          <SearchX size={40} className="not-found__icon" />
        </div>

        <p className="not-found__code">۴۰۴</p>
        <h1 className="not-found__title">صفحه مورد نظر پیدا نشد</h1>
        <p className="not-found__description">
          ممکن است آدرس اشتباه باشد یا این صفحه حذف شده باشد. می‌توانید به
          صفحه اصلی بازگردید.
        </p>

        <Link to="/" className="not-found__button">
          <Home size={18} />
          بازگشت به صفحه اصلی
        </Link>
      </div>
    </section>
  );
}

export default NotFoundPage;
