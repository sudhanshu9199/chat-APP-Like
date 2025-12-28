import style from "./LoginPage.module.scss";

const LoginPage = () => {
  return (
    <div className={style.loginPage}>
      <div className={style.upper}>
        <h1>Login</h1>
      </div>
      <form>
        <div className={style.inputBox}>
          <i className={`ri-mail-fill ${style.icon}`}></i>
          <input type="email" placeholder="Email" />
        </div>
        <div className={style.inputBox}>
          <i className={`ri-lock-2-fill ${style.icon}`}></i>
          <input type="password" placeholder="Password" />
        </div>
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default LoginPage;
