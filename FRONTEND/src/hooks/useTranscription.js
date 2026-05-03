import { useState, useEffect, useRef, useCallback } from "react";

export const useTranscription = (onLocalTranscription) => {
  const [isSupported, setIsSupported] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const workerRef = useRef(null);

  const onLocalTranscriptionRef = useRef(onLocalTranscription);
  useEffect(() => {
    onLocalTranscriptionRef.current = onLocalTranscription;
  }, [onLocalTranscription]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }

      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const startTranscription = useCallback(async () => {
    if (isListening) return; // Prevent double-start

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      // Lazy-initialize the recognition instance
      if (!recognitionRef.current) {
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
            onLocalTranscriptionRef.current({
              id: crypto.randomUUID(),
              text: finalTranscript.trim(),
              timestamp: Date.now(),
            });
          }
        };

        // ✅ Permission denied / device errors handled explicitly
        recognition.onerror = (event) => {
          console.error("Speech recognition error:", event.error);
          if (event.error === "not-allowed") {
            setIsListening(false);
            alert(
              "Microphone access was denied. Please allow microphone permissions and try again.",
            );
          } else if (event.error === "no-speech") {
            // Non-fatal — recognition keeps running; optionally surface in UI
            console.warn("No speech detected.");
          } else {
            setIsListening(false);
          }
        };

        recognition.onend = () => {
          if (recognitionRef.current && isListening) {
            try {
              recognitionRef.current.start();
            } catch (_) {
              setIsListening(false);
            }
          }
        };

        recognitionRef.current = recognition;
      }

      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Failed to start recognition:", err);
      }
    } else {
      setIsSupported(false);

      if (!workerRef.current) {
        workerRef.current = new Worker(
          new URL("../workers/whisper.worker.js", import.meta.url),
          { type: "module" },
        );

        workerRef.current.postMessage({ type: "INIT" });

        workerRef.current.onmessage = (e) => {
          if (e.data.status === "SUCCESS") {
            onLocalTranscriptionRef.current({
              id: crypto.randomUUID(),
              text: e.data.text.trim(),
              timestamp: e.data.timestamp,
            });
          }
        };

        workerRef.current.onerror = (err) => {
          console.error("Whisper worker error:", err);
          setIsListening(false);
        };
      }

      setIsListening(true);
      console.warn(
        "Native Speech API unavailable. Route MediaStream to Whisper worker.",
      );
    }
  }, [isListening]);

  const stopTranscription = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    // Worker keeps running but won't receive audio until you push data to it
    setIsListening(false);
  }, []);

  return {
    startTranscription,
    stopTranscription,
    isSupported,
    isListening,
  };
};
