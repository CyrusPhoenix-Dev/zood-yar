import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import { Star, Users, Send, LogIn } from "lucide-react";
import api from "../api";
import { useAuthStatus } from "../hooks/useAuthStatus";
import { translateApiError } from "../utils/apiErrors";
import "../styles/CounselorProfile.css";

function StarPicker({ value, onChange }) {
  return (
    <div className="counselor-profile-star-picker">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className="counselor-profile-star-btn"
          onClick={() => onChange(n)}
          aria-label={`${n} ستاره`}
        >
          <Star
            size={22}
            className={n <= value ? "counselor-profile-star--filled" : "counselor-profile-star--empty"}
          />
        </button>
      ))}
    </div>
  );
}

function CounselorProfilePage() {
  const { id } = useParams();
  const isAuthenticated = useAuthStatus();

  const [counselor, setCounselor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewableBookingId, setReviewableBookingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const loadReviews = () => {
    api
      .get(`/api/counselors/${id}/reviews/`)
      .then((res) => setReviews(res.data.results ?? res.data))
      .catch((err) => console.error(err));
  };

  // Counselor profile + reviews are public — anyone can see them,
  // logged in or not.
  useEffect(() => {
    setIsLoading(true);
    setError("");

    Promise.all([
      api.get(`/api/counselors/${id}/`),
      api.get(`/api/counselors/${id}/reviews/`),
    ])
      .then(([counselorRes, reviewsRes]) => {
        setCounselor(counselorRes.data);
        setReviews(reviewsRes.data.results ?? reviewsRes.data);
      })
      .catch((err) => {
        setError(translateApiError(err));
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  // The "can I review?" check is authenticated-only — skip the call
  // entirely when logged out instead of firing it and catching a 401.
  // This is what actually gates the review form: an anonymous visitor
  // never has a reviewableBookingId, so the form never renders for them.
  useEffect(() => {
    if (!isAuthenticated) {
      setReviewableBookingId(null);
      return;
    }

    let isMounted = true;
    api
      .get(`/api/counselors/${id}/reviewable-booking/`)
      .then((res) => {
        if (isMounted) setReviewableBookingId(res.data.booking_id);
      })
      .catch(() => {
        if (isMounted) setReviewableBookingId(null);
      });

    return () => {
      isMounted = false;
    };
  }, [id, isAuthenticated]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      setSubmitError("لطفا امتیاز خود را انتخاب کنید");
      return;
    }
    setSubmitError("");
    setIsSubmitting(true);
    try {
      await api.post("/api/reviews/", {
        booking: reviewableBookingId,
        rating,
        comment,
      });
      setReviewableBookingId(null); // one review per booking — can't submit again
      setRating(0);
      setComment("");
      setSubmitSuccess(true);
      // Not calling loadReviews() here — the new review won't appear
      // in the public list until an admin approves it, so refetching
      // now would just show the same list as before and look broken.
    } catch (err) {
      setSubmitError(translateApiError(err));
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <p className="counselor-profile-status">در حال بارگذاری...</p>;
  }

  if (error || !counselor) {
    return (
      <p className="counselor-profile-status counselor-profile-status--error">
        {error || "مشاور پیدا نشد"}
      </p>
    );
  }

  return (
    <div className="counselor-profile-page">
      {/* ===== Header ===== */}
      <div className="counselor-profile-header">
        <img
          src={counselor.avatar || "/default-avatar.png"}
          alt={counselor.name}
          className="counselor-profile-avatar"
        />
        <div className="counselor-profile-header__info">
          <h1 className="counselor-profile-name">{counselor.name}</h1>

          <div className="counselor-profile-meta">
            <span className="counselor-profile-meta-item">
              <Star size={16} className="counselor-profile-star--filled" />
              {counselor.rating != null ? counselor.rating.toLocaleString("fa-IR") : "بدون امتیاز"}
            </span>
            <span className="counselor-profile-meta-item">
              <Users size={16} />
              {counselor.bookings.toLocaleString("fa-IR")} رزرو
            </span>
          </div>

          {counselor.specialties?.length > 0 && (
            <div className="counselor-profile-specialties">
              {counselor.specialties.map((sp) => (
                <span key={sp.slug} className="counselor-profile-specialty-chip">
                  {sp.label}
                </span>
              ))}
            </div>
          )}

          <Link to={`/BookingPage/${id}`} className="counselor-profile-book-btn">
            رزرو نوبت
          </Link>
        </div>
      </div>

      {/* ===== Bio ===== */}
      {counselor.bio && (
        <div className="counselor-profile-card">
          <h2 className="counselor-profile-card__title">درباره</h2>
          <p className="counselor-profile-bio">{counselor.bio}</p>
        </div>
      )}

      {/* ===== Leave a review =====
          - Not logged in → soft prompt to log in, no form
          - Logged in but no eligible completed booking → nothing shown
          - Logged in with an eligible booking → the actual form */}
      {!isAuthenticated ? (
        <div className="counselor-profile-card counselor-profile-login-prompt">
          <LogIn size={18} />
          <span>
            برای ثبت نظر و امتیاز، ابتدا{" "}
            <Link to="/login" className="counselor-profile-login-link">
              وارد حساب کاربری
            </Link>{" "}
            خود شوید.
          </span>
        </div>
      ) : (
        reviewableBookingId ? (
          <div className="counselor-profile-card">
            <h2 className="counselor-profile-card__title">ثبت نظر شما</h2>
            <form onSubmit={handleSubmitReview}>
              <StarPicker value={rating} onChange={setRating} />

              <textarea
                className="counselor-profile-comment-input"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="تجربه خود از این جلسه را بنویسید (اختیاری)"
              />

              {submitError && <p className="counselor-profile-error">{submitError}</p>}

              <button
                type="submit"
                className="counselor-profile-submit-btn"
                disabled={isSubmitting}
              >
                <Send size={14} />
                {isSubmitting ? "در حال ثبت..." : "ثبت نظر"}
              </button>
            </form>
          </div>
        ) : (
          submitSuccess && (
            <div className="counselor-profile-card counselor-profile-pending-notice">
              نظر شما ثبت شد و پس از بررسی و تایید، به‌صورت عمومی نمایش داده خواهد شد.
            </div>
          )
        )
      )}

      {/* ===== Existing reviews — always visible, logged in or not ===== */}
      <div className="counselor-profile-card">
        <h2 className="counselor-profile-card__title">
          نظرات کاربران ({reviews.length.toLocaleString("fa-IR")})
        </h2>

        {reviews.length === 0 ? (
          <p className="counselor-profile-status">هنوز نظری ثبت نشده است.</p>
        ) : (
          <ul className="counselor-profile-reviews-list">
            {reviews.map((r) => (
              <li key={r.id} className="counselor-profile-review-item">
                <div className="counselor-profile-review-item__header">
                  <span className="counselor-profile-review-item__name">{r.reviewer_name}</span>
                  <span className="counselor-profile-review-item__stars">
                    {"★".repeat(r.rating)}
                    {"☆".repeat(5 - r.rating)}
                  </span>
                </div>
                {r.comment && (
                  <p className="counselor-profile-review-item__comment">{r.comment}</p>
                )}
                <span className="counselor-profile-review-item__date">
                  {new Date(r.created_at).toLocaleDateString("fa-IR")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default CounselorProfilePage;
