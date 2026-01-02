import style from "./VoiceCall.module.scss";
import { Phone, PhoneOff, Mic, MicOff } from "lucide-react";
import userImg from "../../../assets/DefaultUserPic.png";
import { useRef, useEffect } from "react";

const VoiceCall = ({
  callStatus,
  localStream,
  remoteStream,
  callerName,
  endCall,
  acceptCall,
}) => {
  const remoteAudioRef = useRef();

  useEffect(() => {
    if (remoteStream && remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (callStatus === "IDLE") return null;
  return (
    <div className={style.callOverlay}>
      <div className={style.callBox}>
        <div className={style.avatarContainer}>
          <img src={userImg} alt="User" className={style.avatar} />
          <div className={style.pulse}></div>
        </div>

        <h3 className={style.callerName}>
          {callStatus === "INCOMING"
            ? `${callerName} is calling...`
            : callStatus === "CALLING"
            ? "Calling..."
            : "Connected"}
        </h3>

        <audio ref={remoteAudioRef} autoPlay />

        <div className={style.controls}>
          {callStatus === "INCOMING" ? (
            <>
              <button
                onClick={endCall}
                className={`${style.btn} ${style.reject}`}
              >
                <PhoneOff size={24} />
              </button>
              <button
                onClick={acceptCall}
                className={`${style.btn} ${style.accept}`}
              >
                <Phone size={24} />
              </button>
            </>
          ) : (
            <button
              onClick={endCall}
              className={`${style.btn} ${style.reject}`}
            >
              <PhoneOff size={24} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceCall;
