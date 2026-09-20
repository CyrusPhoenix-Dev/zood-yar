import { useState, useEffect, useMemo, useRef } from "react";
import { Plus, Trash2, Clock, ChevronRight } from "lucide-react";
import * as DatePickerModule from "react-multi-date-picker";
import DateObject from "react-date-object";

// Confirmed by inspecting the module: Vite wraps this package's
// export in two layers of interop, so the real forwardRef component
// sits at .default.default, not just .default.
const DatePicker = DatePickerModule.default.default;
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import gregorian from "react-date-object/calendars/gregorian";
import api from "../api";
import { translateApiError } from "../utils/apiErrors";
import { useAppDialog } from "../components/AppDialogProvider";
import ScheduleGenerator from "../components/ScheduleGenerator";
import "../styles/CounselorCalendar.css";

function toJalaliWeekday(dateStr) {
  // Simple grouping label — swap for a real Jalali date library
  // (e.g. jalaali-js) if you want actual Persian calendar dates
  // instead of the Gregorian date grouping used here for now.
  return new Date(dateStr).toLocaleDateString("fa-IR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function toJalaliDate(gregorianDateStr) {
  return new DateObject({ date: gregorianDateStr, format: "YYYY-MM-DD", calendar: gregorian })
    .convert(persian)
    .setLocale(persian_fa);
}

function jalaliMonthKey(gregorianDateStr) {
  const jd = toJalaliDate(gregorianDateStr);
  return `${jd.year}-${String(jd.month.number).padStart(2, "0")}`;
}

function jalaliMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const jd = new DateObject({ year, month, day: 1, calendar: persian, locale: persian_fa });
  return jd.format("MMMM YYYY");
}

function dateObjectToGregorianStr(dateObj) {
  const g = dateObj.convert(gregorian);
  return `${g.year}-${String(g.month.number).padStart(2, "0")}-${String(g.day).padStart(2, "0")}`;
}

function CounselorCalendarPage() {
  const [slots, setSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [date, setDate] = useState(null); // DateObject from the picker, not a plain string
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [selectedBookingPast, setSelectedBookingPast] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // ===== Month → day drill-down =====
  const [selectedMonthKey, setSelectedMonthKey] = useState(null); // "YYYY-MM" or null

  const { alertDialog, confirmDialog } = useAppDialog();
  const infoBoxRef = useRef(null);
  const handleDeleteMonth = async () => {
    if (!selectedMonthKey) return;

    const [year, month] = selectedMonthKey.split("-").map(Number);

    // Create separate DateObjects so calculating the end date
    // cannot modify the start date.
    const startJalali = new DateObject({
      year,
      month,
      day: 1,
      calendar: persian,
      locale: persian_fa,
    });

    const endJalali = new DateObject({
      year,
      month,
      day: 1,
      calendar: persian,
      locale: persian_fa,
    })
      .add(1, "month")
      .subtract(1, "day");

    const startStr = dateObjectToGregorianStr(startJalali);
    const endStr = dateObjectToGregorianStr(endJalali);

    const monthSlotCount = selectedMonthDays.reduce((sum, [, s]) => sum + s.length, 0);
    const bookedCount = selectedMonthDays.reduce(
      (sum, [, s]) => sum + s.filter((x) => x.is_booked).length,
      0
    );
    const freeCount = monthSlotCount - bookedCount;

    if (freeCount === 0) {
      await alertDialog("همه زمان‌های این ماه رزرو شده‌اند و قابل حذف نیستند.");
      return;
    }

    const confirmed = await confirmDialog(
      bookedCount > 0
        ? `${freeCount} زمان آزاد این ماه حذف می‌شود. ${bookedCount} زمان رزرو شده باقی می‌ماند.`
        : `آیا از حذف همه زمان‌های این ماه (${freeCount} زمان) مطمئن هستید؟`,
      { danger: true }
    );
    if (!confirmed) return;

    setError("");
    try {
      const res = await api.delete(
        `/api/counselor/slots/range/?start_date=${startStr}&end_date=${endStr}`
      );
      await fetchSlots();
      setSelectedMonthKey(null);
      if (res.data.booked_remaining > 0) {
        await alertDialog(
          `${res.data.deleted} زمان حذف شد. ${res.data.booked_remaining} زمان رزرو شده باقی ماند.`
        );
      }
    } catch (err) {
      setError(translateApiError(err));
      console.error(err);
    }
  };

  const fetchSlots = async () => {
    try {
      const res = await api.get("/api/counselor/slots/");
      setSlots(res.data);
    } catch (err) {
      setError(translateApiError(err));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  useEffect(() => {
    if (!selectedClient) return;

    function handleClickOutside(e) {
      if (infoBoxRef.current && !infoBoxRef.current.contains(e.target)) {
        setSelectedClient(null);
        setSelectedBookingId(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedClient]);

  const handleAddSlot = async (e) => {
    e.preventDefault();
    if (!date || !startTime || !endTime) {
      setError("تاریخ، زمان شروع و زمان پایان را وارد کنید");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      // The picker gives us a Jalali DateObject — Django's DateField
      // expects plain Gregorian (YYYY-MM-DD), so convert right before
      // sending. Pulled directly off the converted DateObject's
      // numeric fields rather than .format(), since .format() renders
      // digits using the attached locale (Persian numerals), which
      // Date() can't parse.
      const g = date.convert(gregorian);
      const gregorianDate = `${g.year}-${String(g.month.number).padStart(2, "0")}-${String(
        g.day
      ).padStart(2, "0")}`;

      await api.post("/api/counselor/slots/", {
        date: gregorianDate,
        start_time: startTime,
        end_time: endTime,
      });
      setDate(null);
      setStartTime("");
      setEndTime("");
      fetchSlots();
    } catch (err) {
      setError(translateApiError(err));
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    setError("");
    try {
      await api.delete(`/api/counselor/slots/${id}/`);
      setSlots((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(translateApiError(err));
      console.error(err);
    }
  };

  const handleDeleteDay = async (dayDate, daySlots) => {
    const bookedCount = daySlots.filter((s) => s.is_booked).length;
    const freeCount = daySlots.length - bookedCount;

    if (freeCount === 0) {
      await alertDialog("همه زمان‌های این روز رزرو شده‌اند و قابل حذف نیستند.");
      return;
    }

    const confirmed = await confirmDialog(
      bookedCount > 0
        ? `${freeCount} زمان آزاد این روز حذف می‌شود. ${bookedCount} زمان رزرو شده باقی می‌ماند.`
        : `آیا از حذف همه زمان‌های این روز (${freeCount} زمان) مطمئن هستید؟`,
      { danger: true }
    );
    if (!confirmed) return;

    setError("");
    try {
      const res = await api.delete(`/api/counselor/slots/day/${dayDate}/`);
      fetchSlots();
      if (res.data.booked_remaining > 0) {
        await alertDialog(
          `${res.data.deleted} زمان حذف شد. ${res.data.booked_remaining} زمان رزرو شده باقی ماند.`
        );
      }
    } catch (err) {
      setError(translateApiError(err));
      console.error(err);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBookingId) return;
    const confirmed = await confirmDialog(
      `آیا از لغو نوبت ${selectedClient?.name || ""} مطمئن هستید؟`,
      { danger: true }
    );
    if (!confirmed) return;

    setIsCancelling(true);
    setError("");
    try {
      const res = await api.post(`/api/bookings/${selectedBookingId}/cancel/`);
      await alertDialog(
        res.data.refunded
          ? "نوبت لغو شد. مبلغ به کاربر عودت داده خواهد شد."
          : "نوبت لغو شد."
      );
      setSelectedClient(null);
      setSelectedBookingId(null);
      fetchSlots();
    } catch (err) {
      setError(translateApiError(err));
      console.error(err);
    } finally {
      setIsCancelling(false);
    }
  };

  // Group slots by date so each day-section holds that day's time
  // blocks in order.
  const groupedByDate = useMemo(() => {
    const groups = {};
    for (const slot of slots) {
      if (!groups[slot.date]) groups[slot.date] = [];
      groups[slot.date].push(slot);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [slots]);

  // Group the days themselves by calendar month ("YYYY-MM" from the
  // Gregorian date string) so the calendar opens on a month list
  // first, not a flat list of every day — a counselor with months of
  // generated slots would otherwise be scrolling forever.
  const groupedByMonth = useMemo(() => {
    const groups = {};
    for (const [dayDate, daySlots] of groupedByDate) {
      const monthKey = jalaliMonthKey(dayDate);
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push([dayDate, daySlots]);
    }
    // Sort by actual Jalali year/month order, not string order — string
    // sort would misorder across year boundaries or double-digit months.
    return Object.entries(groups).sort(([a], [b]) => {
      const [ay, am] = a.split("-").map(Number);
      const [by, bm] = b.split("-").map(Number);
      return ay - by || am - bm;
    });
  }, [groupedByDate]);

  const selectedMonthDays = useMemo(() => {
    if (!selectedMonthKey) return [];
    const found = groupedByMonth.find(([key]) => key === selectedMonthKey);
    return found ? found[1] : [];
  }, [groupedByMonth, selectedMonthKey]);

  function OpenInfo(slot) {
    setSelectedClient(slot.booked_by);
    setSelectedBookingId(slot.booked_by?.id ?? null);

    const sessionStart = new Date(`${slot.date}T${slot.start_time}`);
    setSelectedBookingPast(sessionStart <= new Date());
  }

  return (
    <div className="counselor-calendar-page">
      <div className="counselor-calendar-content">
        {/* ===== Add new slot ===== */}
        <div className="counselor-calendar-card">
          <h1 className="counselor-calendar-card__title">افزودن زمان جدید</h1>
          <form className="counselor-calendar-form" onSubmit={handleAddSlot} noValidate>
            <div className="counselor-calendar-field">
              <label htmlFor="date" className="counselor-calendar-field__label">
                تاریخ
              </label>
              <DatePicker
                value={date}
                onChange={setDate}
                calendar={persian}
                locale={persian_fa}
                calendarPosition="bottom-right"
                inputClass="counselor-calendar-input"
                placeholder="انتخاب تاریخ"
              />
            </div>
            <div className="counselor-calendar-field">
              <label htmlFor="startTime" className="counselor-calendar-field__label">
                از ساعت
              </label>
              <input
                id="startTime"
                type="time"
                lang="en-GB"
                className="counselor-calendar-input"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="counselor-calendar-field">
              <label htmlFor="endTime" className="counselor-calendar-field__label">
                تا ساعت
              </label>
              <input
                id="endTime"
                type="time"
                lang="en-GB"
                className="counselor-calendar-input"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="counselor-calendar-add-btn"
              disabled={isSubmitting}
            >
              <Plus size={16} />
              {isSubmitting ? "در حال افزودن..." : "افزودن"}
            </button>
          </form>
          {error && <p className="counselor-calendar-error">{error}</p>}
        </div>

        {/* ===== Calendar view ===== */}
        <div className="counselor-calendar-card">
          {selectedMonthKey ? (
            <div className="counselor-calendar-month-header">
              <button
                type="button"
                className="counselor-calendar-back-btn"
                onClick={() => setSelectedMonthKey(null)}
              >
                <ChevronRight size={16} />
                بازگشت به ماه‌ها
              </button>
              <div className="counselor-calendar-month-header__row">
                <h2 className="counselor-calendar-card__title">
                  {jalaliMonthLabel(selectedMonthKey)}
                </h2>
                <button
                  type="button"
                  className="counselor-calendar-day__delete-btn"
                  onClick={handleDeleteMonth}
                >
                  <Trash2 size={14} />
                  حذف کل ماه
                </button>
              </div>
            </div>
          ) : (
            <h2 className="counselor-calendar-card__title">تقویم زمان‌های شما</h2>
          )}

          {isLoading ? (
            <p className="counselor-calendar-status">در حال بارگذاری...</p>
          ) : groupedByMonth.length === 0 ? (
            <p className="counselor-calendar-status">هنوز زمانی ثبت نکرده‌اید.</p>
          ) : !selectedMonthKey ? (
            /* ===== Month list ===== */
            <div className="counselor-calendar-months">
              {groupedByMonth.map(([monthKey, monthDays]) => {
                const slotCount = monthDays.reduce((sum, [, s]) => sum + s.length, 0);
                return (
                  <button
                    key={monthKey}
                    type="button"
                    className="counselor-calendar-month-card"
                    onClick={() => setSelectedMonthKey(monthKey)}
                  >
                    <span className="counselor-calendar-month-card__title">
                      {jalaliMonthLabel(monthKey)}
                    </span>
                    <span className="counselor-calendar-month-card__meta">
                      {monthDays.length.toLocaleString("fa-IR")} روز —{" "}
                      {slotCount.toLocaleString("fa-IR")} زمان
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            /* ===== Day list for the selected month ===== */
            <div className="counselor-calendar-days">
              {selectedMonthDays.map(([dayDate, daySlots]) => (
                <div className="counselor-calendar-day" key={dayDate}>
                  <div className="counselor-calendar-day__header">
                    <h3 className="counselor-calendar-day__title">
                      {toJalaliWeekday(dayDate)}
                    </h3>
                    <button
                      type="button"
                      className="counselor-calendar-day__delete-btn"
                      onClick={() => handleDeleteDay(dayDate, daySlots)}
                      aria-label="حذف همه زمان‌های این روز"
                    >
                      <Trash2 size={14} />
                      حذف روز
                    </button>
                  </div>
                  <div className="counselor-calendar-day__slots">
                    {daySlots.map((slot) => (
                      <div
                        key={slot.id}
                        className={`counselor-slot-chip ${slot.is_booked
                          ? "counselor-slot-chip--booked"
                          : "counselor-slot-chip--free"
                          } ${slot.source === "generated" ? "counselor-slot-chip--generated" : ""}`}
                      >
                        <Clock size={13} />
                        <span>
                          {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                        </span>
                        <span className="counselor-slot-chip__status">
                          {slot.is_booked ? "رزرو شده" : "آزاد"}
                        </span>
                        {slot.is_booked && slot.booked_by && (
                          <button
                            className="counselor-slot-chip__client"
                            onClick={() => OpenInfo(slot)}
                          >
                            <img
                              src={slot.booked_by.avatar}
                              alt={slot.booked_by.name}
                              className="user_avatar"
                            />
                            <span>{slot.booked_by.name}</span>
                          </button>
                        )}
                        {!slot.is_booked && (
                          <button
                            type="button"
                            className="counselor-slot-chip__delete"
                            onClick={() => handleDelete(slot.id)}
                            aria-label="حذف این زمان"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ===== Auto-generate schedule ===== */}
        <ScheduleGenerator onGenerated={fetchSlots} />
      </div>

      {selectedClient && (
        <div className="open_info" ref={infoBoxRef}>
          <img src={selectedClient.avatar} alt={selectedClient.name} />

          <h1>{selectedClient.name}</h1>
          <p>{selectedClient.phone}</p>

          {selectedBookingId && !selectedBookingPast && (
            <button
              type="button"
              className="open_info__cancel-btn"
              onClick={handleCancelBooking}
              disabled={isCancelling}
            >
              {isCancelling ? "در حال لغو..." : "لغو نوبت"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default CounselorCalendarPage;