import { Route, Routes } from "react-router";
import { lazy } from "react";

const UserList = lazy(() => import("../Pages/UserList/UserList"));
const LoginPage = lazy(() => import("../Pages/Login/LoginPage"));
const RegisterPage = lazy(() => import("../Pages/Register/RegisterPage"));
const ChatRoomPage = lazy(() => import("../Pages/ChatRoom/ChatRoomPage"));

const MainRoute = () => {
  return (
    <Routes>
      <Route path="/" element={<UserList />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/chatroom/:id" element={<ChatRoomPage />} />
    </Routes>
  );
};

export default MainRoute;
