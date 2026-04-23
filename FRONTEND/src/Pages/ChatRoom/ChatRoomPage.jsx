import style from "./ChatRoomPage.module.scss";
import {
  ArrowLeft,
  Video,
  Phone,
  Send,
  Image,
  Loader2,
  Mic,
  Paperclip,
  Wand2,
} from "lucide-react";
import userImg from "../../assets/DefaultUserPic.png";
import { useEffect, useState, useRef, useMemo, Fragment } from "react";
import { useParams, useLocation, useNavigate } from "react-router";
import { useSocketContext } from "../../context/SocketContext";
import api from "../../services/api";
import { useSelector } from "react-redux";
import VoiceCall from "./VoiceCalling/VoiceCall";
import VideoCall from "./VideoCalling/VideoCall";
import UserInfoPopup from "./UserInfo/UserInfoPopup";
import callMusic from "../../assets/callMusic/Zupiter_&_Jery_Brahma.mp3";

const isNewDay = (currentMsg, prevMsg) => {
  if (!prevMsg) return true;
  const currentDate = new Date(currentMsg.createdAt);
  const prevDate = new Date(prevMsg.createdAt);
  return currentDate.toDateString() !== prevDate.toDateString();
};

const formatDateLabel = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  }
};

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
  const [showInfo, setshowInfo] = useState(false);

  const audioRef = useRef(new Audio(callMusic));

  const selectedUser = state?.selectedUser || { name: "User", avatar: "" };
  const messagesEndRef = useRef(null);

  const isOnline = useMemo(() => {
    return onlineUsers.includes(receiverId);
  }, [onlineUsers, receiverId]);

  useEffect(() => {
    if (state?.incomingCall) {
      const { form, signal, name, callType } = state.incomingCall;

      setcallStatus("INCOMING");
      setcallSignal(signal);
      setincomingCaller(form);
      setcallType(callType || "audio");

      window.history.replaceState({}, document.title);
    }
  }, [state]);

  useEffect(() => {
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

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

  // handle ringtone on call status
  useEffect(() => {
    const audio = audioRef.current;
    if (callStatus === "INCOMING") {
      audio.loop = true;
      audio.play().catch((err) => {
        console.log("Audio Play Error:", err);
      });
    } else {
      audio.pause();
      audio.currentTime = 0;
    }

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [callStatus]);

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
      video: type === "video" ? true : false,
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
        callType: type,
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
      video: callType === "video" ? true : false,
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
        setcallType(type || "audio");

        if (Notification.permission === "granted") {
          try {
            if (navigate.vibrate) {
              navigate.vibrate([200, 100, 200]);
            }
            const notif = new Notification("Incoming Call", {
              body: `${name} is requesting a ${type || "voice"} call.`,
              icon: userImg,
              silent: true,
              tag: "call_notification",
            });

            notif.onclick = () => {
              window.focus();
              notif.close();
            };
          } catch (err) {
            console.error(
              "Notification API error (common on some mobile browsers):",
              err,
            );
          }
        }
      }
    });

    socket.on("callAccepted", async (signal) => {
      setcallStatus("CONNECTED");
      if (peerConnection.current) {
        try {
          await peerConnection.current.setRemoteDescription(
            new RTCSessionDescription(signal),
          );

          while (iceCandidatesQueue.current.length > 0) {
            const candidate = iceCandidatesQueue.current.shift();
            try {
              await peerConnection.current.addIceCandidate(
                new RTCIceCandidate(candidate),
              );
            } catch (err) {
              console.error("Error adding queued candidate", err);
            }
          }
        } catch (err) {
          console.error("Error setting remote description", err);
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

  // AI Suggestion
  const [aiSuggestions, setaiSuggestions] = useState([]);
  const [isSuggesting, setisSuggesting] = useState(false);

  const handleGetAiSuggestions = async () => {
    setisSuggesting(true);
    try {
      const res = await api.get(`/messages/suggest-replies/${receiverId}`);
      setaiSuggestions(res.data);
    } catch (err) {
      console.error("Failed to fetch AI suggestions:", err);
    } finally {
      setisSuggesting(false);
    }
  };

  const handleChipClick = (text) => {
    setnewMessage(text);
    setaiSuggestions([]);
  };

  return (
    <div className={style.chatRoomPage}>
      {showInfo && (
        <UserInfoPopup user={selectedUser} onClose={() => setshowInfo(false)} />
      )}
      {callType === "video" ? (
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
          acceptCall={acceptCall}
        />
      )}

      <div className={style.chatContainer}>
        <div className={style.header}>
          <div className={style.headerLeft}>
            <ArrowLeft
              onClick={() => navigate("/home")}
              className={style.backBtn}
            />
            <div
              className={style.participantDp}
              onClick={() => setshowInfo(true)}
              style={{ cursor: "pointer" }}
            >
              <img src={selectedUser.avatar || userImg} alt="userDP" />
              {isOnline && <div className={style.onlineIndicator}></div>}
            </div>
            <div className={style.texts}>
              <p className={style.participantName}>{selectedUser.name}</p>
              <p className={style.status}>{isOnline ? "Online" : "Offline"}</p>
            </div>
          </div>
          <div className={style.headerRight}>
            <div className={style.actionsContainer}>
              <button
                type="button"
                className={style.callBtn}
                onClick={() => startCall("video")}
              >
                <Video className={style.calIcon} />
              </button>
              <button
                type="button"
                className={style.callBtn}
                onClick={() => startCall("audio")}
              >
                <Phone className={style.calIcon} />
              </button>
            </div>
          </div>
        </div>
        <div className={style.fullMessage}>
          {loading ? (
            <Loader2 className="animate-spin mx-auto mt-10" />
          ) : (
            messages.map((msg, idx) => {
              const showDateSeparator = isNewDay(msg, messages[idx - 1]);

              return (
                <Fragment key={msg._id || idx}>
                  {showDateSeparator && (
                    <div className={style.dateSeparatorWrapper}>
                      <span className={style.datePill}>
                        {formatDateLabel(msg.createdAt)}
                      </span>
                    </div>
                  )}

                  <div
                    key={idx}
                    className={
                      msg.sender === (currentUser.id || currentUser._id)
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
                </Fragment>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {aiSuggestions.length > 0 && (
          <div className={style.suggestionsWrapper}>
            {aiSuggestions.map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                className={style.suggestionChip}
                onClick={() => handleChipClick(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={handleSendMessage} className={style.messageForm}>
          <div className={style.inputBox}>
            {/* AI Trigger Button */}
            <button
              type="button"
              onClick={handleGetAiSuggestions}
              disabled={isSuggesting}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              {isSuggesting ? (
                <Loader2 className="animate-spin" size={20} color="#888" />
              ) : (
                <Wand2 size={20} color="#888" />
              )}
            </button>
            <Mic className={style.micIcon} />
            <div className={style.separator}></div>
            <input
              type="text"
              placeholder="Ok. Let me check"
              value={newMessage}
              onChange={(e) => setnewMessage(e.target.value)}
            />
            <Paperclip className={style.attachIcon} />
          </div>
          <button type="submit" className={style.send}>
            <Send className={style.sendIcon} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatRoomPage;
