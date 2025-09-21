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
  'connect': () => void;
  'disconnect': () => void;
  'error': (error: { message: string }) => void;
  
  'room-state': (data: { room: RoomState }) => void;
  'player-connected': (data: { playerId: string; displayName: string }) => void;
  'player-disconnected': (data: { playerId: string; displayName: string; isHost: boolean }) => void;
  'player-ready-update': (data: { spotifyId: string; isReady: boolean }) => void;
  'player-reconnected': (data: { playerId: string; displayName: string }) => void;
  'join-room-success': (data: { playerId: string; roomCode: string; isNewPlayer: boolean }) => void;
  
  'game-start-initiated': (data: { hostName: string; playerCount: number; estimatedLoadTime: number }) => void;
  'game-started': (data: { gameId: string; totalQuestions: number; players: any[] }) => void;
  'game-start-failed': (data: { message: string }) => void;
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

interface PlayerSocket extends Socket {
  roomCode?: string;
  spotifyId?: string;
  playerId?: string;
}

interface ReconnectionInfo {
  roomCode: string;
  spotifyId: string;
  reconnectionToken: string;
  deviceId: string;
  lastActiveAt: number;
}

export class SocketManager {
  private socket: PlayerSocket | null = null;
  private connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  private eventListeners: Map<string, Function[]> = new Map();
  private reconnectionInfo: ReconnectionInfo | null = null;
  
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

      this.socket.on('connect', () => {
        console.log('Connected to Socket.IO server:', this.socket?.id);
        this.connectionStatus = 'connected';
        this.emitToListeners('connect');
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        this.connectionStatus = 'disconnected';
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Disconnected from Socket.IO server:', reason);
        this.connectionStatus = 'disconnected';
        this.emitToListeners('disconnect');
      });

      this.socket.on('error', (error) => {
        console.error('Socket error:', error);
        this.emitToListeners('error', error);
      });

      this.reattachListeners();
    });
  }

  disconnect(): void {
    if (this.socket) {
      console.log('Disconnecting from Socket.IO server');
      this.socket.disconnect();
      this.socket = null;
      this.connectionStatus = 'disconnected';
    }
  }

  joinRoom(roomCode: string, spotifyId: string, musicData?: any): void {
    if (!this.socket?.connected) {
      console.error('Cannot join room - not connected to server');
      return;
    }

    const deviceId = this.getOrCreateDeviceId();
    const reconnectionToken = crypto.randomUUID();
    
    this.reconnectionInfo = {
      roomCode,
      spotifyId,
      reconnectionToken,
      deviceId,
      lastActiveAt: Date.now()
    };
    
    localStorage.setItem('inclew_reconnection', JSON.stringify(this.reconnectionInfo));

    console.log(`Joining room ${roomCode} as ${spotifyId}`);
    this.socket.emit('join-room', { 
      roomCode, 
      spotifyId, 
      reconnectionToken,
      deviceId,
      musicData
    });
  }

  async attemptReconnection(): Promise<boolean> {
    const stored = localStorage.getItem('inclew_reconnection');
    if (!stored) return false;

    try {
      const reconnectionInfo: ReconnectionInfo = JSON.parse(stored);
      
      const maxAge = 30 * 60 * 1000;
      if (Date.now() - reconnectionInfo.lastActiveAt > maxAge) {
        localStorage.removeItem('inclew_reconnection');
        return false;
      }

      if (!this.socket?.connected) {
        await this.connect();
      }

      console.log(`Attempting to reconnect to room ${reconnectionInfo.roomCode}`);
      this.socket?.emit('reconnect-to-room', {
        roomCode: reconnectionInfo.roomCode,
        spotifyId: reconnectionInfo.spotifyId,
        reconnectionToken: reconnectionInfo.reconnectionToken,
        deviceId: reconnectionInfo.deviceId
      });

      this.reconnectionInfo = reconnectionInfo;
      return true;
    } catch (error) {
      console.error('Reconnection failed:', error);
      localStorage.removeItem('inclew_reconnection');
      return false;
    }
  }

  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem('inclew_device_id');
    
    if (!deviceId) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx?.fillText('inclew-device-id', 10, 10);
      const canvasFingerprint = canvas.toDataURL();
      
      const browserInfo = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        canvasFingerprint.slice(-50)
      ].join('|');
      
      deviceId = btoa(browserInfo).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16) + '_' + crypto.randomUUID().slice(0, 8);
      localStorage.setItem('inclew_device_id', deviceId);
    }
    
    return deviceId;
  }

  clearReconnectionData(): void {
    this.reconnectionInfo = null;
    localStorage.removeItem('inclew_reconnection');
  }

  getReconnectionInfo(): ReconnectionInfo | null {
    return this.reconnectionInfo;
  }

  setPlayerReady(isReady: boolean): void {
    if (!this.socket?.connected) {
      console.error('Cannot update ready status - not connected to server');
      return;
    }

    this.socket.emit('player-ready', { isReady });
  }

  // Host game control methods
  startGame(): void {
    if (!this.socket?.connected) {
      console.error('Cannot start game - not connected to server');
      return;
    }

    console.log('Host starting game...');
    this.socket.emit('start-game', {});
  }

  // Game flow methods
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

  updateScores(scores: any[], questionNumber: number): void {
    if (!this.socket?.connected) {
      console.error('Cannot update scores - not connected to server');
      return;
    }

    this.socket.emit('scores-update', { scores, questionNumber });
  }

  endGame(finalScores: any[], gameStats: any): void {
    if (!this.socket?.connected) {
      console.error('Cannot end game - not connected to server');
      return;
    }

    this.socket.emit('game-ended', { finalScores, gameStats });
  }

  // Generic emit method for custom events
  emit(event: string, data?: any): void {
    if (!this.socket?.connected) {
      console.error(`Cannot emit ${event} - not connected to server`);
      return;
    }

    this.socket.emit(event, data);
  }

  on<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);

    if (this.socket?.connected) {
      this.socket.on(event, callback as any);
    }
  }

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

  getConnectionStatus(): 'disconnected' | 'connecting' | 'connected' {
    return this.connectionStatus;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  private reattachListeners(): void {
    if (!this.socket) return;

    this.eventListeners.forEach((callbacks, event) => {
      callbacks.forEach(callback => {
        this.socket!.on(event, callback as any);
      });
    });
  }

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

export const socketManager = new SocketManager();