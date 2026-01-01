import { createContext, useContext, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import io from "socket.io-client";
import { setonlineUsers } from "../Redux/slices/socketSlice";
import { useEffect } from "react";

const SocketContext = createContext();

export const useSocketContext = () => {
  return useContext(SocketContext);
};

export const SocketContextProvider = ({ children }) => {
  const [socket, setsocket] = useState(null);
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  useEffect(() => {
    if (user && user._id) {
      const socketInstance = io(
        import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:3000",
        {
          query: {
            userId: user._id, // Ensure this matches your User Model ID field
          },
        }
      );

      setsocket(socketInstance);

      // Listen for online users update
      socketInstance.on("getOnlineUsers", (users) => {
        dispatch(setonlineUsers(users));
      });

      // Cleanup on unmount or user change
      return () => {
        socketInstance.close();
        setsocket(null);
      };
    } else {
      if (socket) {
        socket.close();
        setsocket(null);
      }
    }
  }, [user, dispatch]);

  return (
    <SocketContext.Provider value={{ socket }}>
        {children}
    </SocketContext.Provider>
  );
};

