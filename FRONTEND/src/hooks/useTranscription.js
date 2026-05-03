import { useState, useEffect, useRef, useCallback } from "react";

export const useTranscription = (onLocalTranscription) => {
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef(null);
  const workerRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          const payload = {
            id: crypto.randomUUID(),
            text: finalTranscript.trim(),
            timestamp: Date.now(),
          };
          onLocalTranscription(payload);
        }
      };

      recognitionRef.current = recognition;
    } else {
      // Initialize WASM Fallback
      setIsSupported(false);
      workerRef.current = new Worker(
        new URL("../workers/whisper.worker.js", import.meta.url),
        {
          type: "module",
        },
      );

      workerRef.current.postMessage({ type: "INIT" });
      workerRef.current.onmessage = (e) => {
        if (e.data.status === "SUCCESS") {
          onLocalTranscription({
            id: crypto.randomUUID(),
            text: e.data.text.trim(),
            timestamp: e.data.timestamp,
          });
        }
      };
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (workerRef.current) workerRef.current.terminate();
    };
  }, [onLocalTranscription]);

  const startTranscription = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
    } else {
      // Implementation note: You will need to hook up an AudioContext
      // here to extract a Float32Array from the user's MediaStream
      // and post it to workerRef.current.postMessage({ type: 'TRANSCRIBE', audioData })
      console.warn("Native API missing. Route MediaStream to Web Worker.");
    }
  }, []);

  const stopTranscription = useCallback(() => {
    if (recognitionRef.current) recognitionRef.current.stop();
  }, []);

  return { startTranscription, stopTranscription, isSupported };
};
