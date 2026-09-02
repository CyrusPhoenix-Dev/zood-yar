import {
  Briefcase,
  Users,
  HeartHandshake,
  Brain,
  Baby,
  GraduationCap,
  Shield,
  HeartCrack,
} from "lucide-react";
import "../styles/Service.css";

// Each field maps to one lucide icon. Swap freely — these were picked
// for visual distinctiveness, not any deeper meaning.
const fields = [
  { icon: Briefcase, label: "مشاوره شغلی" },
  { icon: Users, label: "مشاوره خانواده" },
  { icon: HeartHandshake, label: "مشاوره ازدواج و زوجین" },
  { icon: Brain, label: "مشاوره فردی و روان‌شناسی" },
  { icon: Baby, label: "مشاوره کودک و نوجوان" },
  { icon: GraduationCap, label: "مشاوره تحصیلی" },
  { icon: Shield, label: "مشاوره ترک اعتیاد" },
  { icon: HeartCrack, label: "مشاوره سوگ" },
];

function ServicesSection() {
  return (
    <section className="services">
      <div className="services__header">
        <h2 className="services__title">خدمات ما</h2>
        <p className="services__description">
          زودیار شما را به متخصصان معتبر در حوزه‌های مختلف مشاوره متصل می‌کند
          تا مناسب‌ترین فرد را برای نیاز خود پیدا کنید.
        </p>
      </div>

      <div className="services__grid">
        {fields.map(({ icon: Icon, label }, index) => (
          <div className="services__card" key={index}>
            <div className="services__icon-wrap">
              <Icon size={24} className="services__icon" />
            </div>
            <p className="services__card-label">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ServicesSection;
