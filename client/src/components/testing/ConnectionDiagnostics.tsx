import React, { useState, useEffect } from 'react';
import { socketManager } from '../../utils/socketManager';

interface DiagnosticInfo {
  browserInfo: {
    userAgent: string;
    language: string;
    cookiesEnabled: boolean;
    localStorageEnabled: boolean;
  };
  networkInfo: {
    onLine: boolean;
    effectiveType?: string;
    downlink?: number;
  };
  socketInfo: {
    connected: boolean;
    id?: string;
    transport?: string;
    ping?: number;
  };
  serverInfo: {
    reachable: boolean;
    responseTime?: number;
    version?: string;
  };
}

const ConnectionDiagnostics: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticInfo | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const testLocalStorage = (): boolean => {
    try {
      const test = 'test';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  };

  const testServerConnection = async (): Promise<{ reachable: boolean; responseTime?: number }> => {
    const startTime = Date.now();
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/health`, { method: 'GET' });
      const responseTime = Date.now() - startTime;
      return {
        reachable: response.ok,
        responseTime
      };
    } catch (error) {
      addLog(`Server connection failed: ${error}`);
      return { reachable: false };
    }
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setLogs([]);
    addLog('Starting diagnostics...');

    // Browser info
    const browserInfo = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      cookiesEnabled: navigator.cookieEnabled,
      localStorageEnabled: testLocalStorage()
    };

    // Network info
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    const networkInfo = {
      onLine: navigator.onLine,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink
    };

    addLog(`Browser: ${browserInfo.userAgent.split(' ')[0]}`);
    addLog(`Network: ${networkInfo.onLine ? 'Online' : 'Offline'}`);
    if (networkInfo.effectiveType) {
      addLog(`Connection type: ${networkInfo.effectiveType}`);
    }

    // Server connectivity
    addLog('Testing server connection...');
    const serverInfo = await testServerConnection();
    if (serverInfo.reachable) {
      addLog(`Server reachable in ${serverInfo.responseTime}ms`);
    } else {
      addLog('Server unreachable');
    }

    // Socket info
    const socketInfo = {
      connected: socketManager.isConnected(),
      id: (socketManager as any).socket?.id,
      transport: (socketManager as any).socket?.io?.engine?.transport?.name,
      ping: (socketManager as any).socket?.ping
    };

    addLog(`Socket connected: ${socketInfo.connected}`);
    if (socketInfo.connected) {
      addLog(`Socket ID: ${socketInfo.id}`);
      addLog(`Transport: ${socketInfo.transport || 'unknown'}`);
    }

    setDiagnostics({
      browserInfo,
      networkInfo,
      socketInfo,
      serverInfo
    });

    addLog('Diagnostics complete');
    setIsRunning(false);
  };

  const exportDiagnostics = () => {
    if (!diagnostics) return;
    
    const report = {
      timestamp: new Date().toISOString(),
      diagnostics,
      logs
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inclew-diagnostics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    if (!diagnostics) return;
    
    const summary = `
Inclew Connection Diagnostics
============================
Browser: ${diagnostics.browserInfo.userAgent}
Language: ${diagnostics.browserInfo.language}
Cookies: ${diagnostics.browserInfo.cookiesEnabled ? 'Enabled' : 'Disabled'}
LocalStorage: ${diagnostics.browserInfo.localStorageEnabled ? 'Enabled' : 'Disabled'}

Network: ${diagnostics.networkInfo.onLine ? 'Online' : 'Offline'}
${diagnostics.networkInfo.effectiveType ? `Type: ${diagnostics.networkInfo.effectiveType}` : ''}

Server: ${diagnostics.serverInfo.reachable ? 'Reachable' : 'Unreachable'}
${diagnostics.serverInfo.responseTime ? `Response: ${diagnostics.serverInfo.responseTime}ms` : ''}

Socket: ${diagnostics.socketInfo.connected ? 'Connected' : 'Disconnected'}
${diagnostics.socketInfo.id ? `ID: ${diagnostics.socketInfo.id}` : ''}
${diagnostics.socketInfo.transport ? `Transport: ${diagnostics.socketInfo.transport}` : ''}

Recent Logs:
${logs.slice(-10).join('\n')}
    `.trim();
    
    navigator.clipboard.writeText(summary);
    addLog('Diagnostics copied to clipboard');
  };

  useEffect(() => {
    // Auto-run diagnostics on mount
    runDiagnostics();
  }, []);

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-white">Connection Diagnostics</h3>
        <div className="space-x-2">
          <button
            onClick={runDiagnostics}
            disabled={isRunning}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-sm"
          >
            {isRunning ? 'Running...' : 'Refresh'}
          </button>
          <button
            onClick={copyToClipboard}
            disabled={!diagnostics}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-sm"
          >
            Copy Report
          </button>
          <button
            onClick={exportDiagnostics}
            disabled={!diagnostics}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-sm"
          >
            Export JSON
          </button>
        </div>
      </div>

      {diagnostics && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Browser & Environment */}
          <div className="space-y-4">
            <div className="bg-black/20 rounded-lg p-4">
              <h4 className="font-medium text-white mb-2">Browser Environment</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Language:</span>
                  <span className="text-white">{diagnostics.browserInfo.language}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Cookies:</span>
                  <span className={diagnostics.browserInfo.cookiesEnabled ? 'text-green-400' : 'text-red-400'}>
                    {diagnostics.browserInfo.cookiesEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">LocalStorage:</span>
                  <span className={diagnostics.browserInfo.localStorageEnabled ? 'text-green-400' : 'text-red-400'}>
                    {diagnostics.browserInfo.localStorageEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-black/20 rounded-lg p-4">
              <h4 className="font-medium text-white mb-2">Network Status</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Status:</span>
                  <span className={diagnostics.networkInfo.onLine ? 'text-green-400' : 'text-red-400'}>
                    {diagnostics.networkInfo.onLine ? 'Online' : 'Offline'}
                  </span>
                </div>
                {diagnostics.networkInfo.effectiveType && (
                  <div className="flex justify-between">
                    <span className="text-gray-300">Type:</span>
                    <span className="text-white">{diagnostics.networkInfo.effectiveType}</span>
                  </div>
                )}
                {diagnostics.networkInfo.downlink && (
                  <div className="flex justify-between">
                    <span className="text-gray-300">Speed:</span>
                    <span className="text-white">{diagnostics.networkInfo.downlink} Mbps</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Server & Socket */}
          <div className="space-y-4">
            <div className="bg-black/20 rounded-lg p-4">
              <h4 className="font-medium text-white mb-2">Server Connection</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Status:</span>
                  <span className={diagnostics.serverInfo.reachable ? 'text-green-400' : 'text-red-400'}>
                    {diagnostics.serverInfo.reachable ? 'Reachable' : 'Unreachable'}
                  </span>
                </div>
                {diagnostics.serverInfo.responseTime && (
                  <div className="flex justify-between">
                    <span className="text-gray-300">Response Time:</span>
                    <span className="text-white">{diagnostics.serverInfo.responseTime}ms</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-black/20 rounded-lg p-4">
              <h4 className="font-medium text-white mb-2">Socket.IO Status</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Connected:</span>
                  <span className={diagnostics.socketInfo.connected ? 'text-green-400' : 'text-red-400'}>
                    {diagnostics.socketInfo.connected ? 'Yes' : 'No'}
                  </span>
                </div>
                {diagnostics.socketInfo.id && (
                  <div className="flex justify-between">
                    <span className="text-gray-300">Socket ID:</span>
                    <span className="text-white font-mono text-xs">{diagnostics.socketInfo.id.slice(0, 8)}...</span>
                  </div>
                )}
                {diagnostics.socketInfo.transport && (
                  <div className="flex justify-between">
                    <span className="text-gray-300">Transport:</span>
                    <span className="text-white">{diagnostics.socketInfo.transport}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Logs */}
      <div className="mt-6 bg-black/30 rounded-lg p-4">
        <h4 className="font-medium text-white mb-2">Live Diagnostics Log</h4>
        <div className="bg-black/50 rounded p-3 max-h-32 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-gray-400 text-sm">No logs yet...</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="text-xs text-green-300 font-mono">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectionDiagnostics;