import { useState, useEffect, useMemo } from "react";
import { useParams, } from "react-router";
import { Clock } from "lucide-react";
import api from "../api";
import { translateApiError } from "../utils/apiErrors";
import "../styles/BookingPage.css";

function BookingPage() {
  const { id } = useParams(); // counselor id

  const [counselor, setCounselor] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState("");

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      api.get(`/api/counselors/${id}/`),
      api.get(`/api/counselors/${id}/slots/`),
    ])
      .then(([counselorRes, slotsRes]) => {
        setCounselor(counselorRes.data);
        setSlots(slotsRes.data.results ?? slotsRes.data);
      })
      .catch((err) => {
        setError(translateApiError(err));
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  // Group slots by date so the calendar reads as day-sections. The
  // backend already excludes past *days* (date__gte=today), but a
  // slot that's today and already ended still comes through — that
  // gets filtered out here, on the client, purely for display. Slots
  // aren't deleted anywhere; this only hides what's already elapsed.
  const groupedByDate = useMemo(() => {
    const now = new Date();
    const upcoming = slots.filter((slot) => {
      const slotEnd = new Date(`${slot.date}T${slot.end_time}`);
      return slotEnd > now;
    });

    const groups = {};
    for (const slot of upcoming) {
      if (!groups[slot.date]) groups[slot.date] = [];
      groups[slot.date].push(slot);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [slots]);

  const selectedSlot = slots.find((s) => s.id === selectedSlotId);

  const handleConfirmBooking = async () => {
    if (!selectedSlotId) {
      setBookingError("لطفا یک زمان را انتخاب کنید");
      return;
    }
    setBookingError("");
    setIsBooking(true);
    try {
      // Starts a real Zarinpal payment for this slot — the backend
      // does NOT create the booking yet, only once Zarinpal verifies
      // the payment on its own callback. This redirects the whole
      // browser away to Zarinpal's pay page; there's no "step 2" to
      // call from here anymore.
      const res = await api.post(`/api/slots/${selectedSlotId}/purchase/`);
      window.location.href = res.data.pay_url;
    } catch (err) {
      setBookingError(translateApiError(err));
      console.error(err);
      // Slot might've just been taken by someone else, or a payment
      // is already in progress for it — refresh the list so the user
      // sees current reality, not stale options.
      api
        .get(`/api/counselors/${id}/slots/`)
        .then((res) => setSlots(res.data.results ?? res.data))
        .catch(() => {});
      setSelectedSlotId(null);
      setIsBooking(false);
    }
  };

  if (isLoading) {
    return <p className="booking-page-status">در حال بارگذاری...</p>;
  }

  if (error || !counselor) {
    return (
      <p className="booking-page-status booking-page-status--error">
        {error || "مشاور پیدا نشد"}
      </p>
    );
  }

  return (
    <div className="booking-page">
      <div className="booking-page__header">
        <img
          src={counselor.avatar || "/default-avatar.png"}
          alt={counselor.name}
          className="booking-page__avatar"
        />
        <div>
          <h1 className="booking-page__title">رزرو نوبت با {counselor.name}</h1>
          {counselor.session_price > 0 && (
            <p className="booking-page__price">
              هزینه هر جلسه: {counselor.session_price.toLocaleString("fa-IR")} تومان
            </p>
          )}
        </div>
      </div>

      {groupedByDate.length === 0 ? (
        <p className="booking-page-status">این مشاور در حال حاضر زمان آزادی ندارد.</p>
      ) : (
        <div className="booking-page__days">
          {groupedByDate.map(([date, daySlots]) => (
            <div className="booking-day" key={date}>
              <h3 className="booking-day__title">
                {new Date(date).toLocaleDateString("fa-IR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </h3>
              <div className="booking-day__slots">
                {daySlots.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    className={`booking-slot-btn ${
                      slot.id === selectedSlotId ? "booking-slot-btn--selected" : ""
                    }`}
                    onClick={() => {
                      setSelectedSlotId(slot.id);
                      setBookingError("");
                    }}
                  >
                    <Clock size={13} />
                    {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedSlot && (
        <div className="booking-page__confirm-bar">
          <span className="booking-page__confirm-text">
            زمان انتخاب‌شده: {new Date(selectedSlot.date).toLocaleDateString("fa-IR")} —{" "}
            {selectedSlot.start_time.slice(0, 5)}
          </span>

          {bookingError && <p className="booking-page__error">{bookingError}</p>}

          <button
            type="button"
            className="booking-page__btn booking-page__btn--primary"
            onClick={handleConfirmBooking}
            disabled={isBooking}
          >
            {isBooking ? "در حال انتقال به درگاه پرداخت..." : "پرداخت و رزرو نهایی"}
          </button>
        </div>
      )}
    </div>
  );
}

export default BookingPage;