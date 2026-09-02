import { FileText, UserCog, LifeBuoy, Mail, Key, RectangleEllipsis } from "lucide-react";
import "../styles/SideBar.css";

const navItems = [
  { label: "ویرایش پروفایل", icon: UserCog, section: "editInfo" },
  { label: "وقت های من", icon: FileText, section: "sessions" },
  { label: "تایید شماره همراه", icon: RectangleEllipsis, section: "phoneAuth" },
  { label: "تایید ایمیل", icon: Mail, section: "emailAuth" },
  { label: "ویرایش رمزعبور", icon: Key, section: "resetPassword" },
  { label: "پشتیبانی", icon: LifeBuoy, section: "support" },
];

function SideNav({ setActiveSection }) {
  return (
    <nav className="side-nav">
      <ul className="side-nav__list">
        {navItems.map(({ label, icon: Icon, section }) => (
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