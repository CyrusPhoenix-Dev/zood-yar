// import Navbar from "./Navbar";
// import Footer from "./Footer";
import ContactSection from "../components/ContactSection";
import "../styles/ContactUs.css";

function ContactPage() {
  return (
    <>
      {/* <Navbar /> */}

      <section className="contact-page-hero">
        <div className="contact-page-hero__inner">
          <h1 className="contact-page-hero__title">تماس با ما</h1>
          <p className="contact-page-hero__subtitle">
            برای هرگونه سوال، پیشنهاد یا نیاز به راهنمایی، تیم زودیار همیشه
            پاسخگوی شماست.
          </p>
        </div>
      </section>

      <ContactSection />

      {/* <Footer /> */}
    </>
  );
}

export default ContactPage;
