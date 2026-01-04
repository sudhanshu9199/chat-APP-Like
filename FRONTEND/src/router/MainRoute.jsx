import { Route, Routes } from "react-router";
import { lazy, Suspense } from "react";
import ProtectedRoute from "./ProtectedRoute";
import GlobalCallHandler from "../components/GlobalCallHandler/GlobalCallHandler";

const UserList = lazy(() => import("../Pages/UserList/UserList"));
const LoginPage = lazy(() => import("../Pages/Login/LoginPage"));
const RegisterPage = lazy(() => import("../Pages/Register/RegisterPage"));
const ChatRoomPage = lazy(() => import("../Pages/ChatRoom/ChatRoomPage"));

const ProfileUpdatePage = lazy(() => import('../Pages/ProfileUpdate/ProfileUpdatePage'));

const MainRoute = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProtectedRoute>
         <GlobalCallHandler />
      </ProtectedRoute>
    <Routes>
      <Route path="/" element={
        <ProtectedRoute>
          <UserList />
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute>
          <ProfileUpdatePage />
        </ProtectedRoute>
      } />
      <Route path="/chatroom/:id" element={
        <ProtectedRoute>
          <ChatRoomPage />
        </ProtectedRoute>
      } />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
    </Routes>
    </Suspense>
  );
};

export default MainRoute;
