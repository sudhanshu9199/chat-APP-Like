// useIdleTimer.js
import { useState, useEffect, useRef } from "react";

export const useIdleTimer = (timeoutMs = 3000) => {
  const [isIdle, setisIdle] = useState(false);
  const [isMenuOpen, setisMenuOpen] = useState(false);

  const timeoutRef = useRef(null);
  const debounceRef = useRef(null);
  const isIdelRef = useRef(isIdle);
  const isMenuOpenRef = useRef(isMenuOpen);

  useEffect(() => {
    isIdelRef.current = isIdle;
  }, [isIdle]);

  useEffect(() => {
    isMenuOpenRef.current = isMenuOpen;
  }, [isMenuOpen]);

  useEffect(() => {
    const handleInteraction = () => {
      if (isMenuOpenRef.current) return;

      if (isIdelRef.current) {
        setisIdle(false);
      }

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        timeoutRef.current = setTimeout(() => {
          if (!isMenuOpenRef.current) {
            setisIdle(true);
          }
        }, timeoutMs);
      }, 100);
    };

    const events = ["mousemove", "touchstart", "touchend", "click", "keydown"];

    events.forEach((event) =>
      window.addEventListener(event, handleInteraction),
    );
    handleInteraction();

    return () => {
      events.forEach((event) =>
        window.removeEventListener(event, handleInteraction),
      );
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [timeoutMs]);

  useEffect(() => {
    if (isMenuOpen) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setisIdle(false);
    }
  }, [isMenuOpen]);

  return { isIdle, isMenuOpen, setisMenuOpen };
};
