import style from "./BrandLogo.module.scss";
import { Link } from "react-router-dom";

const ICON_SRC = "/icons/connectX_icon-512x512.png";

/**
 * Reusable ConnectX Brand Logo with accurate 2026 typography and glowing squircle icon.
 * @param {"sm" | "md" | "lg"} size - Size variant
 * @param {boolean} withLink - Whether clicking navigates to home
 * @param {string} className - Optional external class name
 * @param {string} suffix - Optional sub-badge text (e.g. "Party", "Vault")
 */
const BrandLogo = ({
  size = "md",
  withLink = true,
  className = "",
  suffix = "",
  onClick,
}) => {
  const content = (
    <div
      className={`${style.brandLogo} ${style[size]} ${className}`}
      onClick={onClick}
    >
      <img
        src={ICON_SRC}
        alt="ConnectX"
        className={style.icon}
        loading="eager"
      />
      <span className={style.text}>
        <span className={style.connect}>Connect</span>
        <span className={style.x}>X</span>
        {suffix && (
          <span
            style={{
              marginLeft: "0.45rem",
              fontSize: "0.65em",
              fontWeight: 600,
              padding: "0.18rem 0.5rem",
              borderRadius: "6px",
              background: "rgba(56, 189, 248, 0.15)",
              color: "#38bdf8",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              letterSpacing: "0.02em",
              verticalAlign: "middle",
            }}
          >
            {suffix}
          </span>
        )}
      </span>
    </div>
  );

  if (withLink) {
    return (
      <Link to="/" style={{ textDecoration: "none" }}>
        {content}
      </Link>
    );
  }

  return content;
};

export default BrandLogo;
