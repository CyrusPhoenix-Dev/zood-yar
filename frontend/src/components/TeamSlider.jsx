import { useRef, useState, useEffect } from "react";
import { Star, Users, ChevronLeft, ChevronRight } from "lucide-react";
import api from "../api";
import { translateApiError } from "../utils/apiErrors";
import "../styles/TeamSlider.css";

function CounselorSlider() {
  const trackRef = useRef(null);
  const [counselors, setCounselors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/api/counselors/top/")
      .then((res) => setCounselors(res.data))
      .catch((err) => {
        setError(translateApiError(err));
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const scrollByPage = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth, behavior: "smooth" });
  };

  if (isLoading) {
    return (
      <div className="counselor-slider-container">
        <p className="counselor-slider__status">در حال بارگذاری...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="counselor-slider-container">
        <p className="counselor-slider__status counselor-slider__status--error">
          {error}
        </p>
      </div>
    );
  }

  if (counselors.length === 0) {
    return null; // nothing to show yet — no verified counselors with data
  }

  return (
    <div className="counselor-slider-container">
      <div className="counselor-slider__header">
        <h2 className="counselor-slider__title">مشاوران برتر</h2>
        <div className="counselor-slider__arrows">
          <button
            type="button"
            className="counselor-slider__arrow"
            onClick={() => scrollByPage(1)}
            aria-label="مشاوران بعدی"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            className="counselor-slider__arrow"
            onClick={() => scrollByPage(-1)}
            aria-label="مشاوران قبلی"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="counselor-slider__track" ref={trackRef}>
        {counselors.map((c) => (
          <div className="counselor-card" key={c.id}>
            <img
              src={c.avatar || "/default-avatar.png"}
              alt={c.name}
              className="counselor-card__avatar"
            />
            <h3 className="counselor-card__name">{c.name}</h3>
            <p className="counselor-card__description">{c.bio}</p>

            <div className="counselor-card__meta">
              <span className="counselor-card__meta-item">
                <Users size={14} />
                {c.bookings.toLocaleString("fa-IR")} رزرو
              </span>
              <span className="counselor-card__meta-item">
                <Star size={14} className="counselor-card__star" />
                {c.rating != null ? c.rating.toLocaleString("fa-IR") : "بدون امتیاز"}
              </span>
            </div>

            <div className="counselor-card__actions">
              <a
                href={`/CounselorProfile/${c.id}`}
                className="counselor-card__btn counselor-card__btn--ghost"
              >
                مشاهده پروفایل
              </a>
              <a
                href={`/BookingPage/${c.id}`}
                className="counselor-card__btn counselor-card__btn--primary"
              >
                رزرو نوبت
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CounselorSlider;
