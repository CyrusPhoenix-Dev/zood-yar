import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "../styles/HeroSlider.css";
import { Link } from "react-router";
import api from "../api";

const SWIPE_THRESHOLD = 50; // px — minimum horizontal drag to count as a swipe, not a tap

/**
 * Fetches active hero slides from /api/hero-slides/ and renders them
 * as a slider. Managed entirely from Django admin — no props needed
 * for normal use; autoPlay is still overridable if some page wants a
 * different interval.
 */
function HeroSlider({ autoPlay = 5000 }) {
  const [slides, setSlides] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef(null);

  useEffect(() => {
    api
      .get("/api/hero-slides/")
      .then((res) => {
        setSlides(
          res.data.map((s) => ({
            image: s.image,
            caption: s.title || s.subtitle || "",
            link_url: s.link_url || null,
          }))
        );
      })
      .catch((err) => {
        // Fail quiet — a missing slider shouldn't break the homepage,
        // just render nothing where it would have been.
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const goTo = useCallback(
    (index) => {
      const next = (index + slides.length) % slides.length;
      setCurrent(next);
    },
    [slides.length]
  );

  const goPrev = useCallback(() => goTo(current - 1), [current, goTo]);
  const goNext = useCallback(() => goTo(current + 1), [current, goTo]);

  useEffect(() => {
    if (!autoPlay || slides.length <= 1 || isPaused) return;
    const timer = setInterval(goNext, autoPlay);
    return () => clearInterval(timer);
  }, [autoPlay, goNext, slides.length, isPaused]);

  // ===== Touch / swipe support (mobile) =====
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    setIsPaused(true); // pause autoplay while the user is interacting
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    setIsPaused(false);

    if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;

    // Track is forced LTR (see slider__track), so a physical
    // right-swipe (positive deltaX) always goes to the previous
    // slide, a left-swipe to the next — regardless of the page's
    // RTL context, same reasoning as the nav arrows below.
    if (deltaX > 0) {
      goPrev();
    } else {
      goNext();
    }
  };

  if (isLoading || slides.length === 0) return null;

  return (
    <div className="slider-container">
      <div
        className="slider"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Track direction is forced LTR so translateX math stays predictable
            regardless of the page's RTL context — only the caption text
            itself follows the document's natural reading direction. */}
        <div
          className="slider__track"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {slides.map((slide, index) => {
            const slideContent = (
              <div
                className="slider__slide"
                style={{ backgroundImage: `url(${slide.image})` }}
                aria-hidden={index !== current}
              >
                {slide.caption && (
                  <div className="slider__caption">
                    <p className="slider__caption-text">{slide.caption}</p>
                  </div>
                )}
              </div>
            );

            return (
              <div key={index} className="slider__slide-wrapper">
                {slide.link_url ? (
                  <Link to={slide.link_url} className="slider__slide-link">
                    {slideContent}
                  </Link>
                ) : (
                  slideContent
                )}
              </div>
            );
          })}
        </div>

        {slides.length > 1 && (
          <>
            <button
              type="button"
              className="slider__nav slider__nav--prev"
              onClick={goPrev}
              aria-label="اسلاید قبلی"
            >
              <ChevronRight size={22} />
            </button>
            <button
              type="button"
              className="slider__nav slider__nav--next"
              onClick={goNext}
              aria-label="اسلاید بعدی"
            >
              <ChevronLeft size={22} />
            </button>

            <div className="slider__dots">
              {slides.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  className={`slider__dot ${index === current ? "slider__dot--active" : ""}`}
                  onClick={() => goTo(index)}
                  aria-label={`رفتن به اسلاید ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default HeroSlider;