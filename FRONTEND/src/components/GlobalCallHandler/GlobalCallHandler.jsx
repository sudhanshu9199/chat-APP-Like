import style from './GlobalCallHandler.module.scss';
import { useEffect, useRef } from "react";
import { useSocketContext } from "../../context/SocketContext";
import { useNavigate, useLocation } from "react-router";
import { toast } from "react-toastify";
import callMusic from "../../assets/callMusic/Zupiter_&_Jery_Brahma.mp3";
import userImg from "../../assets/DefaultUserPic.png";

const GlobalCallHandler = () => {
  const { socket } = useSocketContext();
  const navigate = useNavigate();
  const location = useLocation();
  const audioRef = useRef(new Audio(callMusic));
  const toastIdRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = (data) => {
      // If user is already in the caller's chatroom, do nothing (ChatRoomPage handles it)
      if (location.pathname === `/chatroom/${data.from}`) return;

      // Play Ringtone
      audioRef.current.loop = true;
      audioRef.current.play().catch((e) => console.log("Audio play error", e));

      // Show Toast Notification
      toastIdRef.current = toast.info(
        <div className={style.toastCall}>
          <img
            src={userImg}
            alt="caller"
            className={style.toastCall__avatar}
          />
          <div className={style.toastCall__content}>
            <p className={style.toastCall__name}>{data.name}</p>
            <p className={style.toastCall_status}>Incoming {data.callType || "voice"} call...</p>
            {/* <p className={style.toastCall__action}>Click to Answer</p> */}
          </div>
        </div>,
        {
          position: "top-center",
          autoClose: false,
          closeOnClick: false,
          hideProgressBar: true,
          onClick: () => {
            // Stop Ringtone
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            toast.dismiss(toastIdRef.current);
            
            // Navigate to ChatRoom with signal data
            navigate(`/chatroom/${data.from}`, { state: { incomingCall: data } });
          },
        }
      );
      
      // Browser Notification (for minimized window)
      if (Notification.permission === "granted" && document.hidden) {
        new Notification("ConnectX Incoming Call", {
          body: `${data.name} is calling you...`,
          icon: userImg,
        });
      }
    };

    const handleCallEnded = () => {
      // Stop Ringtone and dismiss toast if call ends before answering
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    };

    socket.on("incomingCall", handleIncomingCall);
    socket.on("callEnded", handleCallEnded);

    return () => {
      socket.off("incomingCall", handleIncomingCall);
      socket.off("callEnded", handleCallEnded);
      audioRef.current.pause();
    };
  }, [socket, location.pathname, navigate]);

  return null; // This component renders nothing visibly (handled by toast)
};

export default GlobalCallHandler;