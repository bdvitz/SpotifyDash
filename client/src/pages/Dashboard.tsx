import React from 'react';
import { Music, Users, Trophy, RefreshCw, Play } from 'lucide-react';
import { SpotifyUser } from '../auth/spotifyAuth';
import { useSpotifyAPI } from '../hooks/useSpotifyAPI';
import TrackCard from '../components/TrackCard';
import ArtistCard from '../components/ArtistCard';
import { gameApi } from '../utils/api';
import ConnectionStatus from '../components/ConnectionStatus';
import { useSocket } from '../hooks/useSocket';

interface DashboardProps {
  user: SpotifyUser;
  onJoinGame: (roomCode: string) => void;
  onCreateGame: (roomCode: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onJoinGame, onCreateGame }) => {
  const { 
    topTracks, 
    topArtists, 
    isLoading, 
    error, 
    trackLimit, 
    setTrackLimit, 
    refreshData 
  } = useSpotifyAPI();
  
  const { connectionStatus, isConnected } = useSocket();
  const [joinRoomCode, setJoinRoomCode] = React.useState('');
  const [isJoining, setIsJoining] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [showJoinForm, setShowJoinForm] = React.useState(false);

  // Get top albums from tracks
  const topAlbums = React.useMemo(() => {
    if (!topTracks) return [];
    
    const albumMap = new Map();
    topTracks.forEach(track => {
      if (!albumMap.has(track.album.id)) {
        albumMap.set(track.album.id, track.album);
      }
    });
    
    return Array.from(albumMap.values()).slice(0, 5);
  }, [topTracks]);

  const handleCreateRoom = async () => {
    setIsCreating(true);
    try {
      const response = await gameApi.createRoom({
        spotifyId: user.id,
        displayName: user.display_name
      });
      
      if (response.success && response.data) {
        onCreateGame(response.data.roomCode);
      } else {
        alert('Failed to create room. Please try again.');
      }
    } catch (error) {
      console.error('Failed to create room:', error);
      alert('Failed to create room. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (joinRoomCode.length !== 4) return;
    
    setIsJoining(true);
    try {
      const response = await gameApi.joinRoom(joinRoomCode.toUpperCase(), {
        spotifyId: user.id,
        displayName: user.display_name
      });
      
      if (response.success) {
        onJoinGame(joinRoomCode.toUpperCase());
      } else {
        alert(response.error || 'Failed to join room. Please check the code and try again.');
      }
    } catch (error) {
      console.error('Failed to join room:', error);
      alert('Failed to join room. Please check the code and try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleRefresh = async () => {
    await refreshData();
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Socket Connection Status */}
      <div className="flex justify-between items-center">
        <div className="text-center flex-1">
          <h2 className="text-4xl font-bold text-white mb-3">
            Welcome back, {user.display_name}! 🎵
          </h2>
          <p className="text-xl text-purple-200">
            Ready to explore your music taste and challenge friends?
          </p>
        </div>
        <div className="ml-4">
          <ConnectionStatus status={connectionStatus} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Music Stats Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
          <Music className="w-16 h-16 text-green-400 mb-4 group-hover:scale-110 transition-transform duration-300" />
          <h3 className="text-2xl font-semibold text-white mb-3">Your Music Stats</h3>
          <p className="text-purple-200 mb-6 leading-relaxed">
            Explore your top tracks, artists, and albums with beautiful visualizations
          </p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-white/10 rounded-xl p-3">
              <div className="text-2xl font-bold text-green-400 mb-1">{topTracks?.length || 0}</div>
              <div className="text-purple-200 text-sm">Top Songs</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <div className="text-2xl font-bold text-blue-400 mb-1">{topArtists?.length || 0}</div>
              <div className="text-purple-200 text-sm">Top Artists</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <div className="text-2xl font-bold text-purple-400 mb-1">{topAlbums.length}</div>
              <div className="text-purple-200 text-sm">Top Albums</div>
            </div>
          </div>
        </div>

        {/* Game Actions Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
          <Users className="w-16 h-16 text-blue-400 mb-4 group-hover:scale-110 transition-transform duration-300" />
          <h3 className="text-2xl font-semibold text-white mb-3">Music Quiz Games</h3>
          <p className="text-purple-200 mb-6 leading-relaxed">
            Host or join multiplayer music quizzes with up to 8 players
          </p>
          <div className="space-y-3">
            <button
              onClick={handleCreateRoom}
              disabled={isCreating}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-500 disabled:to-gray-600 text-white px-6 py-3 rounded-lg transition-all duration-200 font-semibold w-full shadow-lg hover:shadow-xl transform hover:scale-105 disabled:scale-100 flex items-center justify-center space-x-2"
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Host Game</span>
                </>
              )}
            </button>
            <button
              onClick={() => setShowJoinForm(!showJoinForm)}
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white px-6 py-3 rounded-lg transition-all duration-200 font-semibold w-full shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Join Game
            </button>
          </div>
        </div>
      </div>

      {/* Join Game Form */}
      {showJoinForm && (
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 animate-slide-down">
          <h3 className="text-xl font-semibold text-white mb-4">Join a Game Room</h3>
          <div className="flex space-x-4">
            <input
              type="text"
              value={joinRoomCode}
              onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
              placeholder="Enter 4-character room code"
              maxLength={4}
              className="flex-1 bg-purple-800/50 text-white px-4 py-3 rounded-lg border border-purple-600/30 focus:border-purple-400 focus:outline-none transition-all duration-200 text-center text-xl font-mono tracking-widest"
            />
            <button
              onClick={handleJoinRoom}
              disabled={joinRoomCode.length !== 4 || isJoining}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-500 disabled:to-gray-600 text-white px-6 py-3 rounded-lg transition-all duration-200 font-semibold disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isJoining ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Joining...</span>
                </>
              ) : (
                <span>Join</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Music Statistics Section */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h2 className="text-3xl font-bold text-white flex items-center">
            <Trophy className="w-8 h-8 text-yellow-400 mr-3" />
            Your Music Statistics
          </h2>
          <div className="flex items-center space-x-4">
            <select
              value={trackLimit}
              onChange={(e) => setTrackLimit(Number(e.target.value))}
              className="bg-purple-800/50 text-white px-4 py-2 rounded-lg border border-purple-600/30 focus:border-purple-400 focus:outline-none transition-all duration-200 font-medium"
            >
              <option value={5}>Top 5 Songs</option>
              <option value={10}>Top 10 Songs</option>
              <option value={25}>Top 25 Songs</option>
              <option value={50}>Top 50 Songs</option>
            </select>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:from-gray-500 disabled:to-gray-600 text-white px-4 py-2 rounded-lg transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 disabled:scale-100 flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-400/50 rounded-lg p-4 mb-6">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-purple-200">Loading your music data...</p>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Top Tracks */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white flex items-center">
                <Music className="w-6 h-6 text-green-400 mr-2" />
                Top Songs ({topTracks?.length || 0})
              </h3>
              <div className="space-y-3 max-h-128 overflow-y-auto custom-scrollbar">
                {topTracks?.map((track, index) => (
                  <TrackCard 
                    key={track.id} 
                    track={track} 
                    rank={index + 1} 
                  />
                ))}
              </div>
            </div>

            {/* Top Artists */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white flex items-center">
                <Users className="w-6 h-6 text-blue-400 mr-2" />
                Top Artists ({topArtists?.length || 0})
              </h3>
              <div className="space-y-3 max-h-128 overflow-y-auto custom-scrollbar">
                {topArtists?.map((artist, index) => (
                  <ArtistCard 
                    key={artist.id} 
                    artist={artist} 
                    rank={index + 1} 
                  />
                ))}
              </div>
            </div>

            {/* Top Albums */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white flex items-center">
                <Play className="w-6 h-6 text-purple-400 mr-2" />
                Top Albums ({topAlbums.length})
              </h3>
              <div className="space-y-3 max-h-128 overflow-y-auto custom-scrollbar">
                {topAlbums.map((album, index) => (
                  <div key={album.id} className="flex items-center space-x-4 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all duration-200 group">
                    <span className="text-purple-300 font-bold w-8 text-center group-hover:text-white transition-colors duration-200">
                      {index + 1}
                    </span>
                    <img 
                      src={album.images?.[0]?.url || `https://via.placeholder.com/48x48/7c3aed/ffffff?text=${album.name.charAt(0)}`} 
                      alt={album.name} 
                      className="w-12 h-12 rounded-lg shadow-md" 
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate group-hover:text-purple-300 transition-colors duration-200">
                        {album.name}
                      </p>
                      <p className="text-purple-200 text-sm truncate">
                        {album.artists?.map((a: { name: any; }) => a.name).join(', ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.6s ease-in-out;
        }
        
        .animate-slide-down {
          animation: slideDown 0.3s ease-out;
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
        
        @keyframes slideDown {
          from { 
            opacity: 0; 
            transform: translateY(-10px) scale(0.95); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0) scale(1); 
          }
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.5);
          border-radius: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.7);
        }
      `}</style>
    </div>
  );
};

export default Dashboard;