import React from 'react';
import { SpotifyUser } from '../auth/spotifyAuth';
import { Users, ArrowLeft } from 'lucide-react';

interface GameRoomProps {
  user: SpotifyUser;
  roomCode: string | null;
  onLeaveGame: () => void;
}

const GameRoom: React.FC<GameRoomProps> = ({ user, roomCode, onLeaveGame }) => {
  return (
    <div className="max-w-2xl mx-auto text-center animate-fade-in">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
        <Users className="w-20 h-20 text-blue-400 mx-auto mb-6" />
        
        <h2 className="text-3xl font-bold text-white mb-4">
          Game Room: {roomCode || 'Loading...'}
        </h2>
        
        <div className="bg-purple-500/20 border border-purple-400/50 rounded-lg p-6 mb-6">
          <h3 className="text-xl font-semibold text-purple-200 mb-2">Coming Soon in Phase 4!</h3>
          <p className="text-purple-300">
            Real-time multiplayer game rooms with Socket.IO will be implemented in the backend phase.
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="text-purple-200">
            <p className="mb-2">Features coming next:</p>
            <ul className="text-sm space-y-1 text-left max-w-md mx-auto">
              <li>• Real-time player management</li>
              <li>• Live game state synchronization</li>
              <li>• Music quiz gameplay</li>
              <li>• Scoring and leaderboards</li>
            </ul>
          </div>
          
          <button 
            onClick={onLeaveGame}
            className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center space-x-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </div>
      
      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.6s ease-in-out;
        }
        
        @keyframes fadeIn {
          from { 
            opacity: 0; 
            transform: translateY(20px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
      `}</style>
    </div>
  );
};

export default GameRoom;