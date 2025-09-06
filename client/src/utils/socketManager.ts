import { io, Socket } from 'socket.io-client';

interface Player {
  id: string;
  displayName: string;
  imageUrl?: string;
  isHost: boolean;
  isReady: boolean;
  spotifyId: string;
}

interface RoomState {
  code: string;
  status: 'WAITING' | 'STARTING' | 'IN_GAME' | 'FINISHED';
  players: Player[];
}

interface SocketEvents {
  // Connection events
  'connect': () => void;
  'disconnect': () => void;
  'error': (error: { message: string }) => void;
  
  // Room events
  'room-state': (data: { room: RoomState }) => void;
  'player-connected': (data: { playerId: string; displayName: string }) => void;
  'player-disconnected': (data: { playerId: string; displayName: string; isHost: boolean }) => void;
  'player-ready-update': (data: { spotifyId: string; isReady: boolean }) => void;
  
  // Game events
  'game-starting': (data: { gameId: string; totalQuestions: number }) => void;
  'question-start': (data: { 
    questionNumber: number; 
    question: string; 
    options: string[]; 
    timeLimit: number; 
    startTime: number;
  }) => void;
  'answer-received': (data: { 
    playerId: string; 
    answersReceived: number; 
    totalPlayers: number; 
    allAnswered: boolean;
  }) => void;
  'question-results': (data: {
    questionNumber: number;
    correctAnswer: number;
    explanation: string;
    results: any[];
  }) => void;
  'scores-updated': (data: { scores: any[]; questionNumber: number }) => void;
  'game-finished': (data: { finalScores: any[]; gameStats: any }) => void;
  'game-paused': (data: { reason: string }) => void;
  'game-resumed': (data: { timeRemaining: number }) => void;
}

export class SocketManager {
  private socket: Socket | null = null;
  private connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  private eventListeners: Map<string, Function[]> = new Map();
  
  constructor() {
    // Initialize with empty state
  }

  /**
   * Connect to the Socket.IO server
   */
  connect(apiUrl: string = 'http://localhost:3001'): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      console.log('Connecting to Socket.IO server...');
      this.connectionStatus = 'connecting';

      this.socket = io(apiUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      // Connection success
      this.socket.on('connect', () => {
        console.log('Connected to Socket.IO server:', this.socket?.id);
        this.connectionStatus = 'connected';
        this.emitToListeners('connect');
        resolve();
      });

      // Connection error
      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        this.connectionStatus = 'disconnected';
        reject(error);
      });

      // Disconnection
      this.socket.on('disconnect', (reason) => {
        console.log('Disconnected from Socket.IO server:', reason);
        this.connectionStatus = 'disconnected';
        this.emitToListeners('disconnect');
      });

      // Error handling
      this.socket.on('error', (error) => {
        console.error('Socket error:', error);
        this.emitToListeners('error', error);
      });

      // Register all existing listeners
      this.reattachListeners();
    });
  }

  /**
   * Disconnect from the Socket.IO server
   */
  disconnect(): void {
    if (this.socket) {
      console.log('Disconnecting from Socket.IO server');
      this.socket.disconnect();
      this.socket = null;
      this.connectionStatus = 'disconnected';
    }
  }

  /**
   * Join a game room
   */
  joinRoom(roomCode: string, spotifyId: string): void {
    if (!this.socket?.connected) {
      console.error('Cannot join room - not connected to server');
      return;
    }

    console.log(`Joining room ${roomCode} as ${spotifyId}`);
    this.socket.emit('join-room', { roomCode, spotifyId });
  }

  /**
   * Update player ready status
   */
  setPlayerReady(isReady: boolean): void {
    if (!this.socket?.connected) {
      console.error('Cannot update ready status - not connected to server');
      return;
    }

    this.socket.emit('player-ready', { isReady });
  }

  /**
   * Host: Start the game
   */
  startGame(gameId: string, totalQuestions: number): void {
    if (!this.socket?.connected) {
      console.error('Cannot start game - not connected to server');
      return;
    }

    this.socket.emit('game-started', { gameId, totalQuestions });
  }

  /**
   * Host: Send new question to players
   */
  sendQuestion(questionData: {
    questionNumber: number;
    question: string;
    options: string[];
    timeLimit: number;
  }): void {
    if (!this.socket?.connected) {
      console.error('Cannot send question - not connected to server');
      return;
    }

    this.socket.emit('new-question', questionData);
  }

  /**
   * Player: Submit answer
   */
  submitAnswer(questionNumber: number, selectedAnswer: number, responseTime: number): void {
    if (!this.socket?.connected) {
      console.error('Cannot submit answer - not connected to server');
      return;
    }

    this.socket.emit('answer-submitted', {
      questionNumber,
      selectedAnswer,
      responseTime
    });
  }

  /**
   * Host: Send question results
   */
  sendResults(resultData: {
    questionNumber: number;
    correctAnswer: number;
    explanation: string;
    results: any[];
  }): void {
    if (!this.socket?.connected) {
      console.error('Cannot send results - not connected to server');
      return;
    }

    this.socket.emit('question-results', resultData);
  }

  /**
   * Host: Update scores
   */
  updateScores(scores: any[], questionNumber: number): void {
    if (!this.socket?.connected) {
      console.error('Cannot update scores - not connected to server');
      return;
    }

    this.socket.emit('scores-update', { scores, questionNumber });
  }

  /**
   * Host: End game
   */
  endGame(finalScores: any[], gameStats: any): void {
    if (!this.socket?.connected) {
      console.error('Cannot end game - not connected to server');
      return;
    }

    this.socket.emit('game-ended', { finalScores, gameStats });
  }

  /**
   * Add event listener
   */
  on<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);

    // Attach to socket if connected
    if (this.socket?.connected) {
      this.socket.on(event, callback as any);
    }
  }

  /**
   * Remove event listener
   */
  off<K extends keyof SocketEvents>(event: K, callback?: SocketEvents[K]): void {
    if (callback) {
      const listeners = this.eventListeners.get(event) || [];
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
      
      if (this.socket?.connected) {
        this.socket.off(event, callback as any);
      }
    } else {
      this.eventListeners.delete(event);
      if (this.socket?.connected) {
        this.socket.off(event);
      }
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): 'disconnected' | 'connecting' | 'connected' {
    return this.connectionStatus;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Reattach all registered listeners to socket
   */
  private reattachListeners(): void {
    if (!this.socket) return;

    this.eventListeners.forEach((callbacks, event) => {
      callbacks.forEach(callback => {
        this.socket!.on(event, callback as any);
      });
    });
  }

  /**
   * Emit to registered listeners
   */
  private emitToListeners(event: string, ...args: any[]): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Error in ${event} listener:`, error);
      }
    });
  }
}

// Singleton instance
export const socketManager = new SocketManager();