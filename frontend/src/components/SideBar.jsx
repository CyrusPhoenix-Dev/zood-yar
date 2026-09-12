import { useState, useEffect } from "react";
import {
  FileText,
  UserCog,
  LifeBuoy,
  Key,
  CalendarDays,
  UserRoundArrowLeft,
  RectangleEllipsis,
} from "lucide-react";
import api from "../api";
import "../styles/SideBar.css";

const navItems = [
  { label: "ویرایش پروفایل", icon: UserCog, section: "editInfo" },
  { label: "وقت های من", icon: FileText, section: "sessions" },
  { label: "تایید شماره همراه", icon: RectangleEllipsis, section: "phoneAuth" },
  { label: "ویرایش رمزعبور", icon: Key, section: "resetPassword" },
  { label: "پشتیبانی", icon: LifeBuoy, section: "support" },
  // These two only make sense for a counselor account — a regular
  // client user has no calendar to manage and no clients to see.
  { label: "اطلاعات مشاور", icon: LifeBuoy, section: "CounselorInfo", counselorOnly: true },
  { label: "تقویم من", icon: CalendarDays, section: "counselorCalender", counselorOnly: true },
  { label: "مراجعین من", icon: UserRoundArrowLeft, section: "counselorClients", counselorOnly: true },
];

function SideNav({ setActiveSection }) {
  const [role, setRole] = useState(null); // null while loading — nothing counselor-only shows yet

  useEffect(() => {
    let isMounted = true;
    api
      .get("/api/user/profile/")
      .then((res) => {
        if (isMounted) setRole(res.data.role);
      })
      .catch(() => {
        // If this fails, default to hiding counselor-only items rather
        // than risk showing them to someone who isn't one.
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const visibleItems = navItems.filter(
    (item) => !item.counselorOnly || role === "counselor"
  );

  return (
    <nav className="side-nav">
      <ul className="side-nav__list">
        {visibleItems.map(({ label, icon: Icon, section }) => (
          <li key={section} className="side-nav__item">
            <button
              type="button"
              className="side-nav__link"
              onClick={() => setActiveSection(section)}
            >
              <Icon size={18} className="side-nav__icon" />
              <span>{label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default SideNav;
