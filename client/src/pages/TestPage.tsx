import React, { useState, useEffect } from 'react';
import SocketTestSuite from '../components/testing/SocketTestSuite';
import ConnectionDiagnostics from '../components/testing/ConnectionDiagnostics';
import { Bug, Network, Activity, Database, Trash2, BarChart3, AlertTriangle, Eraser } from 'lucide-react';
import { apiPost, apiGet } from '../utils/api';

interface DatabaseStats {
  totalRooms: number;
  totalPlayers: number;
  totalGames: number;
  totalAnswers: number;
  totalScores: number;
  activeRooms: number;
  gamesInProgress: number;
  recentActivity: number;
}

const TestPage: React.FC = () => {
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [lastResetTime, setLastResetTime] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const fetchDatabaseStats = async () => {
    try {
      const response = await apiGet('/api/test/stats');
      if (response.success && response.data) {
        setDbStats(response.data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch database stats:', error);
    }
  };

  const handleResetDatabase = async () => {
    if (!showResetConfirm) {
      setShowResetConfirm(true);
      return;
    }

    setIsResetting(true);
    setShowResetConfirm(false);

    try {
      const response = await apiPost('/api/test/reset-database');
      if (response.success) {
        setLastResetTime(new Date().toLocaleString());
        await fetchDatabaseStats(); // Refresh stats
        console.log('Database reset successfully');
      } else {
        console.error('Database reset failed:', response.error);
        alert(`Reset failed: ${response.error}`);
      }
    } catch (error) {
      console.error('Database reset error:', error);
      alert('Reset failed: Network error');
    } finally {
      setIsResetting(false);
    }
  };

  const handleCleanupExpired = async () => {
    setIsCleaning(true);

    try {
      const response = await apiPost('/api/test/cleanup-expired');
      if (response.success && response.data) {
        const { cleaned } = response.data;
        alert(`Cleanup complete: ${cleaned.total} items removed (${cleaned.expiredGames} games, ${cleaned.expiredRooms} rooms)`);
        await fetchDatabaseStats(); // Refresh stats
      } else {
        console.error('Cleanup failed:', response.error);
        alert(`Cleanup failed: ${response.error}`);
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      alert('Cleanup failed: Network error');
    } finally {
      setIsCleaning(false);
    }
  };

  const cancelReset = () => {
    setShowResetConfirm(false);
  };

  // Fetch stats on component mount and periodically
  useEffect(() => {
    fetchDatabaseStats();
    const interval = setInterval(fetchDatabaseStats, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center space-x-3">
          <Bug className="w-10 h-10 text-purple-400" />
          <span>Phase 4A Testing Suite</span>
        </h1>
        <p className="text-purple-200 text-lg mb-2">
          Comprehensive Socket.IO connection, room management, and database testing
        </p>
        <p className="text-purple-300 text-sm">
          Use these tools to verify your implementation before moving to Phase 4B
        </p>
      </div>

      {/* Database Management Section */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
        <div className="flex items-center space-x-3 mb-6">
          <Database className="w-6 h-6 text-green-400" />
          <h2 className="text-2xl font-semibold text-white">Database Management</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Database Stats */}
          <div className="bg-black/20 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-medium text-white">Database Statistics</h3>
            </div>
            
            {dbStats ? (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-blue-500/20 rounded p-2">
                  <div className="text-blue-300 font-medium">Total Rooms</div>
                  <div className="text-white text-lg">{dbStats.totalRooms}</div>
                </div>
                <div className="bg-green-500/20 rounded p-2">
                  <div className="text-green-300 font-medium">Active Rooms</div>
                  <div className="text-white text-lg">{dbStats.activeRooms}</div>
                </div>
                <div className="bg-purple-500/20 rounded p-2">
                  <div className="text-purple-300 font-medium">Total Players</div>
                  <div className="text-white text-lg">{dbStats.totalPlayers}</div>
                </div>
                <div className="bg-orange-500/20 rounded p-2">
                  <div className="text-orange-300 font-medium">Games</div>
                  <div className="text-white text-lg">{dbStats.totalGames}</div>
                </div>
                <div className="bg-yellow-500/20 rounded p-2">
                  <div className="text-yellow-300 font-medium">In Progress</div>
                  <div className="text-white text-lg">{dbStats.gamesInProgress}</div>
                </div>
                <div className="bg-pink-500/20 rounded p-2">
                  <div className="text-pink-300 font-medium">Recent Activity</div>
                  <div className="text-white text-lg">{dbStats.recentActivity}</div>
                </div>
              </div>
            ) : (
              <div className="text-gray-400">Loading stats...</div>
            )}
          </div>

          {/* Database Controls */}
          <div className="bg-black/20 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Trash2 className="w-5 h-5 text-red-400" />
              <h3 className="text-lg font-medium text-white">Database Controls</h3>
            </div>
            
            <div className="space-y-3">
              {/* Reset Database */}
              <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-3">
                <h4 className="text-red-300 font-medium mb-2">Reset All Tables</h4>
                <p className="text-red-200 text-sm mb-3">
                  Completely clears all rooms, players, games, and related data. Use for fresh testing.
                </p>
                
                {showResetConfirm ? (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-yellow-300 text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Are you sure? This cannot be undone!</span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleResetDatabase}
                        disabled={isResetting}
                        className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-sm"
                      >
                        {isResetting ? 'Resetting...' : 'Yes, Reset All'}
                      </button>
                      <button
                        onClick={cancelReset}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleResetDatabase}
                    disabled={isResetting}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-4 py-2 rounded transition-colors duration-200 flex items-center space-x-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Reset Database</span>
                  </button>
                )}
              </div>

              {/* Cleanup Expired */}
              <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-3">
                <h4 className="text-yellow-300 font-medium mb-2">Clean Expired Data</h4>
                <p className="text-yellow-200 text-sm mb-3">
                  Removes finished games older than 1 hour and inactive rooms older than 24 hours.
                </p>
                <button
                  onClick={handleCleanupExpired}
                  disabled={isCleaning}
                  className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white px-4 py-2 rounded transition-colors duration-200 flex items-center space-x-2"
                >
                  <Eraser className="w-4 h-4" />
                  <span>{isCleaning ? 'Cleaning...' : 'Cleanup Expired'}</span>
                </button>
              </div>

              {lastResetTime && (
                <div className="text-xs text-gray-400">
                  Last reset: {lastResetTime}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Connection Diagnostics */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
        <div className="flex items-center space-x-3 mb-4">
          <Network className="w-6 h-6 text-blue-400" />
          <h2 className="text-2xl font-semibold text-white">Connection Diagnostics</h2>
        </div>
        <p className="text-purple-200 mb-4">
          Monitor connection health, browser compatibility, and network status
        </p>
        <ConnectionDiagnostics />
      </div>

      {/* Socket.IO Test Suite */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
        <div className="flex items-center space-x-3 mb-4">
          <Activity className="w-6 h-6 text-green-400" />
          <h2 className="text-2xl font-semibold text-white">Socket.IO Test Suite</h2>
        </div>
        <p className="text-purple-200 mb-4">
          Interactive testing for connection, room management, and real-time events
        </p>
        <SocketTestSuite />
      </div>

      {/* Data Expiration Info */}
      <div className="bg-blue-500/10 border border-blue-400/30 rounded-2xl p-6">
        <h3 className="text-xl font-semibold text-blue-300 mb-3">Data Expiration Policy</h3>
        <div className="space-y-3 text-blue-200 text-sm">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-blue-300 mb-2">Automatic Cleanup:</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Finished games are removed after 1 hour</li>
                <li>Inactive rooms are removed after 24 hours</li>
                <li>Cleanup runs automatically every hour</li>
                <li>Player data is cleaned when rooms expire</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-300 mb-2">Benefits:</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Reduces database storage costs</li>
                <li>Improves query performance</li>
                <li>Maintains user privacy</li>
                <li>Prevents data accumulation</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-500/20 rounded-lg">
            <p className="font-medium text-blue-300">
              This is a reasonable practice for game data. User sessions are temporary, 
              and retaining game history beyond the active session provides minimal value 
              while increasing storage costs and privacy concerns.
            </p>
          </div>
        </div>
      </div>

      {/* Testing Instructions */}
      <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-2xl p-6">
        <h3 className="text-xl font-semibold text-yellow-300 mb-3">Testing Instructions</h3>
        <div className="space-y-3 text-yellow-200 text-sm">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-yellow-300 mb-2">Automated Tests:</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Basic Connection Tests - Verify server health and Socket.IO connection</li>
                <li>Room Tests - Test joining rooms and ready status updates</li>
                <li>Stress Test - Connection stability under rapid connect/disconnect</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-yellow-300 mb-2">Manual Tests:</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Multi-tab test - Open 2+ tabs, create/join same room</li>
                <li>Network test - Disconnect/reconnect internet while in room</li>
                <li>Refresh test - Refresh page while in room</li>
                <li>Host start test - Create room and start game with 1+ players</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 p-3 bg-yellow-500/20 rounded-lg">
            <p className="font-medium text-yellow-300">
              Phase 4A Success Criteria: All automated tests pass, multi-user room updates work in real-time, 
              host can start games, connection recovers gracefully from network issues, database can be reset for clean testing.
            </p>
          </div>
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

export default TestPage;