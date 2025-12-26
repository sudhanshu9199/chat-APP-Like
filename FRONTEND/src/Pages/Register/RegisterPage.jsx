import style from "./RegisterPage.module.scss";

const RegisterPage = () => {
  return (
    <div className={style.registerPage}>
      <div className={style.upper}>
        <h1>Register</h1>
      </div>
      <form>
        <div className="pic">
          <img src="" alt="profile pic" />
        </div>
        <div className="inputBox">
          <input type="text" />
        </div>
        <div className="inputBox">
          <input type="email" placeholder="Email" />
        </div>
        <div className="inputBox">
          <input type="password" placeholder="Password" />
        </div>
        <button type="submit">Register</button>
      </form>
    </div>
  );
};

export default RegisterPage;
