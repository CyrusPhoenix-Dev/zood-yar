import { useState } from "react";
import { Send } from "lucide-react";
import "../styles/Support.css";

// Swap with real data from api.get("/api/user/tickets/") — static for now.
const initialTickets = [
  {
    id: 1,
    subject: "مشکل در پرداخت رزرو",
    date: "۱۴۰۴/۰۵/۰۸",
    status: "resolved",
  },
  {
    id: 2,
    subject: "عدم دریافت پیامک تایید",
    date: "۱۴۰۴/۰۵/۱۵",
    status: "in-progress",
  },
  {
    id: 3,
    subject: "درخواست تغییر زمان جلسه",
    date: "۱۴۰۴/۰۵/۲۰",
    status: "pending",
  },
];

const statusMap = {
  pending: { label: "در انتظار بررسی", className: "support-status--pending" },
  "in-progress": { label: "در حال بررسی", className: "support-status--progress" },
  resolved: { label: "پاسخ داده شد", className: "support-status--resolved" },
};

function SupportPage() {
  const [tickets, setTickets] = useState(initialTickets);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setError("لطفا موضوع و متن پیام را وارد کنید");
      return;
    }
    setError("");
    setLoading(true);
    try {
      // TODO: replace with a real call, e.g.
      // const res = await api.post("/api/user/tickets/", { subject, message });
      await new Promise((resolve) => setTimeout(resolve, 600));

      const newTicket = {
        id: Date.now(),
        subject,
        date: new Date().toLocaleDateString("fa-IR"),
        status: "pending",
      };
      setTickets((prev) => [newTicket, ...prev]);
      setSubject("");
      setMessage("");
    } catch {
      setError("ارسال تیکت ناموفق بود. دوباره تلاش کنید");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="support-page">

      <div className="support-content">
        {/* ===== Submit form ===== */}
        <div className="support-card">
          <h1 className="support-card__title">ارسال درخواست پشتیبانی</h1>

          <form className="support-form" onSubmit={handleSubmit} noValidate>
            <div className="support-form__field">
              <label htmlFor="subject" className="support-form__label">
                موضوع
              </label>
              <input
                id="subject"
                type="text"
                className="support-form__input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="support-form__field">
              <label htmlFor="message" className="support-form__label">
                متن پیام
              </label>
              <textarea
                id="message"
                rows={4}
                className="support-form__textarea"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            {error && <p className="support-form__error">{error}</p>}

            <button type="submit" className="support-form__button" disabled={loading}>
              <Send size={16} />
              {loading ? "در حال ارسال..." : "ارسال درخواست"}
            </button>
          </form>
        </div>

        {/* ===== Ticket history ===== */}
        <div className="support-card">
          <h2 className="support-card__title">درخواست‌های ثبت‌شده</h2>

          {/* Desktop/tablet: table */}
          <table className="support-table">
            <thead>
              <tr>
                <th>موضوع</th>
                <th>تاریخ</th>
                <th>وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id}>
                  <td>{t.subject}</td>
                  <td>{t.date}</td>
                  <td>
                    <span className={`support-status ${statusMap[t.status].className}`}>
                      {statusMap[t.status].label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Phone: stacked cards */}
          <div className="support-list">
            {tickets.map((t) => (
              <div className="support-list__item" key={t.id}>
                <div className="support-list__row support-list__row--top">
                  <span className="support-list__subject">{t.subject}</span>
                  <span className={`support-status ${statusMap[t.status].className}`}>
                    {statusMap[t.status].label}
                  </span>
                </div>
                <span className="support-list__date">{t.date}</span>
              </div>
            ))}
          </div>

          {tickets.length === 0 && (
            <p className="support-empty">هنوز درخواستی ثبت نکرده‌اید.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default SupportPage;
