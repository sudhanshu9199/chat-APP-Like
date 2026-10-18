import { NavLink } from "react-router-dom";
import styles from "./BottomNav.module.scss";

const navItems = [
  { label: "Chats", to: "/home" },
  { label: "Story", to: "/story" },
  { label: "Party", to: "/party" },
];

const BottomNav = () => {
  return (
    <nav className={styles.bottomNav} aria-label="Primary">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `${styles.navItems} ${isActive ? styles.active : ""}`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
};
export default BottomNav;
