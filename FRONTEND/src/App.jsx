import { ToastContainer } from "react-toastify";
import MainRoute from "./router/MainRoute";
import { useEffect, useState, useRef, useCallback } from "react";
import CompanionPet from "./components/CompanionPet/CompanionPet";

// ImageKit Cloud Video CDN URLs (Ultra-fast edge delivery)
const IK_MOBILE_VIDEO = "https://ik.imagekit.io/5gfqhv4e8/introVideo-v2-2026-mobile.mp4";
const IK_LARGE_VIDEO = "https://ik.imagekit.io/5gfqhv4e8/introVideo-v2-2026-large.mp4";

// Local asset fallbacks (Offline / network drop protection)
const LOCAL_MOBILE_VIDEO = "/introVideo-v2-2026-mobile.mp4";
const LOCAL_LARGE_VIDEO = "/introVideo-v2-2026-large.mp4";

const isLegalRoute = typeof window !== "undefined" && 
  (window.location.pathname.startsWith("/privacy") || window.location.pathname.startsWith("/terms"));

const App = () => {
  const [isLoading, setIsLoading] = useState(!isLegalRoute);
  const [isVideoVisible, setIsVideoVisible] = useState(false);
  const videoRef = useRef(null);
  const playTimerRef = useRef(null);
  const hasDismissedRef = useRef(isLegalRoute);

  // Detect viewport dynamically (Mobile ratio <= 768px, Large screen > 768px)
  const isMobile = typeof window !== "undefined" ? window.innerWidth <= 768 : false;
  const targetCloudSrc = isMobile ? IK_MOBILE_VIDEO : IK_LARGE_VIDEO;
  const targetLocalSrc = isMobile ? LOCAL_MOBILE_VIDEO : LOCAL_LARGE_VIDEO;

  const [videoSrc, setVideoSrc] = useState(targetCloudSrc);

  // Safe dismiss callback (ensures splash dismisses cleanly once)
  const dismissSplash = useCallback(() => {
    if (hasDismissedRef.current) return;
    hasDismissedRef.current = true;
    setIsLoading(false);
  }, []);

  // When video starts actively rendering frames on screen
  const handlePlaying = useCallback(() => {
    setIsVideoVisible(true);
    // Allow the video intro to show for 2.6s of active playback before smooth exit
    if (!playTimerRef.current) {
      playTimerRef.current = setTimeout(() => {
        dismissSplash();
      }, 2600);
    }
  }, [dismissSplash]);

  // Graceful fallback to local asset if Cloud CDN encounters any network/offline block
  const handleVideoError = useCallback(() => {
    console.warn("[ConnectX Splash] Cloud CDN fetch failed, switching to local asset.");
    if (videoSrc !== targetLocalSrc) {
      setVideoSrc(targetLocalSrc);
      if (videoRef.current) {
        videoRef.current.load();
        videoRef.current.play().catch(() => {});
      }
    } else {
      dismissSplash();
    }
  }, [videoSrc, targetLocalSrc, dismissSplash]);

  useEffect(() => {
    // 1. Explicitly ensure DOM property video.muted = true (fixes React muted attribute autoplay bug)
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.defaultMuted = true;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("[ConnectX Splash] Autoplay waiting:", err);
        });
      }
    }

    // 2. Absolute safety guard: never lock the user on splash for more than 3.5s total
    const safetyTimer = setTimeout(() => {
      dismissSplash();
    }, 3500);

    return () => {
      clearTimeout(safetyTimer);
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
    };
  }, [dismissSplash]);

  if (isLoading) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          height: "100dvh",
          width: "100vw",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#2579ff", // ConnectX brand theme color
          overflow: "hidden",
          zIndex: 99999,
          transition: "opacity 0.3s ease",
        }}
        role="presentation"
        aria-hidden="true"
      >
        <video
          ref={videoRef}
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onPlaying={handlePlaying}
          onLoadedData={() => setIsVideoVisible(true)}
          onError={handleVideoError}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: isVideoVisible ? 1 : 0.85,
            transition: "opacity 0.2s ease-in",
          }}
        >
          <source src={videoSrc} type="video/mp4" />
          <source src={targetLocalSrc} type="video/mp4" />
        </video>
      </div>
    );
  }
  return (
    <>
      <MainRoute />
      <CompanionPet />
      <ToastContainer />
    </>
  );
};

export default App;
