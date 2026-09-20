import { useState, useEffect } from "react";
import { CalendarClock, Plus, Trash2 } from "lucide-react";
import * as DatePickerModule from "react-multi-date-picker";
const DatePicker = DatePickerModule.default.default;
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import gregorian from "react-date-object/calendars/gregorian";
import api from "../api";
import { translateApiError } from "../utils/apiErrors";
import { useAppDialog } from "../components/AppDialogProvider";

const WEEKDAYS = [
    { value: 0, label: "شنبه" },
    { value: 1, label: "یکشنبه" },
    { value: 2, label: "دوشنبه" },
    { value: 3, label: "سه‌شنبه" },
    { value: 4, label: "چهارشنبه" },
    { value: 5, label: "پنجشنبه" },
    { value: 6, label: "جمعه" },
];

const PERIODS = [
    { value: "week", label: "یک هفته", days: 7 },
    { value: "month", label: "یک ماه", days: 30 },
    { value: "3months", label: "سه ماه", days: 90 },
    { value: "6months", label: "شش ماه", days: 180 },
    { value: "year", label: "یک سال", days: 365 },
    { value: "custom", label: "تاریخ دلخواه", days: null },
];

function defaultWorkingDays() {
    return WEEKDAYS.map((wd) => ({
        weekday: wd.value,
        is_enabled: false,
        start_time: "09:00",
        end_time: "17:00",
        breaks: [],
    }));
}

function toGregorianStr(dateObj) {
    if (!dateObj) return null;
    const g = dateObj.convert(gregorian);
    const yyyy = g.year;
    const mm = String(g.month.number).padStart(2, "0");
    const dd = String(g.day).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function addDaysStr(gregorianStr, days) {
    const d = new Date(gregorianStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

function ScheduleGenerator({ onGenerated }) {
    const [durationMinutes, setDurationMinutes] = useState(45);
    const [gapMinutes, setGapMinutes] = useState(15);
    const [workingDays, setWorkingDays] = useState(defaultWorkingDays());

    const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);
    const [isSavingSchedule, setIsSavingSchedule] = useState(false);
    const [workOnHolidays, setWorkOnHolidays] = useState(false);

    const [startDate, setStartDate] = useState(null);
    const [period, setPeriod] = useState("month");
    const [customEndDate, setCustomEndDate] = useState(null);
    const { alertDialog, confirmDialog } = useAppDialog();
    const [preview, setPreview] = useState(null);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState("");
    const [hasAccess, setHasAccess] = useState(null);

    useEffect(() => {
        api.get("/api/counselor/me/")
            .then((res) => setHasAccess(res.data.has_auto_generator_access))
            .catch(() => setHasAccess(false)); // fail closed
    }, []);
    useEffect(() => {
        api
            .get("/api/counselor/schedule/")
            .then((res) => {
                setDurationMinutes(res.data.session_duration_minutes);
                setGapMinutes(res.data.gap_minutes);
                if (res.data.working_days?.length) {
                    const byWeekday = Object.fromEntries(
                        res.data.working_days.map((wd) => [wd.weekday, wd])
                    );
                    setWorkingDays(
                        WEEKDAYS.map((wd) => byWeekday[wd.value] || defaultWorkingDays()[wd.value])
                    );
                }
            })
            .catch((err) => {
                setError(translateApiError(err));
                console.error(err);
            })
            .finally(() => setIsLoadingSchedule(false));
    }, []);

    const toggleDay = (weekday) => {
        setWorkingDays((prev) =>
            prev.map((wd) => (wd.weekday === weekday ? { ...wd, is_enabled: !wd.is_enabled } : wd))
        );
    };

    const updateDayField = (weekday, field, value) => {
        setWorkingDays((prev) =>
            prev.map((wd) => (wd.weekday === weekday ? { ...wd, [field]: value } : wd))
        );
    };

    const addBreak = (weekday) => {
        setWorkingDays((prev) =>
            prev.map((wd) =>
                wd.weekday === weekday
                    ? { ...wd, breaks: [...wd.breaks, { start_time: "13:00", end_time: "14:00" }] }
                    : wd
            )
        );
    };

    const updateBreak = (weekday, index, field, value) => {
        setWorkingDays((prev) =>
            prev.map((wd) =>
                wd.weekday === weekday
                    ? {
                        ...wd,
                        breaks: wd.breaks.map((b, i) => (i === index ? { ...b, [field]: value } : b)),
                    }
                    : wd
            )
        );
    };

    const removeBreak = (weekday, index) => {
        setWorkingDays((prev) =>
            prev.map((wd) =>
                wd.weekday === weekday
                    ? { ...wd, breaks: wd.breaks.filter((_, i) => i !== index) }
                    : wd
            )
        );
    };

    const saveSchedule = async () => {
        setError("");
        setIsSavingSchedule(true);
        try {
            await api.put("/api/counselor/schedule/", {
                session_duration_minutes: durationMinutes,
                gap_minutes: gapMinutes,
                working_days: workingDays,
            });
            return true;
        } catch (err) {
            setError(translateApiError(err));
            console.error(err);
            return false;
        } finally {
            setIsSavingSchedule(false);
        }
    };

    const resolveEndDate = (startStr) => {
        if (period === "custom") return toGregorianStr(customEndDate);
        const preset = PERIODS.find((p) => p.value === period);
        return addDaysStr(startStr, preset.days);
    };

    const handlePreview = async (workOnHolidaysOverride) => {
        if (!startDate) {
            setError("تاریخ شروع را انتخاب کنید");
            return;
        }
        setError("");
        const saved = await saveSchedule();
        if (!saved) return;

        const startStr = toGregorianStr(startDate);
        const endStr = resolveEndDate(startStr);
        if (!endStr) {
            setError("تاریخ پایان را مشخص کنید");
            return;
        }

        setIsPreviewing(true);
        try {
            const res = await api.post("/api/counselor/schedule/preview/", {
                start_date: startStr,
                end_date: endStr,
                work_on_holidays: workOnHolidaysOverride ?? workOnHolidays,
            });
            setPreview({ ...res.data, startStr, endStr });
        } catch (err) {
            setError(translateApiError(err));
            console.error(err);
        } finally {
            setIsPreviewing(false);
        }
    };

    const handleGenerate = async () => {
        if (!preview) return;
        setIsGenerating(true);
        setError("");
        try {
            const res = await api.post("/api/counselor/schedule/generate/", {
                start_date: preview.startStr,
                end_date: preview.endStr,
                work_on_holidays: workOnHolidays,
            });
            await alertDialog(`${res.data.created.toLocaleString("fa-IR")} زمان کاری جدید ایجاد شد.`);
            setPreview(null);
            onGenerated?.();
        } catch (err) {
            setError(translateApiError(err));
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
    };

    if (isLoadingSchedule) {
        return (
            <div className="counselor-calendar-card">
                <p className="counselor-calendar-status">در حال بارگذاری...</p>
            </div>
        );
    }
    return (
        <div className="counselor-calendar-card schedule-generator">
            <h2 className="counselor-calendar-card__title">
                <CalendarClock size={18} />
                تولید خودکار زمان‌های کاری
            </h2>
            <p className="schedule-generator__hint">
                زمان‌هایی که به صورت خودکار ساخته می‌شوند، جایگزین زمان‌های دستی شما نمی‌شوند و کنار آن‌ها اضافه خواهند شد.
            </p>

            <div className="schedule-generator__section">
                <div className="schedule-generator__row">
                    <div className="counselor-calendar-field">
                        <label className="counselor-calendar-field__label">مدت هر جلسه (دقیقه)</label>
                        <input
                            type="number"
                            min="1"
                            className="counselor-calendar-input"
                            value={durationMinutes}
                            onChange={(e) => setDurationMinutes(Number(e.target.value))}
                        />
                    </div>
                    <div className="counselor-calendar-field">
                        <label className="counselor-calendar-field__label">فاصله بین جلسات (دقیقه)</label>
                        <input
                            type="number"
                            min="0"
                            className="counselor-calendar-input"
                            value={gapMinutes}
                            onChange={(e) => setGapMinutes(Number(e.target.value))}
                        />
                    </div>
                </div>
            </div>

            <div className="schedule-generator__section">
                <h3 className="schedule-generator__section-title">روزهای کاری</h3>
                {workingDays.map((wd) => {
                    const label = WEEKDAYS.find((w) => w.value === wd.weekday)?.label;
                    return (
                        <div key={wd.weekday} className="schedule-generator__day">
                            <label className="schedule-generator__day-toggle">
                                <input
                                    type="checkbox"
                                    checked={wd.is_enabled}
                                    onChange={() => toggleDay(wd.weekday)}
                                />
                                {label}
                            </label>

                            {wd.is_enabled && (
                                <div className="schedule-generator__day-body">
                                    <div className="schedule-generator__row">
                                        <div className="counselor-calendar-field">
                                            <label className="counselor-calendar-field__label">از ساعت</label>
                                            <input
                                                type="time"
                                                className="counselor-calendar-input"
                                                value={wd.start_time}
                                                onChange={(e) => updateDayField(wd.weekday, "start_time", e.target.value)}
                                            />
                                        </div>
                                        <div className="counselor-calendar-field">
                                            <label className="counselor-calendar-field__label">تا ساعت</label>
                                            <input
                                                type="time"
                                                className="counselor-calendar-input"
                                                value={wd.end_time}
                                                onChange={(e) => updateDayField(wd.weekday, "end_time", e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {wd.breaks.map((b, i) => (
                                        <div className="schedule-generator__row schedule-generator__break" key={i}>
                                            <div className="counselor-calendar-field">
                                                <label className="counselor-calendar-field__label">شروع استراحت</label>
                                                <input
                                                    type="time"
                                                    className="counselor-calendar-input"
                                                    value={b.start_time}
                                                    onChange={(e) => updateBreak(wd.weekday, i, "start_time", e.target.value)}
                                                />
                                            </div>
                                            <div className="counselor-calendar-field">
                                                <label className="counselor-calendar-field__label">پایان استراحت</label>
                                                <input
                                                    type="time"
                                                    className="counselor-calendar-input"
                                                    value={b.end_time}
                                                    onChange={(e) => updateBreak(wd.weekday, i, "end_time", e.target.value)}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                className="counselor-slot-chip__delete"
                                                onClick={() => removeBreak(wd.weekday, i)}
                                                aria-label="حذف استراحت"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    ))}

                                    <button
                                        type="button"
                                        className="schedule-generator__add-break-btn"
                                        onClick={() => addBreak(wd.weekday)}
                                    >
                                        افزودن استراحت
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="schedule-generator__section">
                <h3 className="schedule-generator__section-title">بازه زمانی تولید</h3>
                <div className="schedule-generator__row">
                    <div className="counselor-calendar-field">
                        <label className="counselor-calendar-field__label">تاریخ شروع</label>
                        <DatePicker
                            value={startDate}
                            onChange={setStartDate}
                            calendar={persian}
                            locale={persian_fa}
                            calendarPosition="bottom-right"
                            inputClass="counselor-calendar-input"
                            placeholder="انتخاب تاریخ"
                        />
                    </div>
                    <div className="counselor-calendar-field">
                        <label className="counselor-calendar-field__label">دوره</label>
                        <select
                            className="counselor-calendar-input"
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                        >
                            {PERIODS.map((p) => (
                                <option key={p.value} value={p.value}>
                                    {p.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    {period === "custom" && (
                        <div className="counselor-calendar-field">
                            <label className="counselor-calendar-field__label">تاریخ پایان</label>
                            <DatePicker
                                value={customEndDate}
                                onChange={setCustomEndDate}
                                calendar={persian}
                                locale={persian_fa}
                                calendarPosition="bottom-right"
                                inputClass="counselor-calendar-input"
                                placeholder="انتخاب تاریخ"
                            />
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    className="counselor-calendar-add-btn"
                    onClick={() => handlePreview()}
                    disabled={isPreviewing || isSavingSchedule}
                >
                    {isPreviewing || isSavingSchedule ? "در حال بررسی..." : "پیش‌نمایش"}
                </button>
            </div>

            {error && <p className="counselor-calendar-error">{error}</p>}

            {preview && (
                <div className="schedule-generator__preview">
                    {preview.holidays.length > 0 && (
                        <div className="schedule-generator__holiday-warning">
                            <p>
                                {preview.holidays.length.toLocaleString("fa-IR")} روز در این بازه تعطیل رسمی است:
                            </p>
                            <ul>
                                {preview.holidays.map((h) => (
                                    <li key={h.date}>
                                        {new Date(h.date).toLocaleDateString("fa-IR")} — {h.name}
                                    </li>
                                ))}
                            </ul>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={workOnHolidays}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        setWorkOnHolidays(checked);
                                        handlePreview(checked);
                                    }}
                                />
                                می‌خواهم در این روزهای تعطیل هم زمان کاری ایجاد شود
                            </label>
                        </div>
                    )}

                    <p className="schedule-generator__preview-count">
                        در این بازه {preview.count.toLocaleString("fa-IR")} زمان کاری ایجاد خواهد شد.
                    </p>

                    {preview.sample_days.map((day) => (
                        <div key={day.date} className="schedule-generator__preview-day">
                            <strong>{new Date(day.date).toLocaleDateString("fa-IR", { weekday: "long", day: "numeric", month: "long" })}</strong>
                            <div className="schedule-generator__preview-slots">
                                {day.slots.map((s, i) => (
                                    <span key={i} className="schedule-generator__preview-slot">
                                        {s.start_time.slice(0, 5)}-{s.end_time.slice(0, 5)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                    {hasAccess === false && (
                        <p className="schedule-generator__upgrade-notice">
                            تولید خودکار زمان‌های کاری فقط برای پلن‌های نقره‌ای، طلایی و سازمانی فعال است.
                        </p>
                    )}
                    <button
                        type="button"
                        className="counselor-calendar-add-btn"
                        onClick={handleGenerate}
                        disabled={isGenerating || hasAccess === false}
                    >
                        {isGenerating ? "در حال ایجاد..." : "ایجاد زمان‌های کاری"}
                    </button>
                </div>
            )}
        </div>
    );
}

export default ScheduleGenerator;