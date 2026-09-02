import { Target, Eye, ShieldCheck, HeartHandshake, Zap, Lock } from "lucide-react";
// import Navbar from "../components/Navbar";
// import Footer from "../components/Footer";
import AboutSection from "../components/AboutSection";
import "../styles/AboutUs.css";

const values = [
  {
    icon: ShieldCheck,
    title: "اعتماد",
    description: "تمامی مشاوران ما احراز هویت و صلاحیت می‌شوند.",
  },
  {
    icon: HeartHandshake,
    title: "همدلی",
    description: "هر تعامل با درک و احترام به شرایط شما همراه است.",
  },
  {
    icon: Zap,
    title: "دسترسی سریع",
    description: "رزرو و شروع مشاوره در کمتر از چند دقیقه.",
  },
  {
    icon: Lock,
    title: "محرمانگی",
    description: "اطلاعات شما کاملاً محرمانه و ایمن نگهداری می‌شود.",
  },
];

function AboutPage() {
  return (
    <>
      {/* <Navbar /> */}

      {/* ===== HERO ===== */}
      <section className="about-hero">
        <div className="about-hero__inner">
          <h1 className="about-hero__title">درباره زودیار</h1>
          <p className="about-hero__subtitle">
            ما به این باور رسیده‌ایم که دسترسی به مشاوره تخصصی باید ساده،
            سریع و قابل‌اعتماد باشد — برای همین زودیار را ساختیم.
          </p>
        </div>
      </section>

      {/* ===== WHO WE ARE + STATS (reused component) ===== */}
      <AboutSection />

      {/* ===== MISSION & VISION ===== */}
      <section className="about-mission">
        <div className="about-mission__inner">
          <div className="about-mission__card">
            <div className="about-mission__icon-wrap">
              <Target size={24} className="about-mission__icon" />
            </div>
            <h3 className="about-mission__title">ماموریت ما</h3>
            <p className="about-mission__text">
              اتصال هر فرد به مناسب‌ترین متخصص مشاوره، بدون محدودیت زمان و
              مکان، با کمترین هزینه و بیشترین کیفیت.
            </p>
          </div>

          <div className="about-mission__card">
            <div className="about-mission__icon-wrap">
              <Eye size={24} className="about-mission__icon" />
            </div>
            <h3 className="about-mission__title">چشم‌انداز ما</h3>
            <p className="about-mission__text">
              تبدیل شدن به معتبرترین بستر مشاوره آنلاین در منطقه و ارتقای
              سطح سلامت روان جامعه.
            </p>
          </div>
        </div>
      </section>

      {/* ===== VALUES GRID ===== */}
      <section className="about-values">
        <div className="about-values__inner">
          <h2 className="about-values__title">ارزش‌های ما</h2>

          <div className="about-values__grid">
            {values.map(({ icon: Icon, title, description }, index) => (
              <div className="about-values__card" key={index}>
                <div className="about-values__icon-wrap">
                  <Icon size={22} className="about-values__icon" />
                </div>
                <h4 className="about-values__card-title">{title}</h4>
                <p className="about-values__card-text">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="about-cta">
        <div className="about-cta__inner">
          <h2 className="about-cta__title">آماده شروع هستید؟</h2>
          <p className="about-cta__text">
            همین حالا مناسب‌ترین مشاور را پیدا کنید و اولین قدم را بردارید.
          </p>
          <a href="/counselors" className="about-cta__button">
            مشاهده مشاوران
          </a>
        </div>
      </section>

      {/* <Footer /> */}
    </>
  );
}

export default AboutPage;
