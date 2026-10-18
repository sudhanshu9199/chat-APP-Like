/**
 * ConnectX 2026 Party Feature Utilities
 * Handles robust room code parsing, YouTube ID extraction, and default media configurations
 */

export const DEFAULT_YOUTUBE_ID = "5qap5aO4i9A"; // Lofi Girl 24/7 Live Beats (Guaranteed active)

export const CURATED_STREAMS = [
  { label: "☕ 24/7 Lofi Beats", id: "5qap5aO4i9A" },
  { label: "🌌 Synthwave Chill", id: "4xDzrJKXOOY" },
  { label: "⚡ Cyberpunk 2026", id: "f3q8n0p7_zM" },
  { label: "🎵 Chill Study Beats", id: "M576WGiDBdQ" },
  { label: "🎸 Rick Astley (Classic)", id: "dQw4w9WgXcQ" },
];

/**
 * Extracts a clean, sanitized party room ID from ANY input:
 * - Full URL: "http://localhost:5173/party/lounge-39" -> "lounge-39"
 * - Mangled URL: "httplocalhost5173partylounge-39" -> "lounge-39"
 * - Hashtag: "#lounge-39" -> "lounge-39"
 * - Plain: "lounge-39" -> "lounge-39"
 * - Dirty with spaces: "  lounge-39  " -> "lounge-39"
 * - Query/Hash params: "http://localhost:5173/party/lounge-39?ref=123#xyz" -> "lounge-39"
 */
export const parsePartyRoomCode = (input) => {
  if (!input) return "connectx-lounge";
  let raw = String(input).trim();

  // Strip leading hashtags FIRST before splitting by #
  raw = raw.replace(/^#+/, "");

  // 1. If it's a URL containing /party/
  if (raw.includes("/party/")) {
    const parts = raw.split("/party/");
    raw = parts[parts.length - 1];
  }
  // 2. If it's a mangled URL string without slashes (e.g. httplocalhost5173partylounge-39)
  else if (raw.includes("party")) {
    const parts = raw.split("party");
    raw = parts[parts.length - 1].replace(/^[\/_-]+/, "");
  }

  // 3. Strip any query parameters or hashes
  raw = raw.split("?")[0].split("#")[0];

  // 4. Strip trailing slashes
  raw = raw.replace(/\/+$/, "");

  // 5. Keep only alphanumeric, hyphens, and underscores
  const clean = raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return clean || "connectx-lounge";
};

/**
 * Robust YouTube video ID extractor supporting all modern 2026 formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/live/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - Mobile m.youtube.com URLs
 * - URLs with timestamps (&t=45s) or tracking params (?si=...)
 * - Raw 11-char ID
 */
export const extractYoutubeId = (url) => {
  if (!url) return DEFAULT_YOUTUBE_ID;
  const str = String(url).trim();

  // Match 11-character YouTube video ID
  const match = str.match(
    /(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/|shorts\/|live\/|embed\/))([^"&?/\s]{11})/
  );
  if (match && match[1]) return match[1];

  // If already an 11-character video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
    return str;
  }

  return DEFAULT_YOUTUBE_ID;
};
