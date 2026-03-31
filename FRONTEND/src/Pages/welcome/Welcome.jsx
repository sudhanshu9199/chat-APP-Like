import style from "./welcome.module.scss";
import bgImage from "../../assets/Gemini_Generated_Image_nalmg4nalmg4nalm.jpeg";

const Welcome = () => {
  return (
    <div
      className={style.welcome}
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      {/* <div className={style.welcome__overlay} /> */}

      <div className={style.welcome__content}>
        <h2 className={style.welcome__heading}>
          The best app for connecting with others
        </h2>

        <div className={style.welcome__actions}>
          <button
            className={`${style.welcome__btn} ${style["welcome__btn--glass"]}`}
          >
            Sign in
          </button>
          <button
            className={`${style.welcome__btn} ${style["welcome__btn--ghost"]}`}
          >
            Create an account
          </button>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
