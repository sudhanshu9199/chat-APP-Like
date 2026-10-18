import { createContext, useContext, useState, useCallback, useEffect } from "react";

const CompanionContext = createContext();

export const useCompanionPet = () => {
  const context = useContext(CompanionContext);
  if (!context) {
    throw new Error("useCompanionPet must be used within a CompanionProvider");
  }
  return context;
};

// Authentic Enamel Pin Cat color palettes matching the user's reference photo
export const CAT_COATS = {
  cream: {
    id: "cream",
    name: "Vanilla Cream",
    type: "trot", // Left pin in reference
    metal: {
      rim: "#d4af37", // Polished gold metal outline
      highlight: "#fef08a",
      shadow: "#926b15",
    },
    body: "#fcf4dd", // Warm creamy enamel
    highlight: "#ffffff",
    belly: "#ffffff",
    ears: "#f9a8d4", // Kawaii soft pink inner ear
    beans: "#f472b6", // Vibrant toe beans
    eyes: "#261c14", // Deep dark enamel bead eyes
    whiskers: "#c59a2f",
  },
  ginger: {
    id: "ginger",
    name: "Ginger Tabby",
    type: "pounce", // Middle pin in reference
    metal: {
      rim: "#c98f28", // Rich gold metal outline
      highlight: "#fef3c7",
      shadow: "#855410",
    },
    body: "#e89943", // Warm honey ginger enamel
    highlight: "#fcd398",
    belly: "#fef5e7", // Creamy underbelly & paw socks
    stripes: "#c57321", // Forehead tabby marking
    ears: "#fb7185",
    beans: "#f43f5e", // Pink toe beans
    eyes: "#24160c",
    whiskers: "#b5771c",
  },
  slate: {
    id: "slate",
    name: "Sleepy Slate",
    type: "sleep", // Right pin in reference
    metal: {
      rim: "#cbd5e1", // Polished silver / chrome metal outline
      highlight: "#ffffff",
      shadow: "#64748b",
    },
    body: "#7d8490", // Sleek slate gray enamel
    highlight: "#9ca3af",
    belly: "#a8b0bc",
    ears: "#f472b6",
    beans: "#fb7185",
    eyes: "#1e242c",
    whiskers: "#94a3b8",
  },
};

export const CompanionProvider = ({ children }) => {
  // States: 'IDLE' | 'WALK' | 'JUMP' | 'SLEEP' | 'TALK' | 'AI_THINKING' | 'CALL_ALERT' | 'PETTED'
  const [petState, setPetState] = useState("IDLE");
  const [petMessage, setPetMessage] = useState("");
  const [isVisible, setIsVisible] = useState(true);
  const [coatColor, setCoatColor] = useState(() => {
    return localStorage.getItem("connectx_cat_coat") || "cream";
  });

  const cycleCoatColor = useCallback(() => {
    setCoatColor((current) => {
      const keys = Object.keys(CAT_COATS);
      const nextIndex = (keys.indexOf(current) + 1) % keys.length;
      const nextCoat = keys[nextIndex];
      localStorage.setItem("connectx_cat_coat", nextCoat);
      return nextCoat;
    });
  }, []);

  const triggerPetState = useCallback((newState, durationMs = 0, message = "") => {
    setPetState(newState);
    if (message) setPetMessage(message);

    if (durationMs > 0) {
      const timer = setTimeout(() => {
        setPetState("IDLE");
        setPetMessage("");
      }, durationMs);
      return () => clearTimeout(timer);
    }
  }, []);

  const togglePetVisibility = useCallback(() => {
    setIsVisible((prev) => !prev);
  }, []);

  return (
    <CompanionContext.Provider
      value={{
        petState,
        setPetState,
        petMessage,
        setPetMessage,
        triggerPetState,
        isVisible,
        togglePetVisibility,
        coatColor,
        setCoatColor,
        cycleCoatColor,
        CAT_COATS,
      }}
    >
      {children}
    </CompanionContext.Provider>
  );
};
