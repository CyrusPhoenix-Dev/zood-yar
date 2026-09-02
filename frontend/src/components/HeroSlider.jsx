import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "../styles/HeroSlider.css";


/**
 * slides: [{ image: "url", caption: "text shown at bottom center" }]
 * autoPlay: ms interval, 0 or omitted disables autoplay
 */
const defaultSlides = [
  {
    image: "https://picsum.photos/seed/zoodyar1/1200/450",
    caption: "۲۰٪ تخفیف برای اولین رزرو مشاوره",
  },
  {
    image: "https://picsum.photos/seed/zoodyar2/1200/450",
    caption: "بیش از ۵۰۰ متخصص معتبر در انتظار شما",
  },
  {
    image: "https://picsum.photos/seed/zoodyar3/1200/450",
    caption: "رزرو آنلاین در کمتر از دو دقیقه",
  },
  {
    image: "https://picsum.photos/seed/zoodyar4/1200/450",
    caption: "پشتیبانی ۲۴ ساعته برای مشتریان",
  },
  {
    image: "https://picsum.photos/seed/zoodyar5/1200/450",
    caption: "به زودی: خدمات حضوری در سراسر کشور",
  },
];

function Slider({ slides = defaultSlides, autoPlay = 5000 }) {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

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

  if (slides.length === 0) return null;

  return (
    <div className="slider-container">
      <div
        className="slider"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Track direction is forced LTR so translateX math stays predictable
            regardless of the page's RTL context — only the caption text
            itself follows the document's natural reading direction. */}
        <div
          className="slider__track"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {slides.map((slide, index) => (
            <div
              key={index}
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
          ))}
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

export default Slider;
