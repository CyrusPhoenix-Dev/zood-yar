import { Download } from "lucide-react";
import "../styles/SessionRecors.css";

// Swap with real data from api.get("/api/user/sessions/") — static for now.
const sessions = [
  {
    id: 1,
    doctor: "دکتر سید محمد حسینی",
    avatar: "https://i.pravatar.cc/200?img=12",
    date: "۱۴۰۴/۰۵/۱۲",
    time: "۱۰:۳۰",
    price: "۴۵۰,۰۰۰ تومان",
    sessionNumber: 1,
  },
  {
    id: 2,
    doctor: "دکتر سید محمد حسینی",
    avatar: "https://i.pravatar.cc/200?img=12",
    date: "۱۴۰۴/۰۵/۱۹",
    time: "۱۰:۳۰",
    price: "۴۵۰,۰۰۰ تومان",
    sessionNumber: 2,
  },
  {
    id: 3,
    doctor: "دکتر مریم صادقی",
    avatar: "https://i.pravatar.cc/200?img=32",
    date: "۱۴۰۴/۰۴/۰۲",
    time: "۱۷:۰۰",
    price: "۳۸۰,۰۰۰ تومان",
    sessionNumber: 1,
  },
  {
    id: 4,
    doctor: "دکتر مریم صادقی",
    avatar: "https://i.pravatar.cc/200?img=32",
    date: "۱۴۰۴/۰۴/۱۶",
    time: "۱۷:۰۰",
    price: "۳۸۰,۰۰۰ تومان",
    sessionNumber: 2,
  },
  {
    id: 5,
    doctor: "دکتر مریم صادقی",
    avatar: "https://i.pravatar.cc/200?img=32",
    date: "۱۴۰۴/۰۴/۳۰",
    time: "۱۷:۰۰",
    price: "۳۸۰,۰۰۰ تومان",
    sessionNumber: 3,
  },
  {
    id: 6,
    doctor: "دکتر علی رضایی",
    avatar: "https://i.pravatar.cc/200?img=51",
    date: "۱۴۰۴/۰۳/۰۸",
    time: "۱۲:۰۰",
    price: "۳۲۰,۰۰۰ تومان",
    sessionNumber: 1,
  },
];

function SessionRecordsPage() {
  const handleExportPdf = () => {
    // Uses the browser's native print-to-PDF, styled via the
    // @media print rules in SessionRecordsPage.css. This is the
    // reliable option for Persian/RTL text — it renders through the
    // browser's own text engine, unlike client-side PDF libraries
    // (jsPDF etc.) which need a custom-embedded Persian font and are
    // much more fragile for RTL/shaped Arabic-script text.
    window.print();
  };

  return (
    <div className="records-page">
      <div className="records-page__no-print">
      </div>

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

          {/* Print-only heading — the header row above is hidden when
              printing, this one takes its place with just the title. */}
          <h1 className="records-card__title records-page__print-only">
            سوابق جلسات
          </h1>

          {/* Desktop/tablet: table. Also the version used for print,
              forced visible via @media print regardless of viewport. */}
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
                      <img src={s.avatar} alt={s.doctor} className="records-table__avatar" />
                      <span>{s.doctor}</span>
                    </div>
                  </td>
                  <td>
                    {s.date} — {s.time}
                  </td>
                  <td>جلسه {s.sessionNumber.toLocaleString("fa-IR")}</td>
                  <td>{s.price}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Phone: stacked cards, same data. Hidden on print — the
              table above is used for print regardless of screen size. */}
          <div className="records-list records-page__no-print">
            {sessions.map((s) => (
              <div className="records-list__item" key={s.id}>
                <div className="records-list__header">
                  <img src={s.avatar} alt={s.doctor} className="records-table__avatar" />
                  <span className="records-list__doctor">{s.doctor}</span>
                </div>
                <div className="records-list__row">
                  <span className="records-list__label">تاریخ و ساعت</span>
                  <span>{s.date} — {s.time}</span>
                </div>
                <div className="records-list__row">
                  <span className="records-list__label">شماره جلسه</span>
                  <span>جلسه {s.sessionNumber.toLocaleString("fa-IR")}</span>
                </div>
                <div className="records-list__row">
                  <span className="records-list__label">مبلغ</span>
                  <span>{s.price}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SessionRecordsPage;
