import style from "./VoiceCall.module.scss";
import { Phone, PhoneOff, Mic, MicOff } from "lucide-react";
import userImg from "../../../assets/DefaultUserPic.png";
import { useRef, useEffect, useState } from "react";
import { useIdleTimer } from "../../../hooks/useIdleTimer";

const VoiceCall = ({
  callStatus,
  localStream,
  remoteStream,
  callerName,
  endCall,
  acceptCall,
}) => {
  const remoteAudioRef = useRef();
  const localAudioRef = useRef();
  const [isMuted, setisMuted] = useState(false);

  const { isIdle, isMenuOpen, setisMenuOpen } = useIdleTimer(3000);

  const isConnected = callStatus === "CONNECTED";
  const shouldHideControls = isConnected && isIdle && !isMenuOpen;

  useEffect(() => {
    if (remoteStream && remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current
        .play()
        .catch((err) => console.error("Remote audio error:", err));
    }
  }, [remoteStream]);

  // Sync mute state to the actual local audio track
  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
    }
  }, [isMuted, localStream]);

  const toggleMute = (e) => {
    e.stopPropagation(); // prevent idle timer reset from this click propagating oddly
    setisMuted((prev) => !prev);
    // Using setIsMenuOpen as an "interaction lock" while muted keeps controls visible.
    // Toggle it off when unmuting so the idle countdown can resume normally.
    setisMenuOpen((prev) => !prev);
  };

  if (callStatus === "IDLE") return null;
  return (
    <div className={style.callOverlay}>
      <div className={style.callBox}>
        <div className={style.avatarContainer}>
          <img src={userImg} alt="User" className={style.avatar} />
          {(callStatus === "CALLING" || callStatus === "INCOMING") && (
            <div className={style.pulse}></div>
          )}
        </div>

        <h3 className={style.callerName}>
          {callStatus === "INCOMING"
            ? `${callerName} is calling...`
            : callStatus === "CALLING"
              ? "Calling..."
              : isMuted
                ? "Connected · Muted"
                : "Connected"}
        </h3>

        <audio ref={remoteAudioRef} autoPlay playsInline />
        <audio ref={localAudioRef} autoPlay playsInline muted />

        <div
          className={`${style.controls} ${
            shouldHideControls ? style.controlsHidden : ""
          }`}
        >
          {callStatus === "INCOMING" ? (
            <>
              <button
                onClick={endCall}
                className={`${style.btn} ${style.reject}`}
                aria-label="Reject call"
              >
                <PhoneOff size={24} />
              </button>
              <button
                onClick={acceptCall}
                aria-label="Accept call"
                className={`${style.btn} ${style.accept}`}
              >
                <Phone size={24} />
              </button>
            </>
          ) : (
            // Calling or Connected: mute toggle + hang up
            <>
              {isConnected && (
                <button
                  onClick={toggleMute}
                  className={`${style.btn} ${isMuted ? style.muted : style.muteActive}`}
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </button>
              )}
              <button
                onClick={endCall}
                className={`${style.btn} ${style.reject}`}
                aria-label="End call"
              >
                <PhoneOff size={24} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceCall;
