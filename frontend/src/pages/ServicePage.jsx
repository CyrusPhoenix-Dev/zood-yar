import {
  Briefcase,
  Users,
  HeartHandshake,
  Brain,
  Baby,
  GraduationCap,
  Shield,
  HeartCrack,
  HeartPulse,
  Heart,
} from "lucide-react";

import "../styles/ServicesPage.css";

// 10 core counseling services. Extend this list — the layout below
// handles any number of entries, alternating side automatically.
const services = [
  {
    icon: Briefcase,
    title: "مشاوره شغلی",
    description:
      "کمک به شما در انتخاب مسیر شغلی درست، آماده‌سازی برای مصاحبه، و مدیریت استرس‌های محیط کار.",
    points: ["انتخاب مسیر شغلی", "آماده‌سازی مصاحبه استخدامی", "مدیریت استرس شغلی"],
  },
  {
    icon: Users,
    title: "مشاوره خانواده",
    description:
      "بهبود ارتباط میان اعضای خانواده و حل تعارضات رایج در محیط خانوادگی با راهنمایی متخصص.",
    points: ["حل تعارضات خانوادگی", "بهبود ارتباط والد و فرزند", "مدیریت بحران‌های خانوادگی"],
  },
  {
    icon: HeartHandshake,
    title: "مشاوره ازدواج و زوجین",
    description:
      "همراهی زوجین در حل اختلافات، تقویت صمیمیت، و ساخت رابطه‌ای سالم‌تر و پایدارتر.",
    points: ["حل اختلافات زناشویی", "تقویت صمیمیت", "مشاوره پیش از تصمیم به جدایی"],
  },
  {
    icon: Brain,
    title: "مشاوره فردی و روان‌شناسی",
    description:
      "فضایی امن برای صحبت درباره اضطراب، افسردگی و چالش‌های روانی روزمره با یک متخصص بالینی.",
    points: ["مدیریت اضطراب و افسردگی", "افزایش عزت‌نفس", "خودشناسی و رشد فردی"],
  },
  {
    icon: Baby,
    title: "مشاوره کودک و نوجوان",
    description:
      "پشتیبانی تخصصی برای مشکلات رفتاری، تحصیلی و عاطفی کودکان و نوجوانان.",
    points: ["مشکلات رفتاری", "اختلالات یادگیری", "مدیریت خشم در نوجوانان"],
  },
  {
    icon: GraduationCap,
    title: "مشاوره تحصیلی",
    description:
      "راهنمایی برای انتخاب رشته، برنامه‌ریزی درسی، و مقابله با اضطراب امتحان.",
    points: ["انتخاب رشته و دانشگاه", "برنامه‌ریزی تحصیلی", "کاهش اضطراب امتحان"],
  },
  {
    icon: Shield,
    title: "مشاوره ترک اعتیاد",
    description:
      "حمایت روانی در مسیر ترک اعتیاد و پیشگیری از بازگشت، در کنار خانواده و نزدیکان.",
    points: ["برنامه ترک اعتیاد", "پیشگیری از بازگشت", "حمایت از خانواده فرد معتاد"],
  },
  {
    icon: HeartCrack,
    title: "مشاوره سوگ",
    description:
      "همراهی در فرآیند پذیرش و عبور از فقدان عزیزان، با احترام به سرعت و شیوه سوگواری هر فرد.",
    points: ["پردازش فقدان و از دست دادن", "مدیریت احساسات سوگ", "بازگشت تدریجی به زندگی روزمره"],
  },
  {
    icon: HeartPulse,
    title: "مشاوره تروما",
    description:
      "کمک به بهبود پس از تجربه‌های آسیب‌زا با رویکردهای تخصصی و امن.",
    points: ["پردازش تجربه‌های آسیب‌زا", "کاهش علائم استرس پس از سانحه", "بازسازی احساس امنیت"],
  },
  {
    icon: Heart,
    title: "مشاوره پیش از ازدواج",
    description:
      "آماده‌سازی زوجین برای شروع زندگی مشترک با شناخت بهتر انتظارات و ارزش‌های یکدیگر.",
    points: ["سنجش سازگاری زوجین", "گفتگو درباره انتظارات مشترک", "مهارت‌های ارتباطی پیش از ازدواج"],
  },
];

function ServicesPage() {
  return (
    <>

      <section className="services-page-hero">
        <div className="services-page-hero__inner">
          <h1 className="services-page-hero__title">خدمات ما</h1>
          <p className="services-page-hero__subtitle">
            زودیار در حوزه‌های تخصصی مختلف، شما را به مناسب‌ترین مشاور متصل
            می‌کند.
          </p>
        </div>
      </section>

      <section className="services-page">
        <div className="services-page__list">
          {services.map(({ icon: Icon, title, description, points }, index) => (
            <div
              className={`service-row ${index % 2 === 1 ? "service-row--reverse" : ""}`}
              key={title}
            >
              <div className="service-row__icon-panel">
                <div className="service-row__icon-wrap">
                  <Icon size={40} className="service-row__icon" />
                </div>
              </div>

              <div className="service-row__content">
                <h2 className="service-row__title">{title}</h2>
                <p className="service-row__description">{description}</p>
                <ul className="service-row__points">
                  {points.map((point) => (
                    <li key={point} className="service-row__point">
                      {point}
                    </li>
                  ))}
                </ul>
                <a href="/counselors" className="service-row__link">
                  مشاهده مشاوران این حوزه ←
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

    </>
  );
}

export default ServicesPage;
