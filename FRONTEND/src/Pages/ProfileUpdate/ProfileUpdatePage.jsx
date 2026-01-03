import style from "./ProfileUpdatePage.module.scss";
import api from "../../services/api";
import { updateUser } from "../../Redux/slices/authSlice";
import defaultDp from "../../assets/DefaultUserPic.png";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { useState } from "react";
import { useEffect } from "react";
import { toast } from 'react-toastify';
import { ArrowLeft, Camera, Loader2 } from "lucide-react";

const ProfileUpdatePage = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [preview, setpreview] = useState(defaultDp);
  const [selectedFile, setselectedFile] = useState(null);
  const [loading, setloading] = useState(false);

  useEffect(() => {
    if (user) {
      setpreview(user.avatar || defaultDp);
    }
  }, [user]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setselectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setpreview(objectUrl);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.info("Please select a new image to update.");
      return;
    }

    try {
      setloading(true);
      const formData = new FormData();
      formData.append("avatar", selectedFile);

      const response = await api.put("/users/update-profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      dispatch(updateUser(response.data.user));
      toast.success("Profile picture updated successfully!");
      navigate("/");
    } catch (err) {
      console.error("Profile update failed", err);
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setloading(false);
    }
  };
  return (
    <div className={style.container}>
      <div className={style.card}>
        <div className={style.header}>
          <ArrowLeft className={style.backIcon} onClick={() => navigate(-1)} />
          <h2>Profile</h2>
        </div>

        <form onSubmit={handleSubmit} className={style.form}>
            <div className={style.imageSection}>
                <div className={style.imageWrapper}>
                    <img src={preview} alt="profile" className={style.profileImage} />
                    <label htmlFor="fileInput" className={style.cameraOverlay}>
                        <Camera color="#ffff"/>
                    </label>
                    <input type="file" className={style.hiddenInput} id="fileInput" accept="image/*" onChange={handleFileChange} />
                </div>
                <p className={style.hint}>Click icon to change photo</p>
            </div>

            <div className={style.inputGroup}>
                <label htmlFor="">Name</label>
                <input type="text" className={style.disabledInput} value={user?.name || ''} disabled />
            </div>
            <div className={style.inputGroup}>
                <label htmlFor="">Email</label>
                <input type="email" className={style.disabledInput} value={user?.email || ''} disabled />
            </div>
            <button type="submit" className={style.saveBtn} disabled={loading || !selectedFile}>
                {loading ? <Loader2 className={style.spin}/> : 'Save Changes'}
            </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileUpdatePage;
