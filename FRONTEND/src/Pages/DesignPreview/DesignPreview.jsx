import { useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, Sparkles } from "lucide-react";

const DesignPreview = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
        backgroundColor: "#030308",
        display: "flex",
        flexDirection: "column",
        zIndex: 9999,
        overflow: "hidden",
      }}
    >
      {/* Top Testing Control Bar */}
      <header
        style={{
          height: "52px",
          backgroundColor: "rgba(15, 16, 26, 0.85)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          color: "#ffffff",
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={() => navigate("/home")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "999px",
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#e2e8f0",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 600,
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.12)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.06)")}
          >
            <ArrowLeft size={14} /> Back to Live App
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "8px",
              backgroundColor: "rgba(6, 182, 212, 0.12)",
              border: "1px solid rgba(6, 182, 212, 0.3)",
              color: "#22d3ee",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
            }}
          >
            <Sparkles size={12} /> 2026 UI Prototype (Testing)
          </div>
        </div>

        <a
          href="/new-ui-preview.html"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "12px",
            color: "#94a3b8",
            textDecoration: "none",
            padding: "6px 12px",
            borderRadius: "999px",
            backgroundColor: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#ffffff";
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#94a3b8";
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.04)";
          }}
        >
          Open Standalone <ExternalLink size={12} />
        </a>
      </header>

      {/* Frame Preview Container */}
      <div
        style={{
          flex: 1,
          width: "100%",
          height: "calc(100dvh - 52px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          overflow: "auto",
          backgroundColor: "#030308",
        }}
      >
        <iframe
          src="/new-ui-preview.html"
          title="ConnectX 2026 Mobile UI Preview"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            display: "block",
          }}
        />
      </div>
    </div>
  );
};

export default DesignPreview;
