import { NavLink, useLocation } from "react-router-dom";
import styles from "./BottomNav.module.scss";
import { MessageSquare, Zap, Users } from "lucide-react";

const navItems = [
  { label: "Chats", to: "/home", icon: MessageSquare },
  { label: "Story", to: "/story", icon: Zap },
  { label: "Party", to: "/party", icon: Users },
];

const BottomNav = () => {
  const location = useLocation();
  const isChatRoom = location.pathname.startsWith("/chatroom");
  const isPartyRoom = location.pathname.startsWith("/party/") && location.pathname !== "/party";
  const shouldHide = isChatRoom || isPartyRoom;

  return (
    <nav
      className={`${styles.bottomNav} ${shouldHide ? styles.inChatRoom : ""}`}
      aria-label="Primary Navigation"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.active : ""}`
            }
          >
            <Icon size={16} className={styles.navIcon} />
            <span className={styles.navLabel}>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};

export default BottomNav;
