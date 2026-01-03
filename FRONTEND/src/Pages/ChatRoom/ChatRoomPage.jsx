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
import userImg from "../../assets/DefaultUserPic.png";
import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useLocation, useNavigate } from "react-router";
import { useSocketContext } from "../../context/SocketContext";
import api from "../../services/api";
import { useSelector } from "react-redux";
import VoiceCall from "./VoiceCalling/VoiceCall";
import VideoCall from "./VideoCalling/VideoCall";

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

  // voice Call status
  const [callStatus, setcallStatus] = useState("IDLE");
  const [callType, setcallType] = useState(null);
  const [localStream, setlocalStream] = useState(null);
  const [remoteStream, setremoteStream] = useState(null);
  const [callSignal, setcallSignal] = useState(null);
  const [incomingCaller, setincomingCaller] = useState(null);

  const iceCandidatesQueue = useRef([]);
  const peerConnection = useRef(null);

  const servers = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  const createPeerConnection = async () => {
    const pc = new RTCPeerConnection(servers);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("sendIceCandidate", {
          to: callStatus === "INCOMING" ? incomingCaller : receiverId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      setremoteStream(event.streams[0]);
    };
    return pc;
  };

  const startCall = async (type) => {
    setcallStatus("CALLING");
    setcallType(type);

    const constraints = {
      audio: true,
      video: type === 'video' ? true : false
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setlocalStream(stream);

      const pc = await createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      peerConnection.current = pc;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("callUser", {
        userToCall: receiverId,
        signalData: offer,
        from: currentUser.id || currentUser._id,
        name: currentUser.name,
        callType: type
      });
    } catch (err) {
      console.error("Error starting call:", err);
      setcallStatus("IDLE");
    }
  };

  const acceptCall = async () => {
    setcallStatus("CONNECTED");

    const constraints = {
      audio: true,
      video: callType === 'video' ? true : false
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setlocalStream(stream);

      const pc = await createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      peerConnection.current = pc;

      await pc.setRemoteDescription(new RTCSessionDescription(callSignal));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      while (iceCandidatesQueue.current.length > 0) {
        const candidate = iceCandidatesQueue.current.shift();
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("Error adding queued candidate", e);
        }
      }
      socket.emit("answerCall", { signal: answer, to: incomingCaller });
    } catch (err) {
      console.error("Error accepting call:", err);
      cleanupCall();
      if (err.name === "NotReadableError") {
         alert("Camera/Mic is already in use by another app (or tab).");
      }
    }
  };

  const endCall = () => {
    socket.emit("endCall", { to: incomingCaller || receiverId });
    cleanupCall();
  };

  const cleanupCall = () => {
    setcallStatus("IDLE");
    if (localStream) localStream.getTracks().forEach((track) => track.stop());
    if (peerConnection.current) peerConnection.current.close();
    setlocalStream(null);
    setremoteStream(null);
    peerConnection.current = null;
    iceCandidatesQueue.current = [];
    setcallType(null);
  };

  useEffect(() => {
    if (!socket) return;

    socket.on("incomingCall", ({ from, signal, name, callType: type }) => {
      if (callStatus === "IDLE") {
        setcallStatus("INCOMING");
        setcallSignal(signal);
        setincomingCaller(from);
        setcallType(type || 'audio');
      }
    });

    socket.on("callAccepted", async (signal) => {
      setcallStatus("CONNECTED");
      if (peerConnection.current) {
        try {
          await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(signal)
        );

        while (iceCandidatesQueue.current.length > 0) {
          const candidate = iceCandidatesQueue.current.shift();
          try {
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error("Error adding queued candidate", err);
          }
        }
        } catch (err) {
          console.error('Error setting remote description', err);
        }
      }
    });

    socket.on("receiveIceCandidate", async (candidate) => {
      const pc = peerConnection.current;
        if (pc && pc.remoteDescription) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error("Error adding candidate", err);
          }
        } else {
          iceCandidatesQueue.current.push(candidate);
        }
    });

    socket.on("callEnded", () => {
      cleanupCall();
    });

    return () => {
      socket.off("incomingCall");
      socket.off("callAccepted");
      socket.off("receiveIceCandidate");
      socket.off("callEnded");
    };
  }, [socket, callStatus, incomingCaller]);

  return (
    <div className={style.chatRoomPage}>
      { callType === 'video' ? (
        <VideoCall
        callStatus={callStatus}
        localStream={localStream}
        remoteStream={remoteStream}
        callerName={selectedUser.name}
        endCall={endCall}
        acceptCall={acceptCall}
      />
      ) : (
        <VoiceCall 
         callStatus={callStatus}
        localStream={localStream}
        remoteStream={remoteStream}
        callerName={selectedUser.name}
        endCall={endCall}
        acceptCall={acceptCall} />
      )}
      
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
          <p className={style.status}>{isOnline ? "Online" : "Offline"}</p>
        </div>
        <div className={style.userAction}>
          <Video className={style.icon} onClick={() => startCall('video')} />
          <Phone className={style.icon} onClick={() => startCall('audio')} />
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
