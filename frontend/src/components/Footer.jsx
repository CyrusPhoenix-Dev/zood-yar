import { Aperture, Send, Phone, Mail, MapPin } from "lucide-react";
import { Link } from "react-router";
import "../styles/Footer.css";

const quickLinks = [
  { label: "خانه", href: "/" },
  { label: "درباره ما", href: "/aboutus" },
  { label: "تماس با ما", href: "/contactus" },
  { label: "مشاوران", href: "/moshaverin" },
  { label: "خدمات", href: "/services" },
];

const serviceLinks = [
  { label: "مشاوره شغلی", href: "/services/career" },
  { label: "مشاوره خانواده", href: "/services/family" },
  { label: "مشاوره ازدواج و زوجین", href: "/services/marriage" },
  { label: "مشاوره فردی", href: "/services/individual" },
];

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer__top">
        <div className="footer__grid">
          {/* Brand column */}
          <div className="footer__col footer__col--brand">
            <p className="footer__logo">زودیار</p>
            <p className="footer__blurb">
              زودیار شما را به متخصصان معتبر در حوزه‌های مختلف مشاوره متصل
              می‌کند تا مناسب‌ترین فرد را برای نیاز خود پیدا کنید.
            </p>
            <div className="footer__socials">
              <a href="#" className="footer__social-icon" aria-label="اینستاگرام">
                <Aperture size={18} />
              </a>
              <a href="#" className="footer__social-icon" aria-label="تلگرام">
                <Send size={18} />
              </a>
            </div>
          </div>

          {/* Quick links */}
          <div className="footer__col">
            <h3 className="footer__heading">دسترسی سریع</h3>
            <ul className="footer__list">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="footer__link">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div className="footer__col">
            <h3 className="footer__heading">خدمات</h3>
            <ul className="footer__list">
              {serviceLinks.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="footer__link">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="footer__col">
            <h3 className="footer__heading">تماس با ما</h3>
            <ul className="footer__list footer__list--contact">
              <li>
                <Phone size={16} />
                <span>۰۲۱-۰۰۰۰۰۰۰</span>
              </li>
              <li>
                <Mail size={16} />
                <span>info@zood-yar.ir</span>
              </li>
              <li>
                <MapPin size={16} />
                <span>ایران</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="footer__bottom">
        <p className="footer__copyright">
          © {year} زودیار. تمامی حقوق محفوظ است.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
