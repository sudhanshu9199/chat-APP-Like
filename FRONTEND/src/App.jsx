import { ToastContainer, toast } from "react-toastify";
import MainRoute from "./router/MainRoute";
import { useEffect, useState } from "react";

const App = () => {
  const [isLoading, setisLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setisLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);
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
        }}
        role="presentation"
        aria-hidden="true"
      >
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        >
          {/* Mobile viewport (portrait & smartphones) */}
          <source
            src="/introVideo-v2-2026-mobile.mp4"
            media="(max-width: 768px)"
            type="video/mp4"
          />
          {/* Large viewport (tablets, laptops, desktops) */}
          <source
            src="/introVideo-v2-2026-large.mp4"
            media="(min-width: 769px)"
            type="video/mp4"
          />
          {/* Universal fallback */}
          <source src="/introVideo-v2-2026-large.mp4" type="video/mp4" />
        </video>
      </div>
    );
  }
  return (
    <>
      <MainRoute />
      <ToastContainer />
    </>
  );
};

export default App;
