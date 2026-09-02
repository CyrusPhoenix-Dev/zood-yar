import { useState } from "react";
import { Phone, Mail, MapPin, Send } from "lucide-react";
import "../styles/ContactSection.css";

const contactInfo = [
  { icon: Phone, label: "تلفن تماس", value: "۰۲۱-۰۰۰۰۰۰۰" },
  { icon: Mail, label: "ایمیل", value: "info@zood-yar.ir" },
  { icon: MapPin, label: "آدرس", value: "تهران، ایران" },
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
            {contactInfo.map(({ icon: Icon, label, value }, index) => (
              <li className="contact-section__list-item" key={index}>
                <span className="contact-section__icon-wrap">
                  <Icon size={18} />
                </span>
                <span className="contact-section__list-text">
                  <span className="contact-section__list-label">{label}</span>
                  <span className="contact-section__list-value">{value}</span>
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
