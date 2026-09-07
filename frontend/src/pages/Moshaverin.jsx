import { useState, useEffect } from "react";
import { Search, Star, Users, ChevronRight, ChevronLeft } from "lucide-react";
import api from "../api";
import { translateApiError } from "../utils/apiErrors";
import CounselorSlider from "../components/TeamSlider";
import "../styles/Moshaverin.css";

const RATING_OPTIONS = [4.5, 4.0, 3.5, 3.0];

function CounselorsPage() {
  const [specialties, setSpecialties] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedSpecialties, setSelectedSpecialties] = useState([]);
  const [minRating, setMinRating] = useState(0);
  const [page, setPage] = useState(1);

  const [results, setResults] = useState([]);
  const [count, setCount] = useState(0);
  const [pageSize, setPageSize] = useState(9);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Specialty checkboxes are driven by real backend data, not a
  // hardcoded list — fetched once.
  useEffect(() => {
    api
      .get("/api/specialties/")
      .then((res) => setSpecialties(res.data))
      .catch((err) => console.error(err));
  }, []);

  // Re-fetch the directory whenever any filter or the page changes.
  useEffect(() => {
    setIsLoading(true);
    setError("");

    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    selectedSpecialties.forEach((slug) => params.append("specialty", slug));
    if (minRating > 0) params.set("min_rating", minRating);
    params.set("page", page);

    api
      .get(`/api/counselors/?${params.toString()}`)
      .then((res) => {
        setResults(res.data.results);
        setCount(res.data.count);
        // DRF's PageNumberPagination doesn't return page_size directly,
        // but we know it from the backend's configured value.
        setPageSize(9);
      })
      .catch((err) => {
        setError(translateApiError(err));
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  }, [search, selectedSpecialties, minRating, page]);

  const toggleSpecialty = (slug) => {
    setSelectedSpecialties((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedSpecialties([]);
    setMinRating(0);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  return (
    <>
      {/* ===== TOP COUNSELORS SLIDER ===== */}
      <CounselorSlider />

      {/* ===== FILTER + GRID ===== */}
      <section className="counselors-page">
        <div className="counselors-page__inner">
          {/* Sidebar */}
          <aside className="counselors-page__sidebar">
            <div className="counselors-page__search">
              <Search size={18} className="counselors-page__search-icon" />
              <input
                type="text"
                className="counselors-page__search-input"
                placeholder="جستجوی نام یا تخصص..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="counselors-page__filter-group">
              <h3 className="counselors-page__filter-title">حوزه تخصصی</h3>
              {specialties.map((sp) => (
                <label className="counselors-page__checkbox" key={sp.slug}>
                  <input
                    type="checkbox"
                    checked={selectedSpecialties.includes(sp.slug)}
                    onChange={() => toggleSpecialty(sp.slug)}
                  />
                  <span>{sp.label}</span>
                </label>
              ))}
            </div>

            <div className="counselors-page__filter-group">
              <h3 className="counselors-page__filter-title">حداقل امتیاز</h3>
              {RATING_OPTIONS.map((r) => (
                <label className="counselors-page__checkbox" key={r}>
                  <input
                    type="radio"
                    name="minRating"
                    checked={minRating === r}
                    onChange={() => {
                      setMinRating(r);
                      setPage(1);
                    }}
                  />
                  <span>{r.toLocaleString("fa-IR")} به بالا</span>
                </label>
              ))}
              <label className="counselors-page__checkbox">
                <input
                  type="radio"
                  name="minRating"
                  checked={minRating === 0}
                  onChange={() => {
                    setMinRating(0);
                    setPage(1);
                  }}
                />
                <span>همه</span>
              </label>
            </div>

            <button type="button" className="counselors-page__clear" onClick={clearFilters}>
              پاک کردن فیلترها
            </button>
          </aside>

          {/* Grid + pagination */}
          <div className="counselors-page__results">
            {error && <p className="counselors-page__empty">{error}</p>}

            {!error && (
              <p className="counselors-page__count">
                {count.toLocaleString("fa-IR")} مشاور پیدا شد
              </p>
            )}

            {isLoading ? (
              <p className="counselors-page__empty">در حال بارگذاری...</p>
            ) : (
              <div className="counselors-page__grid">
                {results.map((c) => (
                  <div className="counselors-page__card" key={c.id}>
                    <img
                      src={c.avatar || "/default-avatar.png"}
                      alt={c.name}
                      className="counselors-page__avatar"
                    />
                    <h3 className="counselors-page__name">{c.name}</h3>
                    <p className="counselors-page__description">{c.bio}</p>

                    <div className="counselors-page__meta">
                      <span className="counselors-page__meta-item">
                        <Users size={14} />
                        {c.bookings.toLocaleString("fa-IR")} رزرو
                      </span>
                      <span className="counselors-page__meta-item">
                        <Star size={14} className="counselors-page__star" />
                        {c.rating != null ? c.rating.toLocaleString("fa-IR") : "بدون امتیاز"}
                      </span>
                    </div>

                    <div className="counselors-page__actions">
                      <a
                        href={`/CounselorProfile/${c.id}`}
                        className="counselors-page__btn counselors-page__btn--ghost"
                      >
                        مشاهده پروفایل
                      </a>
                      <a
                        href={`/BookingPage/${c.id}`}
                        className="counselors-page__btn counselors-page__btn--primary"
                      >
                        رزرو نوبت
                      </a>
                    </div>
                  </div>
                ))}

                {results.length === 0 && (
                  <p className="counselors-page__empty">
                    هیچ مشاوری با این فیلترها پیدا نشد.
                  </p>
                )}
              </div>
            )}

            {totalPages > 1 && (
              <div className="counselors-page__pagination">
                <button
                  type="button"
                  className="counselors-page__page-btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  aria-label="صفحه قبلی"
                >
                  <ChevronRight size={18} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`counselors-page__page-btn ${
                      n === page ? "counselors-page__page-btn--active" : ""
                    }`}
                    onClick={() => setPage(n)}
                  >
                    {n.toLocaleString("fa-IR")}
                  </button>
                ))}

                <button
                  type="button"
                  className="counselors-page__page-btn"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  aria-label="صفحه بعدی"
                >
                  <ChevronLeft size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

export default CounselorsPage;
