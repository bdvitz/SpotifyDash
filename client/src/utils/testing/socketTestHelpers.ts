// Test helper functions for Socket.IO testing
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