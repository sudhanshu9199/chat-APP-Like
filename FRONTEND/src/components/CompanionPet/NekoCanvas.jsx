import { useEffect, useRef, useState, useCallback } from "react";
import { useCompanionPet, CAT_COATS } from "./CompanionContext";

/**
 * 🐾 Living Enamel Cat Companion Engine (2026 SaaS Ambient Mascot)
 * Pixel-faithful recreation of the 3 Enamel Pin Kawaii Cats:
 * 1. "Vanilla Cream" (Left Pin) — Trotting with stubby legs & pink toe beans
 * 2. "Ginger Tabby" (Middle Pin) — High-energy leaping/running with outstretched paws
 * 3. "Sleepy Slate" (Right Pin) — Curled crescent ball with embossed silver zZz
 *
 * Smooth In-Between State Machine:
 * - Continuous transition blend weights (sleepFactor, jumpFactor, runFactor)
 * - Zero graphical jerking or popping between idle, walk, run, jump, and sleep
 * - Anticipation crouch before jump, mid-air outstretched paws, springy landing dampening
 * - Seamless curling-up and uncurling animations for sleep cycle
 * - NO labels or text bubbles during sleep, jump, or run (pure visual floating zZz & physics)
 * - Real-time eye gaze tracking toward cursor with specular reflections
 */

const NekoCanvas = () => {
  const canvasRef = useRef(null);
  const hitboxRef = useRef(null);
  const {
    petState,
    setPetState,
    petMessage,
    coatColor,
    setCoatColor,
    cycleCoatColor,
  } = useCompanionPet();

  // Floating mascot mini-control HUD visibility
  const [showHud, setShowHud] = useState(false);
  const [speechBubble, setSpeechBubble] = useState(null);

  // Position, physics, and state refs (run at 60 FPS without React re-render overhead)
  const posRef = useRef({
    x: Math.min(window.innerWidth - 130, Math.max(40, window.innerWidth * 0.15)),
    y: window.innerHeight - 140,
    targetX: Math.min(window.innerWidth - 130, Math.max(40, window.innerWidth * 0.15)),
    targetY: window.innerHeight - 140,
    vx: 0,
    vy: 0,
    direction: 1, // 1 = facing right, -1 = facing left
    isDragging: false,
    dragOffsetX: 0,
    dragOffsetY: 0,

    // Smooth In-Between Transition Weights (0.0 to 1.0)
    sleepWeight: 0,   // 0 = awake/standing, 1 = curled sleeping
    jumpWeight: 0,    // 0 = on ground, 1 = peak flight extension
    runWeight: 0,     // 0 = walk/idle, 1 = full run stride
    currentTilt: 0,   // Dynamic body rotation angle
    springScaleX: 1,
    springScaleY: 1,
    springVelY: 0,

    // Walk & Run Kinematics
    walkFrame: 0,
    walkPhase: 0,
    lastStepTime: 0,
    stepIntervalMs: 110,

    // Jumping Timeline Kinematics
    jumpProgress: 0,
    jumpStartX: 0,
    jumpStartY: 0,
    jumpApexHeight: 46,

    // Talking Kinematics
    talkCycle: 0,
    talkMouthOpen: 0,

    // Autonomous Life
    blinkTimer: 0,
    isBlinking: false,
    breathTimer: 0,
    cursorX: window.innerWidth / 2,
    cursorY: window.innerHeight / 2,
    idleTimer: 0,

    // Particle Systems (Floating Enamel zZz, Hearts, Dust)
    floatingZzz: [],
    patHearts: [],
    runPuffs: [],
  });

  // Sync speech bubble from context only for legitimate messages (not state change labels)
  useEffect(() => {
    if (petMessage && petState === "TALK") {
      setSpeechBubble(petMessage);
      posRef.current.idleTimer = 0;
    } else if (!petMessage || petState !== "TALK") {
      setSpeechBubble(null);
    }
  }, [petMessage, petState]);

  // Track cursor coordinates globally for real-time gaze tracking
  useEffect(() => {
    const handleMouseMove = (e) => {
      posRef.current.cursorX = e.clientX;
      posRef.current.cursorY = e.clientY;
      posRef.current.idleTimer = 0;
      if (petState === "SLEEP") {
        setPetState("IDLE");
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches[0]) {
        posRef.current.cursorX = e.touches[0].clientX;
        posRef.current.cursorY = e.touches[0].clientY;
        posRef.current.idleTimer = 0;
        if (petState === "SLEEP") {
          setPetState("IDLE");
        }
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [petState, setPetState]);

  // Snap target ground to UI anchors (e.g. Chat Input Bar or Bottom Nav Dock)
  const updateAnchorGround = useCallback(() => {
    if (posRef.current.isDragging) return;

    // 1. ChatRoom Input Bar
    const chatInput = document.getElementById("chat-input-pill");
    if (chatInput) {
      const rect = chatInput.getBoundingClientRect();
      posRef.current.targetY = rect.top - 54;
      const minX = rect.left + 16;
      const maxX = rect.right - 80;
      if (posRef.current.targetX < minX || posRef.current.targetX > maxX) {
        posRef.current.targetX = Math.max(minX, Math.min(maxX, rect.left + 60));
      }
      return;
    }

    // 2. Bottom Nav Dock
    const navDock = document.querySelector('nav[aria-label="Primary Navigation"]');
    if (navDock) {
      const rect = navDock.getBoundingClientRect();
      posRef.current.targetY = rect.top - 54;
      const minX = Math.max(16, rect.left + 12);
      const maxX = Math.min(window.innerWidth - 80, rect.right - 75);
      if (posRef.current.targetX < minX || posRef.current.targetX > maxX) {
        posRef.current.targetX = Math.max(minX, Math.min(maxX, rect.left + 40));
      }
      return;
    }

    // 3. Viewport Bottom Ground
    posRef.current.targetY = window.innerHeight - 90;
  }, []);

  // Autonomous wandering, pouncing, sleeping & talking behaviors
  useEffect(() => {
    const anchorInterval = setInterval(updateAnchorGround, 600);

    const behaviorInterval = setInterval(() => {
      const p = posRef.current;
      if (p.isDragging) return;

      p.idleTimer += 1;

      // After 14s of inactivity, smoothly curl up to sleep (no text label!)
      if (p.idleTimer > 14 && petState === "IDLE") {
        setPetState("SLEEP");
        return;
      }

      // Random spontaneous actions when idle
      if (petState === "IDLE") {
        const roll = Math.random();

        // 35% Chance: Walk, Run, or Pounce to a new spot
        if (roll < 0.35) {
          const chatInput = document.getElementById("chat-input-pill");
          const navDock = document.querySelector('nav[aria-label="Primary Navigation"]');
          let minX = 24;
          let maxX = window.innerWidth - 90;

          if (chatInput) {
            const rect = chatInput.getBoundingClientRect();
            minX = rect.left + 10;
            maxX = rect.right - 75;
          } else if (navDock) {
            const rect = navDock.getBoundingClientRect();
            minX = rect.left + 10;
            maxX = rect.right - 75;
          }

          const moveDistance = (Math.random() - 0.5) * 220;
          p.targetX = Math.max(minX, Math.min(maxX, p.x + moveDistance));

          const dist = Math.abs(p.targetX - p.x);
          if (dist > 110) {
            // Far distance: Pounce / Jump like Middle Pin!
            p.jumpStartX = p.x;
            p.jumpStartY = p.y;
            p.jumpProgress = 0;
            p.direction = p.targetX > p.x ? 1 : -1;
            setPetState("JUMP");
          } else if (dist > 60) {
            // Medium distance: Run / Sprint!
            p.direction = p.targetX > p.x ? 1 : -1;
            setPetState("RUN");
          } else {
            // Short distance: Cute Trot Walk!
            p.direction = p.targetX > p.x ? 1 : -1;
            setPetState("WALK");
          }
        }
        // 10% Chance: Friendly Meow (with speech bubble only during meow)
        else if (roll < 0.45) {
          const meows = [
            "Meow! 🐾",
            "Purrr... ✨",
            "ConnectX is fast!",
            "I'm on duty! 🐱",
          ];
          const pick = meows[Math.floor(Math.random() * meows.length)];
          setPetState("TALK");
          setSpeechBubble(pick);
          setTimeout(() => {
            setPetState("IDLE");
            setSpeechBubble(null);
          }, 2400);
        }
      }
    }, 3600);

    return () => {
      clearInterval(anchorInterval);
      clearInterval(behaviorInterval);
    };
  }, [petState, setPetState, updateAnchorGround]);

  // Main 60FPS Canvas Kinematics and Enamel Pin Vector Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let animationFrameId;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
      updateAnchorGround();
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    let nextBlinkTime = performance.now() + 2000;

    const renderLoop = (time) => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const p = posRef.current;
      const coat = CAT_COATS[coatColor] || CAT_COATS.cream;

      // ─── 1. BUTTERY-SMOOTH IN-BETWEEN TRANSITIONS ───

      // A. Sleep Weight Transition (0 = awake, 1 = sleeping curled ball)
      const targetSleep = petState === "SLEEP" ? 1.0 : 0.0;
      p.sleepWeight += (targetSleep - p.sleepWeight) * 0.075;

      // B. Run Weight Transition (0 = walk/idle, 1 = full run)
      const targetRun = petState === "RUN" ? 1.0 : 0.0;
      p.runWeight += (targetRun - p.runWeight) * 0.12;

      // C. Spring physics dampening for landing and impact
      p.springVelY += (1.0 - p.springScaleY) * 0.22;
      p.springVelY *= 0.72;
      p.springScaleY += p.springVelY;
      p.springScaleX = 1.0 + (1.0 - p.springScaleY) * 0.65;

      // Sync DOM Hitbox directly via transform (Zero Lag!)
      if (hitboxRef.current) {
        hitboxRef.current.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
      }

      // Smooth vertical ground snapping (unless jumping or dragging)
      if (!p.isDragging && petState !== "JUMP") {
        p.y += (p.targetY - p.y) * 0.18;
      }

      // WALK CYCLE (Discrete Root-Motion Footstep Synchronization)
      if (petState === "WALK" && !p.isDragging) {
        const dx = p.targetX - p.x;
        const dist = Math.abs(dx);

        if (dist > 3) {
          p.direction = dx > 0 ? 1 : -1;
          p.stepIntervalMs = 110;

          if (time - p.lastStepTime > p.stepIntervalMs) {
            p.lastStepTime = time;
            p.walkFrame = (p.walkFrame + 1) % 4;
            p.walkPhase += 0.35;

            // Frames 1 and 3 push off and translate X (Zero Foot Sliding!)
            if (p.walkFrame === 1 || p.walkFrame === 3) {
              const stepAdvance = Math.min(dist, 5.2);
              p.x += stepAdvance * p.direction;
            }
          }
        } else {
          p.walkFrame = 0;
          setPetState("IDLE");
        }
      }

      // RUN CYCLE (Energetic Smooth Sprint with Dust Puffs)
      if (petState === "RUN" && !p.isDragging) {
        const dx = p.targetX - p.x;
        const dist = Math.abs(dx);

        if (dist > 4) {
          p.direction = dx > 0 ? 1 : -1;
          p.stepIntervalMs = 52;

          if (time - p.lastStepTime > p.stepIntervalMs) {
            p.lastStepTime = time;
            p.walkFrame = (p.walkFrame + 1) % 4;
            p.walkPhase += 0.55;

            // Fast smooth push-off
            const runAdvance = Math.min(dist, 8.8);
            p.x += runAdvance * p.direction;

            if (Math.random() < 0.35) {
              p.runPuffs.push({
                x: p.x + (p.direction === 1 ? 8 : 64),
                y: p.y + 45,
                r: 2.5 + Math.random() * 3,
                alpha: 0.55,
              });
            }
          }
        } else {
          p.walkFrame = 0;
          setPetState("IDLE");
        }
      }

      // JUMP / POUNCE TIMELINE KINEMATICS (3-Phase Smooth Arc)
      let targetTilt = 0;
      if (petState === "JUMP" && !p.isDragging) {
        p.jumpProgress += 0.032;
        const t = Math.min(1.0, p.jumpProgress);

        // Phase 1: Anticipation Crouch (t = 0.0 to 0.18)
        if (t < 0.18) {
          const u = t / 0.18;
          const crouch = Math.sin(u * Math.PI);
          p.springScaleY = 1.0 - 0.22 * crouch;
          p.springScaleX = 1.0 + 0.16 * crouch;
          p.jumpWeight = 0;
          targetTilt = 0.08 * crouch;
        }
        // Phase 2: Parabolic Flight (t = 0.18 to 0.84)
        else if (t < 0.84) {
          const u = (t - 0.18) / 0.66;
          // Smoothstep horizontal X
          const smoothX = u * u * (3 - 2 * u);
          p.x = p.jumpStartX + (p.targetX - p.jumpStartX) * smoothX;

          // Parabolic Y trajectory
          const arc = Math.sin(u * Math.PI);
          p.y = p.jumpStartY - arc * p.jumpApexHeight;

          // Flight extension and tilt
          p.jumpWeight = arc;
          p.springScaleY = 0.92;
          p.springScaleX = 1.15;
          targetTilt = -0.32 * arc;
        }
        // Phase 3: Landing Dampening & Settle (t = 0.84 to 1.0)
        else {
          const u = (t - 0.84) / 0.16;
          p.x = p.targetX;
          p.y = p.targetY;
          p.jumpWeight = 1.0 - u;
          targetTilt = 0;

          if (t >= 0.98) {
            p.springScaleY = 0.84; // Trigger impact squash
            p.springVelY = 0.14;
            p.jumpProgress = 0;
            p.jumpWeight = 0;
            setPetState("IDLE");
          }
        }
      } else {
        p.jumpWeight += (0 - p.jumpWeight) * 0.12;
      }

      // Smooth tilt blending
      if (petState === "RUN") {
        targetTilt = -0.15;
      }
      p.currentTilt += (targetTilt - p.currentTilt) * 0.14;

      // Breathing rhythm
      p.breathTimer += 0.04;
      const breath =
        (petState === "IDLE" || petState === "SLEEP")
          ? Math.sin(p.breathTimer) * 1.2 * (1 - p.jumpWeight)
          : 0;

      // Natural Blinking
      if (time > nextBlinkTime && petState !== "SLEEP") {
        p.isBlinking = true;
        setTimeout(() => {
          p.isBlinking = false;
        }, 130);
        nextBlinkTime = time + 2500 + Math.random() * 3000;
      }

      // Talking mouth oscillation (:3 -> :O -> :3)
      if (petState === "TALK") {
        p.talkCycle += 0.18;
        p.talkMouthOpen = (Math.sin(p.talkCycle) + 1) / 2;
      } else {
        p.talkMouthOpen = 0;
      }

      // Screen boundary safety clamping
      p.x = Math.max(12, Math.min(window.innerWidth - 85, p.x));
      p.y = Math.max(12, Math.min(window.innerHeight - 75, p.y));

      // ─── 2. PROCEDURAL ENAMEL PIN CAT RENDERING ───

      // A. Ambient Soft Ground Shadow
      ctx.save();
      ctx.beginPath();
      const shadowW =
        p.sleepWeight > 0.5 ? 32 : p.jumpWeight > 0.2 ? 22 : 28;
      const shadowH = p.jumpWeight > 0.2 ? 4.5 : 7;
      const shadowAlpha =
        p.jumpWeight > 0.1
          ? Math.max(0.08, 0.22 - (p.targetY - p.y) * 0.002)
          : 0.22;
      ctx.ellipse(
        p.x + 36,
        p.targetY + 48,
        shadowW,
        shadowH,
        0,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
      ctx.filter = "blur(4px)";
      ctx.fill();
      ctx.restore();

      // Transform coordinate space for facing, squash/stretch & in-between tilt
      ctx.save();
      ctx.translate(p.x + 36, p.y + 28 + breath + p.sleepWeight * 6);
      if (p.direction === -1) {
        ctx.scale(-1, 1);
      }
      ctx.rotate(p.currentTilt);
      ctx.scale(p.springScaleX, p.springScaleY);
      ctx.translate(-36, -28);

      // Helper: Metallic Enamel Stroke Drawer (Polished Beveled Metal)
      const applyEnamelRim = (lineWidth = 3.2) => {
        ctx.strokeStyle = coat.metal.rim;
        ctx.lineWidth = lineWidth;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.stroke();
      };

      // ─────────────────────────────────────────────────────────────
      // SMOOTH BLENDING: SLEEPING CRESCENT vs STANDING/LEAPING
      // When sleepWeight > 0.01, we smoothly morph into the sleeping ball!
      // ─────────────────────────────────────────────────────────────

      if (p.sleepWeight > 0.02) {
        ctx.save();
        ctx.globalAlpha = Math.min(1.0, p.sleepWeight * 1.5);

        // 1. Curled Outer Crescent Body (Right Pin)
        ctx.beginPath();
        ctx.ellipse(36, 32, 28, 22, 0.05, 0, Math.PI * 2);
        ctx.fillStyle = coat.body;
        ctx.fill();
        applyEnamelRim(3.2);

        // 2. Translucent Enamel Gloss Glint (Highlight on upper spine)
        ctx.beginPath();
        ctx.ellipse(34, 18, 16, 4, -0.22, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.42)";
        ctx.fill();

        // 3. Tail tightly curled along outer contour
        ctx.beginPath();
        ctx.arc(38, 32, 23, 0.25, Math.PI * 0.98);
        ctx.strokeStyle = coat.metal.rim;
        ctx.lineWidth = 3.6;
        ctx.lineCap = "round";
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(38, 32, 23, 0.25, Math.PI * 0.98);
        ctx.strokeStyle = coat.highlight;
        ctx.lineWidth = 2.0;
        ctx.stroke();

        // 4. Nestled Sleeping Head
        ctx.beginPath();
        ctx.ellipse(23, 28, 15, 13.5, 0.12, 0, Math.PI * 2);
        ctx.fillStyle = coat.body;
        ctx.fill();
        applyEnamelRim(3.0);

        // 5. Left Ear
        ctx.beginPath();
        ctx.moveTo(12, 22);
        ctx.quadraticCurveTo(8, 15, 7, 10);
        ctx.quadraticCurveTo(10, 8, 14, 11);
        ctx.lineTo(21, 16);
        ctx.closePath();
        ctx.fillStyle = coat.body;
        ctx.fill();
        applyEnamelRim(2.5);

        // Inner Pink Left Ear
        ctx.beginPath();
        ctx.moveTo(12, 20);
        ctx.lineTo(9, 13);
        ctx.lineTo(17, 15);
        ctx.closePath();
        ctx.fillStyle = coat.ears;
        ctx.fill();

        // 6. Right Ear
        ctx.beginPath();
        ctx.moveTo(27, 16);
        ctx.quadraticCurveTo(31, 10, 34, 7);
        ctx.quadraticCurveTo(37, 9, 36, 14);
        ctx.lineTo(37, 21);
        ctx.closePath();
        ctx.fillStyle = coat.body;
        ctx.fill();
        applyEnamelRim(2.5);

        // Inner Pink Right Ear
        ctx.beginPath();
        ctx.moveTo(29, 17);
        ctx.lineTo(33, 11);
        ctx.lineTo(35, 19);
        ctx.closePath();
        ctx.fillStyle = coat.ears;
        ctx.fill();

        // 7. Peaceful Sleeping Eyes (Two sweet downward curves: ᴗ  ᴗ)
        ctx.beginPath();
        ctx.arc(16.5, 27.5, 3.2, 0.15, Math.PI - 0.15);
        ctx.strokeStyle = coat.metal.rim;
        ctx.lineWidth = 2.2;
        ctx.lineCap = "round";
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(27.5, 27.5, 3.2, 0.15, Math.PI - 0.15);
        ctx.strokeStyle = coat.metal.rim;
        ctx.lineWidth = 2.2;
        ctx.lineCap = "round";
        ctx.stroke();

        // 8. Whiskers (Metallic tabs on the cheek)
        ctx.beginPath();
        ctx.moveTo(10, 27);
        ctx.lineTo(3, 26);
        ctx.moveTo(10, 30);
        ctx.lineTo(3, 31.5);
        ctx.strokeStyle = coat.metal.rim;
        ctx.lineWidth = 2.0;
        ctx.lineCap = "round";
        ctx.stroke();

        // 9. Cute Nose
        ctx.beginPath();
        ctx.arc(22, 29.5, 1.3, 0, Math.PI * 2);
        ctx.fillStyle = coat.ears;
        ctx.fill();

        // 10. Tucked Paws under chin
        ctx.beginPath();
        ctx.ellipse(21, 38, 7.5, 5, 0.1, 0, Math.PI * 2);
        ctx.fillStyle = coat.belly;
        ctx.fill();
        applyEnamelRim(2.2);

        ctx.restore();

        // Floating Silver / Gold Embossed z Z Z Particles (Only when deeply asleep)
        if (p.sleepWeight > 0.85 && Math.random() < 0.04) {
          p.floatingZzz.push({
            x: p.x + 38 + (Math.random() - 0.5) * 12,
            y: p.y + 8,
            size: 10 + Math.random() * 4,
            alpha: 1.0,
            text: Math.random() > 0.45 ? "z" : "Z",
          });
        }
      }

      // ─────────────────────────────────────────────────────────────
      // STANDING / TROTTING / LEAPING / RUNNING ACTIVE POSE
      // Fades out smoothly as sleepWeight reaches 1.0
      // ─────────────────────────────────────────────────────────────
      if (p.sleepWeight < 0.98) {
        ctx.save();
        ctx.globalAlpha = Math.max(0.0, 1.0 - p.sleepWeight * 1.3);

        const jw = p.jumpWeight; // 0 = standing, 1 = peak leap (Middle Pin)
        const rw = p.runWeight;  // 0 = walk/idle, 1 = run

        // 1. Fluid Tail (Interpolates between upright "J" and leaping arch)
        ctx.save();
        ctx.beginPath();
        const tailWalkWave = Math.sin(time * 0.007) * 4;
        const tailRunWave = Math.sin(time * 0.016) * 6;
        const activeTailWave = tailWalkWave * (1 - rw) + tailRunWave * rw;

        // Start at hip
        const tailStartX = 13 * (1 - jw) + 8 * jw;
        const tailStartY = 30 * (1 - jw) + 26 * jw;

        // Arch upward
        ctx.moveTo(tailStartX, tailStartY);
        if (jw > 0.3) {
          // Dynamic Leaping Tail (Middle Pin)
          ctx.quadraticCurveTo(
            -4 + activeTailWave,
            12,
            2 + activeTailWave,
            2
          );
          ctx.quadraticCurveTo(8 + activeTailWave, -4, 13, 2);
          ctx.quadraticCurveTo(12, 14, 16, 28);
        } else {
          // Graceful Trotting "J" Tail (Left Pin)
          const tipSway = Math.sin(time * 0.007 - 0.4) * 7;
          ctx.quadraticCurveTo(4 + activeTailWave, 22, 6 + tipSway, 8);
          ctx.quadraticCurveTo(10 + tipSway, 2, 15 + tipSway, 8);
          ctx.quadraticCurveTo(12 + activeTailWave, 22, 19, 33);
        }
        ctx.closePath();
        ctx.fillStyle = coat.body;
        ctx.fill();
        applyEnamelRim(3.0);

        // Tail tip highlight / band
        ctx.beginPath();
        ctx.arc(
          jw > 0.3 ? 7 + activeTailWave : 10.5,
          jw > 0.3 ? 1 : 7,
          jw > 0.3 ? 4.5 : 3.5,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = coat.belly;
        ctx.fill();
        ctx.restore();

        // 2. Trailing Back Legs
        // During jump: stretch backward (-0.45 rad). During walk: vertical steps
        const rearWalkY =
          petState === "WALK" ? (p.walkFrame === 2 ? -3.5 : 0) : 0;
        const rearRunY =
          petState === "RUN" ? (p.walkFrame === 2 ? -5.5 : 0) : 0;
        const legWalkActiveY = rearWalkY * (1 - rw) + rearRunY * rw;

        if (jw > 0.25) {
          // Trailing Rear Leg in Flight (Middle Pin)
          ctx.beginPath();
          ctx.ellipse(12, 38, 6.5, 11, -0.45 * jw, 0, Math.PI * 2);
          ctx.fillStyle = coat.body;
          ctx.fill();
          applyEnamelRim(2.5);

          // White rear sock
          ctx.beginPath();
          ctx.ellipse(9.5, 45, 5, 4.5, -0.3, 0, Math.PI * 2);
          ctx.fillStyle = coat.belly;
          ctx.fill();
          applyEnamelRim(2.0);
        } else {
          // Ground Rear Legs (Left Pin)
          ctx.beginPath();
          ctx.roundRect(
            14,
            32 + legWalkActiveY,
            8.5,
            15 * (1 - p.sleepWeight),
            [3, 3, 6, 6]
          );
          ctx.fillStyle = coat.body;
          ctx.fill();
          applyEnamelRim(2.4);

          const rearFrontStep =
            petState === "WALK" ? (p.walkFrame === 3 ? -4.0 : 0) : 0;
          ctx.beginPath();
          ctx.roundRect(
            20,
            34 + rearFrontStep,
            9.5,
            15 * (1 - p.sleepWeight),
            [3, 3, 7, 7]
          );
          ctx.fillStyle = coat.body;
          ctx.fill();
          applyEnamelRim(2.6);
        }

        // 3. Torso (Interpolates between Chubby Standing Oval & Leaping Aerodynamic Torso)
        const torsoRX = 21 * (1 - jw) + 23 * jw;
        const torsoRY = 16.5 * (1 - jw) + 14 * jw;
        const torsoRot = 0.06 * (1 - jw) + 0.2 * jw;

        ctx.beginPath();
        ctx.ellipse(32.5, 27.5, torsoRX, torsoRY, torsoRot, 0, Math.PI * 2);
        ctx.fillStyle = coat.body;
        ctx.fill();
        applyEnamelRim(3.3);

        // Specular Enamel Highlight on Spine
        ctx.beginPath();
        ctx.ellipse(28, 17.5, 12, 3.5, torsoRot - 0.25, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.42)";
        ctx.fill();

        // Underbelly & Chest
        ctx.beginPath();
        ctx.ellipse(35.5, 32.5, 15, 8, torsoRot, 0, Math.PI);
        ctx.fillStyle = coat.belly;
        ctx.fill();
        if (coat.metal) {
          ctx.strokeStyle = coat.metal.rim;
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }

        // 4. Front Legs
        if (jw > 0.25) {
          // Outstretched Front Paws with Pink Toe Beans! (Middle Pin)
          const drawOutstretchedPaw = (pawX, pawY) => {
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(pawX, pawY, 7.2, 9.5, 0.85, 0, Math.PI * 2);
            ctx.fillStyle = coat.belly;
            ctx.fill();
            applyEnamelRim(2.4);

            // Pink Palm Bean Pad
            ctx.beginPath();
            ctx.ellipse(pawX + 1.2, pawY - 0.2, 2.8, 2.2, 0.2, 0, Math.PI * 2);
            ctx.fillStyle = coat.beans;
            ctx.fill();

            // 3 Pink Toe Dots
            const toeOffsets = [
              [-2.2, -4.2],
              [1.2, -4.8],
              [4.6, -3.2],
            ];
            toeOffsets.forEach(([tx, ty]) => {
              ctx.beginPath();
              ctx.arc(pawX + tx, pawY + ty, 1.2, 0, Math.PI * 2);
              ctx.fillStyle = coat.beans;
              ctx.fill();
            });
            ctx.restore();
          };

          drawOutstretchedPaw(50, 24);
          drawOutstretchedPaw(43, 33);
        } else {
          // Trotting Ground Front Legs (Left Pin)
          const frontBackStep =
            petState === "WALK" ? (p.walkFrame === 0 ? -3.5 : 0) : 0;
          ctx.beginPath();
          ctx.roundRect(
            32,
            32 + frontBackStep,
            8.5,
            15 * (1 - p.sleepWeight),
            [3, 3, 6, 6]
          );
          ctx.fillStyle = coat.body;
          ctx.fill();
          applyEnamelRim(2.4);

          // Front-Right Lifted Trot Step with Pink Toe Beans!
          const isTrotLifted =
            (petState === "WALK" && p.walkFrame === 1) ||
            (petState === "RUN" && p.walkFrame === 1) ||
            petState === "IDLE";
          const flY = isTrotLifted ? 31 : 35;
          const flX = 40;

          ctx.save();
          ctx.beginPath();
          ctx.roundRect(
            flX,
            flY,
            10,
            14 * (1 - p.sleepWeight),
            [3, 3, 7, 7]
          );
          ctx.fillStyle = coat.body;
          ctx.fill();
          applyEnamelRim(2.6);

          if (isTrotLifted && p.sleepWeight < 0.2) {
            ctx.beginPath();
            ctx.ellipse(flX + 5, flY + 11.5, 3.0, 2.2, 0, 0, Math.PI * 2);
            ctx.fillStyle = coat.beans;
            ctx.fill();

            const beanDots = [
              [flX + 2.2, flY + 8.8],
              [flX + 5.0, flY + 8.2],
              [flX + 7.8, flY + 8.8],
            ];
            beanDots.forEach(([bx, by]) => {
              ctx.beginPath();
              ctx.arc(bx, by, 1.1, 0, Math.PI * 2);
              ctx.fillStyle = coat.beans;
              ctx.fill();
            });
          }
          ctx.restore();
        }

        // 5. Chubby Round Head
        const headX = 46 * (1 - jw) + 48 * jw;
        const headY = 19 * (1 - jw) + 15 * jw;
        const headR = 15.5 * (1 - jw) + 14.5 * jw;

        ctx.beginPath();
        ctx.arc(headX, headY, headR, 0, Math.PI * 2);
        ctx.fillStyle = coat.body;
        ctx.fill();
        applyEnamelRim(3.3);

        // Specular highlight on forehead
        ctx.beginPath();
        ctx.ellipse(headX - 2, headY - 9, 8, 2.5, -0.15, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.fill();

        // Left Ear
        ctx.beginPath();
        ctx.moveTo(headX - 9, headY - 11);
        ctx.quadraticCurveTo(headX - 12, headY - 18, headX - 13, headY - 23);
        ctx.quadraticCurveTo(headX - 9, headY - 25, headX - 4, headY - 20);
        ctx.lineTo(headX, headY - 14);
        ctx.closePath();
        ctx.fillStyle = coat.body;
        ctx.fill();
        applyEnamelRim(2.6);

        // Inner Pink Left Ear
        ctx.beginPath();
        ctx.moveTo(headX - 9, headY - 13);
        ctx.lineTo(headX - 11, headY - 20);
        ctx.lineTo(headX - 4, headY - 18);
        ctx.closePath();
        ctx.fillStyle = coat.ears;
        ctx.fill();

        // Right Ear
        ctx.beginPath();
        ctx.moveTo(headX + 2, headY - 14);
        ctx.quadraticCurveTo(headX + 7, headY - 19, headX + 11, headY - 22);
        ctx.quadraticCurveTo(headX + 15, headY - 20, headX + 14, headY - 14);
        ctx.lineTo(headX + 13, headY - 8);
        ctx.closePath();
        ctx.fillStyle = coat.body;
        ctx.fill();
        applyEnamelRim(2.6);

        // Inner Pink Right Ear
        ctx.beginPath();
        ctx.moveTo(headX + 4, headY - 13);
        ctx.lineTo(headX + 10, headY - 18);
        ctx.lineTo(headX + 11, headY - 11);
        ctx.closePath();
        ctx.fillStyle = coat.ears;
        ctx.fill();

        // Forehead Tabby Stripes
        if (coat.stripes) {
          ctx.beginPath();
          ctx.moveTo(headX - 3, headY - 12);
          ctx.lineTo(headX - 2, headY - 8);
          ctx.moveTo(headX, headY - 13);
          ctx.lineTo(headX, headY - 7.5);
          ctx.moveTo(headX + 3, headY - 12);
          ctx.lineTo(headX + 2, headY - 8);
          ctx.strokeStyle = coat.stripes;
          ctx.lineWidth = 1.8;
          ctx.lineCap = "round";
          ctx.stroke();
        }

        // Whiskers (Metallic tabs)
        ctx.beginPath();
        ctx.moveTo(headX - 13, headY + 1.5);
        ctx.lineTo(headX - 21, headY + 0.5);
        ctx.moveTo(headX - 13, headY + 4.5);
        ctx.lineTo(headX - 21, headY + 5.5);
        ctx.moveTo(headX + 13, headY + 1.5);
        ctx.lineTo(headX + 21, headY + 0.5);
        ctx.moveTo(headX + 13, headY + 4.5);
        ctx.lineTo(headX + 21, headY + 5.5);
        ctx.strokeStyle = coat.metal.rim;
        ctx.lineWidth = 2.0;
        ctx.lineCap = "round";
        ctx.stroke();

        // Gaze Tracking Bead Eyes
        const relX = (p.cursorX - (p.x + headX)) * 0.012;
        const relY = (p.cursorY - (p.y + headY)) * 0.012;
        const gazeX = Math.max(-1.5, Math.min(1.5, relX * p.direction));
        const gazeY = Math.max(-1.2, Math.min(1.2, relY));

        if (p.isBlinking) {
          // Closed Blink Line (^ ^)
          ctx.beginPath();
          ctx.arc(headX - 5, headY - 0.5, 2.6, Math.PI, 0);
          ctx.arc(headX + 6, headY - 0.5, 2.6, Math.PI, 0);
          ctx.strokeStyle = coat.metal.rim;
          ctx.lineWidth = 2.2;
          ctx.stroke();
        } else if (petState === "PETTED") {
          // Loving Crescent Eyes (^ ^)
          ctx.beginPath();
          ctx.arc(headX - 5, headY, 3.2, Math.PI, 0);
          ctx.arc(headX + 6, headY, 3.2, Math.PI, 0);
          ctx.strokeStyle = coat.metal.rim;
          ctx.lineWidth = 2.4;
          ctx.stroke();
        } else {
          // Glossy Enamel Button Eyes with Specular Dots
          ctx.beginPath();
          ctx.arc(headX - 5 + gazeX, headY - 0.5 + gazeY, 3.0, 0, Math.PI * 2);
          ctx.arc(headX + 6 + gazeX, headY - 0.5 + gazeY, 3.0, 0, Math.PI * 2);
          ctx.fillStyle = coat.eyes;
          ctx.fill();

          // White Specular Highlight Dots
          ctx.beginPath();
          ctx.arc(headX - 6 + gazeX, headY - 1.8 + gazeY, 1.1, 0, Math.PI * 2);
          ctx.arc(headX + 5 + gazeX, headY - 1.8 + gazeY, 1.1, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
        }

        // Cute Pink Nose
        ctx.beginPath();
        ctx.arc(headX + 0.5, headY + 1.8, 1.3, 0, Math.PI * 2);
        ctx.fillStyle = coat.beans;
        ctx.fill();

        // Talking mouth or standard cute :3
        if (petState === "TALK" && p.talkMouthOpen > 0.35) {
          ctx.beginPath();
          ctx.arc(headX + 0.5, headY + 3.5, 2.4, 0, Math.PI);
          ctx.fillStyle = "#ff6584";
          ctx.fill();
          ctx.strokeStyle = coat.metal.rim;
          ctx.lineWidth = 1.6;
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(headX - 1.2, headY + 3.5, 1.8, 0.2, Math.PI * 0.95);
          ctx.arc(headX + 2.2, headY + 3.5, 1.8, 0.05, Math.PI * 0.8);
          ctx.strokeStyle = coat.metal.rim;
          ctx.lineWidth = 2.0;
          ctx.lineCap = "round";
          ctx.stroke();
        }

        ctx.restore();
      }

      ctx.restore(); // Restore global translation

      // ─── 3. FLOATING PARTICLES (HEARTS, ZZZ, RUN DUST) ───

      // Floating ZzZ (Sleeping Cat - No speech bubble needed!)
      if (p.floatingZzz.length > 0) {
        ctx.save();
        p.floatingZzz.forEach((z) => {
          z.y -= 0.65;
          z.x += Math.sin(time * 0.006) * 0.35;
          z.alpha -= 0.013;
          ctx.font = `bold ${z.size}px 'Plus Jakarta Sans', sans-serif`;
          ctx.fillStyle = `rgba(160, 175, 195, ${Math.max(0, z.alpha)})`;
          ctx.fillText(z.text, z.x, z.y);
        });
        p.floatingZzz = p.floatingZzz.filter((z) => z.alpha > 0);
        ctx.restore();
      }

      // Floating Hearts (Petted Cat)
      if (p.patHearts.length > 0) {
        ctx.save();
        p.patHearts.forEach((h) => {
          h.y -= 0.95;
          h.alpha -= 0.016;
          ctx.font = "16px sans-serif";
          ctx.fillStyle = `rgba(244, 63, 94, ${Math.max(0, h.alpha)})`;
          ctx.fillText("♥", h.x, h.y);
        });
        p.patHearts = p.patHearts.filter((h) => h.alpha > 0);
        ctx.restore();
      }

      // Run Dust Puffs
      if (p.runPuffs.length > 0) {
        ctx.save();
        p.runPuffs.forEach((puff) => {
          puff.y -= 0.2;
          puff.r += 0.35;
          puff.alpha -= 0.035;
          ctx.beginPath();
          ctx.arc(puff.x, puff.y, puff.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200, 210, 225, ${Math.max(0, puff.alpha)})`;
          ctx.fill();
        });
        p.runPuffs = p.runPuffs.filter((puff) => puff.alpha > 0);
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [petState, setPetState, updateAnchorGround, coatColor]);

  // Pointer interactions: Petting, Dragging, Pouncing & HUD
  const handlePointerDown = (e) => {
    e.stopPropagation();
    const p = posRef.current;
    p.isDragging = true;
    p.dragOffsetX = e.clientX - p.x;
    p.dragOffsetY = e.clientY - p.y;
    p.idleTimer = 0;

    if (petState === "SLEEP") {
      setPetState("IDLE");
    }

    // Spawn heart
    p.patHearts.push({
      x: p.x + 28 + (Math.random() - 0.5) * 16,
      y: p.y - 6,
      alpha: 1.0,
    });

    setPetState("PETTED");

    const handlePointerMove = (moveEvt) => {
      if (!p.isDragging) return;
      p.x = moveEvt.clientX - p.dragOffsetX;
      p.y = moveEvt.clientY - p.dragOffsetY;
      p.targetX = p.x;
      p.targetY = p.y;
    };

    const handlePointerUp = () => {
      p.isDragging = false;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);

      // Smooth Pounce / Hop upon release without any text label!
      p.jumpStartX = p.x;
      p.jumpStartY = p.y;
      p.jumpProgress = 0;
      setPetState("JUMP");

      setTimeout(() => {
        updateAnchorGround();
      }, 950);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  // Quick Action Triggers without annoying state labels
  const triggerAction = (action) => {
    const p = posRef.current;
    p.idleTimer = 0;
    setSpeechBubble(null);

    if (action === "RUN") {
      p.targetX =
        p.x > window.innerWidth / 2 ? p.x - 140 : p.x + 140;
      p.direction = p.targetX > p.x ? 1 : -1;
      setPetState("RUN");
    } else if (action === "WALK") {
      p.targetX =
        p.x > window.innerWidth / 2 ? p.x - 70 : p.x + 70;
      p.direction = p.targetX > p.x ? 1 : -1;
      setPetState("WALK");
    } else if (action === "JUMP") {
      p.jumpStartX = p.x;
      p.jumpStartY = p.y;
      p.targetX =
        p.x > window.innerWidth / 2 ? p.x - 100 : p.x + 100;
      p.jumpProgress = 0;
      p.direction = p.targetX > p.x ? 1 : -1;
      setPetState("JUMP");
    } else if (action === "SLEEP") {
      setPetState("SLEEP");
    } else if (action === "TALK") {
      setPetState("TALK");
      setSpeechBubble("Meow! ConnectX is ready 🐾");
      setTimeout(() => {
        setPetState("IDLE");
        setSpeechBubble(null);
      }, 2600);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
      }}
    >
      {/* 60FPS Retina Vector Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
        }}
      />

      {/* Hardware-Accelerated Hitbox directly translated in renderLoop */}
      <div
        ref={hitboxRef}
        onPointerDown={handlePointerDown}
        onDoubleClick={cycleCoatColor}
        onMouseEnter={() => setShowHud(true)}
        onMouseLeave={() => setShowHud(false)}
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          width: "74px",
          height: "64px",
          pointerEvents: "auto",
          cursor: posRef.current.isDragging ? "grabbing" : "grab",
          userSelect: "none",
          willChange: "transform",
        }}
        title="Living Enamel Cat Companion (Drag, click to pet, double-click to change cat!)"
      >
        {/* Floating Speech Bubble — ONLY shown for talking/AI alerts (NEVER on jump/sleep/run/walk) */}
        {speechBubble && (petState === "TALK" || petState === "AI_THINKING" || petState === "CALL_ALERT") && (
          <div
            style={{
              position: "absolute",
              bottom: "70px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(255, 255, 255, 0.96)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: `1.5px solid ${CAT_COATS[coatColor]?.metal.rim || "#d4af37"}`,
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.28)",
              color: "#371e06",
              fontSize: "12px",
              fontWeight: 700,
              padding: "5px 12px",
              borderRadius: "16px",
              whiteSpace: "nowrap",
              pointerEvents: "none",
              animation: "bubblePop 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
            }}
          >
            {speechBubble}
          </div>
        )}

        {/* 2026 Micro-Mascot HUD (Hover action bar to easily trigger every movement) */}
        {showHud && !posRef.current.isDragging && (
          <div
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              bottom: "-42px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(15, 23, 42, 0.88)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "20px",
              padding: "4px 8px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
              zIndex: 10000,
              pointerEvents: "auto",
            }}
          >
            {/* Coat Switchers */}
            <button
              onClick={() => {
                setCoatColor("cream");
                localStorage.setItem("connectx_cat_coat", "cream");
              }}
              style={{
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                background: "#fcf4dd",
                border: coatColor === "cream" ? "2px solid #d4af37" : "1px solid #999",
                cursor: "pointer",
              }}
              title="Vanilla Cream (Left Pin)"
            />
            <button
              onClick={() => {
                setCoatColor("ginger");
                localStorage.setItem("connectx_cat_coat", "ginger");
              }}
              style={{
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                background: "#e89943",
                border: coatColor === "ginger" ? "2px solid #fef3c7" : "1px solid #999",
                cursor: "pointer",
              }}
              title="Ginger Tabby (Middle Pin)"
            />
            <button
              onClick={() => {
                setCoatColor("slate");
                localStorage.setItem("connectx_cat_coat", "slate");
              }}
              style={{
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                background: "#7d8490",
                border: coatColor === "slate" ? "2px solid #ffffff" : "1px solid #999",
                cursor: "pointer",
              }}
              title="Sleepy Slate (Right Pin)"
            />

            <div style={{ width: "1px", height: "14px", background: "rgba(255,255,255,0.2)" }} />

            {/* Action Buttons */}
            <button
              onClick={() => triggerAction("RUN")}
              style={hudBtnStyle}
              title="Run / Sprint"
            >
              🏃
            </button>
            <button
              onClick={() => triggerAction("JUMP")}
              style={hudBtnStyle}
              title="Pounce / Jump"
            >
              🦘
            </button>
            <button
              onClick={() => triggerAction("SLEEP")}
              style={hudBtnStyle}
              title="Sleep"
            >
              💤
            </button>
            <button
              onClick={() => triggerAction("TALK")}
              style={hudBtnStyle}
              title="Meow / Talk"
            >
              💬
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const hudBtnStyle = {
  background: "rgba(255, 255, 255, 0.08)",
  border: "none",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "12px",
  padding: "3px 6px",
  cursor: "pointer",
  lineHeight: 1,
  transition: "all 0.15s ease",
};

export default NekoCanvas;
