import { Route, Routes, Navigate } from "react-router";
import { lazy, Suspense } from "react";
import { useSelector } from "react-redux";
import ProtectedRoute from "./ProtectedRoute";
import GlobalCallHandler from "../components/GlobalCallHandler/GlobalCallHandler";
import BottomNav from "../components/BottomNav/BottomNav";

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

const MainRoute = () => {
  const { user } = useSelector((state) => state.auth);
  return (
    <Suspense fallback={<div>Loading...</div>}>
      {user && <GlobalCallHandler />}
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
      </Routes>
      {user && <BottomNav />}
    </Suspense>
  );
};

export default MainRoute;
