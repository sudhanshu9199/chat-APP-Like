import style from "./RegisterPage.module.scss";
import { Link, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from "react-redux";
import { registerUser } from "../../Redux/slices/authSlice";
import { useState } from "react";

const RegisterPage = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading } = useSelector(state => state.auth);
  const [preview, setpreview] = useState(null);

  const onSubmit = async (data) => {
    const formData = new FormData();
    formData.append('name', data.fullName);
    formData.append('email', data.email);
    formData.append('password', data.password);
    if (data.avatar && data.avatar[0]) {
      formData.append('avatar', data.avatar[0]);
    }

    const result = await dispatch(registerUser(formData));

    if (registerUser.fulfilled.match(result)) {
      navigate('/login');
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setpreview(URL.createObjectURL(file));
    }
  };
  return (
    <div className={style.registerPage}>
      <div className={style.upper}>
        <h1>Register</h1>
      </div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className={style.pic}>
          <label htmlFor="file-input" className={style.picInner}>
            {preview ? (
              <img src={preview} alt="Preview" />
            ) : (
              <>
                <i className={`ri-camera-4-fill ${style.icon}`}></i>
                <p>Add Photo</p>
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
          <i className={`ri-user-line ${style.icon}`}></i>
          <input type="text" placeholder="Full Name"
          {...register('fullName', { required: "Full Name is required" })} />
        </div>
        {errors.fullName && <span className={style.errors}>{errors.fullName.message}</span>}
        <div className={style.inputBox}>
          <i className={`ri-mail-line ${style.icon}`}></i>
          <input type="email" placeholder="Email" 
          {...register('email', { required: "Email is required" })}/>
        </div>
        {errors.email && <span className={style.errors}>{errors.email.message}</span>}
        <div className={style.inputBox}>
          <i className={`ri-lock-2-line ${style.icon}`}></i>
          <input type="password" placeholder="Password"
          {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Minimum 6 character'}})} />
        </div>
        {errors.password && <span className={style.errors}>{errors.password.message}</span>}
        <button type="submit" disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </button>
        <div className={style.redirect}>
          <p>Already connected? <Link to="/login">Back to Login</Link></p>
        </div>
      </form>
    </div>
  );
};

export default RegisterPage;
