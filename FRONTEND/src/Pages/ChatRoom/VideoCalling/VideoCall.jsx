import style from "./VideoCall.module.scss";
import userImg from "../../../assets/DefaultUserPic.png";
import { useRef, useEffect, useState } from "react";
import { Mic, MicOff, PhoneOff, Video, VideoOff, Settings } from "lucide-react";

const VideoCall = ({
  callStatus,
  localStream,
  remoteStream,
  callerName,
  endCall,
  acceptCall,
}) => {
  const remoteVideoRef = useRef();
  const localVideoRef = useRef();
  const [micOn, setmicOn] = useState(true);
  const [videoOn, setvideoOn] = useState(true);
  const [videoQuality, setVideoQuality] = useState("360p");
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let timer;
    if (callStatus === "CONNECTED") {
      timer = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(timer);
  }, [callStatus]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.muted = true; // Always mute local video to prevent echo
    }
  }, [remoteStream, localStream, callStatus]);

  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setmicOn(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setvideoOn(videoTrack.enabled);
      }
    }
  };

  const changeVideoQuality = async (quality) => {
    setVideoQuality(quality);
    setShowQualityMenu(false);

    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        const qualitySettings = {
          "360p": { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 15 } },
          "480p": { width: { ideal: 854 }, height: { ideal: 480 }, frameRate: { ideal: 20 } },
          "720p": { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24 } },
        };

        try {
          await videoTrack.applyConstraints(qualitySettings[quality] || qualitySettings["360p"]);
        } catch (err) {
          console.error("Failed to change video quality:", err);
        }
      }
    }
  };

  if (callStatus === "IDLE") return null;

  return (
    <div className={style.videoOverlay}>
      <div className={style.remoteVideoContainer}>
        {callStatus === "CONNECTED" && remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={style.remoteVideo}
          />
        ) : (
          <div className={style.placeholder}>
            <img src={userImg} alt="User" className={style.avatar} />
          </div>
        )}
      </div>

      <div className={style.topBar}>
        <h2 className={style.callerName}>{callerName}</h2>
        <p className={style.durationText}>
          {callStatus === "CONNECTED" ? formatTime(duration) : callStatus === "INCOMING" ? "Incoming Call..." : "Calling..."}
        </p>
      </div>

      {(callStatus === "CONNECTED" || callStatus === "CALLING") &&
        localStream && (
          <div className={style.localVideoWrapper}>
            <div className={style.localVideoContainer}>
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                className={style.localVideo}
              />
              {!videoOn && <div className={style.videoOffOverlay}>Video paused</div>}
            </div>
          </div>
        )}

      <div className={style.controlsArea}>
        {callStatus === "INCOMING" ? (
          <div className={style.controlsRow}>
            <button onClick={endCall} className={`${style.controlBtn} ${style.rejectBtn}`}>
              <PhoneOff className={style.icon} />
            </button>
            <button onClick={acceptCall} className={`${style.controlBtn} ${style.acceptBtn}`}>
              <Video className={style.icon} />
            </button>
          </div>
        ) : (
          <div className={style.controlsRow}>
            <button
              onClick={toggleVideo}
              className={`${style.controlBtn} ${!videoOn ? style.offBtn : ""}`}
            >
              {videoOn ? <Video className={style.icon} /> : <VideoOff className={style.icon} />}
            </button>
            
            <div className={style.qualityWrapper}>
              <button
                onClick={() => setShowQualityMenu(!showQualityMenu)}
                className={`${style.controlBtn}`}
              >
                <Settings className={style.icon} />
              </button>
              {showQualityMenu && (
                <div className={style.qualityMenu}>
                  {["360p", "480p", "720p"].map(q => (
                    <button 
                      key={q} 
                      className={`${style.qualityOption} ${videoQuality === q ? style.activeQuality : ""}`}
                      onClick={() => changeVideoQuality(q)}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={toggleMic}
              className={`${style.controlBtn} ${!micOn ? style.offBtn : ""}`}
            >
              {micOn ? <Mic className={style.icon} /> : <MicOff className={style.icon} />}
            </button>
            <button onClick={endCall} className={`${style.controlBtn} ${style.rejectBtn}`}>
              <PhoneOff className={style.icon} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCall;
