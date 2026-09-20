import { useState, useEffect, useRef } from "react";
import api from "../api";
import { translateApiError } from "../utils/apiErrors";
import "../styles/SessionRecors.css";
import { useAppDialog } from "./AppDialogProvider";
const STATUS_LABELS = {
    pending: "در انتظار پرداخت",
    active: "فعال",
    expired: "منقضی شده",
    cancelled: "لغو شده",
};

function MySubscriptions() {
    const [subscriptions, setSubscriptions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedSubscription, setSelectedSubscription] = useState(null);
    const detailBoxRef = useRef(null);
    const [renewingId, setRenewingId] = useState(null);
    const { alertDialog } = useAppDialog();
    useEffect(() => {
        if (!selectedSubscription) return;

        function handleClickOutside(e) {
            if (detailBoxRef.current && !detailBoxRef.current.contains(e.target)) {
                setSelectedSubscription(null);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [selectedSubscription]);

    useEffect(() => {
        api
            .get("/api/user/subscriptions/")
            .then((res) => setSubscriptions(res.data))
            .catch((err) => {
                setError(translateApiError(err));
                console.error(err);
            })
            .finally(() => setIsLoading(false));
    }, []);

    const formatDate = (isoDate) => new Date(isoDate).toLocaleDateString("fa-IR");
    const formatPrice = (price) =>
        price > 0 ? `${price.toLocaleString("fa-IR")} تومان` : "—";
    const handleRenew = async (subscription) => {
        setRenewingId(subscription.id);
        setError("");
        try {
            const res = await api.post(`/api/plans/${subscription.plan_id}/purchase/`, {
                billing_period: subscription.billing_period,
            });
            if (res.data.free) {
                await alertDialog("اشتراک شما با موفقیت تمدید شد.");
                const refreshed = await api.get("/api/user/subscriptions/");
                setSubscriptions(refreshed.data);
            } else {
                window.location.href = res.data.pay_url;
            }
        } catch (err) {
            setError(translateApiError(err));
            console.error(err);
        } finally {
            setRenewingId(null);
        }
    };

    const canRenew = (s) => s.display_status === "active" || s.display_status === "expired";
    return (
        <div className="records-page">
            <div className="records-content">
                <div className="records-card">
                    <h1 className="records-card__title">اشتراک‌های من</h1>

                    {error && <p className="records-page__status records-page__status--error">{error}</p>}

                    {isLoading ? (
                        <p className="records-page__status">در حال بارگذاری...</p>
                    ) : subscriptions.length === 0 ? (
                        <p className="records-page__status">هنوز اشتراکی خریداری نکرده‌اید.</p>
                    ) : (
                        <>
                            {/* Desktop/tablet */}
                            <table className="records-table">
                                <thead>
                                    <tr>
                                        <th>پلن</th>
                                        <th>بازه</th>
                                        <th>تاریخ خرید</th>
                                        <th>تاریخ انقضا</th>
                                        <th>مبلغ</th>
                                        <th>وضعیت</th>
                                        <th>تمدید</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {subscriptions.map((s) => (
                                        <tr key={s.id} onClick={() => setSelectedSubscription(s)} className="records-table__row--clickable">
                                            <td>
                                                <div className="records-table__doctor">
                                                    {s.plan_image && (
                                                        <img src={s.plan_image} alt={s.plan_title} className="records-table__avatar" />
                                                    )}
                                                    <span>{s.plan_title}</span>
                                                </div>
                                            </td>
                                            <td>{s.billing_period_label}</td>
                                            <td>{formatDate(s.created_at)}</td>
                                            <td>{s.ends_at ? formatDate(s.ends_at) : "—"}</td>
                                            <td>{formatPrice(s.price_at_purchase)}</td>
                                            <td>{STATUS_LABELS[s.display_status] || s.display_status}</td>
                                            <td>
                                                {canRenew(s) && (
                                                    <button
                                                        type="button"
                                                        className="records-table__renew-btn"
                                                        onClick={(e) => { e.stopPropagation(); handleRenew(s); }}
                                                        disabled={renewingId === s.id}
                                                    >
                                                        {renewingId === s.id ? "در حال انتقال..." : "تمدید"}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Phone */}
                            <div className="records-list">
                                {subscriptions.map((s) => (
                                    <div
                                        className="records-list__item records-list__item--clickable"
                                        key={s.id}
                                        onClick={() => setSelectedSubscription(s)}
                                    >
                                        <div className="records-list__header">
                                            {s.plan_image && (
                                                <img
                                                    src={s.plan_image}
                                                    alt={s.plan_title}
                                                    className="records-table__avatar"
                                                />
                                            )}
                                            <span className="records-list__doctor">{s.plan_title}</span>
                                        </div>
                                        <div className="records-list__row">
                                            <span className="records-list__label">تاریخ خرید</span>
                                            <span>{formatDate(s.created_at)}</span>
                                        </div>
                                        <div className="records-list__row">
                                            <span className="records-list__label">تاریخ انقضا</span>
                                            <span>{s.ends_at ? formatDate(s.ends_at) : "—"}</span>
                                        </div>
                                        <div className="records-list__row">
                                            <span className="records-list__label">بازه</span>
                                            <span>{s.billing_period_label}</span>
                                        </div>
                                        <div className="records-list__row">
                                            <span className="records-list__label">مبلغ</span>
                                            <span>{formatPrice(s.price_at_purchase)}</span>
                                        </div>
                                        <div className="records-list__row">
                                            <span className="records-list__label">وضعیت</span>
                                            <span>{STATUS_LABELS[s.display_status] || s.display_status}</span>
                                        </div>
                                        {canRenew(s) && (
                                            <button
                                                type="button"
                                                className="records-table__renew-btn"
                                                onClick={(e) => { e.stopPropagation(); handleRenew(s); }}
                                                disabled={renewingId === s.id}
                                            >
                                                {renewingId === s.id ? "در حال انتقال..." : "تمدید"}
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
            {selectedSubscription && (
                <div className="subscription-detail-overlay">
                    <div className="subscription-detail-box" ref={detailBoxRef}>
                        {selectedSubscription.plan_image && (
                            <img
                                src={selectedSubscription.plan_image}
                                alt={selectedSubscription.plan_title}
                                className="subscription-detail-box__image"
                            />
                        )}

                        <h2 className="subscription-detail-box__title">
                            {selectedSubscription.plan_title}
                        </h2>

                        <span
                            className={`support-status ${selectedSubscription.display_status === "active"
                                ? "support-status--resolved"
                                : selectedSubscription.display_status === "pending"
                                    ? "support-status--pending"
                                    : "support-status--closed"
                                }`}
                        >
                            {STATUS_LABELS[selectedSubscription.display_status] || selectedSubscription.display_status}
                        </span>

                        <ul className="subscription-detail-box__features">
                            {selectedSubscription.plan_features
                                .split("\n")
                                .filter((line) => line.trim())
                                .map((line, i) => (
                                    <li key={i}>{line.trim()}</li>
                                ))}
                        </ul>

                        <div className="subscription-detail-box__footer">
                            <span>{selectedSubscription.billing_period_label}</span>
                            <span>{formatPrice(selectedSubscription.price_at_purchase)}</span>
                            <span>{formatDate(selectedSubscription.created_at)}</span>
                            {selectedSubscription.ends_at && <span>انقضا: {formatDate(selectedSubscription.ends_at)}</span>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MySubscriptions;