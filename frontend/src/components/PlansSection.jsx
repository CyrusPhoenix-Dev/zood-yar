import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Check, ArrowLeft } from "lucide-react";
import api from "../api";
import { ACCESS_TOKEN } from "../constants";
import { translateApiError } from "../utils/apiErrors";
import { useAppDialog } from "./AppDialogProvider";
import "../styles/PlansSection.css";

function PlansSection() {
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [purchasingId, setPurchasingId] = useState(null);
  const [couponInputs, setCouponInputs] = useState({});
  const [selectedPeriods, setSelectedPeriods] = useState({}); // { [planId]: "monthly" | "six_months" | "yearly" }
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { alertDialog } = useAppDialog();

  useEffect(() => {
    api
      .get("/api/plans/")
      .then((res) => {
        setPlans(res.data);
        // Default each card to its first available period (monthly,
        // if present, since get_periods iterates in that order).
        const defaults = {};
        for (const plan of res.data) {
          if (plan.periods.length > 0) defaults[plan.id] = plan.periods[0].period;
        }
        setSelectedPeriods(defaults);
      })
      .catch((err) => {
        setError(translateApiError(err));
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const payment = searchParams.get("payment");
    if (!payment) return;

    if (payment === "success") {
      alertDialog("پرداخت با موفقیت انجام شد. اشتراک شما فعال شد.");
    } else if (payment === "failed") {
      alertDialog("پرداخت ناموفق بود یا لغو شد.");
    }

    searchParams.delete("payment");
    setSearchParams(searchParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBuy = async (plan) => {
    const token = localStorage.getItem(ACCESS_TOKEN);
    if (!token) {
      navigate("/login");
      return;
    }

    setPurchasingId(plan.id);
    setError("");
    try {
      const couponCode = (couponInputs[plan.id] || "").trim();
      const billingPeriod = selectedPeriods[plan.id];
      const res = await api.post(`/api/plans/${plan.id}/purchase/`, {
        coupon_code: couponCode || undefined,
        billing_period: billingPeriod,
      });

      if (res.data.free) {
        await alertDialog("اشتراک شما با موفقیت و بدون هزینه فعال شد.");
        setPurchasingId(null);
        return;
      }

      window.location.href = res.data.pay_url;
    } catch (err) {
      setError(translateApiError(err));
      console.error(err);
      setPurchasingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="plans-section">
        <p className="plans-section__status">در حال بارگذاری...</p>
      </div>
    );
  }

  if (plans.length === 0) {
    return null;
  }

  return (
    <div className="plans-section">
      <div className="plans-section__content">
        <h2 className="plans-section__title">پلن‌های اشتراک</h2>

        {error && <p className="plans-section__error">{error}</p>}

        <div className="plans-section__grid">
          {plans.map((plan, index) => {
            const accent = index % 2 === 0 ? "terracotta" : "olive";
            const currentPeriod = selectedPeriods[plan.id];
            const currentOption = plan.periods.find((p) => p.period === currentPeriod);

            return (
              <div className={`plan-card plan-card--${accent}`} key={plan.id}>
                <div className="plan-card__image-wrap">
                  <img src={plan.image} alt={plan.title} className="plan-card__image" />
                  <span className="plan-card__badge">{plan.title}</span>
                </div>

                <div className="plan-card__body">
                  <h3 className="plan-card__title">{plan.title}</h3>

                  <ul className="plan-card__features">
                    {plan.features
                      .split("\n")
                      .filter((l) => l.trim())
                      .map((line, i) => (
                        <li key={i} className="plan-card__feature">
                          <span className="plan-card__feature-check">
                            <Check size={12} />
                          </span>
                          <span>{line.trim()}</span>
                        </li>
                      ))}
                  </ul>

                  {plan.periods.length > 1 && (
                    <div className="plan-card__period-toggle">
                      {plan.periods.map((p) => (
                        <button
                          key={p.period}
                          type="button"
                          className={`plan-card__period-btn ${
                            p.period === currentPeriod ? "plan-card__period-btn--active" : ""
                          }`}
                          onClick={() =>
                            setSelectedPeriods((prev) => ({ ...prev, [plan.id]: p.period }))
                          }
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="plan-card__coupon">
                    <input
                      type="text"
                      className="plan-card__coupon-input"
                      placeholder="کد تخفیف (اختیاری)"
                      value={couponInputs[plan.id] || ""}
                      onChange={(e) =>
                        setCouponInputs((prev) => ({ ...prev, [plan.id]: e.target.value }))
                      }
                    />
                  </div>

                  {currentOption && (
                    <div className="plan-card__price-row">
                      {currentOption.sale_percent != null ? (
                        <>
                          <span className="plan-card__price-original">
                            {currentOption.price.toLocaleString("fa-IR")} تومان
                          </span>
                          <div className="plan-card__price">
                            <span className="plan-card__price-amount">
                              {currentOption.discounted_price.toLocaleString("fa-IR")}
                            </span>
                            <span className="plan-card__price-unit">تومان</span>
                          </div>
                          <span className="plan-card__sale-badge">
                            ٪{currentOption.sale_percent.toLocaleString("fa-IR")} تخفیف
                          </span>
                        </>
                      ) : (
                        <div className="plan-card__price">
                          <span className="plan-card__price-amount">
                            {currentOption.price.toLocaleString("fa-IR")}
                          </span>
                          <span className="plan-card__price-unit">تومان</span>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    className="plan-card__buy-btn"
                    onClick={() => handleBuy(plan)}
                    disabled={purchasingId === plan.id || !currentPeriod}
                  >
                    {purchasingId === plan.id ? (
                      "در حال انتقال..."
                    ) : (
                      <>
                        شروع کنید
                        <ArrowLeft size={16} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default PlansSection;