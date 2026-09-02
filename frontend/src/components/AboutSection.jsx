import { Users, CalendarCheck, Star } from "lucide-react";
import "../styles/AboutSection.css";

// Swap with real numbers from your backend once you have them.
const stats = [
  { icon: Users, value: "۳۰۰+", label: "مشاور متخصص" },
  { icon: CalendarCheck, value: "۱۲,۰۰۰+", label: "رزرو موفق" },
  { icon: Star, value: "۴.۸", label: "امتیاز رضایت" },
];

function AboutStats() {
  return (
    <section className="about-stats">
      <div className="about-stats__inner">
        {/* Text column */}
        <div className="about-stats__content">
          <h2 className="about-stats__title">ما که هستیم؟</h2>
          <p className="about-stats__description">
            زودیار بستری برای اتصال شما به متخصصان معتبر حوزه مشاوره است. ما
            تلاش می‌کنیم دسترسی به خدمات روان‌شناسی و مشاوره را ساده، سریع و
            قابل‌اعتماد کنیم تا هر فرد بتواند بدون دغدغه، مسیر بهبود را آغاز
            کند.
          </p>

          <div className="about-stats__row">
            {stats.map(({ icon: Icon, value, label }, index) => (
              <div className="about-stats__item" key={index}>
                <div className="about-stats__icon-wrap">
                  <Icon size={20} className="about-stats__icon" />
                </div>
                <div className="about-stats__item-text">
                  <p className="about-stats__value">{value}</p>
                  <p className="about-stats__label">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Image column */}
        <div className="about-stats__media">
          <img
            src="https://picsum.photos/seed/zoodyar-about/640/560"
            alt="زودیار"
            className="about-stats__image"
          />
        </div>
      </div>
    </section>
  );
}

export default AboutStats;
