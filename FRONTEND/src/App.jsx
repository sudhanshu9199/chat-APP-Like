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
      <div style={{ 
        height: "100vh", 
        width: "100vw", 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        backgroundColor: "#2579ff" // ConnectX theme color!
      }}>
        <video 
          src="/introVideo.mp4" 
          autoPlay 
          loop 
          muted 
          playsInline 
          style={{ width: "100%", height: "100%", objectFit: "cover" }} 
        />
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
