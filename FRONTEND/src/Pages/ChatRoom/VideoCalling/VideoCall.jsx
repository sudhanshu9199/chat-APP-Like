// VideoCall.jsx
import style from "./VideoCall.module.scss";
import userImg from "../../../assets/DefaultUserPic.png";
import { useRef, useEffect, useState, useCallback } from "react";
import {
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
  Settings,
  Captions,
  CaptionsOff,
} from "lucide-react";
import { useIdleTimer } from "../../../hooks/useIdleTimer";
import { useTranscription } from "../../../hooks/useTranscription";
import CaptionsOverlay from "../../../components/CaptionOverlay";

const VideoCall = ({
  callStatus,
  localStream,
  remoteStream,
  callerName,
  peerConnection,
  endCall,
  acceptCall,
}) => {
  const remoteVideoRef = useRef();
  const localVideoRef = useRef();
  const dataChannelRef = useRef(null);

  const [micOn, setmicOn] = useState(true);
  const [videoOn, setvideoOn] = useState(true);
  const [videoQuality, setVideoQuality] = useState("360p");
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [duration, setDuration] = useState(0);
  const [remoteCaption, setRemoteCaption] = useState(null);
  const { isIdle, setmenuOpen } = useIdleTimer(3500);

  useEffect(() => {
    setmenuOpen(showQualityMenu);
  }, [showQualityMenu, setmenuOpen]);

  useEffect(() => {
    if (callStatus !== "CONNECTED") {
      setDuration(0);
      return;
    }
    const timer = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(timer);
  }, [callStatus]);

  const formatTime = (s) =>
    `${Math.floor(s / 60)
      .toString()
      .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.muted = true; // Always mute local video to prevent echo
    }
  }, [remoteStream, localStream, callStatus]);

  const toggleMic = useCallback(() => {
    const track = localStream?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setmicOn(track.enabled);
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    const track = localStream?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setvideoOn(track.enabled);
  }, [localStream]);

  const changeVideoQuality = useCallback(
    async (quality) => {
      setVideoQuality(quality);
      setShowQualityMenu(false);

      const track = localStream?.getVideoTracks()[0];
      if (!track) return;

      const presets = {
        "360p": {
          width: { ideal: 640 },
          height: { ideal: 360 },
          frameRate: { ideal: 15 },
        },
        "480p": {
          width: { ideal: 854 },
          height: { ideal: 480 },
          frameRate: { ideal: 20 },
        },
        "720p": {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 24 },
        },
      };

      try {
        await track.applyConstraints(presets[quality] ?? presets["360p"]);
      } catch (err) {
        console.error("Failed to change video quality:", err);
      }
    },
    [localStream],
  );

  // Close quality menu on outside click
  useEffect(() => {
    if (!showQualityMenu) return;
    const close = (e) => {
      if (!e.target.closest(`.${style.qualityWrapper}`))
        setShowQualityMenu(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close, { passive: true });
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [showQualityMenu]);

  useEffect(() => {
    if (!peerConnection) return;
    dataChannelRef.current = peerConnection.createDataChannel("live-captions");

    peerConnection.ondatachannel = (event) => {
      event.channel.onmessage = (msg) => {
        try {
          const captionData = JSON.parse(msg.data);
          setRemoteCaption(captionData);
        } catch (err) {
          console.warn("Failed to parse caption data:", msg.data);
        }
      };
    };
    return () => {
      if (dataChannelRef.current) {
        dataChannelRef.current.close();
        dataChannelRef.current = null;
      }
    };
  }, [peerConnection]);

  const handleLocalTranscription = useCallback((payload) => {
    if (dataChannelRef.current?.readyState === "open") {
      dataChannelRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const { startTranscription, stopTranscription, isListening } =
    useTranscription(handleLocalTranscription);

  useEffect(() => {
    if (callStatus !== "CONNECTED" && isListening) {
      stopTranscription();
    }
  }, [callStatus, isListening, stopTranscription]);

  // ✅ Single toggle handler — satisfies browser user-gesture requirement
  const toggleCaptions = useCallback(() => {
    if (isListening) {
      stopTranscription();
    } else {
      startTranscription();
    }
  }, [isListening, startTranscription, stopTranscription]);

  if (callStatus === "IDLE") return null;

  const isConnected = callStatus === "CONNECTED";
  const isCalling = callStatus === "CALLING";
  const isIncoming = callStatus === "INCOMING";

  useEffect(() => {
    if (callStatus === "CONNECTED") {
      startTranscription();
    } else stopTranscription();
    return () => stopTranscription();
  }, [callStatus, startTranscription, stopTranscription]);

  return (
    <div
      className={`${style.videoOverlay} ${isIdle ? style.idle : ""}`}
      role="dialog"
      aria-label={`Video call with ${callerName}`}
    >
      <div className={style.remoteVideoContainer}>
        {isConnected && remoteStream ? (
          <div className={style.remoteVideoWrapper}>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={style.remoteVideo}
              aria-label="Remote participant video"
            />
            <CaptionsOverlay
              incomingCaptionPayload={remoteCaption}
              bufferMs={300}
            />
          </div>
        ) : (
          <div className={style.placeholder}>
            <img src={userImg} alt={callerName} className={style.avatar} />
          </div>
        )}
      </div>

      <div className={style.topBar} aria-live="polite">
        <h2 className={style.callerName}>{callerName}</h2>
        <p className={style.durationText}>
          {isConnected
            ? formatTime(duration)
            : isIncoming
              ? "Incoming Call..."
              : "Calling..."}
        </p>
      </div>

      {(isConnected || isCalling) && localStream && (
        <div className={style.localVideoWrapper}>
          <div className={style.localVideoContainer}>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              className={style.localVideo}
              aria-label="Your video"
            />
            {!videoOn && (
              <div className={style.videoOffOverlay} aria-hidden="true">
                Video paused
              </div>
            )}
          </div>
        </div>
      )}

      <div className={style.controlsArea}>
        {isIncoming ? (
          <div className={style.controlsRow}>
            <button
              onClick={endCall}
              className={`${style.controlBtn} ${style.rejectBtn}`}
              aria-label="Decline call"
            >
              <PhoneOff className={style.icon} />
            </button>
            <button
              onClick={acceptCall}
              className={`${style.controlBtn} ${style.acceptBtn}`}
              aria-label="Accept call"
            >
              <Video className={style.icon} />
            </button>
          </div>
        ) : (
          <div className={style.controlsRow}>
            <button
              onClick={toggleVideo}
              className={`${style.controlBtn} ${!videoOn ? style.offBtn : ""}`}
              aria-label={videoOn ? "Turn off camera" : "Turn on camera"}
              aria-pressed={!videoOn}
            >
              {videoOn ? (
                <Video className={style.icon} />
              ) : (
                <VideoOff className={style.icon} />
              )}
            </button>

            <div className={style.qualityWrapper}>
              <button
                onClick={() => setShowQualityMenu(!showQualityMenu)}
                className={`${style.controlBtn}`}
                aria-label="Video quality settings"
                aria-expanded={showQualityMenu}
                aria-haspopup="listbox"
              >
                <Settings className={style.icon} />
              </button>
              {showQualityMenu && (
                <div
                  className={style.qualityMenu}
                  role="listbox"
                  aria-label="Video quality"
                >
                  {["360p", "480p", "720p"].map((q) => (
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
              aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
              aria-pressed={!micOn}
            >
              {micOn ? (
                <Mic className={style.icon} />
              ) : (
                <MicOff className={style.icon} />
              )}
            </button>

            {isConnected && (
              <button
                onClick={toggleCaptions}
                className={`${style.controlBtn} ${!isListening ? style.offBtn : ""}`}
                aria-label={
                  isListening ? "Stop live captions" : "Start live captions"
                }
                aria-pressed={isListening}
              >
                {isListening ? (
                  <Captions className={style.icon} />
                ) : (
                  <CaptionsOff className={style.icon} />
                )}
              </button>
            )}

            <button
              onClick={endCall}
              className={`${style.controlBtn} ${style.rejectBtn}`}
              aria-label="End call"
            >
              <PhoneOff className={style.icon} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCall;
