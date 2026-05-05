import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useSocket } from "../../../context/SocketContext"; // Adjust path to your socket context
import ChatComponent from "../Chat/ChatComponent"; // Adjust path
import VideoComponent from "../Video/VideoComponent"; // Adjust path

const PartyRoom = () => {
  const { code } = useParams();
  // const socket = useSocket(); // Assuming you have a socket instance available globally

  useEffect(() => {
    // Emit the socket event as soon as the room mounts.
    // Doing this here ensures connection even on a hard page refresh.
    if (code) {
      // socket.emit('join-party-room', { partyCode: code });
      console.log(`Emitting join-party-room for code: ${code}`);
    }

    // Cleanup function to leave the room when the component unmounts
    return () => {
      if (code) {
        // socket.emit('leave-party-room', { partyCode: code });
        console.log(`Emitting leave-party-room for code: ${code}`);
      }
    };
  }, [code /*, socket */]);

  return (
    <div className="party-room-container">
      <header className="party-room-header">
        <h2>Welcome to the Party!</h2>
        <div className="party-code-display">
          <span>Share this code to invite others: </span>
          <strong>{code}</strong>
        </div>
      </header>

      <div className="party-room-content">
        {/* Mount your existing components and pass the code as a prop */}
        {/* <VideoComponent partyCode={code} /> */}
        {/* <ChatComponent partyCode={code} /> */}

        <p>Chat and Video components will render here for room: {code}</p>
      </div>
    </div>
  );
};

export default PartyRoom;
