import { useState, useEffect } from "react";
import { Download } from "lucide-react";
import api from "../api";
import { translateApiError } from "../utils/apiErrors";
import "../styles/SessionRecors.css";

function SessionRecordsPage() {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/api/user/bookings/")
      .then((res) => setSessions(res.data))
      .catch((err) => {
        setError(translateApiError(err));
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleExportPdf = () => {
    // Uses the browser's native print-to-PDF — see the @media print
    // rules in SessionRecors.css for why this is preferred over a
    // client-side PDF library for Persian/RTL text.
    window.print();
  };

  const formatDate = (isoDate) => new Date(isoDate).toLocaleDateString("fa-IR");
  const formatTime = (time) => time.slice(0, 5);
  const formatPrice = (price) =>
    price > 0 ? `${price.toLocaleString("fa-IR")} تومان` : "—";

  return (
    <div className="records-page">
      <div className="records-content">
        <div className="records-card">
          <div className="records-card__header records-page__no-print">
            <h1 className="records-card__title">سوابق جلسات</h1>
            <button
              type="button"
              className="records-card__export-btn"
              onClick={handleExportPdf}
            >
              <Download size={16} />
              خروجی PDF
            </button>
          </div>

          <h1 className="records-card__title records-page__print-only">سوابق جلسات</h1>

          {isLoading ? (
            <p className="records-page__status">در حال بارگذاری...</p>
          ) : error ? (
            <p className="records-page__status records-page__status--error">{error}</p>
          ) : sessions.length === 0 ? (
            <p className="records-page__status">هنوز جلسه‌ای رزرو نکرده‌اید.</p>
          ) : (
            <>
              {/* Desktop/tablet + print */}
              <table className="records-table">
                <thead>
                  <tr>
                    <th>پزشک</th>
                    <th>تاریخ و ساعت</th>
                    <th>شماره جلسه</th>
                    <th>مبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div className="records-table__doctor">
                          <img
                            src={s.avatar || "/default-avatar.png"}
                            alt={s.doctor}
                            className="records-table__avatar"
                          />
                          <span>{s.doctor}</span>
                        </div>
                      </td>
                      <td>
                        {formatDate(s.date)} — {formatTime(s.time)}
                      </td>
                      <td>جلسه {s.session_number.toLocaleString("fa-IR")}</td>
                      <td>{formatPrice(s.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Phone */}
              <div className="records-list records-page__no-print">
                {sessions.map((s) => (
                  <div className="records-list__item" key={s.id}>
                    <div className="records-list__header">
                      <img
                        src={s.avatar || "/default-avatar.png"}
                        alt={s.doctor}
                        className="records-table__avatar"
                      />
                      <span className="records-list__doctor">{s.doctor}</span>
                    </div>
                    <div className="records-list__row">
                      <span className="records-list__label">تاریخ و ساعت</span>
                      <span>
                        {formatDate(s.date)} — {formatTime(s.time)}
                      </span>
                    </div>
                    <div className="records-list__row">
                      <span className="records-list__label">شماره جلسه</span>
                      <span>جلسه {s.session_number.toLocaleString("fa-IR")}</span>
                    </div>
                    <div className="records-list__row">
                      <span className="records-list__label">مبلغ</span>
                      <span>{formatPrice(s.price)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default SessionRecordsPage;
