import { useState, useEffect, useRef } from "react";
import { Pencil, Save, User, Camera, ShieldCheck, ShieldAlert } from "lucide-react";
import * as DatePickerModule from "react-multi-date-picker";
// Same two-layer Vite/ESM interop as CounselorCalendarPage.jsx — the
// real forwardRef component sits at .default.default, not just
// .default.
const DatePicker = DatePickerModule.default.default;
import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import gregorian from "react-date-object/calendars/gregorian";
import api from "../api";
import { translateApiError } from "../utils/apiErrors";
import "../styles/EditInfo.css";

const fields = [
  { key: "first_name", label: "نام", type: "text" },
  { key: "last_name", label: "نام خانوادگی", type: "text" },
  { key: "national_id", label: "کد ملی", type: "text" },
  { key: "phone", label: "شماره تلفن", type: "tel" },
];

const genderOptions = [
  { value: "male", label: "مرد" },
  { value: "female", label: "زن" },
];

function MyProfilePage() {
  const [data, setData] = useState(null); // null while loading
  const [draft, setDraft] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  // Holds the Persian DateObject directly, exactly as the picker
  // library manages it internally. Converting to/from Gregorian on
  // every render (via useMemo) caused the picker's own internal
  // selection state to desync from the `value` prop, requiring two
  // clicks before a selection visibly took. Now it's only converted
  // once, at save time.
  const [birthDateObj, setBirthDateObj] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      try {
        const res = await api.get("/api/user/profile/");
        if (isMounted) setData(res.data);
      } catch (err) {
        if (isMounted) setError(translateApiError(err));
        console.error(err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleAvatarClick = () => {
    if (isEditing) fileInputRef.current?.click();
  };

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setDraft((prev) => ({ ...prev, avatar: URL.createObjectURL(file) }));
  };

  const handleToggle = async () => {
    if (!isEditing) {
      setDraft(data);
      // Seed the picker's own state once, converting the saved
      // Gregorian string to a Persian DateObject a single time when
      // entering edit mode — not on every render via useMemo, which
      // was desyncing the picker's internal selection state from its
      // `value` prop and needing two clicks to register.
      setBirthDateObj(
        data?.birth_date
          ? new DateObject({
              date: data.birth_date,
              format: "YYYY-MM-DD",
              calendar: gregorian,
            }).convert(persian)
          : null
      );
      setIsEditing(true);
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      // Convert back to Gregorian only now, right before sending —
      // this is the one place the backend's format is actually needed.
      const birthDateGregorian = birthDateObj
        ? birthDateObj.convert(gregorian).format("YYYY-MM-DD")
        : null;

      const draftWithBirthDate = { ...draft, birth_date: birthDateGregorian };

      // If a new avatar was picked, this needs multipart/form-data
      // instead of a plain JSON PATCH.
      let payload;
      let config = {};

      if (avatarFile) {
        const formData = new FormData();
        Object.entries(draftWithBirthDate).forEach(([k, v]) => {
          if (k !== "avatar" && v != null) formData.append(k, v);
        });
        formData.append("avatar", avatarFile);
        payload = formData;
        config = { headers: { "Content-Type": "multipart/form-data" } };
      } else {
        // No new avatar — never send the avatar field at all, since
        // `draft.avatar` is just the display URL (or an ObjectURL from a
        // preview), never real file data. Sending it as JSON trips the
        // backend's ImageField validation with "not a file" every time,
        // even when nothing changed.
        const { avatar, ...rest } = draftWithBirthDate;
        payload = rest;
      }

      const res = await api.patch("/api/user/profile/", payload, config);
      setData(res.data);
      setAvatarFile(null);
      setIsEditing(false);
    } catch (err) {
      setError(translateApiError(err));
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="my-profile-page">
        <div className="my-profile-content">
          <p className="my-profile-status">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="my-profile-page">
        <div className="my-profile-content">
          <p className="my-profile-status my-profile-status--error">{error}</p>
        </div>
      </div>
    );
  }

  const current = isEditing ? draft : data;
  const displayedAvatar = current?.avatar;

  // Deliberately reads from `data` (the last saved state), not
  // `current`/`draft` — editing a field shouldn't make its badge look
  // verified until the change is actually saved and the backend has
  // confirmed the new verification status.
  const isPhoneVerified = data?.is_phone_verified;

  // If the user has typed a different value than what's saved, the
  // badge would be showing stale info either way — flag that
  // explicitly instead of letting it look authoritative.
  const phoneChangedUnsaved = isEditing && draft?.phone !== data?.phone;

  return (
    <div className="my-profile-page">
      <div className="my-profile-content">
        <div className="my-profile-card">
          <div className="my-profile-card__header">
            <h1 className="my-profile-card__title">پرونده من</h1>
            <button
              type="button"
              className="my-profile-card__edit-btn"
              onClick={handleToggle}
              disabled={isSaving}
            >
              {isEditing ? <Save size={16} /> : <Pencil size={16} />}
              {isEditing ? (isSaving ? "در حال ذخیره..." : "ذخیره") : "ویرایش"}
            </button>
          </div>

          <div className="my-profile-avatar-row">
            <button
              type="button"
              className={`my-profile-avatar ${isEditing ? "my-profile-avatar--editable" : ""}`}
              onClick={handleAvatarClick}
              disabled={!isEditing}
              aria-label="تغییر عکس پروفایل"
            >
              {displayedAvatar ? (
                <img src={displayedAvatar} alt="عکس پروفایل" className="my-profile-avatar__img" />
              ) : (
                <User size={28} className="my-profile-avatar__icon" />
              )}
              {isEditing && (
                <span className="my-profile-avatar__overlay">
                  <Camera size={16} />
                </span>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarSelect}
              className="my-profile-avatar__file-input"
            />
          </div>

          {error && <p className="my-profile-form-error">{error}</p>}

          <div className="my-profile-card__grid">
            {fields.map(({ key, label, type }) => (
              <div className="my-profile-field" key={key}>
                <div className="my-profile-field__label-row">
                  <label htmlFor={key} className="my-profile-field__label">
                    {label}
                  </label>

                  {key === "phone" && (
                    phoneChangedUnsaved ? (
                      <span className="phone-verify-badge phone-verify-badge--pending">
                        <ShieldAlert size={13} />
                        پس از ذخیره نیاز به تایید مجدد
                      </span>
                    ) : isPhoneVerified ? (
                      <span className="phone-verify-badge phone-verify-badge--verified">
                        <ShieldCheck size={13} />
                        تایید شده
                      </span>
                    ) : (
                      <span className="phone-verify-badge phone-verify-badge--unverified">
                        <ShieldAlert size={13} />
                        تایید نشده
                      </span>
                    )
                  )}
                </div>

                <input
                  id={key}
                  type={type}
                  className="my-profile-field__input"
                  value={current?.[key] ?? ""}
                  onChange={(e) => handleChange(key, e.target.value)}
                  readOnly={!isEditing}
                  disabled={isSaving}
                />
              </div>
            ))}

            {/* ===== Gender ===== */}
            <div className="my-profile-field">
              <div className="my-profile-field__label-row">
                <label htmlFor="gender" className="my-profile-field__label">
                  جنسیت
                </label>
              </div>
              {isEditing ? (
                <select
                  id="gender"
                  className="my-profile-field__input"
                  value={draft?.gender ?? ""}
                  onChange={(e) => handleChange("gender", e.target.value)}
                  disabled={isSaving}
                >
                  <option value="">انتخاب نشده</option>
                  {genderOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="my-profile-field__input"
                  value={
                    genderOptions.find((opt) => opt.value === data?.gender)?.label ?? ""
                  }
                  readOnly
                  disabled
                />
              )}
            </div>

            {/* ===== Birth date ===== */}
            <div className="my-profile-field">
              <div className="my-profile-field__label-row">
                <label htmlFor="birth_date" className="my-profile-field__label">
                  تاریخ تولد
                </label>
              </div>
              {isEditing ? (
                <DatePicker
                  value={birthDateObj}
                  onChange={setBirthDateObj}
                  calendar={persian}
                  locale={persian_fa}
                  calendarPosition="bottom-right"
                  inputClass="my-profile-field__input"
                  placeholder="انتخاب تاریخ تولد"
                  disabled={isSaving}
                />
              ) : (
                <input
                  id="birth_date"
                  className="my-profile-field__input"
                  value={
                    data?.birth_date
                      ? new DateObject({
                          date: data.birth_date,
                          format: "YYYY-MM-DD",
                          calendar: gregorian,
                        })
                          .convert(persian)
                          .format("YYYY/MM/DD")
                      : ""
                  }
                  readOnly
                  disabled
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MyProfilePage;
