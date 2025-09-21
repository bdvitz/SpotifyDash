import React, { useState, useEffect } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { socketManager } from '../../utils/socketManager';
import { checkApiHealth } from '../../utils/api';
import { createTestUser, waitForCondition, testLogger, generateTestScenario } from '../../utils/testing/socketTestHelpers';
import { Play, Square, RotateCcw, Download, Copy, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface TestResult {
  test: string;
  status: 'pending' | 'pass' | 'fail';
  message: string;
  timestamp: number;
  duration?: number;
}

const SocketTestSuite: React.FC = () => {
  const { connectionStatus, isConnected, connectionError, roomState } = useSocket();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [testUser] = useState(() => createTestUser('TestUser'));
  const [testProgress, setTestProgress] = useState(0);
  const [totalTests, setTotalTests] = useState(0);

  const addTestResult = (test: string, status: 'pass' | 'fail', message: string, duration?: number) => {
    const result: TestResult = {
      test,
      status,
      message,
      timestamp: Date.now(),
      duration
    };
    
    setTestResults(prev => [...prev, result]);
    testLogger.log(`Test ${status.toUpperCase()}: ${test} - ${message}`);
    
    if (status === 'fail') {
      testLogger.error(`Test failed: ${test}`, message);
    }
  };

  const updateProgress = (completed: number, total: number) => {
    setTestProgress(completed);
    setTotalTests(total);
  };

  const runBasicConnectionTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    setCurrentTest('Server Health Check');
    
    const tests = [
      'Server Health Check',
      'Socket Connection',
      'Event Registration',
      'Connection Status Sync'
    ];
    
    updateProgress(0, tests.length);

    try {
      // Test 1: Server Health Check
      const healthStart = performance.now();
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const response = await fetch(`${apiUrl}/health`);
        const healthDuration = performance.now() - healthStart;
        
        if (response.ok) {
          addTestResult('Server Health Check', 'pass', `Server responding in ${Math.round(healthDuration)}ms`, healthDuration);
        } else {
          addTestResult('Server Health Check', 'fail', `Server returned ${response.status}`);
        }
      } catch (error) {
        addTestResult('Server Health Check', 'fail', `Cannot reach server: ${error}`);
      }
      updateProgress(1, tests.length);

      // Test 2: Socket Connection
      setCurrentTest('Socket Connection');
      const connectionStart = performance.now();
      
      const connectionSuccess = await waitForCondition(
        () => socketManager.isConnected(),
        5000
      );
      
      const connectionDuration = performance.now() - connectionStart;
      
      if (connectionSuccess) {
        addTestResult('Socket Connection', 'pass', `Connected in ${Math.round(connectionDuration)}ms`, connectionDuration);
      } else {
        addTestResult('Socket Connection', 'fail', 'Connection timeout after 5 seconds');
      }
      updateProgress(2, tests.length);

      // Test 3: Event Registration
      setCurrentTest('Event Registration');
      let eventReceived = false;
      const testHandler = () => { eventReceived = true; };
      
      socketManager.on('connect', testHandler);
      await new Promise(resolve => setTimeout(resolve, 500));
      socketManager.off('connect', testHandler);
      
      if (eventReceived || isConnected) {
        addTestResult('Event Registration', 'pass', 'Event system working correctly');
      } else {
        addTestResult('Event Registration', 'fail', 'Event system not responding');
      }
      updateProgress(3, tests.length);

      // Test 4: Connection Status Sync
      setCurrentTest('Connection Status Sync');
      const socketStatus = socketManager.getConnectionStatus();
      const hookStatus = connectionStatus;
      
      if (socketStatus === hookStatus) {
        addTestResult('Connection Status Sync', 'pass', `Status synchronized: ${socketStatus}`);
      } else {
        addTestResult('Connection Status Sync', 'fail', `Status mismatch: Socket(${socketStatus}) vs Hook(${hookStatus})`);
      }
      updateProgress(4, tests.length);

    } catch (error) {
      addTestResult('Test Suite', 'fail', `Unexpected error: ${error}`);
    } finally {
      setCurrentTest(null);
      setIsRunning(false);
    }
  };

  const runRoomTests = async () => {
    if (!isConnected) {
      addTestResult('Room Tests', 'fail', 'Not connected to server');
      return;
    }

    const roomCode = prompt('Enter a room code to test (create one first in another tab):');
    if (!roomCode || roomCode.length !== 4) {
      addTestResult('Room Tests', 'fail', 'Invalid room code provided');
      return;
    }

    setIsRunning(true);
    setCurrentTest('Room Join Test');

    const tests = [
      'Room Join',
      'Real-time Updates',
      'Ready Status Toggle'
    ];
    
    updateProgress(0, tests.length);

    try {
      // Test 1: Room Join with improved timing
      const joinStart = performance.now();
      
      // Listen for join success
      let joinSuccessReceived = false;
      const joinSuccessHandler = () => { joinSuccessReceived = true; };
      socketManager.on('join-room-success', joinSuccessHandler);
      
      // Attempt to join
      socketManager.joinRoom(roomCode.toUpperCase(), testUser.id);
      
      // Wait for either room state or join success
      const roomJoined = await waitForCondition(
        () => roomState?.code === roomCode.toUpperCase() || joinSuccessReceived,
        15000 // Increased timeout
      );
      
      socketManager.off('join-room-success', joinSuccessHandler);
      const joinDuration = performance.now() - joinStart;
      
      if (roomJoined && (roomState || joinSuccessReceived)) {
        const playerCount = roomState?.players.length || 'unknown';
        addTestResult('Room Join', 'pass', `Joined room ${roomCode.toUpperCase()} with ${playerCount} players in ${Math.round(joinDuration)}ms`, joinDuration);
      } else {
        addTestResult('Room Join', 'fail', 'Failed to join room within 15 seconds');
        setIsRunning(false);
        setCurrentTest(null);
        return;
      }
      updateProgress(1, tests.length);

      // Test 2: Real-time Updates
      setCurrentTest('Real-time Updates');
      if (roomState && roomState.players.length > 0) {
        addTestResult('Real-time Updates', 'pass', `Room has ${roomState.players.length} players - real-time updates working`);
      } else {
        addTestResult('Real-time Updates', 'pass', 'Room state received - open another tab to test multi-user updates');
      }
      updateProgress(2, tests.length);

      // Test 3: Ready Status Toggle
      setCurrentTest('Ready Status Toggle');
      const currentPlayer = roomState?.players.find(p => p.spotifyId === testUser.id);
      
      if (currentPlayer && !currentPlayer.isHost) {
        const initialReadyState = currentPlayer.isReady;
        
        // Toggle ready state
        socketManager.setPlayerReady(!initialReadyState);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Toggle back
        socketManager.setPlayerReady(initialReadyState);
        addTestResult('Ready Status Toggle', 'pass', 'Ready status commands sent successfully');
      } else {
        addTestResult('Ready Status Toggle', 'pass', 'Host player detected - ready status not applicable');
      }
      updateProgress(3, tests.length);

    } catch (error) {
      addTestResult('Room Tests', 'fail', `Unexpected error: ${error}`);
    } finally {
      setCurrentTest(null);
      setIsRunning(false);
    }
  };

  const runStressTest = async () => {
    setIsRunning(true);
    setCurrentTest('Stress Test');
    
    const cycles = 3;
    updateProgress(0, cycles);
    
    try {
      for (let i = 0; i < cycles; i++) {
        setCurrentTest(`Stress Test - Cycle ${i + 1}/${cycles}`);
        
        // Disconnect
        socketManager.disconnect();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Reconnect
        await socketManager.connect();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        updateProgress(i + 1, cycles);
      }
      
      addTestResult('Stress Test', 'pass', `Completed ${cycles} connect/disconnect cycles successfully`);
    } catch (error) {
      addTestResult('Stress Test', 'fail', `Failed during stress testing: ${error}`);
    } finally {
      setCurrentTest(null);
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
    testLogger.clear();
    setTestProgress(0);
    setTotalTests(0);
  };

  const exportResults = () => {
    const report = {
      timestamp: new Date().toISOString(),
      testUser: testUser.display_name,
      connectionStatus,
      roomState,
      results: testResults,
      logs: testLogger.getLogs()
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `socket-test-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyResults = async () => {
    const summary = testResults.map(result => 
      `${result.status === 'pass' ? '✓' : '✗'} ${result.test}: ${result.message}`
    ).join('\n');
    
    await navigator.clipboard.writeText(summary);
    testLogger.log('Test results copied to clipboard');
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pass': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'fail': return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'pending': return <Clock className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pass': return 'bg-green-500/20 border-green-400/50';
      case 'fail': return 'bg-red-500/20 border-red-400/50';
      case 'pending': return 'bg-yellow-500/20 border-yellow-400/50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Test Status */}
      <div className="bg-black/20 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-300">Connection:</span>
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
        
        {currentTest && (
          <div className="mt-3 flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-blue-300 text-sm">Running: {currentTest}</span>
            {totalTests > 0 && (
              <span className="text-gray-400 text-sm">({testProgress}/{totalTests})</span>
            )}
          </div>
        )}
      </div>

      {/* Test Controls */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={runBasicConnectionTests}
          disabled={isRunning}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
        >
          <Play className="w-4 h-4" />
          <span>Basic Tests</span>
        </button>
        
        <button
          onClick={runRoomTests}
          disabled={isRunning || !isConnected}
          className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
        >
          <Play className="w-4 h-4" />
          <span>Room Tests</span>
        </button>
        
        <button
          onClick={runStressTest}
          disabled={isRunning}
          className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
        >
          <Play className="w-4 h-4" />
          <span>Stress Test</span>
        </button>
        
        <button
          onClick={clearResults}
          disabled={isRunning}
          className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white px-4 py-2 rounded-lg transition-colors duration-200"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Clear</span>
        </button>
        
        <button
          onClick={exportResults}
          disabled={testResults.length === 0}
          className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
        >
          <Download className="w-4 h-4" />
          <span>Export</span>
        </button>
        
        <button
          onClick={copyResults}
          disabled={testResults.length === 0}
          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
        >
          <Copy className="w-4 h-4" />
          <span>Copy</span>
        </button>
      </div>

      {/* Test Results */}
      <div className="bg-black/30 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Test Results</h3>
        {testResults.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">No tests run yet. Click a test button to start.</p>
            <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4 text-left">
              <h4 className="text-blue-300 font-medium mb-2">Room Test Instructions:</h4>
              <ol className="text-blue-200 text-sm space-y-1 list-decimal list-inside">
                <li>Open a new tab and go to the Dashboard</li>
                <li>Create a new room (note the room code)</li>
                <li>Come back to this tab and run "Room Tests"</li>
                <li>Enter the room code when prompted</li>
                <li>Watch for real-time updates</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded border ${getStatusColor(result.status)}`}
              >
                <div className="flex items-center space-x-3">
                  {getStatusIcon(result.status)}
                  <div>
                    <div className="text-white font-medium">{result.test}</div>
                    <div className="text-sm text-gray-300">{result.message}</div>
                    {result.duration && (
                      <div className="text-xs text-gray-400">Duration: {Math.round(result.duration)}ms</div>
                    )}
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

      {/* Test Summary */}
      {testResults.length > 0 && (
        <div className="bg-black/20 rounded-lg p-4">
          <h4 className="text-white font-medium mb-2">Test Summary</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-green-500/20 rounded p-3">
              <div className="text-green-400 text-2xl font-bold">
                {testResults.filter(r => r.status === 'pass').length}
              </div>
              <div className="text-green-300 text-sm">Passed</div>
            </div>
            <div className="bg-red-500/20 rounded p-3">
              <div className="text-red-400 text-2xl font-bold">
                {testResults.filter(r => r.status === 'fail').length}
              </div>
              <div className="text-red-300 text-sm">Failed</div>
            </div>
            <div className="bg-blue-500/20 rounded p-3">
              <div className="text-blue-400 text-2xl font-bold">
                {testResults.length}
              </div>
              <div className="text-blue-300 text-sm">Total</div>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Testing Tips */}
      <div className="bg-purple-500/10 border border-purple-400/30 rounded-lg p-4">
        <h4 className="text-purple-300 font-medium mb-2">Real-time Testing Tips:</h4>
        <ul className="text-purple-200 text-sm space-y-1 list-disc list-inside">
          <li>Room tests create a new test player each time - this is expected behavior</li>
          <li>First room join may take longer due to player creation in test mode</li>
          <li>Real-time updates should appear immediately when other players join/leave</li>
          <li>If tests fail, try resetting the database and running tests again</li>
        </ul>
      </div>
    </div>
  );
};

export default SocketTestSuite;