import { Route, Routes, Navigate, useLocation } from "react-router";
import React, { lazy, Suspense } from "react";
import { useSelector } from "react-redux";
import ProtectedRoute from "./ProtectedRoute";
import GlobalCallHandler from "../components/GlobalCallHandler/GlobalCallHandler";
import BottomNav from "../components/BottomNav/BottomNav";
import ConnectXPrivacy from "../Pages/Legal/ConnectXPrivacy";
import ConnectXTerms from "../Pages/Legal/ConnectXTerms";

const UserList = lazy(() => import("../Pages/UserList/UserList"));
const LoginPage = lazy(() => import("../Pages/Login/LoginPage"));
const RegisterPage = lazy(() => import("../Pages/Register/RegisterPage"));
const ChatRoomPage = lazy(() => import("../Pages/ChatRoom/ChatRoomPage"));
const ProfileUpdatePage = lazy(
  () => import("../Pages/ProfileUpdate/ProfileUpdatePage"),
);
const WelcomePage = lazy(() => import("../Pages/welcome/Welcome"));
const PartyDashboard = lazy(
  () => import("../Pages/Party/PartDashboard/PartyDashboard"),
);
const PartyRoom = lazy(() => import("../Pages/Party/PartyRoom/PartyRoom"));
const DesignPreview = lazy(
  () => import("../Pages/DesignPreview/DesignPreview"),
);

class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("[ConnectX Router] Uncaught render error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0f1d",
          color: "#f8fafc",
          padding: "2rem",
          textAlign: "center"
        }}>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Unable to load page content</h2>
          <p style={{ color: "#94a3b8", maxWidth: "500px", marginBottom: "1.5rem" }}>
            This may be caused by an aggressive browser ad-blocker or network interruption.
          </p>
          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "0.6rem 1.2rem",
                borderRadius: "8px",
                background: "#2563eb",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontWeight: 600
              }}
            >
              Reload Page
            </button>
            <a
              href="/"
              style={{
                padding: "0.6rem 1.2rem",
                borderRadius: "8px",
                background: "rgba(255,255,255,0.1)",
                color: "#fff",
                textDecoration: "none",
                fontWeight: 600
              }}
            >
              Return Home
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const MainRoute = () => {
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();
  const isPreview = ["/preview", "/test-ui", "/new-ui"].includes(location.pathname);

  return (
    <RouteErrorBoundary>
      <Suspense fallback={<div>Loading...</div>}>
        {user && !isPreview && <GlobalCallHandler />}
        <Routes>
          <Route
            path="/"
            element={user ? <Navigate to="/home" replace /> : <WelcomePage />}
          />
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <UserList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/story"
            element={
              <ProtectedRoute>
                <UserList />
              </ProtectedRoute>
            }
          />

          <Route
            path="/party"
            element={
              <ProtectedRoute>
                <PartyDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/party/:roomId"
            element={
              <ProtectedRoute>
                <PartyRoom />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfileUpdatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chatroom/:id"
            element={
              <ProtectedRoute>
                <ChatRoomPage />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/privacy" element={<ConnectXPrivacy />} />
          <Route path="/terms" element={<ConnectXTerms />} />
          {/* Temporary Routes for 2026 UI Design Testing */}
          <Route path="/preview" element={<DesignPreview />} />
          <Route path="/test-ui" element={<DesignPreview />} />
          <Route path="/new-ui" element={<DesignPreview />} />
        </Routes>
        {user && !isPreview && <BottomNav />}
      </Suspense>
    </RouteErrorBoundary>
  );
};

export default MainRoute;
