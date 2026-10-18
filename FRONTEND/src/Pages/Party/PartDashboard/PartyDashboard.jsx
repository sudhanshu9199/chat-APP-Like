import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./PartyDashboard.module.scss";
import { Sparkles, Users, Video, Mic, Flame, ArrowRight } from "lucide-react";

import { parsePartyRoomCode } from "../partyUtils";

// Curated active community lounges for 1-tap entry
const POPULAR_LOUNGES = [
  { id: "connectx-lounge", icon: "🎉", name: "ConnectX Main Lounge", desc: "The official hangout room" },
  { id: "lofi-chill", icon: "☕", name: "24/7 Lofi & Chill", desc: "Background study & work beats" },
  { id: "cyber-beats", icon: "⚡", name: "Cyberpunk Vibe Stage", desc: "High-energy watch & listen party" },
];

const PartyDashboard = () => {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState("");

  // Create an ephemeral room with a short aesthetic slug
  const handleQuickLaunch = () => {
    const adjectives = ["neon", "cyber", "chill", "lounge", "pulse", "echo", "astro"];
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNum = Math.floor(10 + Math.random() * 89);
    const generatedRoom = `${randomAdj}-${randomNum}`;
    navigate(`/party/${generatedRoom}`);
  };

  const handleJoinParty = (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    const clean = parsePartyRoomCode(joinCode);
    navigate(`/party/${clean}`);
  };

  return (
    <div className={styles.lobbyContainer}>
      {/* Ambient Radial Glow */}
      <div className={styles.glowTop} />

      {/* Hero Header */}
      <header className={styles.headerSection}>
        <div className={styles.heroIconWrapper}>
          🎉
        </div>
        <h1 className={styles.title}>Live Co-Experience</h1>
        <p className={styles.subtitle}>
          Drop in for group voice, watch YouTube or local movies in frame-accurate sync, and hang out with ₹0 lag.
        </p>
      </header>

      {/* 2026 Feature Highlights */}
      <section className={styles.featuresGrid}>
        <div className={styles.featureCard}>
          <span className={styles.featureIcon}>🎙️</span>
          <span className={styles.featureTitle}>Drop-In Voice</span>
          <span className={styles.featureDesc}>P2P WebRTC mesh with dynamic speaking rings.</span>
        </div>
        <div className={styles.featureCard}>
          <span className={styles.featureIcon}>🍿</span>
          <span className={styles.featureTitle}>Watch Together</span>
          <span className={styles.featureDesc}>Synchronized YouTube or local file streaming.</span>
        </div>
        <div className={styles.featureCard}>
          <span className={styles.featureIcon}>✨</span>
          <span className={styles.featureTitle}>Emoji Bursts</span>
          <span className={styles.featureDesc}>Floating glassmorphic reaction effects.</span>
        </div>
        <div className={styles.featureCard}>
          <span className={styles.featureIcon}>🐱</span>
          <span className={styles.featureTitle}>Mascot Co-Watch</span>
          <span className={styles.featureDesc}>Kawaii enamel cat vibes to music with you.</span>
        </div>
      </section>

      {/* Launch / Join Action Card */}
      <div className={styles.actionCard}>
        <button onClick={handleQuickLaunch} className={styles.createBtn}>
          <Sparkles size={16} />
          <span>Launch Instant Party Room 🚀</span>
        </button>

        <div className={styles.divider}>or join existing</div>

        <form onSubmit={handleJoinParty} className={styles.joinForm}>
          <input
            type="text"
            placeholder="Enter Room Code (e.g. lofi-chill)..."
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            className={styles.joinInput}
          />
          <button
            type="submit"
            disabled={!joinCode.trim()}
            className={styles.joinBtn}
          >
            Join
          </button>
        </form>
      </div>

      {/* Featured Community Lounges */}
      <section className={styles.featuredSection}>
        <h2 className={styles.sectionTitle}>Featured 2026 Lounges</h2>
        <div className={styles.loungeList}>
          {POPULAR_LOUNGES.map((lounge) => (
            <div
              key={lounge.id}
              onClick={() => navigate(`/party/${lounge.id}`)}
              className={styles.loungeCard}
            >
              <div className={styles.loungeLeft}>
                <span className={styles.loungeIcon}>{lounge.icon}</span>
                <div className={styles.loungeInfo}>
                  <span className={styles.loungeName}>{lounge.name}</span>
                  <span className={styles.loungeDesc}>{lounge.desc}</span>
                </div>
              </div>
              <span className={styles.loungeTag}>#{lounge.id}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default PartyDashboard;
