import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios"; // Or your custom API client

const PartyDashboard = () => {
  const navigate = useNavigate();
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCreateParty = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // POST /api/v1/party/create
      const response = await axios.post("/api/v1/party/create");
      const { code } = response.data; // Adjust based on your API response structure

      // Route to the new party room
      navigate(`/party/${code}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create party");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinParty = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      // POST /api/v1/party/join
      await axios.post("/api/v1/party/join", { code: joinCode });

      // On success, route to the party room
      navigate(`/party/${joinCode}`);
    } catch (err) {
      setError(
        err.response?.data?.message || "Invalid party code or failed to join",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="party-dashboard-container">
      <h2>Party Dashboard</h2>

      {error && <div className="error-message">{error}</div>}

      <div className="party-actions">
        <button onClick={handleCreateParty} disabled={isLoading}>
          {isLoading ? "Creating..." : "Create a Party"}
        </button>

        <button
          onClick={() => setShowJoinInput(!showJoinInput)}
          disabled={isLoading}
        >
          Join a Party
        </button>
      </div>

      {showJoinInput && (
        <form onSubmit={handleJoinParty} className="join-form">
          <input
            type="text"
            placeholder="Enter Party Code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || !joinCode}>
            {isLoading ? "Joining..." : "Submit Code"}
          </button>
        </form>
      )}
    </div>
  );
};

export default PartyDashboard;
