import { useForm } from "react-hook-form";
import style from "./LoginPage.module.scss";
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from "react-redux";
import { loginUser } from "../../Redux/slices/authSlice";

const LoginPage = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading } = useSelector(state => state.auth);

  const onSubmit = async (data) => {
    const result = await dispatch(loginUser(data));

    if (loginUser.fulfilled.match(result)) {
      navigate('/');
    }
  };
  return (
    <div className={style.loginPage}>
      <div className={style.upper}>
        <h1>Login</h1>
      </div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className={style.inputBox}>
          <i className={`ri-mail-fill ${style.icon}`}></i>
          <input type="email" placeholder="Email"
          {...register('email', { required: 'Email is required' })} />
        </div>
        {errors.email && <span className={style.errors}>{errors.email.message}</span>}
        <div className={style.inputBox}>
          <i className={`ri-lock-2-fill ${style.icon}`}></i>
          <input type="password" placeholder="Password"
          {...register('password', { required: 'Password is required' })} />
        </div>
        {errors.password && <span className={style.errors}>{errors.password.message}</span>}
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
        <div className={style.redirect}>
          <p>New to ConnectX? <Link to='/register'>Start connecting</Link></p>
        </div>
      </form>
    </div>
  );
};

export default LoginPage;
