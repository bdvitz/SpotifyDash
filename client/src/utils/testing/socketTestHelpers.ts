export interface TestUser {
  id: string;
  display_name: string;
}

export function createTestUser(prefix: string = 'TestUser'): TestUser {
  return {
    id: `test_${Math.random().toString(36).substr(2, 9)}`,
    display_name: `${prefix}_${Math.floor(Math.random() * 1000)}`
  };
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function waitForCondition(
  condition: () => boolean,
  timeout: number = 5000,
  checkInterval: number = 100
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (condition()) return true;
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  
  return false;
}

export function logWithTimestamp(message: string): void {
  console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getConnectionQuality(responseTime: number): { quality: string; color: string } {
  if (responseTime < 100) return { quality: 'Excellent', color: 'text-green-400' };
  if (responseTime < 300) return { quality: 'Good', color: 'text-yellow-400' };
  if (responseTime < 600) return { quality: 'Fair', color: 'text-orange-400' };
  return { quality: 'Poor', color: 'text-red-400' };
}

export function simulateNetworkDelay(minMs: number = 50, maxMs: number = 200): Promise<void> {
  const delay = Math.random() * (maxMs - minMs) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
}

export function createMockPlayer(overrides: Partial<TestUser> = {}): TestUser {
  const defaultPlayer = createTestUser();
  return { ...defaultPlayer, ...overrides };
}

export function validateRoomCode(code: string): boolean {
  return /^[A-Z]{4}$/.test(code);
}

export async function measureApiLatency(apiUrl: string): Promise<number> {
  const startTime = performance.now();
  try {
    await fetch(`${apiUrl}/health`);
    return performance.now() - startTime;
  } catch (error) {
    throw new Error(`API latency test failed: ${error}`);
  }
}

export function getBrowserInfo() {
  const ua = navigator.userAgent;
  let browserName = 'Unknown';
  let browserVersion = 'Unknown';

  if (ua.includes('Firefox')) {
    browserName = 'Firefox';
    browserVersion = ua.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
  } else if (ua.includes('Chrome')) {
    browserName = 'Chrome';
    browserVersion = ua.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    browserName = 'Safari';
    browserVersion = ua.match(/Version\/(\d+)/)?.[1] || 'Unknown';
  } else if (ua.includes('Edge')) {
    browserName = 'Edge';
    browserVersion = ua.match(/Edge\/(\d+)/)?.[1] || 'Unknown';
  }

  return {
    name: browserName,
    version: browserVersion,
    userAgent: ua,
    platform: navigator.platform,
    language: navigator.language,
    cookiesEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine
  };
}

export class TestEventLogger {
  private logs: Array<{ timestamp: number; level: string; message: string; data?: any }> = [];

  log(message: string, data?: any) {
    this.logs.push({
      timestamp: Date.now(),
      level: 'info',
      message,
      data
    });
    console.log(`[TEST] ${message}`, data || '');
  }

  error(message: string, error?: any) {
    this.logs.push({
      timestamp: Date.now(),
      level: 'error',
      message,
      data: error
    });
    console.error(`[TEST ERROR] ${message}`, error || '');
  }

  warn(message: string, data?: any) {
    this.logs.push({
      timestamp: Date.now(),
      level: 'warn',
      message,
      data
    });
    console.warn(`[TEST WARN] ${message}`, data || '');
  }

  getLogs() {
    return this.logs;
  }

  getLogsAsString() {
    return this.logs
      .map(log => `[${new Date(log.timestamp).toLocaleTimeString()}] ${log.level.toUpperCase()}: ${log.message}`)
      .join('\n');
  }

  clear() {
    this.logs = [];
  }

  export() {
    const report = {
      generatedAt: new Date().toISOString(),
      browserInfo: getBrowserInfo(),
      logs: this.logs
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export const testLogger = new TestEventLogger();

export function generateTestScenario(scenarioType: 'single-user' | 'multi-user' | 'stress') {
  switch (scenarioType) {
    case 'single-user':
      return {
        name: 'Single User Flow',
        steps: [
          'Connect to Socket.IO server',
          'Create a new room',
          'Toggle ready status',
          'Leave room gracefully'
        ],
        expectedDuration: '30 seconds',
        requirements: ['Server running', 'Valid Spotify auth']
      };
    
    case 'multi-user':
      return {
        name: 'Multi-User Interaction',
        steps: [
          'Open multiple browser tabs',
          'Create room in first tab',
          'Join room from other tabs',
          'Test real-time updates',
          'Verify disconnection handling'
        ],
        expectedDuration: '2-3 minutes',
        requirements: ['Multiple browser tabs', 'Server running']
      };
    
    case 'stress':
      return {
        name: 'Connection Stress Test',
        steps: [
          'Rapid connect/disconnect cycles',
          'Network interruption simulation',
          'Multiple simultaneous connections',
          'Resource usage monitoring'
        ],
        expectedDuration: '5 minutes',
        requirements: ['Stable network', 'Performance monitoring']
      };
    
    default:
      throw new Error(`Unknown scenario type: ${scenarioType}`);
  }
}