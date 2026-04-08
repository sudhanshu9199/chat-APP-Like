import style from "./RegisterPage.module.scss";
import { Link, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { registerUser } from "../../Redux/slices/authSlice";
import { useState } from "react";
import pandaImg from "../../assets/panda_right.png";
import { useGoogleLogin } from "@react-oauth/google";
import { googleAuthenticate } from "../../Redux/slices/authSlice";

const RegisterPage = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading } = useSelector((state) => state.auth);
  const [preview, setpreview] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (data) => {
    const formData = new FormData();
    formData.append("name", data.fullName);
    formData.append("email", data.email);
    formData.append("password", data.password);
    if (data.avatar && data.avatar[0]) {
      formData.append("avatar", data.avatar[0]);
    }

    const result = await dispatch(registerUser(formData));

    if (registerUser.fulfilled.match(result)) {
      navigate("/login", { replace: true });
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setpreview(URL.createObjectURL(file));
    }
  };

  return (
    <div className={style.registerWrapper}>
      <img src={pandaImg} alt="panda" className={style.pandaImage} />

      <div className={style.header}>
        <Link to="/" className={style.backBtn}>
          <i className="ri-arrow-left-s-line"></i>
        </Link>
        <h1>Register</h1>
        <p className={style.subtitle}>Create your new account</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className={style.pic}>
          <label htmlFor="file-input" className={style.picInner}>
            {preview ? (
              <img src={preview} alt="Preview" />
            ) : (
              <>
                <i className={`ri-camera-4-fill ${style.icon}`}></i>
                <p>Photo</p>
              </>
            )}
          </label>
          <input
            id="file-input"
            type="file"
            accept="image/*"
            {...register("avatar", { onChange: handleImageChange })}
          />
        </div>

        <div className={style.inputBox}>
          <i className={`ri-user-fill ${style.icon}`}></i>
          <input
            type="text"
            placeholder="Full Name"
            {...register("fullName", { required: "Full Name is required" })}
          />
        </div>
        {errors.fullName && (
          <span className={style.errors}>{errors.fullName.message}</span>
        )}

        <div className={style.inputBox}>
          <i className={`ri-mail-fill ${style.icon}`}></i>
          <input
            type="email"
            placeholder="user@mail.com"
            {...register("email", { required: "Email is required" })}
          />
          <i
            className={`ri-check-line ${style.rightIcon} ${style.checkIcon}`}
          ></i>
        </div>
        {errors.email && (
          <span className={style.errors}>{errors.email.message}</span>
        )}

        <div className={style.inputBox}>
          <i className={`ri-lock-2-fill ${style.icon}`}></i>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="........"
            {...register("password", {
              required: "Password is required",
              minLength: { value: 6, message: "Minimum 6 character" },
            })}
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

        <button type="submit" disabled={loading}>
          {loading ? "Registering..." : "Register"}
        </button>

        <div className={style.options}>
          <label className={style.remember}>
            <input type="checkbox" />
            <span className={style.checkmark}></span>
            Remember Me
          </label>
          <span className={style.forgot}>Forgot Password ?</span>
        </div>

        <div className={style.divider}>
          <span>Or continue with</span>
        </div>

        <div className={style.socialOptions}>
          <div className={style.socialIcon}>
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
              alt="Google"
            />
          </div>
        </div>

        <div className={style.redirect}>
          <p>
            Already have an account? <Link to="/login">Sign up</Link>
          </p>
        </div>
      </form>
    </div>
  );
};

export default RegisterPage;
