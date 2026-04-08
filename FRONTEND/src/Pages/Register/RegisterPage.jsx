import style from "./RegisterPage.module.scss";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { registerUser, googleAuthenticate } from "../../Redux/slices/authSlice";
import { useState } from "react";
import pandaImg from "../../assets/panda_right.png";
import { useGoogleLogin } from "@react-oauth/google";
import { toast } from "react-toastify";

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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPEG, PNG, and WebP images are allowed");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be smaller than 2MB");
      return;
    }
    setpreview(URL.createObjectURL(file));
  };

  const onSubmit = async (data) => {
    const formData = new FormData();
    formData.append("name", data.fullName.trim());
    formData.append("email", data.email.trim().toLowerCase());
    formData.append("password", data.password);
    if (data.avatar && data.avatar[0]) {
      formData.append("avatar", data.avatar[0]);
    }

    try {
      const result = await dispatch(registerUser(formData));
      if (registerUser.fulfilled.match(result)) {
        toast.success("Account created! Please log in.");
        navigate("/login", { replace: true });
      } else {
        toast.error(
          result.payload?.message || "Registration failed. Try again.",
        );
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  };

  const registerWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const result = await dispatch(
          googleAuthenticate(tokenResponse.access_token),
        );
        if (googleAuthenticate.fulfilled.match(result)) {
          toast.success("Signed up with Google!");
          navigate("/home", { replace: true });
        } else {
          toast.error(result.payload?.message || "Google Sign-Up failed.");
        }
      } catch {
        toast.error("Google Sign-Up failed. Please try again.");
      }
    },
    onError: () => toast.error("Google Sign-Up Failed"),
  });

  return (
    <div className={style.registerWrapper}>
      <img src={pandaImg} alt="panda" className={style.pandaImage} />

      <div className={style.header}>
        <Link to="/" className={style.backBtn} aria-label="Go back">
          <i className="ri-arrow-left-s-line"></i>
        </Link>
        <h1>Register</h1>
        <p className={style.subtitle}>Create your new account</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className={style.pic}>
          <label
            htmlFor="file-input"
            className={style.picInner}
            aria-label="Upload profile photo"
          >
            {preview ? (
              <img src={preview} alt="Avatar preview" />
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
          <div
            className={style.socialIcon}
            onClick={() => registerWithGoogle()}
            role="button"
            tabIndex={0}
            aria-label="Sign up with Google"
            onKeyDown={(e) => e.key === "Enter" && registerWithGoogle()}
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
            Already have an account? <Link to="/login">Sign up</Link>
          </p>
        </div>
      </form>
    </div>
  );
};

export default RegisterPage;
