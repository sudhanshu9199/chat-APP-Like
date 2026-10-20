import { createContext, useContext, useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import io from "socket.io-client";
import { setonlineUsers } from "../Redux/slices/socketSlice";
import {
  openChatDb,
  requestPersistentStorage,
  saveMessage,
  saveMessagesBatch,
} from "../services/chatDb";

const SocketContext = createContext();

export const useSocketContext = () => {
  return useContext(SocketContext);
};

export const SocketContextProvider = ({ children }) => {
  const [socket, setsocket] = useState(null);
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  useEffect(() => {
    const userId = user?._id || user?.id;

    if (user && userId) {
      // 1. Initialize IndexedDB & request storage eviction protection
      openChatDb().catch(console.error);
      requestPersistentStorage().catch(console.error);

      // 2. Establish live WebSocket connection
      const socketInstance = io(
        import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:3000",
        {
          query: {
            userId: userId,
          },
        }
      );

      setsocket(socketInstance);

      // Listen for online users update
      socketInstance.on("getOnlineUsers", (users) => {
        dispatch(setonlineUsers(users));
      });

      // ─── 3. WHATSAPP POST OFFICE: SYNC QUEUED OFFLINE MESSAGES ───
      socketInstance.on("sync:pending", async (pendingMessages) => {
        if (Array.isArray(pendingMessages) && pendingMessages.length > 0) {
          try {
            await saveMessagesBatch(pendingMessages, userId);
            // Two-phase commit: ACK receipt so server purges them from MongoDB
            const messageIds = pendingMessages.map((m) => m._id);
            socketInstance.emit("sync:ack", { messageIds });
            console.log(
              `[PostOffice] Synced & ACKed ${messageIds.length} queued messages to local IndexedDB.`
            );
          } catch (err) {
            console.error("[PostOffice] Error saving synced pending messages:", err);
          }
        }
      });

      // ─── 4. REAL-TIME INCOMING MESSAGE & TWO-PHASE ACK ───
      socketInstance.on("newMessage", async (newMsg) => {
        try {
          await saveMessage(newMsg, userId);
          // Two-phase delivery ACK back to server & sender
          socketInstance.emit("msg:ack", {
            messageId: newMsg._id || newMsg.id,
            senderId: newMsg.sender?._id || newMsg.sender,
          });
        } catch (err) {
          console.error("[SocketContext] Error storing incoming newMessage:", err);
        }
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

