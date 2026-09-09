import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Clock } from "lucide-react";
import * as DatePickerModule from "react-multi-date-picker";
// Confirmed by inspecting the module: Vite wraps this package's
// export in two layers of interop, so the real forwardRef component
// sits at .default.default, not just .default.
const DatePicker = DatePickerModule.default.default;
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import gregorian from "react-date-object/calendars/gregorian";
import api from "../api";
import { translateApiError } from "../utils/apiErrors";
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

function CounselorCalendarPage() {
  const [slots, setSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [date, setDate] = useState(null); // DateObject from the picker, not a plain string
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

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
      // sending. The user only ever sees/picks Jalali; the backend
      // only ever sees/stores Gregorian.
      const gregorianDate = date.convert(gregorian).format("YYYY-MM-DD");

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

  // Group slots by date so the calendar reads as day-sections, each
  // containing that day's time blocks in order.
  const groupedByDate = useMemo(() => {
    const groups = {};
    for (const slot of slots) {
      if (!groups[slot.date]) groups[slot.date] = [];
      groups[slot.date].push(slot);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [slots]);

  function OpenInfo(slot) {
    console.log(slot);
    setSelectedClient(slot.booked_by);
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
          <h2 className="counselor-calendar-card__title">تقویم زمان‌های شما</h2>

          {isLoading ? (
            <p className="counselor-calendar-status">در حال بارگذاری...</p>
          ) : groupedByDate.length === 0 ? (
            <p className="counselor-calendar-status">هنوز زمانی ثبت نکرده‌اید.</p>
          ) : (
            <div className="counselor-calendar-days">
              {groupedByDate.map(([dayDate, daySlots]) => (
                <div className="counselor-calendar-day" key={dayDate}>
                  <h3 className="counselor-calendar-day__title">
                    {toJalaliWeekday(dayDate)}
                  </h3>
                  <div className="counselor-calendar-day__slots">
                    {daySlots.map((slot) => (
                      <div
                        key={slot.id}
                        className={`counselor-slot-chip ${slot.is_booked
                          ? "counselor-slot-chip--booked"
                          : "counselor-slot-chip--free"
                          }`}
                      >
                        <Clock size={13} />
                        <span>
                          {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                        </span>
                        <span className="counselor-slot-chip__status">
                          {slot.is_booked ? "رزرو شده" : "آزاد"}
                        </span>
                        {slot.is_booked && slot.booked_by && (
                          <button className="counselor-slot-chip__client" onClick={() => OpenInfo(slot)}>
                            <img src={slot.booked_by.avatar} alt={slot.booked_by.name} className="user_avatar" />
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
      </div>
      {selectedClient && (
        <div className="open_info">
          <img
            src={selectedClient.avatar}
            alt={selectedClient.name}
          />

          <h1>{selectedClient.name}</h1>
          <p>{selectedClient.phone}</p>
          <button onClick={() => setSelectedClient(null)}>بستن</button>
        </div>
      )}
    </div>
  );
}

export default CounselorCalendarPage;
