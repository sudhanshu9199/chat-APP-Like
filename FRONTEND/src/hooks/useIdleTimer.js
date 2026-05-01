// useIdleTimer.js
import { useState, useEffect, useRef, useCallback } from "react";

export const useIdleTimer = (timeoutMs = 3000) => {
  const [isIdle, setisIdle] = useState(false);
  const [menuOpen, setmenuOpen] = useState(false);

  const timeRef = useRef(null);
  const debounceRef = useRef(null);
  const idelRef = useRef(false);
  const menuRef = useRef(false);

  useEffect(() => {
    idelRef.current = isIdle;
  }, [isIdle]);

  useEffect(() => {
    menuRef.current = menuOpen;
  }, [menuOpen]);

  const clearTimers = useCallback(() => {
    clearTimeout(timeRef.current);
    clearTimeout(debounceRef.current);
  }, []);

  const scheduleHide = useCallback(() => {
    clearTimers();

    debounceRef.current = setTimeout(() => {
      timeRef.current = setTimeout(() => {
        if (!menuRef.current) setisIdle(true);
      }, timeoutMs);
    }, 120);
  }, [timeoutMs, clearTimers]);

  const handleInteraction = useCallback(() => {
    if (menuRef.current) return;
    if (idelRef.current) setisIdle(false);
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => {
    const events = ["mousemove", "touchend", "click", "keydown"];

    events.forEach((e) =>
      window.addEventListener(e, handleInteraction, { passive: true }),
    );
    scheduleHide();

    return () => {
      events.forEach((e) => window.removeEventListener(e, handleInteraction));
      clearTimers();
    };
  }, [handleInteraction, scheduleHide, clearTimers]);

  useEffect(() => {
    if (menuOpen) {
      clearTimers();
      setisIdle(false);
    } else {
      scheduleHide();
    }
  }, [menuOpen, clearTimers, scheduleHide]);

  return { isIdle, setmenuOpen };
};
