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
  Share2,
  ArrowLeft,
  Play,
  Film,
  Sparkles,
  Volume2,
  VolumeX,
  Copy,
  Check,
  MonitorUp,
  RefreshCw,
  Radio,
} from "lucide-react";

// Free global STUN servers (₹0 cost WebRTC P2P NAT traversal)
const FREE_RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ],
};

const PartyRoom = () => {
  const { roomId: rawParamRoomId } = useParams();
  // Sanitize room ID from ANY input (mangled URL, hash, query params, etc.)
  const roomId = useMemo(() => parsePartyRoomCode(rawParamRoomId), [rawParamRoomId]);
  const navigate = useNavigate();
  const { socket } = useSocketContext();
  const { user: currentUser } = useSelector((state) => state.auth);
  const { triggerPetState } = useCompanionPet();

  // URL Auto-Correction: If navigated with dirty/mangled URL, clean it up immediately in the address bar
  useEffect(() => {
    if (rawParamRoomId && rawParamRoomId !== roomId) {
      navigate(`/party/${roomId}`, { replace: true });
    }
  }, [rawParamRoomId, roomId, navigate]);

  // Room & Participant State
  const [participants, setParticipants] = useState([]);
  const [hostId, setHostId] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  // Voice & WebRTC State
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakingLocal, setIsSpeakingLocal] = useState(false);

  // Cinema / Watch Party State
  const [mediaMode, setMediaMode] = useState("youtube"); // "youtube" | "local" | "screenshare"
  const [videoId, setVideoId] = useState(DEFAULT_YOUTUBE_ID);
  const [videoInput, setVideoInput] = useState("");
  const [mediaTitle, setMediaTitle] = useState("24/7 Lofi Beats");
  const [localVideoUrl, setLocalVideoUrl] = useState(null);
  const [isHostStreaming, setIsHostStreaming] = useState(false);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [reactions, setReactions] = useState([]);

  // Refs for WebRTC mesh and Audio/Video Streams
  const localStreamRef = useRef(null); // Mic stream
  const localMediaStreamRef = useRef(null); // Local video or screen share stream
  const peersRef = useRef({}); // socketId -> RTCPeerConnection
  const iceCandidateQueuesRef = useRef({}); // socketId -> RTCIceCandidate[]
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const remoteAudiosRef = useRef({}); // socketId -> HTMLAudioElement
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const myUserId = currentUser?._id || currentUser?.id;
  const isHost =
    hostId === socket?.id ||
    participants.find((p) => p.socketId === hostId)?.userId === myUserId ||
    (participants.length > 0 && participants[0]?.socketId === socket?.id);

  // Helper to show transient toast feedback
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 2200);
  };

  // ─── 1. BROADCAST MEDIA STREAM TO ALL PEERS ───
  const broadcastMediaTracks = useCallback((stream) => {
    if (!stream) return;
    Object.entries(peersRef.current).forEach(([peerSocketId, pc]) => {
      try {
        const senders = pc.getSenders();
        stream.getTracks().forEach((track) => {
          const existingSender = senders.find((s) => s.track?.kind === track.kind);
          if (existingSender) {
            existingSender.replaceTrack(track).catch((err) => {
              console.warn("[Party RTC] Error replacing track:", err);
            });
          } else {
            pc.addTrack(track, stream);
          }
        });
      } catch (e) {
        console.warn("[Party RTC] broadcastMediaTracks failed for peer:", peerSocketId, e);
      }
    });
  }, []);

  // ─── 2. WEBRTC MESH PEER CONNECTION FACTORY ───
  const createPeerConnection = useCallback(
    (targetSocketId, isInitiator) => {
      if (peersRef.current[targetSocketId]) {
        return peersRef.current[targetSocketId];
      }

      const pc = new RTCPeerConnection(FREE_RTC_CONFIG);
      peersRef.current[targetSocketId] = pc;
      iceCandidateQueuesRef.current[targetSocketId] = [];

      // Add local microphone audio tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      // Add active local video/screen share stream tracks if host is streaming
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

      // Handle renegotiation if tracks are added dynamically
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket?.emit("party:webrtc-signal", {
            to: targetSocketId,
            signal: { sdp: pc.localDescription },
            type: "offer",
          });
        } catch (err) {
          console.warn("[Party RTC] Negotiation offer error:", err);
        }
      };

      // Handle remote incoming tracks (Microphone voice, video stream, screen share)
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        const track = event.track;

        if (track.kind === "video") {
          // Live P2P Video Track received (Watch Party Cinema)
          setHasRemoteVideo(true);
          const streamToUse = remoteStream || new MediaStream([track]);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = streamToUse;
            remoteVideoRef.current.play().catch(() => {});
          }
        } else if (track.kind === "audio") {
          // Audio track (Mic voice or shared media sound)
          let audioEl = remoteAudiosRef.current[targetSocketId];
          if (!audioEl) {
            audioEl = new Audio();
            audioEl.autoplay = true;
            remoteAudiosRef.current[targetSocketId] = audioEl;
          }
          audioEl.srcObject = remoteStream || new MediaStream([track]);
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
          .catch((err) => console.error("[Party RTC] Offer creation error:", err));
      }

      return pc;
    },
    [socket]
  );

  // ─── 3. LOCAL AUDIO LEVEL ANALYZER (Glow Ring Detection) ───
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

        // Threshold for speaking glow ring
        setIsSpeakingLocal(avg > 18);
        animFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (e) {
      console.warn("[Party] Audio analyzer not available:", e);
    }
  };

  // ─── 4. INITIALIZE VOICE & JOIN ROOM ───
  useEffect(() => {
    if (!socket || !roomId) return;

    let localStream = null;

    const initVoiceAndJoin = async () => {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
        localStreamRef.current = localStream;
        setupAudioAnalyzer(localStream);
      } catch (err) {
        console.warn("[Party] Microphone access not granted, joining in listener mode.");
      }

      // Join party room on server
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

    // ─── SOCKET EVENT LISTENERS ───
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

      // Existing peers initiate WebRTC offer to the new joiner
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
      showToast("Host privileges updated 👑");
    };

    const handleWebRTCSignal = async ({ from, signal }) => {
      let pc = peersRef.current[from];
      if (!pc) {
        pc = createPeerConnection(from, false);
      }

      try {
        if (signal?.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

          // Drain any queued ICE candidates received before remoteDescription was set
          const candidateQueue = iceCandidateQueuesRef.current[from] || [];
          while (candidateQueue.length > 0) {
            const cand = candidateQueue.shift();
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (err) {
              console.warn("[Party RTC] Error adding queued candidate:", err);
            }
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
            // Buffer candidate until remote description is ready
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

    const handleMediaSync = ({ url, type, title, isStreaming }) => {
      if (url) setVideoId(url);
      if (type) setMediaMode(type);
      if (title) setMediaTitle(title);
      if (typeof isStreaming === "boolean") {
        setIsHostStreaming(isStreaming);
        if (!isStreaming) setHasRemoteVideo(false);
      }

      // Trigger live mascot to groove to the new sync!
      triggerPetState("TALK", 2500, "Vibing to the party! 🎶");
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

      // Leave room
      socket.emit("party:leave", { roomId });

      // Clean audio analyzer
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});

      // Clean WebRTC connections
      Object.values(peersRef.current).forEach((pc) => pc.close());
      peersRef.current = {};
      iceCandidateQueuesRef.current = {};

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (localMediaStreamRef.current) {
        localMediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [socket, roomId, myUserId, currentUser, createPeerConnection, triggerPetState]);

  // ─── 5. CONTROLS ───
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
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

  // ─── 6. YOUTUBE SYNC ───
  const handleSyncVideo = (e) => {
    e?.preventDefault();
    if (!videoInput.trim()) return;

    const cleanId = extractYoutubeId(videoInput.trim());
    setVideoId(cleanId);
    setMediaMode("youtube");
    setMediaTitle("YouTube Video");
    setIsHostStreaming(false);
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

  // ─── 7. ₹0 LOCAL VIDEO STREAMING (WebRTC captureStream) ───
  const handleLocalFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setLocalVideoUrl(localUrl);
    setMediaMode("local");
    setMediaTitle(file.name);
    setIsHostStreaming(true);

    // After video element mounts and plays, capture its live stream and broadcast to peers
    setTimeout(() => {
      const videoEl = localVideoRef.current;
      if (videoEl) {
        try {
          const stream = videoEl.captureStream
            ? videoEl.captureStream(30)
            : videoEl.mozCaptureStream
            ? videoEl.mozCaptureStream(30)
            : null;

          if (stream) {
            localMediaStreamRef.current = stream;
            broadcastMediaTracks(stream);
          }
        } catch (err) {
          console.warn("[Party] Local video captureStream error:", err);
        }
      }
    }, 400);

    socket?.emit("party:media-sync", {
      roomId,
      action: "play",
      currentTime: 0,
      url: file.name,
      type: "local",
      title: file.name,
      isStreaming: true,
    });

    showToast(`Streaming ${file.name} to peers 🍿`);
  };

  // ─── 8. ₹0 SCREEN / TAB SHARE (1080p 60fps Watch Together) ───
  const handleScreenShare = async () => {
    try {
      if (localMediaStreamRef.current && mediaMode === "screenshare") {
        // Stop screen share
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
        showToast("Screen share ended");
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: true,
      });

      localMediaStreamRef.current = stream;
      setMediaMode("screenshare");
      setMediaTitle("Screen / Tab Stream");
      setIsHostStreaming(true);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }

      broadcastMediaTracks(stream);

      // Handle user stopping screen share via browser stop button
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
        title: "Screen / Movie Share",
        isStreaming: true,
      });

      showToast("Sharing screen with party 🖥️");
    } catch (err) {
      console.warn("[Party] Screen share cancelled or not supported:", err);
    }
  };

  // ─── 9. REACTION BURSTS ───
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

  // ─── 10. COPY ROOM LINK OR CODE ───
  const copyRoomLink = () => {
    const url = `${window.location.origin}/party/${roomId}`;
    navigator.clipboard.writeText(url);
    showToast(`Room link copied! (#${roomId}) 🚀`);
  };

  // Identify remote peers (excluding me)
  const isMe = (p) => p.socketId === socket?.id || (myUserId && p.userId === myUserId);
  const remotePeers = participants.filter((p) => !isMe(p));
  const totalActivePeers = Math.max(participants.length, 1);

  return (
    <div className={styles.partyContainer}>
      {/* Ambient Neon Orbs */}
      <div className={styles.glowCyan} />
      <div className={styles.glowPurple} />

      {/* Transient Toast Feedback */}
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
        {/* 1. SYNCHRONIZED CINEMA STAGE */}
        <section className={styles.cinemaCard}>
          {isHostStreaming && (
            <div className={styles.streamBadge}>
              <Radio size={11} className={styles.liveDot} />
              <span>LIVE P2P STREAM</span>
            </div>
          )}

          <div className={styles.playerWrapper}>
            {mediaMode === "youtube" ? (
              <iframe
                key={videoId}
                className={styles.iframePlayer}
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`}
                title="ConnectX Watch Party Cinema"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : isHost ? (
              /* Host view of local file or screen share */
              <video
                ref={localVideoRef}
                className={styles.localVideo}
                src={mediaMode === "local" ? localVideoUrl : undefined}
                controls
                autoPlay
                playsInline
              />
            ) : hasRemoteVideo ? (
              /* Peer view of live P2P WebRTC stream */
              <video
                ref={remoteVideoRef}
                className={styles.localVideo}
                controls
                autoPlay
                playsInline
              />
            ) : (
              /* Peer waiting for host stream */
              <div className={styles.streamPlaceholder}>
                <Film size={36} color="#06b6d4" />
                <h3>Host is streaming "{mediaTitle}"</h3>
                <p>Receiving live WebRTC video feed from host...</p>
                <label className={styles.localUploadBtn}>
                  <span>Have this file? Load locally for HD</span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleLocalFileSelect}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Media Input & Sync Controls */}
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

              <label className={styles.localUploadBtn} title="Stream local movie/video via WebRTC (₹0)">
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

        {/* 2. SPATIAL VOICE STAGE (Dynamic Speaking Glow Rings) */}
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
      <footer className={styles.controlDock}>
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
