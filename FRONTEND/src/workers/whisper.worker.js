import { pipeline, env } from "@xenova/transformers";

// Disable local models, fetch from Hugging Face CDN
env.allowLocalModels = false;

let transcriber = null;

self.addEventListener("message", async (event) => {
  const { type, audioData } = event.data;

  if (type === "INIT") {
    // Load the whisper-tiny model (smallest footprint for client-side)
    transcriber = await pipeline(
      "automatic-speech-recognition",
      "Xenova/whisper-tiny.en",
    );
    self.postMessage({ status: "READY" });
  }

  if (type === "TRANSCRIBE" && transcriber) {
    try {
      // audioData must be a Float32Array sampled at 16kHz
      const result = await transcriber(audioData);
      self.postMessage({
        status: "SUCCESS",
        text: result.text,
        timestamp: Date.now(),
      });
    } catch (error) {
      self.postMessage({ status: "ERROR", error: error.message });
    }
  }
});
