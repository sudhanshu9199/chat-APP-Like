import style from "./ProfileUpdatePage.module.scss";
import api from "../../services/api";
import { updateUser } from "../../Redux/slices/authSlice";
import defaultDp from "../../assets/DefaultUserPic.png";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  Camera,
  Loader2,
  HardDrive,
  ShieldCheck,
  ShieldAlert,
  CloudUpload,
  CloudDownload,
  FileDown,
  FileUp,
  Sparkles,
} from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";
import {
  getStorageInfo,
  requestPersistentStorage,
} from "../../services/chatDb";
import {
  downloadLocalBackup,
  restoreFromLocalFile,
  backupToGoogleDrive,
  restoreFromGoogleDrive,
} from "../../services/googleDriveBackup";

const ProfileUpdatePage = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [preview, setpreview] = useState(defaultDp);
  const [selectedFile, setselectedFile] = useState(null);
  const [loading, setloading] = useState(false);

  // Chat Vault & Storage Management state
  const [storageInfo, setStorageInfo] = useState({
    persisted: false,
    usageFormatted: "0 B",
    quotaFormatted: "Checking...",
  });
  const [loadingVaultAction, setLoadingVaultAction] = useState(null);
  const [showGoogleGuide, setShowGoogleGuide] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setpreview(user.avatar || defaultDp);
    }
  }, [user]);

  // Load storage quota and persistence status
  useEffect(() => {
    const checkStorage = async () => {
      const info = await getStorageInfo();
      setStorageInfo(info);
    };
    checkStorage();
  }, []);

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

  // ─── CHAT VAULT CONTROLS ───
  const handleEnablePersistence = async () => {
    const granted = await requestPersistentStorage();
    if (granted) {
      toast.success("Storage eviction protection activated! 🛡️");
    } else {
      toast.info("Storage persistence requested.");
    }
    const info = await getStorageInfo();
    setStorageInfo(info);
  };

  // Google Drive BYOD (OAuth token -> appDataFolder)
  const loginForDriveBackup = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/drive.appdata",
    onSuccess: async (tokenResponse) => {
      setLoadingVaultAction("drive-backup");
      try {
        await backupToGoogleDrive(tokenResponse.access_token);
        toast.success("Chat vault safely backed up to your Google Drive! ☁️");
      } catch (err) {
        console.error("Drive backup error:", err);
        toast.error(err.message || "Drive backup failed");
      } finally {
        setLoadingVaultAction(null);
      }
    },
    onError: (err) => {
      console.error("Google Drive auth error:", err);
      setShowGoogleGuide(true);
      toast.error("Google access blocked (Error 403). See setup guide below.");
    },
  });

  const loginForDriveRestore = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/drive.appdata",
    onSuccess: async (tokenResponse) => {
      setLoadingVaultAction("drive-restore");
      try {
        const res = await restoreFromGoogleDrive(tokenResponse.access_token);
        toast.success(`Restored ${res.importedMessages} messages from Google Drive! 🎉`);
      } catch (err) {
        console.error("Drive restore error:", err);
        toast.error(err.message || "No backup found in Google Drive");
      } finally {
        setLoadingVaultAction(null);
      }
    },
    onError: (err) => {
      console.error("Google Drive auth error:", err);
      setShowGoogleGuide(true);
      toast.error("Google access blocked (Error 403). See setup guide below.");
    },
  });

  // Local JSON Export
  const handleExportLocal = async () => {
    setLoadingVaultAction("local-export");
    try {
      await downloadLocalBackup();
      toast.success("Chat vault exported to your device! 💾");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Failed to export backup file");
    } finally {
      setLoadingVaultAction(null);
    }
  };

  // Local JSON Restore
  const handleImportLocalFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoadingVaultAction("local-import");
    try {
      const res = await restoreFromLocalFile(file);
      toast.success(`Restored ${res.importedMessages} messages successfully! ✨`);
    } catch (err) {
      console.error("Import error:", err);
      toast.error(err.message || "Invalid backup file format");
    } finally {
      setLoadingVaultAction(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className={style.container}>
      <div className={style.card}>
        <div className={style.header}>
          <ArrowLeft className={style.backIcon} onClick={() => navigate(-1)} />
          <h2>Profile & Vault</h2>
        </div>

        <form onSubmit={handleSubmit} className={style.form}>
          <div className={style.imageSection}>
            <div className={style.imageWrapper}>
              <img src={preview} alt="profile" className={style.profileImage} />
              <label htmlFor="fileInput" className={style.cameraOverlay}>
                <Camera color="#ffff" />
              </label>
              <input
                type="file"
                className={style.hiddenInput}
                id="fileInput"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
            <p className={style.hint}>Click icon to change photo</p>
          </div>

          <div className={style.inputGroup}>
            <label htmlFor="">Name</label>
            <input
              type="text"
              className={style.disabledInput}
              value={user?.name || ""}
              disabled
            />
          </div>
          <div className={style.inputGroup}>
            <label htmlFor="">Email</label>
            <input
              type="email"
              className={style.disabledInput}
              value={user?.email || ""}
              disabled
            />
          </div>
          <button
            type="submit"
            className={style.saveBtn}
            disabled={loading || !selectedFile}
          >
            {loading ? <Loader2 className={style.spin} /> : "Save Changes"}
          </button>
        </form>

        {/* ─── 2026 CHAT VAULT & ZERO-COST STORAGE SECTION ─── */}
        <div className={style.vaultSection}>
          <div className={style.vaultHeader}>
            <HardDrive className={style.vaultIcon} size={20} />
            <h3>Chat Vault (₹0 Storage)</h3>
          </div>
          <p className={style.vaultSubtitle}>
            Your messages are stored in your device's browser vault for instant
            speed and 100% privacy with ₹0 server hosting cost.
          </p>

          <div className={style.storageStatusCard}>
            <div className={style.statusRow}>
              <span className={style.label}>Eviction Protection:</span>
              {storageInfo.persisted ? (
                <span className={style.protectedBadge}>
                  <ShieldCheck size={14} /> Active
                </span>
              ) : (
                <button
                  type="button"
                  className={style.warningBadge}
                  onClick={handleEnablePersistence}
                  title="Click to protect chats from OS clearing"
                >
                  <ShieldAlert size={14} /> Enable Protection
                </button>
              )}
            </div>

            <div className={style.quotaRow}>
              <span>Storage Used:</span>
              <span>
                {storageInfo.usageFormatted} / {storageInfo.quotaFormatted}
              </span>
            </div>
          </div>

          <div className={style.vaultActionsGrid}>
            {/* Google Drive BYOD */}
            <button
              type="button"
              className={`${style.vaultBtn} ${style.driveBtn}`}
              onClick={() => loginForDriveBackup()}
              disabled={loadingVaultAction !== null}
            >
              {loadingVaultAction === "drive-backup" ? (
                <Loader2 className={style.spin} size={16} />
              ) : (
                <CloudUpload size={16} />
              )}
              Backup to Google Drive
            </button>

            <button
              type="button"
              className={`${style.vaultBtn} ${style.driveRestoreBtn}`}
              onClick={() => loginForDriveRestore()}
              disabled={loadingVaultAction !== null}
            >
              {loadingVaultAction === "drive-restore" ? (
                <Loader2 className={style.spin} size={16} />
              ) : (
                <CloudDownload size={16} />
              )}
              Restore from Google Drive
            </button>

            {/* Local Offline JSON Backup */}
            <div className={style.localRow}>
              <button
                type="button"
                className={`${style.vaultBtn} ${style.exportBtn}`}
                onClick={handleExportLocal}
                disabled={loadingVaultAction !== null}
                title="Download JSON copy of your entire chat history"
              >
                {loadingVaultAction === "local-export" ? (
                  <Loader2 className={style.spin} size={14} />
                ) : (
                  <FileDown size={14} />
                )}
                Export .json
              </button>

              <button
                type="button"
                className={`${style.vaultBtn} ${style.importBtn}`}
                onClick={() => fileInputRef.current?.click()}
                disabled={loadingVaultAction !== null}
                title="Restore chats from a previous JSON backup file"
              >
                {loadingVaultAction === "local-import" ? (
                  <Loader2 className={style.spin} size={14} />
                ) : (
                  <FileUp size={14} />
                )}
                Import .json
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: "none" }}
                onChange={handleImportLocalFile}
              />
            </div>

            {/* Google Drive Setup Help Toggle */}
            <button
              type="button"
              className={style.helpLink}
              onClick={() => setShowGoogleGuide(!showGoogleGuide)}
            >
              {showGoogleGuide
                ? "▲ Hide Google Setup Guide"
                : "ℹ️ Why does Google show 'Access blocked (Error 403)'?"}
            </button>

            {showGoogleGuide && (
              <div className={style.googleGuideBox}>
                <h4>🔧 How to Fix 'Error 403: access_denied':</h4>
                <p>
                  Google Cloud blocks apps in <strong>Testing</strong> status unless your email is added as an approved tester:
                </p>
                <ol>
                  <li>
                    Open{" "}
                    <a
                      href="https://console.cloud.google.com/apis/credentials/consent"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Google Cloud Console ➔ OAuth Consent Screen
                    </a>
                  </li>
                  <li>
                    Scroll to <strong>Test users</strong> and click{" "}
                    <strong>+ ADD USERS</strong>.
                  </li>
                  <li>Enter your Gmail (e.g. <code>dearsubject@gmail.com</code>) and click <strong>Save</strong>.</li>
                  <li>
                    Ensure{" "}
                    <a
                      href="https://console.cloud.google.com/apis/library/drive.googleapis.com"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Google Drive API
                    </a>{" "}
                    is enabled on project <code>293478870449</code>.
                  </li>
                </ol>
                <div className={style.offlineHint}>
                  💡 <strong>Tip:</strong> If you don't want to configure Google Cloud, simply click <strong>Export .json</strong> above. It saves your entire chat vault offline with 0 cloud dependencies!
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileUpdatePage;
