import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useSocketContext } from "../../../context/SocketContext";
import { useCompanionPet } from "../../../components/CompanionPet/CompanionContext";
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

// Production WebRTC NAT Traversal Configuration (STUN + OpenRelay TURN for 5G/Mobile Networks)
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

  // URL Auto-Correction
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
  const ytContainerRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
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
  const remoteAudiosRef = useRef({}); // socketId -> Audio

  const myUserId = currentUser?._id || currentUser?.id;
  const isHost =
    hostId === socket?.id ||
    participants.find((p) => p.socketId === hostId)?.userId === myUserId ||
    (participants.length > 0 && participants[0]?.socketId === socket?.id);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 2200);
  };

  // ─── 1. INTERACTION TIMER (AUTO-HIDE CONTROLS) ───
  const handleUserActivity = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
  }, [isPlaying]);

  // ─── 2. YOUTUBE IFRAME API LOADER & CONTROLLER ───
  useEffect(() => {
    if (mediaMode !== "youtube") return;

    let isMounted = true;

    const initYTPlayer = () => {
      if (!window.YT || !window.YT.Player) return;

      // Clean existing player instance if any
      if (ytPlayerRef.current && ytPlayerRef.current.destroy) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {}
      }

      const playerDiv = document.getElementById("yt-player-target");
      if (!playerDiv) return;

      ytPlayerRef.current = new window.YT.Player("yt-player-target", {
        videoId: videoId || DEFAULT_YOUTUBE_ID,
        playerVars: {
          autoplay: 1,
          controls: 0, // HIDE YOUTUBE DEFAULT CONTROLS COMPLETELY
          disablekb: 1, // Disable YouTube keyboard shortcuts
          modestbranding: 1,
          rel: 0,
          fs: 0, // Hide YouTube fullscreen button (we use our own)
          iv_load_policy: 3,
          enablejsapi: 1,
          origin: window.location.origin,
          playsinline: 1,
        },
        events: {
          onReady: (event) => {
            if (!isMounted) return;
            event.target.setVolume(volume * 100);
            if (isPlayerMuted) event.target.mute();
            event.target.playVideo();
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
            }
          },
          onError: (event) => {
            console.warn("[Party YT] Playback restriction error code:", event.data);
            showToast("Video has playback restrictions. Trying alternate track.");
          },
        },
      });
    };

    // Load YouTube API script if not loaded
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
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
      } else if (remoteVideoRef.current && remoteVideoStream) {
        setCurrentTime(remoteVideoRef.current.currentTime || 0);
        setDuration(remoteVideoRef.current.duration || 0);
      }
    }, 300);

    return () => {
      if (timeUpdateIntervalRef.current) clearInterval(timeUpdateIntervalRef.current);
    };
  }, [mediaMode, duration, remoteVideoStream]);

  // ─── 3. WEBRTC MEDIA TRACK BROADCASTER (LOCAL VIDEO & SCREEN SHARE) ───
  const broadcastMediaStream = useCallback((stream) => {
    if (!stream) return;
    localMediaStreamRef.current = stream;

    Object.entries(peersRef.current).forEach(async ([peerSocketId, pc]) => {
      try {
        const senders = pc.getSenders();
        stream.getTracks().forEach((track) => {
          const existingSender = senders.find((s) => s.track?.kind === track.kind);
          if (existingSender) {
            existingSender.replaceTrack(track).catch((err) => {
              console.warn("[Party RTC] Track replace error:", err);
            });
          } else {
            pc.addTrack(track, stream);
          }
        });

        // Trigger clean renegotiation offer so peer immediately expects video track
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
  }, [socket]);

  // ─── 4. WEBRTC PEER CONNECTION FACTORY ───
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

      // Handle incoming remote tracks (Microphone voice, Host live video stream)
      pc.ontrack = (event) => {
        const [stream] = event.streams;
        const track = event.track;

        if (track.kind === "video") {
          // Received Host Live P2P Video Stream
          const videoStream = stream || new MediaStream([track]);
          setRemoteVideoStream(videoStream);
          setNeedsUserGesture(false);

          // If audio track is also part of stream, ensure it's active
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = videoStream;
            remoteVideoRef.current
              .play()
              .catch((err) => {
                console.warn("[Party] Mobile autoplay deferred:", err);
                setNeedsUserGesture(true);
              });
          }
        } else if (track.kind === "audio") {
          // Voice mesh track
          let audioEl = remoteAudiosRef.current[targetSocketId];
          if (!audioEl) {
            audioEl = new Audio();
            audioEl.autoplay = true;
            remoteAudiosRef.current[targetSocketId] = audioEl;
          }
          audioEl.srcObject = stream || new MediaStream([track]);
          audioEl.play().catch(() => {});
        }
      };

      // If initiator, create and send Offer
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
    [socket]
  );

  // ─── 5. LOCAL AUDIO LEVEL ANALYZER ───
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

  // ─── 6. INITIALIZE VOICE & JOIN ROOM ───
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
        console.warn("[Party] Microphone permission unavailable, joining as listener.");
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
      if (remoteAudiosRef.current[socketId]) {
        delete remoteAudiosRef.current[socketId];
      }
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

          // Drain queued ICE candidates
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
        } else if (signal?.candidate) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
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

    const handleMediaSync = ({ url, type, title, isStreaming, action, currentTime: syncTime }) => {
      if (url && url !== videoId) setVideoId(url);
      if (type) setMediaMode(type);
      if (title) setMediaTitle(title);

      if (typeof isStreaming === "boolean") {
        setIsHostStreaming(isStreaming);
        if (!isStreaming) setRemoteVideoStream(null);
      }

      // Synchronize Player Action
      if (type === "youtube" && ytPlayerRef.current) {
        if (typeof syncTime === "number") {
          ytPlayerRef.current.seekTo(syncTime, true);
          setCurrentTime(syncTime);
        }
        if (action === "play") {
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
        } else if (action === "pause") {
          ytPlayerRef.current.pauseVideo();
          setIsPlaying(false);
        }
      } else if (type === "local" && localVideoRef.current) {
        if (typeof syncTime === "number") localVideoRef.current.currentTime = syncTime;
        if (action === "play") localVideoRef.current.play().catch(() => {});
        else if (action === "pause") localVideoRef.current.pause();
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

  // ─── 7. UNIFIED PLAYBACK CONTROLLERS ───
  const togglePlayPause = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);

    if (mediaMode === "youtube" && ytPlayerRef.current) {
      if (nextState) ytPlayerRef.current.playVideo();
      else ytPlayerRef.current.pauseVideo();
    } else if (mediaMode === "local" && localVideoRef.current) {
      if (nextState) localVideoRef.current.play().catch(() => {});
      else localVideoRef.current.pause();
    }

    // Broadcast sync to party
    socket?.emit("party:media-sync", {
      roomId,
      action: nextState ? "play" : "pause",
      currentTime,
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
      ytPlayerRef.current.seekTo(newTime, true);
    } else if (mediaMode === "local" && localVideoRef.current) {
      localVideoRef.current.currentTime = newTime;
    }

    // Broadcast seek to party
    socket?.emit("party:media-sync", {
      roomId,
      action: "seek",
      currentTime: newTime,
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
      ytPlayerRef.current.seekTo(newTime, true);
    } else if (mediaMode === "local" && localVideoRef.current) {
      localVideoRef.current.currentTime = newTime;
    }

    socket?.emit("party:media-sync", {
      roomId,
      action: "seek",
      currentTime: newTime,
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
      ytPlayerRef.current.setVolume(val * 100);
      if (val === 0) ytPlayerRef.current.mute();
      else ytPlayerRef.current.unMute();
    } else if (localVideoRef.current) {
      localVideoRef.current.volume = val;
    } else if (remoteVideoRef.current) {
      remoteVideoRef.current.volume = val;
    }
  };

  const togglePlayerMute = () => {
    const nextMute = !isPlayerMuted;
    setIsPlayerMuted(nextMute);

    if (mediaMode === "youtube" && ytPlayerRef.current) {
      if (nextMute) ytPlayerRef.current.mute();
      else {
        ytPlayerRef.current.unMute();
        ytPlayerRef.current.setVolume((volume || 0.8) * 100);
      }
    } else if (localVideoRef.current) {
      localVideoRef.current.muted = nextMute;
    } else if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = nextMute;
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

  // ─── 8. YOUTUBE SYNC INPUT & PRESETS ───
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

  // ─── 9. HOST LOCAL MOVIE STREAMING (captureStream) ───
  const handleLocalFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setLocalVideoUrl(localUrl);
    setMediaMode("local");
    setMediaTitle(file.name);
    setIsHostStreaming(true);
    setRemoteVideoStream(null);

    setTimeout(() => {
      const videoEl = localVideoRef.current;
      if (videoEl) {
        try {
          videoEl.play().catch(() => {});
          const stream = videoEl.captureStream
            ? videoEl.captureStream(30)
            : videoEl.mozCaptureStream
            ? videoEl.mozCaptureStream(30)
            : null;

          if (stream) {
            broadcastMediaStream(stream);
          }
        } catch (err) {
          console.warn("[Party] Local video captureStream error:", err);
        }
      }
    }, 450);

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

  // ─── 10. SCREEN / TAB SHARE (1080p 60fps) ───
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

  // ─── 11. MIC CONTROLS & EMOJI REACTIONS ───
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
            <h1 className={styles.title}>ConnectX Party</h1>
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
        >
          {isHostStreaming && (
            <div className={styles.streamBadge}>
              <Radio size={11} className={styles.liveDot} />
              <span>LIVE P2P STREAM</span>
            </div>
          )}

          <div className={styles.playerWrapper}>
            {/* A. YOUTUBE CINEMA (Controls=0, Custom Controller Overlay) */}
            {mediaMode === "youtube" && (
              <div
                ref={ytContainerRef}
                style={{ width: "100%", height: "100%", pointerEvents: "none" }}
              >
                <div id="yt-player-target" style={{ width: "100%", height: "100%" }} />
              </div>
            )}

            {/* B. HOST LOCAL MOVIE OR SCREEN SHARE (Plays Locally & Broadcasts to Peers) */}
            {mediaMode !== "youtube" && isHost && (
              <video
                ref={localVideoRef}
                className={styles.localVideo}
                src={mediaMode === "local" ? localVideoUrl : undefined}
                playsInline
                autoPlay
              />
            )}

            {/* C. PEER VIEW OF LIVE P2P WEBRTC STREAM */}
            {mediaMode !== "youtube" && !isHost && (
              <video
                ref={(el) => {
                  remoteVideoRef.current = el;
                  if (el && remoteVideoStream && el.srcObject !== remoteVideoStream) {
                    el.srcObject = remoteVideoStream;
                    el.play().catch((err) => {
                      console.log("Deferred play:", err);
                      setNeedsUserGesture(true);
                    });
                  }
                }}
                className={styles.localVideo}
                playsInline
                autoPlay
              />
            )}

            {/* Tap to Unmute Overlay for Mobile Autoplay Policy */}
            {needsUserGesture && (
              <div
                className={styles.tapToPlayOverlay}
                onClick={() => {
                  if (remoteVideoRef.current) {
                    remoteVideoRef.current.play();
                    setNeedsUserGesture(false);
                  }
                }}
              >
                <button className={styles.tapToPlayBtn}>
                  <Volume2 size={16} />
                  <span>Tap to Watch & Unmute Stream</span>
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
                  onClick={() => skipSeconds(-10)}
                  className={styles.quickSkipBtn}
                  title="Rewind 10 seconds"
                >
                  <RotateCcw size={15} />
                </button>

                <button
                  type="button"
                  onClick={togglePlayPause}
                  className={styles.centerPlayBtn}
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause size={22} /> : <Play size={22} fill="white" />}
                </button>

                <button
                  type="button"
                  onClick={() => skipSeconds(10)}
                  className={styles.quickSkipBtn}
                  title="Fast Forward 10 seconds"
                >
                  <RotateCw size={15} />
                </button>
              </div>

              {/* Bottom Glass Controller Dock */}
              <div className={styles.bottomControlsDock}>
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

        {/* 2. SPATIAL VOICE STAGE (Speaking Glow Rings & Accurate Host Badges) */}
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

      {/* 3. BOTTOM PARTY CONTROL DOCK (With Unique ID for Mascot Ground Snapping) */}
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
