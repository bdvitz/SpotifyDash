import React from 'react';
import { SpotifyUser } from '../auth/spotifyAuth';

interface GameRoomProps {
  user: SpotifyUser;
  roomCode: string | null;
  onLeaveGame: () => void;
}

const GameRoom: React.FC<GameRoomProps> = ({ user, roomCode, onLeaveGame }) => {
  return (
    <div className="text-center">
      <h2 className="text-2xl text-white mb-4">Game Room: {roomCode}</h2>
      <p className="text-purple-200 mb-6">Coming soon in Phase 4!</p>
      <button 
        onClick={onLeaveGame}
        className="btn-secondary"
      >
        Back to Dashboard
      </button>
    </div>
  );
};

export default GameRoom;