import { useState } from "react";
import { Quote } from "lucide-react";
import "../styles/Quote.css";

// Swap with a real quote fetched per-day from your backend/API later —
// static for now.
const quotes = [
  {
    text: "سلامت روان، پیش‌نیاز هر موفقیتی است؛ مراقبت از ذهن خود را به تعویق نیندازید.",
    author: "تیم زودیار",
  },
  {
    text: "صحبت کردن درباره احساسات، نشانه ضعف نیست؛ نشانه شجاعت است.",
    author: "تیم زودیار",
  },
  {
    text: "هر قدم کوچک به سمت مراقبت از خود، یک پیروزی بزرگ است.",
    author: "تیم زودیار",
  },
  {
    text: "درخواست کمک، اولین قدم برای تغییر است.",
    author: "تیم زودیار",
  },
  {
    text: "هیچ‌کس مجبور نیست به‌تنهایی با مشکلاتش روبه‌رو شود.",
    author: "تیم زودیار",
  },
];

// Picked once per component mount (i.e. once per page load), not on
// every re-render — the lazy initializer form of useState runs only
// on the first render.
function getRandomQuote() {
  return quotes[Math.floor(Math.random() * quotes.length)];
}

function QuoteOfDay() {
  const [quote] = useState(getRandomQuote);

  return (
    <section className="quote-section">
      <div className="quote-card">
        <div className="quote-card__icon-wrap">
          <Quote size={28} className="quote-card__icon" />
        </div>

        <p className="quote-card__text">{quote.text}</p>

        <div className="quote-card__divider" />

        <p className="quote-card__author">{quote.author}</p>
        <p className="quote-card__label">نقل قول امروز</p>
      </div>
    </section>
  );
}

export default QuoteOfDay;
