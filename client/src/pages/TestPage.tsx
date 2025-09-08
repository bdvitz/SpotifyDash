import React from 'react';
import SocketTestSuite from '../components/testing/SocketTestSuite';
import ConnectionDiagnostics from '../components/testing/ConnectionDiagnostics';
import { Bug, Network, Activity } from 'lucide-react';

const TestPage: React.FC = () => {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center space-x-3">
          <Bug className="w-10 h-10 text-purple-400" />
          <span>Phase 4A Testing Suite</span>
        </h1>
        <p className="text-purple-200 text-lg mb-2">
          Comprehensive Socket.IO connection and room management testing
        </p>
        <p className="text-purple-300 text-sm">
          Use these tools to verify Socket.IO functionality before moving to Phase 4B
        </p>
      </div>

      <div className="grid gap-8">
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
      </div>

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
                <li>Ready state test - Toggle ready status across multiple players</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 p-3 bg-yellow-500/20 rounded-lg">
            <p className="font-medium text-yellow-300">
              Phase 4A Success Criteria: All automated tests pass, multi-user room updates work in real-time, 
              connection recovers gracefully from network issues.
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