/**
 * URL routing utilities for game navigation
 */

export interface GameSession {
  roomCode: string;
  gameId: string;
  timestamp: number;
}

export interface RouteState {
  view: 'dashboard' | 'room' | 'game' | 'test';
  roomCode: string | null;
  gameSession: GameSession | null;
}

/**
 * Validates room code format
 */
export function isValidRoomCode(code: string): boolean {
  return /^[A-Z]{4}$/.test(code);
}

/**
 * Parses current URL and returns route state
 */
export function parseUrl(): RouteState {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);

  // Test page
  if (path === '/test') {
    return { view: 'test', roomCode: null, gameSession: null };
  }

  // Room page: /room/ABCD
  if (path.startsWith('/room/')) {
    const roomCode = path.split('/')[2]?.toUpperCase();
    
    if (roomCode && isValidRoomCode(roomCode)) {
      return { view: 'room', roomCode, gameSession: null };
    }
    // Invalid room code, redirect to dashboard
    return { view: 'dashboard', roomCode: null, gameSession: null };
  }

  // Game page: /game/ABCD?gameId=xyz
  if (path.startsWith('/game/')) {
    const roomCode = path.split('/')[2]?.toUpperCase();
    const gameId = params.get('gameId');
    
    if (roomCode && isValidRoomCode(roomCode) && gameId) {
      const gameSession: GameSession = {
        roomCode,
        gameId,
        timestamp: Date.now()
      };
      return { view: 'game', roomCode, gameSession };
    }
    
    // If we have valid room code but no gameId, go to room
    if (roomCode && isValidRoomCode(roomCode)) {
      return { view: 'room', roomCode, gameSession: null };
    }
    
    // Invalid format, go to dashboard
    return { view: 'dashboard', roomCode: null, gameSession: null };
  }

  // Default to dashboard
  return { view: 'dashboard', roomCode: null, gameSession: null };
}

/**
 * Builds URL for given route state
 */
export function buildUrl(view: RouteState['view'], roomCode?: string, gameId?: string): string {
  switch (view) {
    case 'dashboard':
      return '/';
    case 'test':
      return '/test';
    case 'room':
      if (roomCode && isValidRoomCode(roomCode)) {
        return `/room/${roomCode}`;
      }
      return '/';
    case 'game':
      if (roomCode && isValidRoomCode(roomCode) && gameId) {
        return `/game/${roomCode}?gameId=${gameId}`;
      } else if (roomCode && isValidRoomCode(roomCode)) {
        return `/room/${roomCode}`;
      }
      return '/';
    default:
      return '/';
  }
}

/**
 * Navigates to a new route
 */
export function navigateToRoute(view: RouteState['view'], roomCode?: string, gameId?: string): RouteState {
  const url = buildUrl(view, roomCode, gameId);
  
  // Update browser URL
  window.history.pushState(null, '', url);
  
  // Return new state
  return parseUrl();
}

/**
 * Generates a shareable room URL
 */
export function generateShareableRoomUrl(roomCode: string): string {
  if (!isValidRoomCode(roomCode)) {
    throw new Error('Invalid room code format');
  }
  
  return `${window.location.origin}/room/${roomCode}`;
}

/**
 * Generates a shareable game URL
 */
export function generateShareableGameUrl(roomCode: string, gameId: string): string {
  if (!isValidRoomCode(roomCode)) {
    throw new Error('Invalid room code format');
  }
  
  return `${window.location.origin}/game/${roomCode}?gameId=${gameId}`;
}

/**
 * Extracts room code from current URL if present
 */
export function getCurrentRoomCode(): string | null {
  const path = window.location.pathname;
  
  if (path.startsWith('/room/') || path.startsWith('/game/')) {
    const roomCode = path.split('/')[2]?.toUpperCase();
    return roomCode && isValidRoomCode(roomCode) ? roomCode : null;
  }
  
  return null;
}

/**
 * Saves game session to localStorage
 */
export function saveGameSession(gameSession: GameSession): void {
  try {
    localStorage.setItem('inclew_active_game', JSON.stringify(gameSession));
  } catch (error) {
    console.error('Failed to save game session:', error);
  }
}

/**
 * Loads game session from localStorage
 */
export function loadGameSession(): GameSession | null {
  try {
    const saved = localStorage.getItem('inclew_active_game');
    if (!saved) return null;
    
    const session: GameSession = JSON.parse(saved);
    
    // Check if session is still valid (within 2 hours)
    const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
    if (session.timestamp < twoHoursAgo) {
      clearGameSession();
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Failed to load game session:', error);
    clearGameSession();
    return null;
  }
}

/**
 * Clears saved game session
 */
export function clearGameSession(): void {
  try {
    localStorage.removeItem('inclew_active_game');
  } catch (error) {
    console.error('Failed to clear game session:', error);
  }
}

/**
 * Validates if current URL matches expected route state
 */
export function validateCurrentRoute(expectedState: RouteState): boolean {
  const currentState = parseUrl();
  
  return (
    currentState.view === expectedState.view &&
    currentState.roomCode === expectedState.roomCode &&
    currentState.gameSession?.gameId === expectedState.gameSession?.gameId
  );
}

/**
 * Handles browser back/forward navigation
 */
export function createPopStateHandler(onStateChange: (state: RouteState) => void) {
  return () => {
    const newState = parseUrl();
    onStateChange(newState);
  };
}

/**
 * Room code utilities
 */
export const RoomCodeUtils = {
  /**
   * Formats room code for display (adds spaces or dashes)
   */
  formatForDisplay: (code: string): string => {
    if (!isValidRoomCode(code)) return code;
    return code.split('').join('-');
  },
  
  /**
   * Normalizes room code input (removes spaces, converts to uppercase)
   */
  normalize: (input: string): string => {
    return input.replace(/\s/g, '').toUpperCase();
  },
  
  /**
   * Validates and normalizes room code input
   */
  validateAndNormalize: (input: string): { valid: boolean; code: string } => {
    const normalized = RoomCodeUtils.normalize(input);
    return {
      valid: isValidRoomCode(normalized),
      code: normalized
    };
  }
};