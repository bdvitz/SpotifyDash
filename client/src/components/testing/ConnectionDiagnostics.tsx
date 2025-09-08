import React, { useState, useEffect } from 'react';
import { socketManager } from '../../utils/socketManager';
import { getBrowserInfo, getConnectionQuality, measureApiLatency } from '../../utils/testing/socketTestHelpers';
import { RefreshCw, Download, Copy, Wifi, Server, Globe, Monitor } from 'lucide-react';

interface DiagnosticInfo {
  browserInfo: {
    name: string;
    version: string;
    userAgent: string;
    platform: string;
    language: string;
    cookiesEnabled: boolean;
    onLine: boolean;
  };
  networkInfo: {
    onLine: boolean;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
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
    apiUrl: string;
  };
  environmentInfo: {
    localStorageEnabled: boolean;
    webSocketSupported: boolean;
    performanceApiAvailable: boolean;
    notificationPermission: string;
  };
}

const ConnectionDiagnostics: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticInfo | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-20), `[${timestamp}] ${message}`]);
  };

  const testLocalStorage = (): boolean => {
    try {
      const test = 'inclew_test';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  };

  const testWebSocketSupport = (): boolean => {
    return typeof WebSocket !== 'undefined';
  };

  const getNotificationPermission = (): string => {
    if ('Notification' in window) {
      return Notification.permission;
    }
    return 'not-supported';
  };

  const testServerConnection = async (): Promise<{ reachable: boolean; responseTime?: number }> => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    try {
      const responseTime = await measureApiLatency(apiUrl);
      return {
        reachable: true,
        responseTime
      };
    } catch (error) {
      addLog(`Server connection failed: ${error}`);
      return { reachable: false };
    }
  };

  const getNetworkInfo = () => {
    const connection = (navigator as any).connection || 
                     (navigator as any).mozConnection || 
                     (navigator as any).webkitConnection;
    
    return {
      onLine: navigator.onLine,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt
    };
  };

  const getSocketInfo = () => {
    const socket = (socketManager as any).socket;
    return {
      connected: socketManager.isConnected(),
      id: socket?.id,
      transport: socket?.io?.engine?.transport?.name,
      ping: socket?.ping
    };
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    addLog('Starting comprehensive diagnostics...');

    try {
      // Browser info
      const browserInfo = getBrowserInfo();
      addLog(`Browser: ${browserInfo.name} ${browserInfo.version}`);
      addLog(`Platform: ${browserInfo.platform}`);
      addLog(`Language: ${browserInfo.language}`);

      // Network info
      const networkInfo = getNetworkInfo();
      addLog(`Network status: ${networkInfo.onLine ? 'Online' : 'Offline'}`);
      if (networkInfo.effectiveType) {
        addLog(`Connection type: ${networkInfo.effectiveType}`);
      }
      if (networkInfo.downlink) {
        addLog(`Downlink speed: ${networkInfo.downlink} Mbps`);
      }

      // Environment capabilities
      const environmentInfo = {
        localStorageEnabled: testLocalStorage(),
        webSocketSupported: testWebSocketSupport(),
        performanceApiAvailable: typeof performance !== 'undefined',
        notificationPermission: getNotificationPermission()
      };

      addLog(`LocalStorage: ${environmentInfo.localStorageEnabled ? 'Available' : 'Blocked'}`);
      addLog(`WebSocket: ${environmentInfo.webSocketSupported ? 'Supported' : 'Not supported'}`);

      // Server connectivity
      addLog('Testing server connection...');
      const serverInfo = await testServerConnection();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      
      if (serverInfo.reachable && serverInfo.responseTime) {
        const quality = getConnectionQuality(serverInfo.responseTime);
        addLog(`Server reachable in ${Math.round(serverInfo.responseTime)}ms (${quality.quality})`);
      } else {
        addLog('Server unreachable - check if backend is running');
      }

      // Socket info
      const socketInfo = getSocketInfo();
      addLog(`Socket connected: ${socketInfo.connected}`);
      if (socketInfo.connected) {
        addLog(`Socket ID: ${socketInfo.id}`);
        addLog(`Transport: ${socketInfo.transport || 'unknown'}`);
        if (socketInfo.ping) {
          addLog(`Socket ping: ${socketInfo.ping}ms`);
        }
      }

      setDiagnostics({
        browserInfo,
        networkInfo,
        socketInfo,
        serverInfo: { ...serverInfo, apiUrl },
        environmentInfo
      });

      addLog('Diagnostics completed successfully');
    } catch (error) {
      addLog(`Diagnostics failed: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const exportDiagnostics = () => {
    if (!diagnostics) return;
    
    const report = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      diagnostics,
      logs,
      recommendations: generateRecommendations(diagnostics)
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inclew-diagnostics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyDiagnostics = async () => {
    if (!diagnostics) return;
    
    const summary = `
Inclew Connection Diagnostics Report
===================================
Generated: ${new Date().toLocaleString()}

Browser: ${diagnostics.browserInfo.name} ${diagnostics.browserInfo.version}
Platform: ${diagnostics.browserInfo.platform}
Language: ${diagnostics.browserInfo.language}

Network Status: ${diagnostics.networkInfo.onLine ? 'Online' : 'Offline'}
${diagnostics.networkInfo.effectiveType ? `Connection Type: ${diagnostics.networkInfo.effectiveType}` : ''}
${diagnostics.networkInfo.downlink ? `Download Speed: ${diagnostics.networkInfo.downlink} Mbps` : ''}

Server: ${diagnostics.serverInfo.reachable ? 'Reachable' : 'Unreachable'}
API URL: ${diagnostics.serverInfo.apiUrl}
${diagnostics.serverInfo.responseTime ? `Response Time: ${Math.round(diagnostics.serverInfo.responseTime)}ms` : ''}

Socket.IO: ${diagnostics.socketInfo.connected ? 'Connected' : 'Disconnected'}
${diagnostics.socketInfo.transport ? `Transport: ${diagnostics.socketInfo.transport}` : ''}

Environment:
- LocalStorage: ${diagnostics.environmentInfo.localStorageEnabled ? 'Available' : 'Blocked'}
- WebSocket: ${diagnostics.environmentInfo.webSocketSupported ? 'Supported' : 'Not supported'}
- Notifications: ${diagnostics.environmentInfo.notificationPermission}

Recent Activity:
${logs.slice(-5).join('\n')}
    `.trim();
    
    await navigator.clipboard.writeText(summary);
    addLog('Diagnostics copied to clipboard');
  };

  const generateRecommendations = (diagnostics: DiagnosticInfo): string[] => {
    const recommendations: string[] = [];
    
    if (!diagnostics.serverInfo.reachable) {
      recommendations.push('Server unreachable - ensure backend is running on the correct port');
    }
    
    if (diagnostics.serverInfo.responseTime && diagnostics.serverInfo.responseTime > 1000) {
      recommendations.push('High server response time - check network connection or server performance');
    }
    
    if (!diagnostics.environmentInfo.localStorageEnabled) {
      recommendations.push('LocalStorage blocked - enable cookies and site data for full functionality');
    }
    
    if (!diagnostics.environmentInfo.webSocketSupported) {
      recommendations.push('WebSocket not supported - update to a modern browser');
    }
    
    if (!diagnostics.socketInfo.connected && diagnostics.serverInfo.reachable) {
      recommendations.push('Socket.IO connection failed despite server being reachable - check for proxy or firewall issues');
    }
    
    if (!diagnostics.networkInfo.onLine) {
      recommendations.push('Browser reports offline status - check internet connection');
    }
    
    return recommendations;
  };

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        runDiagnostics();
      }, 10000); // Refresh every 10 seconds
      
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Initial run
  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={runDiagnostics}
          disabled={isRunning}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
        >
          <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
        
        <button
          onClick={copyDiagnostics}
          disabled={!diagnostics}
          className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
        >
          <Copy className="w-4 h-4" />
          <span>Copy Report</span>
        </button>
        
        <button
          onClick={exportDiagnostics}
          disabled={!diagnostics}
          className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
        >
          <Download className="w-4 h-4" />
          <span>Export JSON</span>
        </button>
        
        <label className="flex items-center space-x-2 text-white">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Auto-refresh (10s)</span>
        </label>
      </div>

      {diagnostics && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Browser & Environment */}
          <div className="space-y-4">
            <div className="bg-black/20 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Monitor className="w-5 h-5 text-blue-400" />
                <h4 className="font-medium text-white">Browser Environment</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Browser:</span>
                  <span className="text-white">{diagnostics.browserInfo.name} {diagnostics.browserInfo.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Platform:</span>
                  <span className="text-white">{diagnostics.browserInfo.platform}</span>
                </div>
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
                  <span className={diagnostics.environmentInfo.localStorageEnabled ? 'text-green-400' : 'text-red-400'}>
                    {diagnostics.environmentInfo.localStorageEnabled ? 'Available' : 'Blocked'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">WebSocket:</span>
                  <span className={diagnostics.environmentInfo.webSocketSupported ? 'text-green-400' : 'text-red-400'}>
                    {diagnostics.environmentInfo.webSocketSupported ? 'Supported' : 'Not supported'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-black/20 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Globe className="w-5 h-5 text-green-400" />
                <h4 className="font-medium text-white">Network Status</h4>
              </div>
              <div className="space-y-2 text-sm">
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
                {diagnostics.networkInfo.rtt && (
                  <div className="flex justify-between">
                    <span className="text-gray-300">RTT:</span>
                    <span className="text-white">{diagnostics.networkInfo.rtt}ms</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Server & Socket */}
          <div className="space-y-4">
            <div className="bg-black/20 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Server className="w-5 h-5 text-purple-400" />
                <h4 className="font-medium text-white">Server Connection</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Status:</span>
                  <span className={diagnostics.serverInfo.reachable ? 'text-green-400' : 'text-red-400'}>
                    {diagnostics.serverInfo.reachable ? 'Reachable' : 'Unreachable'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">URL:</span>
                  <span className="text-white text-xs font-mono">{diagnostics.serverInfo.apiUrl}</span>
                </div>
                {diagnostics.serverInfo.responseTime && (
                  <div className="flex justify-between">
                    <span className="text-gray-300">Response:</span>
                    <span className={getConnectionQuality(diagnostics.serverInfo.responseTime).color}>
                      {Math.round(diagnostics.serverInfo.responseTime)}ms
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-black/20 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Wifi className="w-5 h-5 text-orange-400" />
                <h4 className="font-medium text-white">Socket.IO Status</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Connected:</span>
                  <span className={diagnostics.socketInfo.connected ? 'text-green-400' : 'text-red-400'}>
                    {diagnostics.socketInfo.connected ? 'Yes' : 'No'}
                  </span>
                </div>
                {diagnostics.socketInfo.id && (
                  <div className="flex justify-between">
                    <span className="text-gray-300">Socket ID:</span>
                    <span className="text-white font-mono text-xs">{diagnostics.socketInfo.id.slice(0, 12)}...</span>
                  </div>
                )}
                {diagnostics.socketInfo.transport && (
                  <div className="flex justify-between">
                    <span className="text-gray-300">Transport:</span>
                    <span className="text-white">{diagnostics.socketInfo.transport}</span>
                  </div>
                )}
                {diagnostics.socketInfo.ping && (
                  <div className="flex justify-between">
                    <span className="text-gray-300">Ping:</span>
                    <span className="text-white">{diagnostics.socketInfo.ping}ms</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {diagnostics && generateRecommendations(diagnostics).length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-4">
          <h4 className="font-medium text-yellow-300 mb-2">Recommendations</h4>
          <ul className="space-y-1 text-yellow-200 text-sm">
            {generateRecommendations(diagnostics).map((rec, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="text-yellow-400 mt-0.5">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Live Logs */}
      <div className="bg-black/30 rounded-lg p-4">
        <h4 className="font-medium text-white mb-2">Diagnostic Log</h4>
        <div className="bg-black/50 rounded p-3 max-h-40 overflow-y-auto">
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