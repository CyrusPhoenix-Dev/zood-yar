import { useState, useEffect } from "react";
import { Send, MessageSquare, X } from "lucide-react";
import api from "../api";
import { translateApiError } from "../utils/apiErrors";
import "../styles/Support.css";

const statusMap = {
  pending: { label: "در انتظار بررسی", className: "support-status--pending" },
  in_progress: { label: "در حال بررسی", className: "support-status--progress" },
  resolved: { label: "پاسخ داده شد", className: "support-status--resolved" },
};

function SupportPage() {
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ===== Thread view state =====
  const [openTicketId, setOpenTicketId] = useState(null);
  const [openTicket, setOpenTicket] = useState(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [replyError, setReplyError] = useState("");

  const loadTickets = () => {
    api
      .get("/api/support/tickets/")
      .then((res) => setTickets(res.data.results ?? res.data))
      .catch((err) => {
        setLoadError(translateApiError(err));
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setError("لطفا موضوع و متن پیام را وارد کنید");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/api/support/tickets/", { subject, message });
      setTickets((prev) => [res.data, ...prev]);
      setSubject("");
      setMessage("");
    } catch (err) {
      setError(translateApiError(err));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openThread = (ticketId) => {
    setOpenTicketId(ticketId);
    setOpenTicket(null);
    setReplyError("");
    setThreadLoading(true);
    api
      .get(`/api/support/tickets/${ticketId}/`)
      .then((res) => setOpenTicket(res.data))
      .catch((err) => {
        setReplyError(translateApiError(err));
        console.error(err);
      })
      .finally(() => setThreadLoading(false));
  };

  const closeThread = () => {
    setOpenTicketId(null);
    setOpenTicket(null);
    setReplyText("");
    setReplyError("");
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setReplyError("");
    setIsReplying(true);
    try {
      const res = await api.post(`/api/support/tickets/${openTicketId}/reply/`, {
        message: replyText,
      });
      setOpenTicket((prev) => ({ ...prev, replies: [...prev.replies, res.data] }));
      setReplyText("");
    } catch (err) {
      setReplyError(translateApiError(err));
      console.error(err);
    } finally {
      setIsReplying(false);
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

          {isLoading ? (
            <p className="support-empty">در حال بارگذاری...</p>
          ) : loadError ? (
            <p className="support-empty">{loadError}</p>
          ) : tickets.length === 0 ? (
            <p className="support-empty">هنوز درخواستی ثبت نکرده‌اید.</p>
          ) : (
            <>
              <table className="support-table">
                <thead>
                  <tr>
                    <th>موضوع</th>
                    <th>تاریخ</th>
                    <th>وضعیت</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.id}>
                      <td>{t.subject}</td>
                      <td>{new Date(t.created_at).toLocaleDateString("fa-IR")}</td>
                      <td>
                        <span className={`support-status ${statusMap[t.status].className}`}>
                          {statusMap[t.status].label}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="support-view-btn"
                          onClick={() => openThread(t.id)}
                        >
                          <MessageSquare size={14} />
                          مشاهده گفتگو
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="support-list">
                {tickets.map((t) => (
                  <div className="support-list__item" key={t.id}>
                    <div className="support-list__row support-list__row--top">
                      <span className="support-list__subject">{t.subject}</span>
                      <span className={`support-status ${statusMap[t.status].className}`}>
                        {statusMap[t.status].label}
                      </span>
                    </div>
                    <div className="support-list__row">
                      <span className="support-list__date">
                        {new Date(t.created_at).toLocaleDateString("fa-IR")}
                      </span>
                      <button
                        type="button"
                        className="support-view-btn"
                        onClick={() => openThread(t.id)}
                      >
                        <MessageSquare size={14} />
                        مشاهده گفتگو
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ===== Ticket thread (opens when "مشاهده گفتگو" is clicked) ===== */}
        {openTicketId && (
          <div className="support-card support-thread">
            <div className="support-thread__header">
              <h2 className="support-card__title">
                {openTicket ? openTicket.subject : "گفتگو"}
              </h2>
              <button type="button" className="support-thread__close" onClick={closeThread}>
                <X size={18} />
              </button>
            </div>

            {threadLoading ? (
              <p className="support-empty">در حال بارگذاری...</p>
            ) : !openTicket ? (
              <p className="support-empty">{replyError || "خطایی رخ داد"}</p>
            ) : (
              <>
                <div className="support-thread__original">
                  <p className="support-thread__original-text">{openTicket.message}</p>
                  <span className="support-thread__original-date">
                    {new Date(openTicket.created_at).toLocaleDateString("fa-IR")}
                  </span>
                </div>

                <div className="support-thread__replies">
                  {openTicket.replies.length === 0 ? (
                    <p className="support-empty">هنوز پاسخی داده نشده است.</p>
                  ) : (
                    openTicket.replies.map((r) => (
                      <div
                        key={r.id}
                        className={`support-reply ${
                          r.is_staff_reply ? "support-reply--staff" : "support-reply--user"
                        }`}
                      >
                        <div className="support-reply__header">
                          <span className="support-reply__sender">
                            {r.is_staff_reply ? "پشتیبانی زودیار" : r.sender_name}
                          </span>
                          <span className="support-reply__date">
                            {new Date(r.created_at).toLocaleDateString("fa-IR")}
                          </span>
                        </div>
                        <p className="support-reply__message">{r.message}</p>
                      </div>
                    ))
                  )}
                </div>

                <form className="support-reply-form" onSubmit={handleSendReply}>
                  <textarea
                    className="support-reply-input"
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="پاسخ خود را بنویسید..."
                  />
                  {replyError && <p className="support-form__error">{replyError}</p>}
                  <button
                    type="submit"
                    className="support-form__button"
                    disabled={isReplying || !replyText.trim()}
                  >
                    <Send size={14} />
                    {isReplying ? "در حال ارسال..." : "ارسال پاسخ"}
                  </button>
                </form>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SupportPage;
