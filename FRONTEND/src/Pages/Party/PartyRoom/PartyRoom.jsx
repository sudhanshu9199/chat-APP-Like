import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useSocketContext } from "../../../context/SocketContext";
import { useCompanionPet } from "../../../components/CompanionPet/CompanionContext";
import BrandLogo from "../../../components/BrandLogo/BrandLogo";
import styles from "./PartyRoom.module.scss";
import {
  parsePartyRoomCode,
  DEFAULT_YOUTUBE_ID,
  CURATED_STREAMS,
  extractYoutubeId,
} from "../partyUtils";
import {
  Mic,
  MicOff,
  ArrowLeft,
  Play,
  Pause,
  Film,
  Copy,
  MonitorUp,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Radio,
  RotateCcw,
  RotateCw,
  Sparkles,
} from "lucide-react";

// Production WebRTC NAT Traversal Configuration (Google STUN + OpenRelay TURN for 5G/Mobile Networks)
const FREE_RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turns:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  iceCandidatePoolSize: 10,
};

// Format seconds into MM:SS
const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

const PartyRoom = () => {
  const { roomId: rawParamRoomId } = useParams();
  const roomId = useMemo(() => parsePartyRoomCode(rawParamRoomId), [rawParamRoomId]);
  const navigate = useNavigate();
  const { socket } = useSocketContext();
  const { user: currentUser } = useSelector((state) => state.auth);
  const { triggerPetState } = useCompanionPet();

  // URL Auto-Correction: Fix any mangled URL immediately in address bar
  useEffect(() => {
    if (rawParamRoomId && rawParamRoomId !== roomId) {
      navigate(`/party/${roomId}`, { replace: true });
    }
  }, [rawParamRoomId, roomId, navigate]);

  // Room & Participant State
  const [participants, setParticipants] = useState([]);
  const [hostId, setHostId] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  // Voice & WebRTC Mic State
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakingLocal, setIsSpeakingLocal] = useState(false);

  // ─── UNIFIED 2026 CINEMA & CUSTOM CONTROLLER STATE ───
  const [mediaMode, setMediaMode] = useState("youtube"); // "youtube" | "local" | "screenshare"
  const [videoId, setVideoId] = useState(DEFAULT_YOUTUBE_ID);
  const [videoInput, setVideoInput] = useState("");
  const [mediaTitle, setMediaTitle] = useState("24/7 Lofi Beats");
  const [localVideoUrl, setLocalVideoUrl] = useState(null);
  const [remoteVideoStream, setRemoteVideoStream] = useState(null);
  const [isHostStreaming, setIsHostStreaming] = useState(false);

  // Unified Playback Controls State
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isPlayerMuted, setIsPlayerMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [needsUserGesture, setNeedsUserGesture] = useState(false);
  const [reactions, setReactions] = useState([]);

  // Refs
  const cinemaContainerRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteMediaAudioRef = useRef(null); // Dedicated mounted DOM audio for live incoming movie audio
  const mediaElementSourceRef = useRef(null); // Cached Web Audio source node to prevent InvalidStateError
  const controlsTimeoutRef = useRef(null);
  const timeUpdateIntervalRef = useRef(null);

  // WebRTC Mesh Refs
  const localMicStreamRef = useRef(null);
  const localMediaStreamRef = useRef(null); // Local video or screen share stream
  const peersRef = useRef({}); // socketId -> RTCPeerConnection
  const iceCandidateQueuesRef = useRef({});
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const remoteAudiosRef = useRef({}); // socketId -> HTMLAudioElement (Voice)

  const myUserId = currentUser?._id || currentUser?.id;
  const isHost =
    hostId === socket?.id ||
    participants.find((p) => p.socketId === hostId)?.userId === myUserId ||
    (participants.length > 0 && participants[0]?.socketId === socket?.id);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 2200);
  };

  // ─── 1. INTERACTION TIMER (AUTO-HIDE CONTROLS ON IDLE) ───
  const handleUserActivity = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
  }, [isPlaying]);

  // ─── 2. YOUTUBE PRIVACY-ENHANCED API & CONTROLLER (NO-COOKIE MODE) ───
  // Using youtube-nocookie.com domain bypasses ad-blocker ERR_BLOCKED_BY_CLIENT
  useEffect(() => {
    if (mediaMode !== "youtube") return;

    let isMounted = true;

    const initYTPlayer = () => {
      if (!window.YT || !window.YT.Player) return;

      const iframeEl = document.getElementById("yt-player-target");
      if (!iframeEl) return;

      if (ytPlayerRef.current && ytPlayerRef.current.destroy) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {}
        ytPlayerRef.current = null;
      }

      try {
        ytPlayerRef.current = new window.YT.Player(iframeEl, {
          events: {
            onReady: (event) => {
              if (!isMounted) return;
              try {
                event.target.playVideo();
              } catch (e) {}
              setIsPlaying(true);
              setDuration(event.target.getDuration() || 0);
            },
            onStateChange: (event) => {
              if (!isMounted) return;
              // 1 = PLAYING, 2 = PAUSED, 0 = ENDED
              if (event.data === window.YT.PlayerState.PLAYING) {
                setIsPlaying(true);
                setDuration(event.target.getDuration() || 0);
                setNeedsUserGesture(false);
              } else if (event.data === window.YT.PlayerState.PAUSED) {
                setIsPlaying(false);
              } else if (event.data === window.YT.PlayerState.ENDED) {
                setIsPlaying(false);
              }
            },
            onError: (event) => {
              console.warn("[Party YT] Error code:", event.data);
              // Error 150/101 = owner restricted embedding
              showToast("Video restricted by owner. Switching to Lofi Chill 🎵");
              setVideoId(DEFAULT_YOUTUBE_ID);
            },
          },
        });
      } catch (err) {
        console.warn("[Party YT] Init error:", err);
      }
    };

    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
      window.onYouTubeIframeAPIReady = () => {
        initYTPlayer();
      };
    } else {
      initYTPlayer();
    }

    return () => {
      isMounted = false;
      if (ytPlayerRef.current && ytPlayerRef.current.destroy) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {}
        ytPlayerRef.current = null;
      }
    };
  }, [videoId, mediaMode]);

  // Update current playback time smoothly every 300ms
  useEffect(() => {
    timeUpdateIntervalRef.current = setInterval(() => {
      if (mediaMode === "youtube" && ytPlayerRef.current && ytPlayerRef.current.getCurrentTime) {
        try {
          const t = ytPlayerRef.current.getCurrentTime() || 0;
          const d = ytPlayerRef.current.getDuration() || 0;
          setCurrentTime(t);
          if (d > 0 && d !== duration) setDuration(d);
        } catch (e) {}
      } else if (mediaMode === "local" && localVideoRef.current) {
        setCurrentTime(localVideoRef.current.currentTime || 0);
        setDuration(localVideoRef.current.duration || 0);
        setIsPlaying(!localVideoRef.current.paused);
      }
    }, 300);

    return () => {
      if (timeUpdateIntervalRef.current) clearInterval(timeUpdateIntervalRef.current);
    };
  }, [mediaMode, duration]);

  // ─── 3. WEBRTC MEDIA TRACK BROADCASTER (VIDEO & AUDIO TRACKS) ───
  const broadcastMediaStream = useCallback(
    (stream) => {
      if (!stream) return;
      localMediaStreamRef.current = stream;
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      Object.entries(peersRef.current).forEach(async ([peerSocketId, pc]) => {
        try {
          // 1. Broadcast Video Track with explicit sendrecv direction
          if (videoTrack) {
            let videoTransceiver = pc.getTransceivers().find(
              (t) => t.sender.track?.kind === "video" || t.receiver.track?.kind === "video"
            );
            if (videoTransceiver) {
              videoTransceiver.direction = "sendrecv";
              await videoTransceiver.sender.replaceTrack(videoTrack);
            } else {
              pc.addTrack(videoTrack, stream);
            }
          }

          // 2. Broadcast Media Audio Track
          if (audioTrack) {
            const micTrack = localMicStreamRef.current?.getAudioTracks()[0];
            let mediaAudioTransceiver = pc.getTransceivers().find(
              (t) => t.sender.track?.kind === "audio" && t.sender.track !== micTrack
            );
            if (mediaAudioTransceiver) {
              mediaAudioTransceiver.direction = "sendrecv";
              await mediaAudioTransceiver.sender.replaceTrack(audioTrack);
            } else {
              pc.addTrack(audioTrack, stream);
            }
          }

          // 3. Renegotiation Offer Handshake
          const offer = await pc.createOffer({
            offerToReceiveVideo: true,
            offerToReceiveAudio: true,
          });
          await pc.setLocalDescription(offer);
          socket?.emit("party:webrtc-signal", {
            to: peerSocketId,
            signal: { sdp: pc.localDescription },
            type: "offer",
          });
        } catch (e) {
          console.warn("[Party RTC] Error broadcasting stream to peer:", peerSocketId, e);
        }
      });
    },
    [socket]
  );

  // ─── 4. LOCAL MOVIE STREAMING ENGINE (CANVAS/CAPTURESTREAM + WEB AUDIO API) ───
  // Captures BOTH video frames AND decoded audio from local file
  const startStreamingLocalVideo = useCallback(
    (videoEl) => {
      if (!videoEl) return;

      const captureAndBroadcast = async () => {
        try {
          await videoEl.play().catch(() => {});

          // A. Capture Video Track
          let capStream = null;
          if (typeof videoEl.captureStream === "function") {
            capStream = videoEl.captureStream(30);
          } else if (typeof videoEl.mozCaptureStream === "function") {
            capStream = videoEl.mozCaptureStream(30);
          }

          let videoTrack = capStream && capStream.getVideoTracks().length > 0 ? capStream.getVideoTracks()[0] : null;
          let audioTrack = capStream && capStream.getAudioTracks().length > 0 ? capStream.getAudioTracks()[0] : null;

          // B. Capture Audio via Web Audio API if captureStream has no audio track
          if (!audioTrack) {
            try {
              const AudioCtx = window.AudioContext || window.webkitAudioContext;
              if (AudioCtx) {
                if (!audioContextRef.current || audioContextRef.current.state === "closed") {
                  audioContextRef.current = new AudioCtx();
                }
                const actx = audioContextRef.current;
                if (actx.state === "suspended") await actx.resume().catch(() => {});

                if (!mediaElementSourceRef.current) {
                  mediaElementSourceRef.current = actx.createMediaElementSource(videoEl);
                }
                const dest = actx.createMediaStreamDestination();
                mediaElementSourceRef.current.connect(dest);
                mediaElementSourceRef.current.connect(actx.destination); // Host hears local movie sound

                if (dest.stream && dest.stream.getAudioTracks().length > 0) {
                  audioTrack = dest.stream.getAudioTracks()[0];
                }
              }
            } catch (audioErr) {
              console.warn("[Party] Web Audio capture note:", audioErr);
            }
          }

          const combinedTracks = [videoTrack, audioTrack].filter(Boolean);
          if (combinedTracks.length > 0) {
            const stream = new MediaStream(combinedTracks);
            localMediaStreamRef.current = stream;
            broadcastMediaStream(stream);
            showToast("Streaming movie with live audio 🍿");
          }
        } catch (err) {
          console.error("[Party] Local video stream setup error:", err);
        }
      };

      if (videoEl.readyState >= 1) {
        captureAndBroadcast();
      } else {
        videoEl.onloadedmetadata = () => captureAndBroadcast();
      }
    },
    [broadcastMediaStream]
  );

  // Handle Host Local Video Attachment
  useEffect(() => {
    if (isHost && mediaMode === "local" && localVideoUrl && localVideoRef.current) {
      if (localVideoRef.current.src !== localVideoUrl) {
        localVideoRef.current.src = localVideoUrl;
        localVideoRef.current.play().catch(() => {});
        startStreamingLocalVideo(localVideoRef.current);
      }
    }
  }, [isHost, mediaMode, localVideoUrl, startStreamingLocalVideo]);

  // Handle Peer Remote Video Attachment (Plays without black screen)
  useEffect(() => {
    if (!isHost && mediaMode !== "youtube" && remoteVideoRef.current && remoteVideoStream) {
      if (remoteVideoRef.current.srcObject !== remoteVideoStream) {
        remoteVideoRef.current.srcObject = remoteVideoStream;
      }
      remoteVideoRef.current.play().catch((err) => {
        console.warn("[Party] Remote video play deferred:", err);
      });
    }
  }, [isHost, mediaMode, remoteVideoStream]);

  // Host Periodic Playback Sync (Every 1.5s for Local Movie or Screenshare)
  useEffect(() => {
    if (!isHost || mediaMode === "youtube") return;
    const interval = setInterval(() => {
      if (localVideoRef.current && !localVideoRef.current.paused) {
        const cur = localVideoRef.current.currentTime || 0;
        const dur = localVideoRef.current.duration || 0;
        socket?.emit("party:media-sync", {
          roomId,
          action: "sync",
          currentTime: cur,
          duration: dur,
          url: mediaTitle,
          type: mediaMode,
          title: mediaTitle,
          isStreaming: isHostStreaming,
        });
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [isHost, mediaMode, roomId, socket, mediaTitle, isHostStreaming]);

  // ─── 5. WEBRTC PEER CONNECTION FACTORY ───
  const createPeerConnection = useCallback(
    (targetSocketId, isInitiator) => {
      if (peersRef.current[targetSocketId]) {
        return peersRef.current[targetSocketId];
      }

      const pc = new RTCPeerConnection(FREE_RTC_CONFIG);
      peersRef.current[targetSocketId] = pc;
      iceCandidateQueuesRef.current[targetSocketId] = [];

      // Add local microphone audio
      if (localMicStreamRef.current) {
        localMicStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localMicStreamRef.current);
        });
      }

      // Add active local video/screen share stream tracks
      if (localMediaStreamRef.current) {
        localMediaStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localMediaStreamRef.current);
        });
      }

      // Ensure video transceiver exists with sendrecv so receiving/sending works seamlessly
      if (!pc.getTransceivers().some((t) => t.receiver.track.kind === "video")) {
        pc.addTransceiver("video", { direction: "sendrecv" });
      }

      // Handle ICE Candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit("party:webrtc-signal", {
            to: targetSocketId,
            signal: { candidate: event.candidate },
            type: "ice",
          });
        }
      };

      // Handle incoming remote tracks (Microphone voice, Host live movie/screen stream)
      pc.ontrack = (event) => {
        const [stream] = event.streams;
        const track = event.track;

        if (track.kind === "video") {
          console.log("[Party RTC] Received video stream from peer:", track.id);
          const videoStream = stream || new MediaStream([track]);
          setRemoteVideoStream(videoStream);
          setNeedsUserGesture(false);

          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = videoStream;
            remoteVideoRef.current.play().catch((err) => {
              console.warn("[Party] Autoplay deferred on mobile:", err);
            });
          }
        } else if (track.kind === "audio") {
          console.log("[Party RTC] Received audio track from peer:", track.id);
          const existingVoice = remoteAudiosRef.current[targetSocketId];
          if (!existingVoice) {
            // First audio track is Voice Mic
            const audioEl = new Audio();
            audioEl.autoplay = true;
            audioEl.srcObject = stream || new MediaStream([track]);
            audioEl.play().catch(() => {});
            remoteAudiosRef.current[targetSocketId] = audioEl;
          } else {
            // Second audio track is Live Movie / Screen Audio!
            if (remoteMediaAudioRef.current) {
              remoteMediaAudioRef.current.srcObject = stream || new MediaStream([track]);
              remoteMediaAudioRef.current.volume = isPlayerMuted ? 0 : volume;
              remoteMediaAudioRef.current.play().catch(() => {
                setNeedsUserGesture(true);
              });
            }
          }
        }
      };

      if (isInitiator) {
        pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            socket?.emit("party:webrtc-signal", {
              to: targetSocketId,
              signal: { sdp: pc.localDescription },
              type: "offer",
            });
          })
          .catch((err) => console.error("[Party RTC] Offer error:", err));
      }

      return pc;
    },
    [socket, volume, isPlayerMuted]
  );

  // ─── 6. LOCAL AUDIO LEVEL ANALYZER (VOICE RING DETECTION) ───
  const setupAudioAnalyzer = (stream) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        setIsSpeakingLocal(avg > 18);
        animFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (e) {
      console.warn("[Party] Audio analyzer error:", e);
    }
  };

  // ─── 7. INITIALIZE VOICE & JOIN ROOM ───
  useEffect(() => {
    if (!socket || !roomId) return;

    let localMic = null;

    const initVoiceAndJoin = async () => {
      try {
        localMic = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
        localMicStreamRef.current = localMic;
        setupAudioAnalyzer(localMic);
      } catch (err) {
        console.warn("[Party] Microphone permission unavailable, joining in listener mode.");
      }

      // Join party room
      socket.emit("party:join", {
        roomId,
        user: {
          id: myUserId || socket.id,
          name: currentUser?.name || "Guest Peer",
          avatar: currentUser?.profilePic || currentUser?.avatar || "",
        },
      });
    };

    initVoiceAndJoin();

    // ─── SOCKET EVENT HANDLERS ───
    const handlePartyState = ({ hostId: initialHost, media, participants: list }) => {
      setHostId(initialHost);
      setParticipants(list || []);

      if (media?.url) {
        setVideoId(media.url);
        setMediaMode(media.type || "youtube");
        if (media.title) setMediaTitle(media.title);
        if (media.isStreaming) setIsHostStreaming(true);
      }
    };

    const handleUserJoined = ({ socketId, user: newPeer }) => {
      setParticipants((prev) => {
        const index = prev.findIndex(
          (p) => p.socketId === socketId || (newPeer.userId && p.userId === newPeer.userId)
        );
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = newPeer;
          return updated;
        }
        return [...prev, newPeer];
      });

      // Existing peers initiate WebRTC offer to new joiner
      createPeerConnection(socketId, true);
    };

    const handleUserLeft = ({ socketId }) => {
      setParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
      if (peersRef.current[socketId]) {
        peersRef.current[socketId].close();
        delete peersRef.current[socketId];
      }
      delete iceCandidateQueuesRef.current[socketId];

      // Clean remote audios for this socket
      Object.keys(remoteAudiosRef.current).forEach((key) => {
        if (key.startsWith(socketId)) {
          delete remoteAudiosRef.current[key];
        }
      });
    };

    const handleNewHost = ({ hostId: newHost }) => {
      setHostId(newHost);
      showToast("Host privileges migrated 👑");
    };

    const handleWebRTCSignal = async ({ from, signal }) => {
      let pc = peersRef.current[from];
      if (!pc) {
        pc = createPeerConnection(from, false);
      }

      try {
        if (signal?.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

          const queue = iceCandidateQueuesRef.current[from] || [];
          while (queue.length > 0) {
            const cand = queue.shift();
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (err) {}
          }

          if (signal.sdp.type === "offer") {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("party:webrtc-signal", {
              to: from,
              signal: { sdp: pc.localDescription },
              type: "answer",
            });
          }
        } else if (signal?.candidate && signal.candidate.candidate) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(() => {});
          } else {
            if (!iceCandidateQueuesRef.current[from]) {
              iceCandidateQueuesRef.current[from] = [];
            }
            iceCandidateQueuesRef.current[from].push(signal.candidate);
          }
        }
      } catch (err) {
        console.warn("[Party RTC] Signal handle error:", err);
      }
    };

    const handleMediaSync = ({ url, type, title, isStreaming, action, currentTime: syncTime, duration: syncDuration }) => {
      if (url && url !== videoId) setVideoId(url);
      if (type) setMediaMode(type);
      if (title) setMediaTitle(title);

      if (typeof syncDuration === "number" && syncDuration > 0) setDuration(syncDuration);
      if (typeof syncTime === "number") setCurrentTime(syncTime);

      if (typeof isStreaming === "boolean") {
        setIsHostStreaming(isStreaming);
        if (!isStreaming) setRemoteVideoStream(null);
      }

      // Synchronize Player Action
      if (type === "youtube" && ytPlayerRef.current) {
        if (typeof syncTime === "number") {
          try {
            ytPlayerRef.current.seekTo(syncTime, true);
          } catch (e) {}
        }
        if (action === "play") {
          try {
            ytPlayerRef.current.playVideo();
            setIsPlaying(true);
          } catch (e) {}
        } else if (action === "pause") {
          try {
            ytPlayerRef.current.pauseVideo();
            setIsPlaying(false);
          } catch (e) {}
        }
      } else if (type === "local") {
        if (localVideoRef.current && isHost) {
          if (typeof syncTime === "number") localVideoRef.current.currentTime = syncTime;
          if (action === "play") localVideoRef.current.play().catch(() => {});
          else if (action === "pause") localVideoRef.current.pause();
        }
        if (action === "play") setIsPlaying(true);
        else if (action === "pause") setIsPlaying(false);
      }

      triggerPetState("TALK", 2000, "Vibing to the party! 🎶");
    };

    const handlePeerStatus = ({ socketId, isMuted: peerMuted }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.socketId === socketId ? { ...p, isMuted: peerMuted } : p))
      );
    };

    const handleReaction = (reaction) => {
      const leftPos = 15 + Math.random() * 70;
      setReactions((prev) => [...prev.slice(-15), { ...reaction, left: leftPos }]);
    };

    socket.on("party:state", handlePartyState);
    socket.on("party:user-joined", handleUserJoined);
    socket.on("party:user-left", handleUserLeft);
    socket.on("party:new-host", handleNewHost);
    socket.on("party:webrtc-signal", handleWebRTCSignal);
    socket.on("party:media-sync", handleMediaSync);
    socket.on("party:peer-status", handlePeerStatus);
    socket.on("party:reaction", handleReaction);

    return () => {
      socket.off("party:state", handlePartyState);
      socket.off("party:user-joined", handleUserJoined);
      socket.off("party:user-left", handleUserLeft);
      socket.off("party:new-host", handleNewHost);
      socket.off("party:webrtc-signal", handleWebRTCSignal);
      socket.off("party:media-sync", handleMediaSync);
      socket.off("party:peer-status", handlePeerStatus);
      socket.off("party:reaction", handleReaction);

      socket.emit("party:leave", { roomId });

      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});

      Object.values(peersRef.current).forEach((pc) => pc.close());
      peersRef.current = {};
      iceCandidateQueuesRef.current = {};

      if (localMicStreamRef.current) {
        localMicStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (localMediaStreamRef.current) {
        localMediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [socket, roomId, myUserId, currentUser, createPeerConnection, triggerPetState, videoId]);

  // ─── 8. UNIFIED PLAYBACK CONTROLS ───
  const togglePlayPause = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);

    if (mediaMode === "youtube" && ytPlayerRef.current) {
      try {
        if (nextState) {
          if (!isPlayerMuted) {
            ytPlayerRef.current.unMute();
            ytPlayerRef.current.setVolume((volume || 0.8) * 100);
          }
          ytPlayerRef.current.playVideo();
        } else {
          ytPlayerRef.current.pauseVideo();
        }
      } catch (e) {}
    } else if (mediaMode === "local" && localVideoRef.current) {
      if (nextState) localVideoRef.current.play().catch(() => {});
      else localVideoRef.current.pause();
    }

    // Broadcast sync to party
    socket?.emit("party:media-sync", {
      roomId,
      action: nextState ? "play" : "pause",
      currentTime,
      duration,
      url: videoId,
      type: mediaMode,
      title: mediaTitle,
      isStreaming: isHostStreaming,
    });
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percentage * (duration || 100);

    setCurrentTime(newTime);

    if (mediaMode === "youtube" && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.seekTo(newTime, true);
      } catch (e) {}
    } else if (mediaMode === "local" && localVideoRef.current) {
      localVideoRef.current.currentTime = newTime;
    }

    socket?.emit("party:media-sync", {
      roomId,
      action: "seek",
      currentTime: newTime,
      duration,
      url: videoId,
      type: mediaMode,
      title: mediaTitle,
      isStreaming: isHostStreaming,
    });
  };

  const skipSeconds = (sec) => {
    const newTime = Math.max(0, Math.min(duration || 9999, currentTime + sec));
    setCurrentTime(newTime);

    if (mediaMode === "youtube" && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.seekTo(newTime, true);
      } catch (e) {}
    } else if (mediaMode === "local" && localVideoRef.current) {
      localVideoRef.current.currentTime = newTime;
    }

    socket?.emit("party:media-sync", {
      roomId,
      action: "seek",
      currentTime: newTime,
      duration,
      url: videoId,
      type: mediaMode,
      title: mediaTitle,
      isStreaming: isHostStreaming,
    });
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsPlayerMuted(val === 0);

    if (mediaMode === "youtube" && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.setVolume(val * 100);
        if (val === 0) ytPlayerRef.current.mute();
        else ytPlayerRef.current.unMute();
      } catch (e) {}
    } else if (localVideoRef.current) {
      localVideoRef.current.volume = val;
    }

    if (remoteMediaAudioRef.current) {
      remoteMediaAudioRef.current.volume = val;
    }

    // Update all remote voice audio elements volume
    Object.values(remoteAudiosRef.current).forEach((audio) => {
      audio.volume = val;
    });
  };

  const togglePlayerMute = () => {
    const nextMute = !isPlayerMuted;
    setIsPlayerMuted(nextMute);

    if (mediaMode === "youtube" && ytPlayerRef.current) {
      try {
        if (nextMute) ytPlayerRef.current.mute();
        else {
          ytPlayerRef.current.unMute();
          ytPlayerRef.current.setVolume((volume || 0.8) * 100);
        }
      } catch (e) {}
    } else if (localVideoRef.current) {
      localVideoRef.current.muted = nextMute;
    }

    if (remoteMediaAudioRef.current) {
      remoteMediaAudioRef.current.muted = nextMute;
    }

    Object.values(remoteAudiosRef.current).forEach((audio) => {
      audio.muted = nextMute;
    });
  };

  const handleCinemaCardClick = () => {
    // Unmute YouTube player on first interaction if currently muted
    if (mediaMode === "youtube" && ytPlayerRef.current && !isPlayerMuted) {
      try {
        ytPlayerRef.current.unMute();
        ytPlayerRef.current.setVolume((volume || 0.8) * 100);
      } catch (e) {}
    }
    if (remoteMediaAudioRef.current && remoteMediaAudioRef.current.paused) {
      remoteMediaAudioRef.current.play().catch(() => {});
    }
  };

  const toggleFullscreen = () => {
    const container = cinemaContainerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  // ─── 9. YOUTUBE SYNC INPUT & PRESETS ───
  const handleSyncVideo = (e) => {
    e?.preventDefault();
    if (!videoInput.trim()) return;

    const cleanId = extractYoutubeId(videoInput.trim());
    setVideoId(cleanId);
    setMediaMode("youtube");
    setMediaTitle("YouTube Video");
    setIsHostStreaming(false);
    setRemoteVideoStream(null);
    setVideoInput("");

    socket?.emit("party:media-sync", {
      roomId,
      action: "play",
      currentTime: 0,
      url: cleanId,
      type: "youtube",
      title: "YouTube Video",
      isStreaming: false,
    });

    showToast("Synced YouTube video with party 🎬");
    triggerPetState("TALK", 2500, "New track synced! 🎵");
  };

  const handleSelectPreset = (stream) => {
    setVideoId(stream.id);
    setMediaMode("youtube");
    setMediaTitle(stream.label);
    setIsHostStreaming(false);
    setRemoteVideoStream(null);

    socket?.emit("party:media-sync", {
      roomId,
      action: "play",
      currentTime: 0,
      url: stream.id,
      type: "youtube",
      title: stream.label,
      isStreaming: false,
    });

    showToast(`Playing ${stream.label} 🎶`);
  };

  // ─── 10. HOST LOCAL MOVIE STREAMING TRIGGER ───
  const handleLocalFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setLocalVideoUrl(localUrl);
    setMediaMode("local");
    setMediaTitle(file.name);
    setIsHostStreaming(true);
    setRemoteVideoStream(null);

    socket?.emit("party:media-sync", {
      roomId,
      action: "play",
      currentTime: 0,
      url: file.name,
      type: "local",
      title: file.name,
      isStreaming: true,
    });

    showToast(`Streaming ${file.name} to party 🍿`);
  };

  // ─── 11. SCREEN / TAB SHARE (1080p 60fps) ───
  const handleScreenShare = async () => {
    try {
      if (localMediaStreamRef.current && mediaMode === "screenshare") {
        localMediaStreamRef.current.getTracks().forEach((t) => t.stop());
        localMediaStreamRef.current = null;
        setMediaMode("youtube");
        setIsHostStreaming(false);
        socket?.emit("party:media-sync", {
          roomId,
          action: "stop",
          url: DEFAULT_YOUTUBE_ID,
          type: "youtube",
          title: "24/7 Lofi Beats",
          isStreaming: false,
        });
        showToast("Screen share stopped");
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: true,
      });

      setMediaMode("screenshare");
      setMediaTitle("Screen / Tab Stream");
      setIsHostStreaming(true);
      setRemoteVideoStream(null);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }

      broadcastMediaStream(stream);

      stream.getVideoTracks()[0].onended = () => {
        setMediaMode("youtube");
        setIsHostStreaming(false);
        socket?.emit("party:media-sync", {
          roomId,
          action: "stop",
          url: DEFAULT_YOUTUBE_ID,
          type: "youtube",
          title: "24/7 Lofi Beats",
          isStreaming: false,
        });
      };

      socket?.emit("party:media-sync", {
        roomId,
        action: "play",
        type: "screenshare",
        title: "Screen / Movie Stream",
        isStreaming: true,
      });

      showToast("Sharing screen with party 🖥️");
    } catch (err) {
      console.warn("[Party] Screen share cancelled:", err);
    }
  };

  // ─── 12. MIC CONTROLS & EMOJI REACTIONS ───
  const toggleMute = () => {
    if (localMicStreamRef.current) {
      const audioTrack = localMicStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        socket?.emit("party:peer-status", {
          roomId,
          isMuted: !audioTrack.enabled,
        });
      }
    }
  };

  const sendReaction = (emoji) => {
    const newReaction = {
      id: `${Date.now()}-${Math.random()}`,
      emoji,
      left: 15 + Math.random() * 70,
    };
    setReactions((prev) => [...prev.slice(-15), newReaction]);
    socket?.emit("party:reaction", {
      roomId,
      emoji,
      senderName: currentUser?.name || "Peer",
    });
  };

  const copyRoomLink = () => {
    const url = `${window.location.origin}/party/${roomId}`;
    navigator.clipboard.writeText(url);
    showToast(`Room link copied! (#${roomId}) 🚀`);
  };

  const isMe = (p) => p.socketId === socket?.id || (myUserId && p.userId === myUserId);
  const remotePeers = participants.filter((p) => !isMe(p));
  const totalActivePeers = Math.max(participants.length, 1);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={styles.partyContainer}>
      {/* Ambient Neon Glows */}
      <div className={styles.glowCyan} />
      <div className={styles.glowPurple} />

      {/* Transient Toast Notification */}
      {toastMessage && <div className={styles.copyToast}>{toastMessage}</div>}

      {/* TOP HEADER */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            onClick={() => navigate("/party")}
            className={styles.backBtn}
            title="Back to Party Lobby"
          >
            <ArrowLeft size={16} />
          </button>
          <div className={styles.titleGroup}>
            <BrandLogo size="sm" withLink={false} suffix="Party" />
            <div className={styles.liveBadge}>
              <span className={styles.liveDot} />
              <span>LIVE CO-EXPERIENCE</span>
            </div>
          </div>
        </div>

        <div className={styles.headerRight}>
          <button
            onClick={copyRoomLink}
            className={styles.roomCodeBadge}
            title="Click to copy room share link"
          >
            <Copy size={12} />
            <span>#{roomId}</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className={styles.roomContent}>
        {/* 1. SYNCHRONIZED CINEMA STAGE WITH 2026 LIQUID GLASS CUSTOM CONTROLLER */}
        <section
          ref={cinemaContainerRef}
          className={styles.cinemaCard}
          onMouseMove={handleUserActivity}
          onTouchStart={handleUserActivity}
          onClick={handleCinemaCardClick}
        >
          {isHostStreaming && (
            <div className={styles.streamBadge}>
              <Radio size={11} className={styles.liveDot} />
              <span>LIVE P2P STREAM</span>
            </div>
          )}

          <div className={styles.playerWrapper}>
            {/* A. YOUTUBE CINEMA (Controls=0, Privacy-Enhanced No-Cookie Domain, Custom Controller Overlay) */}
            {mediaMode === "youtube" && (
              <iframe
                id="yt-player-target"
                className={styles.iframePlayer}
                src={`https://www.youtube-nocookie.com/embed/${videoId || DEFAULT_YOUTUBE_ID}?enablejsapi=1&autoplay=1&controls=0&disablekb=1&modestbranding=1&rel=0&fs=0&iv_load_policy=3&playsinline=1&mute=1&origin=${encodeURIComponent(window.location.origin)}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                title="ConnectX Cinema Player"
              />
            )}

            {/* B. HOST LOCAL MOVIE OR SCREEN SHARE (Plays Locally & Broadcasts to Peers) */}
            {mediaMode !== "youtube" && isHost && (
              <video
                ref={localVideoRef}
                className={styles.localVideo}
                playsInline
                autoPlay
                muted={false}
              />
            )}

            {/* C. PEER VIEW OF LIVE P2P WEBRTC STREAM */}
            {mediaMode !== "youtube" && !isHost && (
              <video
                ref={remoteVideoRef}
                className={styles.localVideo}
                playsInline
                autoPlay
                muted={true}
              />
            )}

            {/* Dedicated Mounted Audio for Incoming Live Movie / Screen Audio */}
            <audio
              ref={remoteMediaAudioRef}
              autoPlay
              playsInline
              style={{ display: "none" }}
            />

            {/* Tap to Unmute Overlay for Mobile Autoplay Policy */}
            {needsUserGesture && (
              <div
                className={styles.tapToPlayOverlay}
                onClick={(e) => {
                  e.stopPropagation();
                  if (remoteVideoRef.current) {
                    remoteVideoRef.current.play().catch(() => {});
                  }
                  if (remoteMediaAudioRef.current) {
                    remoteMediaAudioRef.current.play().catch(() => {});
                  }
                  if (ytPlayerRef.current) {
                    try {
                      ytPlayerRef.current.unMute();
                      ytPlayerRef.current.setVolume((volume || 0.8) * 100);
                      ytPlayerRef.current.playVideo();
                    } catch (err) {}
                  }
                  setNeedsUserGesture(false);
                }}
              >
                <button className={styles.tapToPlayBtn}>
                  <Volume2 size={16} />
                  <span>Tap to Play & Unmute Audio</span>
                </button>
              </div>
            )}

            {/* ─── 2026 LIQUID GLASS UNIFIED CUSTOM CONTROLLER OVERLAY ─── */}
            <div
              className={`${styles.customControlsOverlay} ${
                showControls ? styles.controlsVisible : styles.controlsHidden
              }`}
            >
              {/* Top Title Pill */}
              <div className={styles.topControlRow}>
                <div className={styles.mediaTitlePill}>
                  <Film size={12} color="#06b6d4" />
                  <span>{mediaTitle}</span>
                </div>

                <div
                  className={styles.syncStatusPill}
                  onClick={() => {
                    if (mediaMode === "youtube" && ytPlayerRef.current) {
                      ytPlayerRef.current.seekTo(currentTime, true);
                    }
                    showToast("Synchronized with party stream ✨");
                  }}
                  title="Click to manually resync"
                >
                  <Sparkles size={11} />
                  <span>Synced</span>
                </div>
              </div>

              {/* Center Play / Pause Indicator */}
              <div className={styles.centerActionContainer}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    skipSeconds(-10);
                  }}
                  className={styles.quickSkipBtn}
                  title="Rewind 10 seconds"
                >
                  <RotateCcw size={15} />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlayPause();
                  }}
                  className={styles.centerPlayBtn}
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause size={22} /> : <Play size={22} fill="white" />}
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    skipSeconds(10);
                  }}
                  className={styles.quickSkipBtn}
                  title="Fast Forward 10 seconds"
                >
                  <RotateCw size={15} />
                </button>
              </div>

              {/* Bottom Glass Controller Dock */}
              <div className={styles.bottomControlsDock} onClick={(e) => e.stopPropagation()}>
                {/* Timeline Scrubber */}
                <div className={styles.timelineRow}>
                  <span className={styles.timeLabel}>{formatTime(currentTime)}</span>
                  <div
                    className={styles.timelineBar}
                    onClick={handleSeek}
                    title="Click or drag to seek"
                  >
                    <div
                      className={styles.timelineProgress}
                      style={{ width: `${progressPercent}%` }}
                    >
                      <div className={styles.timelineThumb} />
                    </div>
                  </div>
                  <span className={styles.timeLabel}>
                    {duration > 0 ? formatTime(duration) : "LIVE"}
                  </span>
                </div>

                {/* Bottom Actions Row */}
                <div className={styles.dockActionsRow}>
                  <div className={styles.dockLeftGroup}>
                    <button
                      type="button"
                      onClick={togglePlayPause}
                      className={styles.dockIconBtn}
                      title={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}
                    </button>

                    <div className={styles.volumeGroup}>
                      <button
                        type="button"
                        onClick={togglePlayerMute}
                        className={styles.dockIconBtn}
                        title={isPlayerMuted ? "Unmute" : "Mute"}
                      >
                        {isPlayerMuted || volume === 0 ? (
                          <VolumeX size={15} />
                        ) : (
                          <Volume2 size={15} />
                        )}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={isPlayerMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className={styles.volumeSlider}
                      />
                    </div>
                  </div>

                  <div className={styles.dockRightGroup}>
                    <button
                      type="button"
                      onClick={toggleFullscreen}
                      className={styles.dockIconBtn}
                      title="Fullscreen Cinema"
                    >
                      <Maximize size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Media Input & Sync Controls Bar */}
          <div className={styles.mediaBar}>
            <form onSubmit={handleSyncVideo} className={styles.mediaInputRow}>
              <input
                type="text"
                value={videoInput}
                onChange={(e) => setVideoInput(e.target.value)}
                placeholder="Paste any YouTube video or music link..."
                className={styles.mediaInput}
              />
              <button type="submit" className={styles.syncBtn} title="Sync video with all peers">
                <Play size={13} />
                <span>Sync</span>
              </button>

              <label
                className={styles.localUploadBtn}
                title="Stream local movie/video file via P2P WebRTC (₹0)"
              >
                <Film size={13} />
                <span>Movie</span>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleLocalFileSelect}
                  style={{ display: "none" }}
                />
              </label>

              <button
                type="button"
                onClick={handleScreenShare}
                className={styles.screenShareBtn}
                title="Share Screen or Browser Tab (Watch Together)"
              >
                <MonitorUp size={13} />
                <span>{mediaMode === "screenshare" ? "Stop" : "Screen"}</span>
              </button>
            </form>

            {/* Quick Presets */}
            <div className={styles.presetChips}>
              {CURATED_STREAMS.map((stream) => (
                <button
                  key={stream.id}
                  onClick={() => handleSelectPreset(stream)}
                  className={styles.presetChip}
                >
                  {stream.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 2. SPATIAL VOICE STAGE */}
        <section className={styles.stageSection}>
          <div className={styles.stageHeader}>
            <span className={styles.stageTitle}>
              Voice Stage ({totalActivePeers}/6 Active)
            </span>
            <span className={styles.stageInfo}>● P2P WebRTC Mesh</span>
          </div>

          <div className={styles.avatarsGrid}>
            {/* Local User Avatar */}
            <div className={styles.avatarCard}>
              <div
                className={`${styles.avatarRing} ${
                  isSpeakingLocal && !isMuted ? styles.speaking : ""
                }`}
              >
                <div className={styles.avatarCircle}>
                  {currentUser?.profilePic || currentUser?.avatar ? (
                    <img
                      src={currentUser.profilePic || currentUser.avatar}
                      alt={currentUser.name}
                      className={styles.avatarImg}
                    />
                  ) : (
                    currentUser?.name?.[0]?.toUpperCase() || "ME"
                  )}
                </div>
                {isHost && <span className={styles.hostBadge}>HOST</span>}
              </div>
              <span className={styles.avatarName}>
                {currentUser?.name || "You"} (You)
              </span>
              <span
                className={`${styles.avatarStatus} ${
                  isMuted ? styles.muted : ""
                }`}
              >
                {isMuted ? <MicOff size={11} /> : <Mic size={11} />}
                <span>{isMuted ? "Muted" : isSpeakingLocal ? "Speaking..." : "Active"}</span>
              </span>
            </div>

            {/* Remote Peer Avatars */}
            {remotePeers.map((peer) => {
              const peerIsHost = hostId === peer.socketId;
              return (
                <div key={peer.socketId} className={styles.avatarCard}>
                  <div
                    className={`${styles.avatarRing} ${
                      peer.isSpeaking ? styles.speaking : ""
                    }`}
                  >
                    <div className={styles.avatarCircle}>
                      {peer.avatar ? (
                        <img
                          src={peer.avatar}
                          alt={peer.name}
                          className={styles.avatarImg}
                        />
                      ) : (
                        peer.name?.[0]?.toUpperCase() || "P"
                      )}
                    </div>
                    {peerIsHost && <span className={styles.hostBadge}>HOST</span>}
                  </div>
                  <span className={styles.avatarName}>{peer.name}</span>
                  <span
                    className={`${styles.avatarStatus} ${
                      peer.isMuted ? styles.muted : ""
                    }`}
                  >
                    {peer.isMuted ? <MicOff size={11} /> : <Mic size={11} />}
                    <span>{peer.isMuted ? "Muted" : "Active"}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Floating Reactions Overlay */}
      <div className={styles.reactionsOverlay}>
        {reactions.map((r) => (
          <div
            key={r.id}
            style={{ left: `${r.left}%` }}
            className={styles.floatingReaction}
          >
            {r.emoji}
          </div>
        ))}
      </div>

      {/* 3. BOTTOM PARTY CONTROL DOCK */}
      <footer id="party-control-dock" className={styles.controlDock}>
        <button
          onClick={toggleMute}
          className={`${styles.dockBtn} ${
            isMuted ? styles.micBtnMuted : styles.micBtnActive
          }`}
        >
          {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
          <span>{isMuted ? "Unmute" : "Mute"}</span>
        </button>

        {/* Emoji Reactions Bar */}
        <div className={styles.reactionPill}>
          {["🔥", "😂", "💜", "👏", "🚀", "🐱"].map((emoji) => (
            <button
              key={emoji}
              onClick={() => sendReaction(emoji)}
              className={styles.emojiBtn}
              title={`Send ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>

        <button onClick={() => navigate("/party")} className={styles.leaveBtn}>
          Leave
        </button>
      </footer>
    </div>
  );
};

export default PartyRoom;
