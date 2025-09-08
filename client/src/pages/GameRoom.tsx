import React, { useEffect, useState } from 'react';
import { SpotifyUser } from '../auth/spotifyAuth';
import { Users, ArrowLeft, Crown, Check, X, Wifi, Play, Clock, Loader } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import { socketManager } from '../utils/socketManager';
import ConnectionStatus from '../components/ConnectionStatus';

interface GameRoomProps {
  user: SpotifyUser;
  roomCode: string | null;
  onLeaveGame: () => void;
}

const GameRoom: React.FC<GameRoomProps> = ({ user, roomCode, onLeaveGame }) => {
  const { 
    connectionStatus, 
    isConnected, 
    connectionError, 
    roomState
  } = useSocket();

  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [gameStartStatus, setGameStartStatus] = useState<string | null>(null);

  // Join room when connected and have room code
  useEffect(() => {
    if (isConnected && roomCode && !hasJoinedRoom) {
      console.log(`Joining room ${roomCode} as ${user.id}`);
      socketManager.joinRoom(roomCode, user.id);
      setHasJoinedRoom(true);
    }
  }, [isConnected, roomCode, user.id, hasJoinedRoom]);

  // Reset join status when room code changes
  useEffect(() => {
    setHasJoinedRoom(false);
  }, [roomCode]);

  // Listen for game start events
  useEffect(() => {
    const handleGameStartInitiated = (data: { hostName: string; playerCount: number; estimatedLoadTime: number }) => {
      setIsStartingGame(true);
      setGameStartStatus(`${data.hostName} is starting the game with ${data.playerCount} player(s)...`);
    };

    const handleGameStarted = (data: { gameId: string; totalQuestions: number }) => {
      setIsStartingGame(false);
      setGameStartStatus(`Game started! ${data.totalQuestions} questions incoming...`);
      // Here you would navigate to the actual game interface
      setTimeout(() => {
        setGameStartStatus(null);
        // TODO: Navigate to game play interface
        console.log('Game started with ID:', data.gameId);
      }, 2000);
    };

    const handleGameStartFailed = (data: { message: string }) => {
      setIsStartingGame(false);
      setGameStartStatus(`Failed to start game: ${data.message}`);
      setTimeout(() => setGameStartStatus(null), 3000);
    };

    socketManager.on('game-start-initiated', handleGameStartInitiated);
    socketManager.on('game-started', handleGameStarted);
    socketManager.on('game-start-failed', handleGameStartFailed);

    return () => {
      socketManager.off('game-start-initiated', handleGameStartInitiated);
      socketManager.off('game-started', handleGameStarted);
      socketManager.off('game-start-failed', handleGameStartFailed);
    };
  }, []);

  const isHost = roomState?.players.find(p => p.spotifyId === user.id)?.isHost || false;
  const currentPlayer = roomState?.players.find(p => p.spotifyId === user.id);

  const handleToggleReady = () => {
    const newReadyState = !currentPlayer?.isReady;
    socketManager.setPlayerReady(newReadyState);
  };

  const handleStartGame = () => {
    if (!isHost || isStartingGame) return;
    
    setIsStartingGame(true);
    socketManager.emit('start-game', {});
  };

  const handleLeave = () => {
    setHasJoinedRoom(false);
    onLeaveGame();
  };

  const canStartGame = isHost && roomState && roomState.players.length >= 1 && !isStartingGame;

  if (!roomCode) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4">No Room Selected</h2>
          <button onClick={onLeaveGame} className="btn-secondary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Game loading screen
  if (isStartingGame || gameStartStatus) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 border border-white/20">
          <div className="mb-6">
            {isStartingGame ? (
              <Loader className="w-16 h-16 text-purple-400 mx-auto animate-spin" />
            ) : (
              <Check className="w-16 h-16 text-green-400 mx-auto" />
            )}
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">
            {isStartingGame ? 'Starting Game...' : 'Game Ready!'}
          </h2>
          <p className="text-purple-200 text-lg mb-6">
            {gameStartStatus}
          </p>
          {isStartingGame && (
            <div className="space-y-2 text-sm text-purple-300">
              <p>• Generating personalized questions</p>
              <p>• Analyzing music preferences</p>
              <p>• Preparing game interface</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Connection Status */}
      <div className="mb-6">
        <ConnectionStatus 
          status={connectionStatus}
          error={connectionError}
          showDetails={true}
          className="mb-4"
        />
      </div>

      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
        {/* Room Header */}
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-white mb-2">Room: {roomCode}</h2>
          {roomState && (
            <div className="flex items-center justify-center space-x-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                roomState.status === 'WAITING' ? 'bg-blue-500/20 text-blue-300' :
                roomState.status === 'STARTING' ? 'bg-yellow-500/20 text-yellow-300' :
                roomState.status === 'IN_GAME' ? 'bg-green-500/20 text-green-300' :
                'bg-gray-500/20 text-gray-300'
              }`}>
                {roomState.status.replace('_', ' ')}
              </span>
              <span className="text-purple-200">
                {roomState.players.length}/8 players
              </span>
            </div>
          )}
        </div>

        {/* Loading/Error States */}
        {!isConnected && (
          <div className="text-center py-8">
            <div className="animate-pulse">
              <Wifi className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <p className="text-purple-200">Connecting to game server...</p>
            </div>
          </div>
        )}

        {isConnected && !roomState && (
          <div className="text-center py-8">
            <div className="animate-pulse">
              <Users className="w-16 h-16 text-blue-400 mx-auto mb-4" />
              <p className="text-purple-200">Joining room...</p>
            </div>
          </div>
        )}

        {/* Room Content */}
        {isConnected && roomState && (
          <>
            {/* Player Status */}
            {currentPlayer && (
              <div className="text-center mb-8">
                <div className="bg-white/10 rounded-xl p-4 max-w-md mx-auto">
                  <div className="flex items-center justify-center space-x-3 mb-3">
                    {isHost && <Crown className="w-5 h-5 text-yellow-400" />}
                    <span className="text-white font-semibold">
                      {isHost ? 'You are the host' : 'You are a player'}
                    </span>
                  </div>
                  
                  {!isHost && (
                    <button
                      onClick={handleToggleReady}
                      className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 mx-auto ${
                        currentPlayer.isReady
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-gray-600 hover:bg-gray-700 text-white'
                      }`}
                    >
                      {currentPlayer.isReady ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Ready</span>
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4" />
                          <span>Not Ready</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Players List */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-white mb-4 text-center">
                Players ({roomState.players.length}/8)
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {roomState.players.map((player) => (
                  <div
                    key={player.id}
                    className={`flex items-center space-x-4 p-4 rounded-xl transition-all duration-200 ${
                      player.isReady ? 'bg-green-500/20 border border-green-400/50' : 'bg-white/5 border border-white/20'
                    }`}
                  >
                    <img
                      src={player.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.displayName)}&background=7c3aed&color=fff`}
                      alt={player.displayName}
                      className="w-12 h-12 rounded-full"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-semibold">{player.displayName}</span>
                        {player.isHost && <Crown className="w-4 h-4 text-yellow-400" />}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        {player.isReady ? (
                          <>
                            <Check className="w-4 h-4 text-green-400" />
                            <span className="text-green-300 text-sm">Ready</span>
                          </>
                        ) : (
                          <>
                            <X className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-300 text-sm">Not Ready</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Host Controls */}
            {isHost && (
              <div className="text-center space-y-4 mb-8">
                <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-yellow-300 mb-2">Host Controls</h3>
                  <p className="text-yellow-200 text-sm mb-4">
                    You can start the game with as few as 1 player for testing purposes.
                  </p>
                  <button
                    onClick={handleStartGame}
                    disabled={!canStartGame}
                    className={`flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 mx-auto ${
                      canStartGame
                        ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                        : 'bg-gray-600 text-gray-300 cursor-not-allowed'
                    }`}
                  >
                    <Play className="w-5 h-5" />
                    <span>
                      {roomState.players.length === 1 ? 'Start Solo Test Game' : `Start Game (${roomState.players.length} players)`}
                    </span>
                  </button>
                  {roomState.players.length === 1 && (
                    <p className="text-yellow-300 text-xs mt-2">
                      Test mode: You can play alone to test the game mechanics
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleLeave}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-lg transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Leave Room</span>
              </button>
            </div>
          </>
        )}
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
        
        .btn-secondary {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          transition: all 0.2s;
        }
        
        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
};

export default GameRoom;