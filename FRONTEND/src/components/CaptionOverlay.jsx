import React, { useState, useEffect } from "react";

const CaptionsOverlay = ({ incomingCaptionPayload, bufferMs = 300 }) => {
  const [currentCaption, setCurrentCaption] = useState("");

  useEffect(() => {
    if (!incomingCaptionPayload) return;

    // Calculate time elapsed since the text was generated on the sender's side
    const timeElapsed = Date.now() - incomingCaptionPayload.timestamp;

    // Determine how long to wait before rendering to match the audio playback
    const renderDelay = Math.max(0, bufferMs - timeElapsed);

    const renderTimer = setTimeout(() => {
      setCurrentCaption(incomingCaptionPayload.text);
    }, renderDelay);

    // Clear caption after 4 seconds of silence
    const clearTimer = setTimeout(() => {
      setCurrentCaption("");
    }, renderDelay + 4000);

    return () => {
      clearTimeout(renderTimer);
      clearTimeout(clearTimer);
    };
  }, [incomingCaptionPayload, bufferMs]);

  if (!currentCaption) return null;

  return (
    <div className="absolute bottom-10 left-0 w-full flex justify-center pointer-events-none z-50">
      <div className="bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg max-w-[80%] text-center text-lg font-medium shadow-md transition-opacity duration-300">
        {currentCaption}
      </div>
    </div>
  );
};

export default CaptionsOverlay;
