import { NotebookPen, Send, Phone, Mail, MapPin } from "lucide-react";
import { Link } from "react-router";
import "../styles/Footer.css";

const quickLinks = [
  { label: "خانه", href: "/" },
  { label: "درباره ما", href: "/aboutus" },
  { label: "تماس با ما", href: "/contactus" },
  { label: "مشاوران", href: "/moshaverin" },
  { label: "خدمات", href: "/services" },
  { label: "قوانین و مقررات", href: "/terms" },
  { label: "حریم خصوصی", href: "/privacy" },
];

const serviceLinks = [
  { label: "مشاوره شغلی", href: "/moshaverin" },
  { label: "مشاوره خانواده", href: "/moshaverin" },
  { label: "مشاوره ازدواج و زوجین", href: "/moshaverin" },
  { label: "مشاوره فردی", href: "/moshaverin" },
];

function Footer() {

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
              <a href="https://eitaa.com/@AmirHA289" className="footer__social-icon" aria-label="ایتا">
                <NotebookPen size={18} />
              </a>
              <a href="https://t.me/AmirHA289" className="footer__social-icon" aria-label="تلگرام">
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
                <a href="tel:09929542476" className="footer__link" dir="ltr">09929542476</a>
              </li>
              <li>
                <Mail size={16} />
                <a href="mailto:korosh.ardestani.289@gmail.com" className="footer__link" dir="ltr">korosh.ardestani.289@gmail.com</a>
              </li>
              <li>
                <a
                  referrerPolicy="origin"
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://trustseal.enamad.ir/?id=7666369&Code=aoEPO2fCDflRRPtfEsHO18b8Q1q2TcLK"
                  aria-label="نماد اعتماد الکترونیکی اینماد"
                >
                  <img
                    referrerPolicy="origin"
                    src="https://trustseal.enamad.ir/logo.aspx?id=7666369&Code=aoEPO2fCDflRRPtfEsHO18b8Q1q2TcLK"
                    alt=""
                    style={{ cursor: "pointer" }}
                    code="aoEPO2fCDflRRPtfEsHO18b8Q1q2TcLK"
                  />
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="footer__bottom">
        <p className="footer__copyright">
          © 1405 زودیار. تمامی حقوق محفوظ است.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
