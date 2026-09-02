import { useState, useMemo } from "react";
import { Search, Star, Users, ChevronRight, ChevronLeft } from "lucide-react";
// import Navbar from "./Navbar";
// import Footer from "./Footer";
import CounselorSlider from "../components/TeamSlider";
import "../styles/Moshaverin.css";

// Full counselor directory data. Swap with a real API call — this is
// separate from CounselorSlider's own "top counselors" sample data,
// since that slider only ever shows a curated subset.
const allCounselors = [
  { id: 1, name: "دکتر سید محمد حسینی", avatar: "https://i.pravatar.cc/200?img=12", description: "متخصص مشاوره خانواده، ازدواج و طلاق با ۱۰ سال سابقه", bookings: 482, rating: 4.9, category: "family" },
  { id: 2, name: "دکتر مریم صادقی", avatar: "https://i.pravatar.cc/200?img=32", description: "روان‌شناس بالینی، متخصص اضطراب و افسردگی", bookings: 356, rating: 4.8, category: "individual" },
  { id: 3, name: "دکتر علی رضایی", avatar: "https://i.pravatar.cc/200?img=51", description: "مشاور کودک و نوجوان، متخصص مشکلات رفتاری", bookings: 210, rating: 4.7, category: "child" },
  { id: 4, name: "دکتر نگار کریمی", avatar: "https://i.pravatar.cc/200?img=45", description: "مشاور شغلی و مسیر پیشرفت حرفه‌ای", bookings: 128, rating: 4.9, category: "career" },
  { id: 5, name: "دکتر امیر حسینی", avatar: "https://i.pravatar.cc/200?img=15", description: "متخصص ترک اعتیاد و بازتوانی رفتاری", bookings: 190, rating: 4.6, category: "addiction" },
  { id: 6, name: "دکتر سارا احمدی", avatar: "https://i.pravatar.cc/200?img=47", description: "مشاور تحصیلی و برنامه‌ریزی آموزشی", bookings: 267, rating: 4.8, category: "educational" },
  { id: 7, name: "دکتر رضا مرادی", avatar: "https://i.pravatar.cc/200?img=8", description: "مشاور ازدواج و زوج‌درمانی", bookings: 301, rating: 4.7, category: "marriage" },
  { id: 8, name: "دکتر لیلا نوری", avatar: "https://i.pravatar.cc/200?img=44", description: "متخصص مشاوره سوگ و از دست دادن", bookings: 95, rating: 4.9, category: "grief" },
  { id: 9, name: "دکتر حسن قاسمی", avatar: "https://i.pravatar.cc/200?img=13", description: "روان‌شناس فردی، متخصص استرس شغلی", bookings: 174, rating: 4.6, category: "individual" },
  { id: 10, name: "دکتر فاطمه یوسفی", avatar: "https://i.pravatar.cc/200?img=48", description: "مشاور خانواده و فرزندپروری", bookings: 220, rating: 4.8, category: "family" },
  { id: 11, name: "دکتر بابک صالحی", avatar: "https://i.pravatar.cc/200?img=11", description: "مشاور کودک، متخصص اختلالات یادگیری", bookings: 140, rating: 4.7, category: "child" },
  { id: 12, name: "دکتر شیوا رحیمی", avatar: "https://i.pravatar.cc/200?img=49", description: "مشاور شغلی و مصاحبه استخدامی", bookings: 88, rating: 4.5, category: "career" },
];

const categories = [
  { value: "family", label: "مشاوره خانواده" },
  { value: "marriage", label: "مشاوره ازدواج و زوجین" },
  { value: "individual", label: "مشاوره فردی و روان‌شناسی" },
  { value: "child", label: "مشاوره کودک و نوجوان" },
  { value: "educational", label: "مشاوره تحصیلی" },
  { value: "addiction", label: "مشاوره ترک اعتیاد" },
  { value: "grief", label: "مشاوره سوگ" },
  { value: "career", label: "مشاوره شغلی" },
];

const PAGE_SIZE = 9;

function CounselorsPage() {
  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [minRating, setMinRating] = useState(0);
  const [page, setPage] = useState(1);

  const toggleCategory = (value) => {
    setSelectedCategories((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedCategories([]);
    setMinRating(0);
    setPage(1);
  };

  const filtered = useMemo(() => {
    return allCounselors.filter((c) => {
      const matchesSearch = c.name.includes(search) || c.description.includes(search);
      const matchesCategory =
        selectedCategories.length === 0 || selectedCategories.includes(c.category);
      const matchesRating = c.rating >= minRating;
      return matchesSearch && matchesCategory && matchesRating;
    });
  }, [search, selectedCategories, minRating]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      {/* <Navbar /> */}

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
              {categories.map((cat) => (
                <label className="counselors-page__checkbox" key={cat.value}>
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat.value)}
                    onChange={() => toggleCategory(cat.value)}
                  />
                  <span>{cat.label}</span>
                </label>
              ))}
            </div>

            <div className="counselors-page__filter-group">
              <h3 className="counselors-page__filter-title">حداقل امتیاز</h3>
              {[4.5, 4.0, 3.5].map((r) => (
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

            <button
              type="button"
              className="counselors-page__clear"
              onClick={clearFilters}
            >
              پاک کردن فیلترها
            </button>
          </aside>

          {/* Grid + pagination */}
          <div className="counselors-page__results">
            <p className="counselors-page__count">
              {filtered.length.toLocaleString("fa-IR")} مشاور پیدا شد
            </p>

            <div className="counselors-page__grid">
              {pageItems.map((c) => (
                <div className="counselors-page__card" key={c.id}>
                  <img src={c.avatar} alt={c.name} className="counselors-page__avatar" />
                  <h3 className="counselors-page__name">{c.name}</h3>
                  <p className="counselors-page__description">{c.description}</p>

                  <div className="counselors-page__meta">
                    <span className="counselors-page__meta-item">
                      <Users size={14} />
                      {c.bookings.toLocaleString("fa-IR")} رزرو
                    </span>
                    <span className="counselors-page__meta-item">
                      <Star size={14} className="counselors-page__star" />
                      {c.rating.toLocaleString("fa-IR")}
                    </span>
                  </div>

                  <div className="counselors-page__actions">
                    <a
                      href={`/counselors/${c.id}`}
                      className="counselors-page__btn counselors-page__btn--ghost"
                    >
                      مشاهده پروفایل
                    </a>
                    <a
                      href={`/counselors/${c.id}/book`}
                      className="counselors-page__btn counselors-page__btn--primary"
                    >
                      رزرو نوبت
                    </a>
                  </div>
                </div>
              ))}

              {pageItems.length === 0 && (
                <p className="counselors-page__empty">
                  هیچ مشاوری با این فیلترها پیدا نشد.
                </p>
              )}
            </div>

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

      {/* <Footer /> */}
    </>
  );
}

export default CounselorsPage;
