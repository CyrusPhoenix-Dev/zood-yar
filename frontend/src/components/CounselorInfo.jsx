import { useState, useEffect } from "react";
import { Save, ShieldCheck, ShieldAlert, Upload, Trash2 } from "lucide-react";
import api from "../api";
import { translateApiError } from "../utils/apiErrors";
import "../styles/CounselorInfo.css";

const sessionFormatOptions = [
  { value: "online", label: "آنلاین" },
  { value: "in_person", label: "حضوری" },
  { value: "both", label: "آنلاین و حضوری" },
];

const GALLERY_MAX_IMAGES = 6;

// Some mobile keyboards (Persian Android/iOS keyboards in particular)
// type actual Persian or Arabic-Indic digits into number inputs
// instead of ASCII digits. `Number("۵۰۰۰۰")` returns NaN — which then
// serializes to null and gets silently rejected — so every numeric
// input needs its raw value normalized to ASCII before parsing.
function toAsciiDigits(str) {
  const persian = "۰۱۲۳۴۵۶۷۸۹";
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  return str.replace(/[۰-۹٠-٩]/g, (d) => {
    const p = persian.indexOf(d);
    if (p !== -1) return String(p);
    return String(arabic.indexOf(d));
  });
}

function CounselorInfoPage() {
  const [specialtyOptions, setSpecialtyOptions] = useState([]);
  const [data, setData] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [galleryError, setGalleryError] = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/api/counselor/me/"),
      api.get("/api/specialties/"),
      api.get("/api/counselor/certificates/"),
      api.get("/api/counselor/gallery/"),
    ])
      .then(([meRes, specRes, certRes, galleryRes]) => {
        setData(meRes.data);
        setSpecialtyOptions(specRes.data);
        setCertificates(certRes.data.results ?? certRes.data);
        setGallery(galleryRes.data.results ?? galleryRes.data);
      })
      .catch((err) => {
        setError(translateApiError(err));
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleChange = (key, value) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setSaveSuccess(false);
  };

  const toggleSpecialty = (id) => {
    setData((prev) => {
      const current = prev.specialties || [];
      const next = current.includes(id)
        ? current.filter((s) => s !== id)
        : [...current, id];
      return { ...prev, specialties: next };
    });
    setSaveSuccess(false);
  };

  // Address only matters once in-person sessions are involved — no
  // point asking for it (or sending it) when the counselor is
  // online-only.
  const showAddressFields = data?.session_format === "in_person" || data?.session_format === "both";

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      const res = await api.patch("/api/counselor/me/", {
        license_number: data.license_number,
        nezam_number: data.nezam_number,
        degree: data.degree,
        bio: data.bio,
        specialties: data.specialties,
        session_price: data.session_price,
        session_format: data.session_format,
        years_of_experience: data.years_of_experience,
        city: data.city,
        address: data.address,
        slug: data.slug,
      });
      setData(res.data);
      setSaveSuccess(true);
    } catch (err) {
      setError(translateApiError(err));
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCertificateUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await api.post("/api/counselor/certificates/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setCertificates((prev) => [...prev, res.data]);
    } catch (err) {
      setError(translateApiError(err));
      console.error(err);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleGalleryUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (gallery.length >= GALLERY_MAX_IMAGES) {
      setGalleryError(`حداکثر ${GALLERY_MAX_IMAGES.toLocaleString("fa-IR")} عکس می‌توانید اضافه کنید`);
      e.target.value = "";
      return;
    }
    setGalleryError("");
    setIsUploadingGallery(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await api.post("/api/counselor/gallery/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setGallery((prev) => [...prev, res.data]);
    } catch (err) {
      setGalleryError(translateApiError(err));
      console.error(err);
    } finally {
      setIsUploadingGallery(false);
      e.target.value = "";
    }
  };

  const handleGalleryDelete = async (imageId) => {
    setGalleryError("");
    try {
      await api.delete(`/api/counselor/gallery/${imageId}/`);
      setGallery((prev) => prev.filter((img) => img.id !== imageId));
    } catch (err) {
      setGalleryError(translateApiError(err));
      console.error(err);
    }
  };

  if (isLoading) {
    return <p className="counselor-info-status">در حال بارگذاری...</p>;
  }

  if (error && !data) {
    return <p className="counselor-info-status counselor-info-status--error">{error}</p>;
  }

  return (
    <div className="counselor-info-page">
      <div className="counselor-info-card">
        <div className="counselor-info-card__header">
          <h1 className="counselor-info-card__title">اطلاعات حرفه‌ای</h1>
          {data.is_verified ? (
            <span className="counselor-info-verified counselor-info-verified--yes">
              <ShieldCheck size={14} />
              تایید شده
            </span>
          ) : (
            <span className="counselor-info-verified counselor-info-verified--no">
              <ShieldAlert size={14} />
              در انتظار تایید ادمین
            </span>
          )}
        </div>

        <form onSubmit={handleSave}>
          <div className="counselor-info-grid">
            <div className="counselor-info-field">
              <label className="counselor-info-field__label">شماره پروانه</label>
              <input
                type="text"
                className="counselor-info-input"
                value={data.license_number || ""}
                onChange={(e) => handleChange("license_number", e.target.value)}
              />
            </div>

            <div className="counselor-info-field">
              <label className="counselor-info-field__label">شماره نظام</label>
              <input
                type="text"
                className="counselor-info-input"
                value={data.nezam_number || ""}
                onChange={(e) => handleChange("nezam_number", e.target.value)}
              />
            </div>

            <div className="counselor-info-field">
              <label className="counselor-info-field__label">مدرک تحصیلی</label>
              <input
                type="text"
                className="counselor-info-input"
                value={data.degree || ""}
                onChange={(e) => handleChange("degree", e.target.value)}
              />
            </div>

            <div className="counselor-info-field">
              <label className="counselor-info-field__label">هزینه هر جلسه (تومان)</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="counselor-info-input"
                value={data.session_price ?? 0}
                onChange={(e) => {
                  const digitsOnly = toAsciiDigits(e.target.value).replace(/[^\d]/g, "");
                  handleChange("session_price", digitsOnly === "" ? 0 : Number(digitsOnly));
                }}
              />
            </div>

            <div className="counselor-info-field">
              <label className="counselor-info-field__label">سابقه کار (سال)</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="counselor-info-input"
                value={data.years_of_experience ?? 0}
                onChange={(e) => {
                  const digitsOnly = toAsciiDigits(e.target.value).replace(/[^\d]/g, "");
                  handleChange("years_of_experience", digitsOnly === "" ? 0 : Number(digitsOnly));
                }}
              />
            </div>

            <div className="counselor-info-field">
              <label className="counselor-info-field__label">نوع جلسه</label>
              <select
                className="counselor-info-input"
                value={data.session_format || "online"}
                onChange={(e) => handleChange("session_format", e.target.value)}
              >
                {sessionFormatOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="counselor-info-field">
              <label className="counselor-info-field__label">لینک اختصاصی</label>
              <input
                type="text"
                className="counselor-info-input"
                value={data.slug || ""}
                onChange={(e) => handleChange("slug", e.target.value)}
              />
            </div>
            {showAddressFields && (
              <div className="counselor-info-field">
                <label className="counselor-info-field__label">شهر</label>
                <input
                  type="text"
                  className="counselor-info-input"
                  value={data.city || ""}
                  onChange={(e) => handleChange("city", e.target.value)}
                  placeholder="مثلا تهران"
                />
              </div>
            )}
          </div>

          {showAddressFields && (
            <div className="counselor-info-field">
              <label className="counselor-info-field__label">آدرس کامل</label>
              <textarea
                rows={2}
                className="counselor-info-textarea"
                value={data.address || ""}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="آدرس دقیق محل برگزاری جلسات حضوری..."
              />
            </div>
          )}

          <div className="counselor-info-field">
            <label className="counselor-info-field__label">درباره من</label>
            <textarea
              rows={4}
              className="counselor-info-textarea"
              value={data.bio || ""}
              onChange={(e) => handleChange("bio", e.target.value)}
              placeholder="معرفی کوتاهی از خودتان و روش کاری‌تان بنویسید..."
            />
          </div>

          <div className="counselor-info-field">
            <label className="counselor-info-field__label">حوزه‌های تخصصی</label>
            <div className="counselor-info-specialties">
              {specialtyOptions.map((sp) => (
                <label className="counselor-info-checkbox" key={sp.slug}>
                  <input
                    type="checkbox"
                    checked={(data.specialties || []).includes(sp.id)}
                    onChange={() => toggleSpecialty(sp.id)}
                  />
                  <span>{sp.label}</span>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="counselor-info-error">{error}</p>}
          {saveSuccess && <p className="counselor-info-success">اطلاعات با موفقیت ذخیره شد</p>}

          <button type="submit" className="counselor-info-save-btn" disabled={isSaving}>
            <Save size={16} />
            {isSaving ? "در حال ذخیره..." : "ذخیره تغییرات"}
          </button>
        </form>
      </div>

      {/* ===== Certificates ===== */}
      <div className="counselor-info-card">
        <h2 className="counselor-info-card__title">مدارک و مجوزها</h2>
        <p className="counselor-info-hint">
          تصویر پروانه یا مدرک تحصیلی خود را برای بررسی توسط ادمین آپلود کنید.
        </p>

        <div className="counselor-info-certificates">
          {certificates.map((cert) => (
            <img
              key={cert.id}
              src={cert.image}
              alt="مدرک"
              className="counselor-info-certificate-thumb"
            />
          ))}

          <label className="counselor-info-upload-btn">
            <Upload size={18} />
            {isUploading ? "در حال آپلود..." : "افزودن مدرک"}
            <input
              type="file"
              accept="image/*"
              onChange={handleCertificateUpload}
              disabled={isUploading}
              hidden
            />
          </label>
        </div>
      </div>

      {/* ===== Gallery — public photos shown on the profile page ===== */}
      <div className="counselor-info-card">
        <h2 className="counselor-info-card__title">گالری تصاویر</h2>
        <p className="counselor-info-hint">
          عکس‌هایی از خودتان یا محل مشاوره‌تان اضافه کنید تا در پروفایل عمومی
          شما نمایش داده شود (حداکثر {GALLERY_MAX_IMAGES.toLocaleString("fa-IR")} عکس).
        </p>

        {galleryError && <p className="counselor-info-error">{galleryError}</p>}

        <div className="counselor-info-certificates">
          {gallery.map((img) => (
            <div key={img.id} className="counselor-info-gallery-item">
              <img src={img.image} alt="تصویر گالری" className="counselor-info-certificate-thumb" />
              <button
                type="button"
                className="counselor-info-gallery-item__delete"
                onClick={() => handleGalleryDelete(img.id)}
                aria-label="حذف تصویر"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {gallery.length < GALLERY_MAX_IMAGES && (
            <label className="counselor-info-upload-btn">
              <Upload size={18} />
              {isUploadingGallery ? "در حال آپلود..." : "افزودن عکس"}
              <input
                type="file"
                accept="image/*"
                onChange={handleGalleryUpload}
                disabled={isUploadingGallery}
                hidden
              />
            </label>
          )}
        </div>
      </div>
    </div>
  );
}

export default CounselorInfoPage;
