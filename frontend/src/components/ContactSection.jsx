import { useState } from "react";
import { Phone, Mail, MapPin, Send, Hash } from "lucide-react";
import "../styles/ContactSection.css";

const contactInfo = [
  { icon: Phone, label: "تلفن تماس", value: "09929542476", isTel: true },
  { icon: Mail, label: "ایمیل", value: "korosh.ardestani.289@gmail.com", isMail: true },
  {
    icon: MapPin,
    label: "آدرس پستی (مطابق اینماد)",
    value: "استان : خراسان رضوی - شهرستان : مشهد - بخش : مرکزی - شهر : مشهد - محله : لشکر - خیابان شهید فلاحی 8 - خیابان شهیدهاشمی مهنه4 [شهیدفلاحی8/7] - ساحل - پلاک : -40.0 - طبقه : 4 - واحد : 7",
  },
  { icon: Hash, label: "کد پستی", value: "9184176651", isLtr: true },
];

function ContactSection() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState(""); // email or phone
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !contact.trim() || !message.trim()) {
      setError("لطفا تمامی فیلدها را تکمیل کنید");
      return;
    }
    setError("");
    setLoading(true);
    try {
      // TODO: wire to real endpoint, e.g. api.post("/api/contact/", {...})
      await new Promise((resolve) => setTimeout(resolve, 800));
      setSubmitted(true);
      setName("");
      setContact("");
      setMessage("");
    } catch {
      setError("ارسال پیام ناموفق بود. دوباره تلاش کنید");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="contact-section">
      <div className="contact-section__inner">
        {/* ===== Info column ===== */}
        <div className="contact-section__info">
          <h2 className="contact-section__title">تماس با ما</h2>
          <p className="contact-section__description">
            سوالی دارید یا نیاز به راهنمایی دارید؟ فرم زیر را پر کنید تا در
            سریع‌ترین زمان ممکن با شما تماس بگیریم.
          </p>

          <ul className="contact-section__list">
            {contactInfo.map(({ icon: Icon, label, value, isTel, isMail, isLtr }, index) => (
              <li className="contact-section__list-item" key={index}>
                <span className="contact-section__icon-wrap">
                  <Icon size={18} />
                </span>
                <span className="contact-section__list-text">
                  <span className="contact-section__list-label">{label}</span>
                  {isTel ? (
                    <a href={`tel:${value}`} className="contact-section__list-link" dir="ltr">
                      {value}
                    </a>
                  ) : isMail ? (
                    <a href={`mailto:${value}`} className="contact-section__list-link" dir="ltr">
                      {value}
                    </a>
                  ) : (
                    <span className="contact-section__list-value" dir={isLtr ? "ltr" : undefined}>{value}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* ===== Form column ===== */}
        <form className="contact-section__form" onSubmit={handleSubmit} noValidate>
          <div className="contact-section__field">
            <label htmlFor="contact-name" className="contact-section__label">
              نام
            </label>
            <input
              id="contact-name"
              type="text"
              className="contact-section__input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="contact-section__field">
            <label htmlFor="contact-method" className="contact-section__label">
              ایمیل یا شماره تلفن
            </label>
            <input
              id="contact-method"
              type="text"
              className="contact-section__input"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="email@example.com یا 09xxxxxxxxx"
            />
          </div>

          <div className="contact-section__field">
            <label htmlFor="contact-message" className="contact-section__label">
              پیام شما
            </label>
            <textarea
              id="contact-message"
              className="contact-section__textarea"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          {error && <p className="contact-section__error">{error}</p>}
          {submitted && (
            <p className="contact-section__success">
              پیام شما ارسال شد. به زودی با شما تماس می‌گیریم.
            </p>
          )}

          <button
            type="submit"
            className="contact-section__button"
            disabled={loading}
          >
            <Send size={16} />
            {loading ? "در حال ارسال..." : "ارسال پیام"}
          </button>
        </form>
      </div>
    </section>
  );
}

export default ContactSection;
