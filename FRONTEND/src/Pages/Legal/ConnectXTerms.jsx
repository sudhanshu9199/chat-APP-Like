import style from "./Legal.module.scss";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ConnectXTerms = () => {
  const navigate = useNavigate();

  return (
    <div className={style.legalContainer}>
      <div className={style.legalCard}>
        <button onClick={() => navigate(-1)} className={style.backLink}>
          <ArrowLeft size={16} /> Back to ConnectX
        </button>

        <h1>Terms of Service</h1>
        <p className={style.lastUpdated}>Last Updated: October 20, 2026</p>

        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using <strong>ConnectX</strong> at <code>https://connectx-chat-with.netlify.app</code>, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the service.
          </p>
        </section>

        <section>
          <h2>2. Description of Service</h2>
          <p>
            ConnectX provides real-time peer-to-peer messaging, WebRTC audio/video communications, on-device AI transcriptions, and personal chat backup utilities. The service is provided "as is" and "as available".
          </p>
        </section>

        <section>
          <h2>3. User Responsibilities</h2>
          <ul>
            <li>You agree not to use ConnectX for any unlawful, harassing, defamatory, or abusive behavior.</li>
            <li>You are responsible for maintaining the security of your account and any backup files you export.</li>
            <li>You acknowledge that messages are stored locally in your browser; clearing your browser data without exporting a backup may result in data loss.</li>
          </ul>
        </section>

        <section>
          <h2>4. Third-Party Integrations</h2>
          <p>
            ConnectX interfaces with third-party services including Google OAuth 2.0 and Google Drive APIs for authentication and user-initiated backups. Your use of these services is governed by Google's respective Terms of Service and Privacy Policies.
          </p>
        </section>

        <section>
          <h2>5. Contact Information</h2>
          <p>
            For questions regarding these Terms, please contact:
            <br />
            <strong>Developer:</strong> Sudhanshu Ghosh
            <br />
            <strong>Contact Email:</strong>{" "}
            <a href="mailto:shudhanshukumar9713@gmail.com" style={{ color: "#38bdf8" }}>
              shudhanshukumar9713@gmail.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
};

export default ConnectXTerms;
