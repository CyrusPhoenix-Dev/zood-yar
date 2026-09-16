import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import api from "../api";
import { translateApiError } from "../utils/apiErrors";
import "../styles/SessionRecors.css";
import { useAppDialog } from "../components/AppDialogProvider";

const STATUS_LABELS = {
  paid: "پرداخت شده",
  cancelled_refunded: "لغو شده (عودت وجه)",
  cancelled_no_refund: "لغو شده (بدون عودت)",
};

function SessionRecordsPage() {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState(null);
  const { alertDialog, confirmDialog } = useAppDialog();

  const fetchSessions = () => {
    setIsLoading(true);
    api
      .get("/api/user/bookings/")
      .then((res) => setSessions(res.data))
      .catch((err) => {
        setError(translateApiError(err));
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleExportPdf = () => {
    // Uses the browser's native print-to-PDF — see the @media print
    // rules in SessionRecors.css for why this is preferred over a
    // client-side PDF library for Persian/RTL text.
    window.print();
  };

  const handleCancel = async (session) => {
    const confirmed = await confirmDialog(
      `آیا از لغو نوبت با ${session.doctor} مطمئن هستید؟ عودت وجه بر اساس فاصله زمانی تا جلسه بررسی می‌شود.`,
      { danger: true }
    );
    if (!confirmed) return;

    setCancellingId(session.id);
    setError("");
    try {
      const res = await api.post(`/api/bookings/${session.id}/cancel/`);
      await alertDialog(
        res.data.refunded
          ? "نوبت لغو شد. مبلغ پرداختی عودت داده خواهد شد."
          : "نوبت لغو شد. با توجه به نزدیک بودن به زمان جلسه، این نوبت مشمول عودت وجه نیست."
      );
      fetchSessions();
    } catch (err) {
      setError(translateApiError(err));
      console.error(err);
    } finally {
      setCancellingId(null);
    }
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

          {error && <p className="records-page__status records-page__status--error records-page__no-print">{error}</p>}

          {isLoading ? (
            <p className="records-page__status">در حال بارگذاری...</p>
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
                    <th>وضعیت</th>
                    <th className="records-page__no-print">عملیات</th>
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
                      <td>{STATUS_LABELS[s.status] || s.status}</td>
                      <td className="records-page__no-print">
                        {s.can_cancel && (
                          <button
                            type="button"
                            className="records-table__cancel-btn"
                            onClick={() => handleCancel(s)}
                            disabled={cancellingId === s.id}
                          >
                            {cancellingId === s.id ? "در حال لغو..." : "لغو نوبت"}
                          </button>
                        )}
                      </td>
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
                    <div className="records-list__row">
                      <span className="records-list__label">وضعیت</span>
                      <span>{STATUS_LABELS[s.status] || s.status}</span>
                    </div>
                    {s.can_cancel && (
                      <button
                        type="button"
                        className="records-table__cancel-btn records-list__cancel-btn"
                        onClick={() => handleCancel(s)}
                        disabled={cancellingId === s.id}
                      >
                        {cancellingId === s.id ? "در حال لغو..." : "لغو نوبت"}
                      </button>
                    )}
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