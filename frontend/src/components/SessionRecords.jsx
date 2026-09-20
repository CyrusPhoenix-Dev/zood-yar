import { useState, useEffect, useMemo } from "react";
import { Download, ChevronRight } from "lucide-react";
import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import gregorian from "react-date-object/calendars/gregorian";
import api from "../api";
import { translateApiError } from "../utils/apiErrors";
import "../styles/SessionRecors.css";
import { useAppDialog } from "../components/AppDialogProvider";

const STATUS_LABELS = {
  paid: "پرداخت شده",
  cancelled_refunded: "لغو شده (عودت وجه)",
  cancelled_no_refund: "لغو شده (بدون عودت)",
};

function jalaliMonthKey(gregorianDateStr) {
  const jd = new DateObject({ date: gregorianDateStr, format: "YYYY-MM-DD", calendar: gregorian })
    .convert(persian);
  return `${jd.year}-${String(jd.month.number).padStart(2, "0")}`;
}

function jalaliMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const jd = new DateObject({ year, month, day: 1, calendar: persian, locale: persian_fa });
  return jd.format("MMMM YYYY");
}

function SessionRecordsPage() {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState(null);
  const { alertDialog, confirmDialog } = useAppDialog();

  // ===== Drill-down state =====
  const [selectedCounselorKey, setSelectedCounselorKey] = useState(null);
  const [selectedMonthKey, setSelectedMonthKey] = useState(null);

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

  // A session's counselor key — uses counselor_id if the backend
  // sends it, falls back to the doctor name string otherwise.
  const counselorKeyOf = (s) => (s.counselor_id != null ? String(s.counselor_id) : s.doctor);

  // ===== Level 1: group by counselor =====
  const counselorGroups = useMemo(() => {
    const groups = {};
    for (const s of sessions) {
      const key = counselorKeyOf(s);
      if (!groups[key]) {
        groups[key] = { key, doctor: s.doctor, avatar: s.avatar, sessions: [] };
      }
      groups[key].sessions.push(s);
    }
    return Object.values(groups).sort((a, b) => a.doctor.localeCompare(b.doctor));
  }, [sessions]);

  const selectedCounselorGroup = useMemo(
    () => counselorGroups.find((g) => g.key === selectedCounselorKey) || null,
    [counselorGroups, selectedCounselorKey]
  );

  // ===== Level 2: group the selected counselor's sessions by Jalali month =====
  const monthGroups = useMemo(() => {
    if (!selectedCounselorGroup) return [];
    const groups = {};
    for (const s of selectedCounselorGroup.sessions) {
      const key = jalaliMonthKey(s.date);
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    }
    return Object.entries(groups).sort(([a], [b]) => {
      const [ay, am] = a.split("-").map(Number);
      const [by, bm] = b.split("-").map(Number);
      return by - ay || bm - am; // most recent month first
    });
  }, [selectedCounselorGroup]);

  const selectedMonthSessions = useMemo(() => {
    if (!selectedMonthKey) return [];
    const found = monthGroups.find(([key]) => key === selectedMonthKey);
    return found ? found[1] : [];
  }, [monthGroups, selectedMonthKey]);

  // ===== Level 3: group the selected month's sessions by day =====
  const dayGroups = useMemo(() => {
    const groups = {};
    for (const s of selectedMonthSessions) {
      if (!groups[s.date]) groups[s.date] = [];
      groups[s.date].push(s);
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a)); // most recent day first
  }, [selectedMonthSessions]);

  const openCounselor = (key) => {
    setSelectedCounselorKey(key);
    setSelectedMonthKey(null);
  };

  const backToCounselors = () => {
    setSelectedCounselorKey(null);
    setSelectedMonthKey(null);
  };

  const backToMonths = () => {
    setSelectedMonthKey(null);
  };

  return (
    <div className="records-page">
      <div className="records-content">
        <div className="records-card">
          <div className="records-card__header records-page__no-print">
            <h1 className="records-card__title">وقت‌های من</h1>
            <button type="button" className="records-card__export-btn" onClick={handleExportPdf}>
              <Download size={16} />
              خروجی PDF
            </button>
          </div>

          <h1 className="records-card__title records-page__print-only">وقت‌های من</h1>

          {error && (
            <p className="records-page__status records-page__status--error records-page__no-print">
              {error}
            </p>
          )}

          {isLoading ? (
            <p className="records-page__status">در حال بارگذاری...</p>
          ) : sessions.length === 0 ? (
            <p className="records-page__status">هنوز جلسه‌ای رزرو نکرده‌اید.</p>
          ) : !selectedCounselorGroup ? (
            /* ===== Level 1: counselor list ===== */
            <div className="records-counselors">
              {counselorGroups.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  className="records-counselor-card"
                  onClick={() => openCounselor(g.key)}
                >
                  <img
                    src={g.avatar || "/default-avatar.png"}
                    alt={g.doctor}
                    className="records-counselor-card__avatar"
                  />
                  <span className="records-counselor-card__name">{g.doctor}</span>
                  <span className="records-counselor-card__meta">
                    {g.sessions.length.toLocaleString("fa-IR")} جلسه
                  </span>
                </button>
              ))}
            </div>
          ) : !selectedMonthKey ? (
            /* ===== Level 2: month list for the selected counselor ===== */
            <>
              <div className="records-page__breadcrumb">
                <button type="button" className="records-page__back-btn" onClick={backToCounselors}>
                  <ChevronRight size={16} />
                  بازگشت به مشاوران
                </button>
                <h2 className="records-page__breadcrumb-title">
                  {selectedCounselorGroup.doctor}
                </h2>
              </div>

              <div className="records-months">
                {monthGroups.map(([monthKey, monthSessions]) => (
                  <button
                    key={monthKey}
                    type="button"
                    className="records-month-card"
                    onClick={() => setSelectedMonthKey(monthKey)}
                  >
                    <span className="records-month-card__title">{jalaliMonthLabel(monthKey)}</span>
                    <span className="records-month-card__meta">
                      {monthSessions.length.toLocaleString("fa-IR")} جلسه
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            /* ===== Level 3: day-by-day detail for the selected month ===== */
            <>
              <div className="records-page__breadcrumb">
                <button type="button" className="records-page__back-btn" onClick={backToMonths}>
                  <ChevronRight size={16} />
                  بازگشت به ماه‌ها
                </button>
                <h2 className="records-page__breadcrumb-title">
                  {selectedCounselorGroup.doctor} — {jalaliMonthLabel(selectedMonthKey)}
                </h2>
              </div>

              <div className="records-days">
                {dayGroups.map(([date, daySessions]) => (
                  <div className="records-day" key={date}>
                    <h3 className="records-day__title">{formatDate(date)}</h3>
                    <div className="records-day__sessions">
                      {daySessions.map((s) => (
                        <div className="records-day__session" key={s.id}>
                          <span className="records-day__time" dir="ltr">
                            {formatTime(s.time)}–{formatTime(s.end_time)}
                          </span>
                          <span>جلسه {s.session_number.toLocaleString("fa-IR")}</span>
                          <span>{formatPrice(s.price)}</span>
                          <span>{STATUS_LABELS[s.status] || s.status}</span>
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
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      <table className="records-print-table">
        <thead>
          <tr>
            <th>مشاور</th>
            <th>تاریخ</th>
            <th>ساعت</th>
            <th>شماره جلسه</th>
            <th>مبلغ</th>
            <th>وضعیت</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.id}>
              <td>{s.doctor}</td>
              <td>{formatDate(s.date)}</td>
              <td>
                <span dir="ltr">{formatTime(s.time)}–{formatTime(s.end_time)}</span>
              </td>
              <td>جلسه {s.session_number.toLocaleString("fa-IR")}</td>
              <td>{formatPrice(s.price)}</td>
              <td>{STATUS_LABELS[s.status] || s.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default SessionRecordsPage;