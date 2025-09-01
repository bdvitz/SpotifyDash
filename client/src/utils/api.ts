/**
 * API client utilities for backend communication
 */

// Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * API response wrapper type
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * API error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: Response
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Makes HTTP requests to the backend API
 * @param endpoint - API endpoint (without base URL)
 * @param options - Fetch options
 * @returns Promise with API response
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new ApiError(
        data?.error || data?.message || `HTTP ${response.status}`,
        response.status,
        response
      );
    }

    return {
      success: true,
      data,
      message: data?.message
    };
  } catch (error) {
    console.error(`API request failed: ${endpoint}`, error);
    
    if (error instanceof ApiError) {
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error occurred'
    };
  }
}

/**
 * GET request helper
 */
export async function apiGet<T = any>(endpoint: string): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { method: 'GET' });
}

/**
 * POST request helper
 */
export async function apiPost<T = any>(
  endpoint: string,
  data?: any
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined
  });
}

/**
 * PUT request helper
 */
export async function apiPut<T = any>(
  endpoint: string,
  data?: any
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined
  });
}

/**
 * DELETE request helper
 */
export async function apiDelete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { method: 'DELETE' });
}

/**
 * Health check endpoint
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await apiGet('/health');
    return response.success;
  } catch {
    return false;
  }
}

// Game Room API endpoints
export const gameApi = {
  /**
   * Creates a new game room
   */
  createRoom: async (hostData: { spotifyId: string; displayName: string }) => {
    return apiPost<{ roomCode: string; roomId: string }>('/api/rooms', hostData);
  },

  /**
   * Joins an existing game room
   */
  joinRoom: async (roomCode: string, playerData: { spotifyId: string; displayName: string }) => {
    return apiPost<{ roomId: string; players: any[] }>(`/api/rooms/${roomCode}/join`, playerData);
  },

  /**
   * Gets room information
   */
  getRoom: async (roomCode: string) => {
    return apiGet<{
      id: string;
      code: string;
      host: any;
      players: any[];
      isActive: boolean;
      gameType: string;
    }>(`/api/rooms/${roomCode}`);
  },

  /**
   * Leaves a game room
   */
  leaveRoom: async (roomCode: string, spotifyId: string) => {
    return apiDelete(`/api/rooms/${roomCode}/players/${spotifyId}`);
  },

  /**
   * Starts a game in the room
   */
  startGame: async (roomCode: string) => {
    return apiPost(`/api/rooms/${roomCode}/start`);
  },

  /**
   * Gets game state
   */
  getGameState: async (gameId: string) => {
    return apiGet(`/api/games/${gameId}/state`);
  }
};

// User API endpoints
export const userApi = {
  /**
   * Creates or updates user profile
   */
  upsertUser: async (userData: {
    spotifyId: string;
    displayName: string;
    email?: string;
    imageUrl?: string;
    country?: string;
  }) => {
    return apiPost<{ user: any }>('/api/users', userData);
  },

  /**
   * Gets user profile by Spotify ID
   */
  getUser: async (spotifyId: string) => {
    return apiGet<{ user: any }>(`/api/users/${spotifyId}`);
  },

  /**
   * Gets user's game history
   */
  getGameHistory: async (spotifyId: string) => {
    return apiGet<{ games: any[] }>(`/api/users/${spotifyId}/games`);
  }
};

/**
 * WebSocket connection utilities
 */
export class SocketManager {
  private socket: any = null;
  private listeners: Map<string, Function[]> = new Map();

  constructor() {
    // Socket.IO will be initialized when needed
  }

  /**
   * Connects to WebSocket server
   */
  async connect(userId: string): Promise<boolean> {
    try {
      // Dynamic import to avoid loading Socket.IO on initial page load
      const { io } = await import('socket.io-client');
      
      this.socket = io(API_BASE_URL, {
        query: { userId },
        transports: ['websocket', 'polling']
      });

      this.socket.on('connect', () => {
        console.log('Connected to game server');
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from game server');
      });

      // Re-register all listeners
      this.listeners.forEach((callbacks, event) => {
        callbacks.forEach(callback => {
          this.socket.on(event, callback);
        });
      });

      return true;
    } catch (error) {
      console.error('Failed to connect to game server:', error);
      return false;
    }
  }

  /**
   * Disconnects from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Adds event listener
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  /**
   * Removes event listener
   */
  off(event: string, callback?: Function): void {
    if (callback) {
      const callbacks = this.listeners.get(event) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
      if (this.socket) {
        this.socket.off(event, callback);
      }
    } else {
      this.listeners.delete(event);
      if (this.socket) {
        this.socket.off(event);
      }
    }
  }

  /**
   * Emits event to server
   */
  emit(event: string, data?: any): void {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  /**
   * Gets connection status
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Global socket manager instance
export const socketManager = new SocketManager();