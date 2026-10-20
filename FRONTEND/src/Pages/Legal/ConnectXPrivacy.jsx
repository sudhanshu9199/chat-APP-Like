import style from "./Legal.module.scss";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ConnectXPrivacy = () => {
  const navigate = useNavigate();

  return (
    <div className={style.legalContainer}>
      <div className={style.legalCard}>
        <button onClick={() => navigate(-1)} className={style.backLink}>
          <ArrowLeft size={16} /> Back to ConnectX
        </button>

        <h1>Privacy Policy</h1>
        <p className={style.lastUpdated}>Last Updated: October 20, 2026</p>

        <section>
          <h2>1. Introduction</h2>
          <p>
            Welcome to <strong>ConnectX</strong> ("we", "our", or "us"), developed by <strong>Sudhanshu Ghosh</strong>. We are committed to protecting your personal privacy. This Privacy Policy outlines our data handling practices for our real-time messaging, WebRTC calling, and chat backup services available at <code>https://connectx-chat-with.netlify.app</code>.
          </p>
        </section>

        <section>
          <h2>2. Information We Collect</h2>
          <p>When you create an account or use ConnectX, we collect minimal necessary data:</p>
          <ul>
            <li><strong>Account Information:</strong> Your name, email address, and optional profile avatar image.</li>
            <li><strong>Google Identity Data:</strong> If you sign in via Google OAuth, we receive your name, email address, and profile picture from your Google Account to authenticate your identity.</li>
          </ul>
        </section>

        <section>
          <h2>3. Zero-Database Architecture & Browser Storage</h2>
          <p>
            ConnectX operates on a privacy-first <strong>Store-and-Forward ("WhatsApp Post Office")</strong> architecture:
          </p>
          <ul>
            <li>Messages delivered to online users are streamed peer-to-screen over secure WebSockets and are <strong>never permanently stored on our backend databases</strong>.</li>
            <li>Historical messages reside locally on your own device inside your browser's private <strong>IndexedDB Vault</strong>.</li>
            <li>Offline queued messages are temporarily held with a 14-day auto-purge TTL and deleted immediately upon recipient receipt.</li>
          </ul>
        </section>

        <section>
          <h2>4. Google Drive AppData Scope Usage</h2>
          <p>
            ConnectX provides an optional Bring-Your-Own-Drive (BYOD) cloud backup feature using the Google Drive API scope <code>https://www.googleapis.com/auth/drive.appdata</code>:
          </p>
          <ul>
            <li><strong>Purpose:</strong> We request this permission solely to upload and restore your encrypted/JSON chat vault backup to your personal, hidden Google Drive application data folder.</li>
            <li><strong>Limited Access:</strong> ConnectX only accesses the <code>connectx_chat_vault.json</code> file inside your private appDataFolder. We cannot see, access, or modify any other files or folders in your Google Drive.</li>
            <li><strong>No Data Sharing:</strong> Your Google Drive data remains 100% private to you. We do not inspect, log, sell, or transfer your Google Drive data to any external parties.</li>
          </ul>
        </section>

        <section>
          <h2>5. WebRTC Peer-to-Peer Calling</h2>
          <p>
            Audio, video, and live caption streams during calls flow directly peer-to-peer between participating browsers via encrypted WebRTC connections. Media tracks do not traverse or get recorded on our application servers.
          </p>
        </section>

        <section>
          <h2>6. Contact Information</h2>
          <p>
            If you have any questions, feedback, or requests regarding your personal data or this Privacy Policy, please contact our team:
            <br /><br />
            <strong>Developer & Lead Maintainer:</strong> Sudhanshu Ghosh
            <br />
            <strong>Developer Contact Email:</strong>{" "}
            <a href="mailto:shudhanshukumar9713@gmail.com" style={{ color: "#38bdf8" }}>
              shudhanshukumar9713@gmail.com
            </a>
            <br />
            <strong>User Support & Inquiries:</strong>{" "}
            <a href="mailto:dearsubject@gmail.com" style={{ color: "#38bdf8" }}>
              dearsubject@gmail.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
};

export default ConnectXPrivacy;
