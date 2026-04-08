import { useForm } from "react-hook-form";
import style from "./LoginPage.module.scss";
import { Link, useNavigate } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { loginUser } from "../../Redux/slices/authSlice";
import { useState } from "react";
import bgImage from "../../assets/Gemini_Generated_Image_nalmg4nalmg4nalm.jpeg";
import { useGoogleLogin } from "@react-oauth/google";
import { googleAuthenticate } from "../../Redux/slices/authSlice";
import { toast } from "react-toastify";

const LoginPage = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading } = useSelector((state) => state.auth);
  const [showPassword, setShowPassword] = useState(false);

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      const result = await dispatch(
        googleAuthenticate(tokenResponse.access_token),
      );
      if (googleAuthenticate.fulfilled.match(result)) {
        navigate("/home", { replace: true });
      }
    },
    onError: () => toast.error("Google Sign-In Failed"),
  });

  const onSubmit = async (data) => {
    const result = await dispatch(loginUser(data));

    if (loginUser.fulfilled.match(result)) {
      navigate("/home", { replace: true });
    }
  };

  return (
    <div className={style.loginWrapper}>
      <Link to="/" className={style.backBtn}>
        <i className="ri-arrow-left-s-line"></i>
      </Link>

      <div className={style.topSection}>
        <img src={bgImage} alt="background" className={style.bgImage} />
        <div className={style.curveShape}>
          <svg viewBox="0 0 1440 180" preserveAspectRatio="none">
            <path
              fill="#ffffff"
              d="M0,180 L1440,180 L1440,5 C1000,10 600,150 0,100 Z"
            ></path>
          </svg>
        </div>
      </div>

      <div className={style.contentSection}>
        <div className={style.header}>
          <h1>Welcome Back</h1>
          <p className={style.subtitle}>Login to your account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className={style.form}>
          <div className={style.inputBox}>
            <i className={`ri-user-fill ${style.icon}`}></i>
            <input
              type="email"
              placeholder="Email"
              {...register("email", { required: "Email is required" })}
            />
          </div>
          {errors.email && (
            <span className={style.errors}>{errors.email.message}</span>
          )}

          <div className={style.inputBox}>
            <i className={`ri-lock-2-fill ${style.icon}`}></i>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="........"
              {...register("password", { required: "Password is required" })}
            />
            <i
              className={`ri-eye-${showPassword ? "line" : "off-line"} ${style.rightIcon}`}
              onClick={() => setShowPassword(!showPassword)}
              style={{ cursor: "pointer" }}
            ></i>
          </div>
          {errors.password && (
            <span className={style.errors}>{errors.password.message}</span>
          )}

          <div className={style.options}>
            <label className={style.remember}>
              <input type="checkbox" />
              <span className={style.checkmark}></span>
              Remember Me
            </label>
            <span className={style.forgot}>Forgot Password ?</span>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>

          <div className={style.divider}>
            <span>Or continue with</span>
          </div>

          <div className={style.socialOptions}>
            <div
              className={style.socialIcon}
              onClick={() => loginWithGoogle()}
              style={{ cursor: "pointer" }}
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
                alt="Google"
              />
            </div>
          </div>

          <div className={style.redirect}>
            <p>
              New to ConnectX? <Link to="/register">Start connecting</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
export default LoginPage;
