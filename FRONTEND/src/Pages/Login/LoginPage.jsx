import style from "./LoginPage.module.scss";

const LoginPage = () => {
  return (
    <div className={style.loginPage}>
      <div className={style.upper}>
        <h1>Login</h1>
      </div>
      <form>
        <div className="inputBox">
          <input type="email" placeholder="Email" />
        </div>
        <div className="inputBox">
          <input type="password" placeholder="Password" />
        </div>
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default LoginPage;
