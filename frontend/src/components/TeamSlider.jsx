import { useRef } from "react";
import { Star, Users, ChevronLeft, ChevronRight } from "lucide-react";
import "../styles/TeamSlider.css";

// Sample data — swap with real counselor records from your API.
const defaultCounselors = [
  {
    id: 1,
    name: "دکتر سید محمد حسینی",
    avatar: "https://i.pravatar.cc/200?img=12",
    description: "متخصص مشاوره خانواده، ازدواج و طلاق با ۱۰ سال سابقه",
    bookings: 482,
    rating: 4.9,
  },
  {
    id: 2,
    name: "دکتر مریم صادقی",
    avatar: "https://i.pravatar.cc/200?img=32",
    description: "روان‌شناس بالینی، متخصص اضطراب و افسردگی",
    bookings: 356,
    rating: 4.8,
  },
  {
    id: 3,
    name: "دکتر علی رضایی",
    avatar: "https://i.pravatar.cc/200?img=51",
    description: "مشاور کودک و نوجوان، متخصص مشکلات رفتاری",
    bookings: 210,
    rating: 4.7,
  },
  {
    id: 4,
    name: "دکتر نگار کریمی",
    avatar: "https://i.pravatar.cc/200?img=45",
    description: "مشاور شغلی و مسیر پیشرفت حرفه‌ای",
    bookings: 128,
    rating: 4.9,
  },
  {
    id: 5,
    name: "دکتر امیر حسینی",
    avatar: "https://i.pravatar.cc/200?img=15",
    description: "متخصص ترک اعتیاد و بازتوانی رفتاری",
    bookings: 190,
    rating: 4.6,
  },
  {
    id: 6,
    name: "دکتر سارا احمدی",
    avatar: "https://i.pravatar.cc/200?img=47",
    description: "مشاور تحصیلی و برنامه‌ریزی آموزشی",
    bookings: 267,
    rating: 4.8,
  },
];

function CounselorSlider({ counselors = defaultCounselors }) {
  const trackRef = useRef(null);

  const scrollByPage = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    // Scroll by one full viewport width of the track, so it moves
    // exactly "one page" worth of visible cards at a time.
    track.scrollBy({ left: direction * track.clientWidth, behavior: "smooth" });
  };

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
              src={c.avatar}
              alt={c.name}
              className="counselor-card__avatar"
            />
            <h3 className="counselor-card__name">{c.name}</h3>
            <p className="counselor-card__description">{c.description}</p>

            <div className="counselor-card__meta">
              <span className="counselor-card__meta-item">
                <Users size={14} />
                {c.bookings.toLocaleString("fa-IR")} رزرو
              </span>
              <span className="counselor-card__meta-item">
                <Star size={14} className="counselor-card__star" />
                {c.rating.toLocaleString("fa-IR")}
              </span>
            </div>

            <div className="counselor-card__actions">
              <a
                href={`/counselors/${c.id}`}
                className="counselor-card__btn counselor-card__btn--ghost"
              >
                مشاهده پروفایل
              </a>
              <a
                href={`/counselors/${c.id}/book`}
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
