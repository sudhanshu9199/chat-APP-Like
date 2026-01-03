import style from "./VideoCall.module.scss";
import userImg from "../../../assets/DefaultUserPic.png";
import { useRef } from "react";
import { useState } from "react";
import { useEffect } from "react";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";

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
            <h3 className={style.statusText}>
              {callStatus === "INCOMING"
                ? `${callerName} is requesting a video call...`
                : callStatus === "CALLING"
                ? "Calling..."
                : "Connecting..."}
            </h3>
          </div>
        )}
      </div>
      {(callStatus === "CONNECTED" || callStatus === "CALLING") &&
        localStream && (
          <div className={style.localVideoContainer}>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              className={style.localVideo}
            />
            {!videoOn && <div className={style.videoOffOverlay}>Video off</div>}
          </div>
        )}

      <div className={style.controls}>
        {callStatus === "INCOMING" ? (
          <>
            <button
              onClick={endCall}
              className={`${style.btn} ${style.reject}`}
            >
              <PhoneOff />
            </button>
            <button
              onClick={acceptCall}
              className={`${style.btn} ${style.accept}`}
            >
              <Video />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={toggleVideo}
              className={`${style.btn} ${!videoOn ? style.off : ""}`}
            >
              {videoOn ? <Video /> : <VideoOff />}
            </button>
            <button
              onClick={toggleMic}
              className={`${style.btn} ${!micOn ? style.off : ""}`}
            >
              {micOn ? <Mic /> : <MicOff />}
            </button>
            <button
              onClick={endCall}
              className={`${style.btn} ${style.reject}`}
            >
              <PhoneOff />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default VideoCall;
