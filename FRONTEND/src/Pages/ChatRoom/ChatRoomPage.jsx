import style from "./ChatRoomPage.module.scss";
import {
  ArrowLeft,
  Video,
  Phone,
  Info,
  Send,
  Image,
  Loader2,
} from "lucide-react";
import userImg from "../../assets/dp_demo_img/doctor.jpg";
import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useLocation, useNavigate } from "react-router";
import { useSocketContext } from "../../context/SocketContext";
import api from "../../services/api";
import { useSelector } from "react-redux";

const ChatRoomPage = () => {
  const { id: receiverId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { socket } = useSocketContext();
  const { onlineUsers } = useSelector((state) => state.socket);
  const { user: currentUser } = useSelector((state) => state.auth);

  const [messages, setmessages] = useState([]);
  const [newMessage, setnewMessage] = useState("");
  const [loading, setloading] = useState(false);

  const selectedUser = state?.selectedUser || { name: "User", avatar: "" };
  const messagesEndRef = useRef(null);

  const isOnline = useMemo(() => {
    return onlineUsers.includes(receiverId); 
  }, [onlineUsers, receiverId]);

  useEffect(() => {
    socket?.on("newMessage", (newMessage) => {
      // Only add if it belongs to this chat
      if (newMessage.sender === receiverId) {
        setmessages((prev) => [...prev, newMessage]);
      }
    });

    return () => socket?.off("newMessage");
  }, [socket, receiverId]);

  useEffect(() => {
    const getMessages = async () => {
      setloading(true);
      try {
        // You need to create this route in backend
        const res = await api.get(`/messages/${receiverId}`);
        setmessages(res.data);
      } catch (error) {
        console.error(error);
      } finally {
        setloading(false);
      }
    };
    if (receiverId) getMessages();
  }, [receiverId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      // Optimistic UI update (optional)
      const res = await api.post(`/messages/send/${receiverId}`, {
        text: newMessage,
      });
      setmessages([...messages, res.data]);
      setnewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div className={style.chatRoomPage}>
      <div className={style.header}>
        <ArrowLeft
          onClick={() => navigate("/")}
          style={{ cursor: "pointer" }}
        />
        <div className={style.participantDp}>
          <img src={selectedUser.avatar || userImg} alt="userDP" />
        </div>
        <div className={style.texts}>
          <p className={style.participantName}>{selectedUser.name}</p>
          <p className={style.status}>
            {isOnline ? "Online" : "Offline"}
          </p>
        </div>
        <div className={style.userAction}>
          <Video className={style.icon} />
          <Phone className={style.icon} />
          <Info className={style.icon} />
        </div>
      </div>
      <div className={style.fullMessage}>
        {loading ? (
          <Loader2 className="animate-spin mx-auto mt-10" />
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={
                msg.sender === currentUser.id
                  ? style.yourMsg
                  : style.participantMsg
              }
            >
              <p className={style.message}>{msg.text}</p>
              <div className={style.timeline}>
                {new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage}>
        <div className={style.inputBox}>
        <Image className={style.icon} />
          <input
            type="text"
            placeholder="Type a message"
            value={newMessage}
            onChange={(e) => setnewMessage(e.target.value)}
          />
        </div>
        <button type="submit" className="send">
          <Send className={style.icon} />
        </button>
      </form>
    </div>
  );
};

export default ChatRoomPage;
