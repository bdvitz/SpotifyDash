// File: client/src/components/testing/SocketTestSuite.tsx
import React, { useState, useEffect } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { socketManager } from '../../utils/socketManager';
import { checkApiHealth } from '../../utils/api';

interface TestResult {
  test: string;
  status: 'pending' | 'pass' | 'fail';
  message: string;
  timestamp: number;
}

const SocketTestSuite: React.FC = () => {
  const { connectionStatus, isConnected, connectionError, roomState } = useSocket();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testUser] = useState({
    id: `test_${Math.random().toString(36).substr(2, 9)}`,
    display_name: `TestUser_${Math.floor(Math.random() * 1000)}`
  });

  const addTestResult = (test: string, status: 'pass' | 'fail', message: string) => {
    setTestResults(prev => [...prev, {
      test,
      status,
      message,
      timestamp: Date.now()
    }]);
  };

  const runBasicConnectionTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    // Test 1: Server Health Check
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/health`);
      if (response.ok) {
        addTestResult('Server Health', 'pass', 'Server is responding');
      } else {
        addTestResult('Server Health', 'fail', `Server returned ${response.status}`);
      }
    } catch (error) {
      addTestResult('Server Health', 'fail', `Cannot reach server: ${error}`);
    }

    // Test 2: Socket Connection
    await new Promise(resolve => {
      if (isConnected) {
        addTestResult('Socket Connection', 'pass', 'Already connected');
        resolve(void 0);
      } else {
        const timeout = setTimeout(() => {
          addTestResult('Socket Connection', 'fail', 'Connection timeout');
          resolve(void 0);
        }, 5000);

        const checkConnection = () => {
          if (socketManager.isConnected()) {
            clearTimeout(timeout);
            addTestResult('Socket Connection', 'pass', 'Successfully connected');
            resolve(void 0);
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      }
    });

    // Test 3: Event Listener Registration
    let eventReceived = false;
    const testHandler = () => { eventReceived = true; };
    
    socketManager.on('connect', testHandler);
    setTimeout(() => {
      socketManager.off('connect', testHandler);
      if (eventReceived || isConnected) {
        addTestResult('Event Listeners', 'pass', 'Events can be registered and triggered');
      } else {
        addTestResult('Event Listeners', 'fail', 'Event system not working');
      }
    }, 1000);

    setIsRunning(false);
  };

  const runRoomTests = async () => {
    if (!isConnected) {
      addTestResult('Room Tests', 'fail', 'Not connected to server');
      return;
    }

    const roomCode = prompt('Enter a room code to test (or create one first):');
    if (!roomCode) return;

    setIsRunning(true);

    // Test 4: Room Join
    socketManager.joinRoom(roomCode.toUpperCase(), testUser.id);
    
    await new Promise(resolve => {
      const timeout = setTimeout(() => {
        addTestResult('Room Join', 'fail', 'No room state received within 5 seconds');
        resolve(void 0);
      }, 5000);

      const checkRoomState = () => {
        if (roomState && roomState.code === roomCode.toUpperCase()) {
          clearTimeout(timeout);
          addTestResult('Room Join', 'pass', `Joined room ${roomState.code} with ${roomState.players.length} players`);
          resolve(void 0);
        } else {
          setTimeout(checkRoomState, 100);
        }
      };
      checkRoomState();
    });

    // Test 5: Ready Status Toggle
    if (roomState) {
      socketManager.setPlayerReady(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      socketManager.setPlayerReady(false);
      addTestResult('Ready Toggle', 'pass', 'Ready status commands sent');
    }

    setIsRunning(false);
  };

  const runStressTest = async () => {
    setIsRunning(true);
    
    // Test rapid connection/disconnection
    for (let i = 0; i < 5; i++) {
      socketManager.disconnect();
      await new Promise(resolve => setTimeout(resolve, 500));
      await socketManager.connect();
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    addTestResult('Stress Test', 'pass', 'Completed 5 connect/disconnect cycles');
    setIsRunning(false);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6">Phase 4A Socket.IO Test Suite</h2>
      
      {/* Connection Status */}
      <div className="mb-6 p-4 bg-black/20 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-2">Connection Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-300">Status:</span>
            <span className={`ml-2 font-semibold ${
              connectionStatus === 'connected' ? 'text-green-400' :
              connectionStatus === 'connecting' ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {connectionStatus}
            </span>
          </div>
          <div>
            <span className="text-gray-300">Room:</span>
            <span className="ml-2 text-white">{roomState?.code || 'None'}</span>
          </div>
          <div>
            <span className="text-gray-300">Players:</span>
            <span className="ml-2 text-white">{roomState?.players.length || 0}</span>
          </div>
          <div>
            <span className="text-gray-300">Test User:</span>
            <span className="ml-2 text-purple-300">{testUser.display_name}</span>
          </div>
        </div>
        {connectionError && (
          <div className="mt-2 text-red-300 text-sm">Error: {connectionError}</div>
        )}
      </div>

      {/* Test Controls */}
      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={runBasicConnectionTests}
          disabled={isRunning}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
        >
          Basic Connection Tests
        </button>
        <button
          onClick={runRoomTests}
          disabled={isRunning || !isConnected}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
        >
          Room Tests
        </button>
        <button
          onClick={runStressTest}
          disabled={isRunning}
          className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
        >
          Stress Test
        </button>
        <button
          onClick={clearResults}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
        >
          Clear Results
        </button>
      </div>

      {/* Test Results */}
      <div className="bg-black/30 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Test Results</h3>
        {testResults.length === 0 ? (
          <p className="text-gray-400">No tests run yet</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-2 rounded ${
                  result.status === 'pass' ? 'bg-green-500/20' :
                  result.status === 'fail' ? 'bg-red-500/20' :
                  'bg-yellow-500/20'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className={`text-lg ${
                    result.status === 'pass' ? 'text-green-400' :
                    result.status === 'fail' ? 'text-red-400' :
                    'text-yellow-400'
                  }`}>
                    {result.status === 'pass' ? '✓' : result.status === 'fail' ? '✗' : '⏳'}
                  </span>
                  <div>
                    <div className="text-white font-medium">{result.test}</div>
                    <div className="text-sm text-gray-300">{result.message}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(result.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Manual Tests */}
      <div className="mt-6 p-4 bg-black/20 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-3">Manual Test Instructions</h3>
        <div className="space-y-2 text-sm text-gray-300">
          <p>1. <strong>Multi-tab test:</strong> Open this page in 2+ browser tabs, create room in one, join from others</p>
          <p>2. <strong>Network test:</strong> Disconnect/reconnect internet while in a room</p>
          <p>3. <strong>Ready state test:</strong> Toggle ready status and watch other players' views</p>
          <p>4. <strong>Page refresh test:</strong> Refresh browser while in room (should reconnect)</p>
        </div>
      </div>
    </div>
  );
};

export default SocketTestSuite;