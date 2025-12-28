import style from "./RegisterPage.module.scss";
import { Link } from 'react-router';

const RegisterPage = () => {
  return (
    <div className={style.registerPage}>
      <div className={style.upper}>
        <h1>Register</h1>
      </div>
      <form>
        <div className={style.pic}>
          <div className={style.picInner}>
          {/* <img src="" alt="profile pic" /> */}
          <i className={`ri-camera-4-fill ${style.icon}`}></i>
          <p>Add Photo</p>
          </div>
        </div>
        <div className={style.inputBox}>
          <i className={`ri-user-line ${style.icon}`}></i>
          <input type="text" placeholder="Full Name" />
        </div>
        <div className={style.inputBox}>
          <i className={`ri-mail-line ${style.icon}`}></i>
          <input type="email" placeholder="Email" />
        </div>
        <div className={style.inputBox}>
          <i className={`ri-lock-2-line ${style.icon}`}></i>
          <input type="password" placeholder="Password" />
        </div>
        <button type="submit">Register</button>
        <div className={style.redirect}>
          <p>Already connected? <Link to="/login">Back to Login</Link></p>
        </div>
      </form>
    </div>
  );
};

export default RegisterPage;
