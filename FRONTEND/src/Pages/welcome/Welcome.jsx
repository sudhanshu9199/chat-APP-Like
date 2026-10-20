import style from "./welcome.module.scss";
import { useNavigate, Link } from "react-router-dom";
import { 
  ShieldCheck, 
  Database, 
  Video, 
  Cloud, 
  ArrowRight, 
  Lock,
  ExternalLink
} from "lucide-react";

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className={style.welcomePage}>
      <div className={style.bgGlow} />

      {/* Navigation Bar */}
      <header className={style.navbar}>
        <div className={style.brand}>
          <div className={style.logoBadge}>X</div>
          <span>ConnectX</span>
        </div>
        <nav className={style.navLinks}>
          <a href="#features">Features</a>
          <a href="#compliance">Security & Privacy</a>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms</Link>
          <button className={style.btnSignIn} onClick={() => navigate("/login")}>
            Sign In
          </button>
          <button className={style.btnRegister} onClick={() => navigate("/register")}>
            Get Started
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className={style.hero}>
        <div className={style.badge}>
          <ShieldCheck size={16} />
          <span>ConnectX 2026 • Private P2P Messaging & WebRTC Mesh</span>
        </div>

        <h1 className={style.title}>
          Connect Freely. <br />
          <span className={style.gradientText}>Store Safely. ₹0 Forever.</span>
        </h1>

        <p className={style.description}>
          Experience next-generation communications built on a zero-database Store-and-Forward architecture. 
          Enjoy crystal-clear WebRTC video calling with live AI captions, local on-device IndexedDB chat vaults, 
          and optional Bring-Your-Own-Drive (BYOD) cloud backup.
        </p>

        <div className={style.actions}>
          <button className={style.primaryBtn} onClick={() => navigate("/register")}>
            Create Free Account <ArrowRight size={18} style={{ display: "inline", verticalAlign: "middle", marginLeft: "4px" }} />
          </button>
          <button className={style.secondaryBtn} onClick={() => navigate("/login")}>
            Sign In to ConnectX
          </button>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className={style.featuresSection}>
        <div className={style.sectionHeader}>
          <h3>Architected for Absolute Privacy & Zero Cost</h3>
          <p>Cutting-edge web standards designed to put you in complete control of your communication.</p>
        </div>

        <div className={style.grid}>
          <div className={style.card}>
            <div className={style.iconWrapper}>
              <Lock size={24} />
            </div>
            <h4>WhatsApp "Post Office" Engine</h4>
            <p>
              Delivered messages stream live peer-to-screen and are never permanently saved in a central database. 
              Offline messages are temporarily held with a 14-day auto-purge TTL and deleted immediately upon receipt.
            </p>
          </div>

          <div className={style.card}>
            <div className={style.iconWrapper}>
              <Database size={24} />
            </div>
            <h4>On-Device IndexedDB Vault</h4>
            <p>
              Your full conversation history and media snippets live encrypted on your own device inside your browser's 
              private storage, with browser eviction protection and zero server surveillance.
            </p>
          </div>

          <div className={style.card}>
            <div className={style.iconWrapper}>
              <Video size={24} />
            </div>
            <h4>Crystal HD WebRTC Calling</h4>
            <p>
              Peer-to-peer encrypted audio and video calling with sub-50ms latency. Includes on-device speech recognition 
              for real-time live captions during active calls.
            </p>
          </div>

          <div className={style.card}>
            <div className={style.iconWrapper}>
              <Cloud size={24} />
            </div>
            <h4>Bring-Your-Own-Drive (BYOD)</h4>
            <p>
              Seamlessly backup and restore your chat vault using your personal Google Drive (AppData folder). 
              Your data stays in your personal cloud—not on our servers.
            </p>
          </div>
        </div>
      </section>

      {/* Google Trust & Security Disclosure */}
      <section id="compliance" className={style.complianceBox}>
        <h4>
          <ShieldCheck size={20} />
          Google API & Identity Services Disclosure
        </h4>
        <p>
          <strong>Google Sign-In:</strong> ConnectX allows you to sign in securely with your Google account. 
          We only access your basic profile (name, email, and avatar) to authenticate your identity.
        </p>
        <p>
          <strong>Google Drive AppData Scope (<code>drive.appdata</code>):</strong> When you explicitly choose to backup or restore your chat history, 
          ConnectX interacts only with its dedicated <code>connectx_chat_vault.json</code> file in your private application data folder. 
          ConnectX cannot view, access, or modify any other files in your Google Drive, and your data is never transferred or sold to third parties.
        </p>
      </section>

      {/* Footer with Legal Links */}
      <footer className={style.footer}>
        <div className={style.footerContent}>
          <div>
            <strong>ConnectX</strong> &copy; {new Date().getFullYear()} — Engineered by Sudhanshu Ghosh
          </div>

          <div className={style.footerLinks}>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
          </div>

          <div className={style.contacts}>
            Developer: <a href="mailto:shudhanshukumar9713@gmail.com">shudhanshukumar9713@gmail.com</a> | 
            Support: <a href="mailto:dearsubject@gmail.com">dearsubject@gmail.com</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Welcome;
