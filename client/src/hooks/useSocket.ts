import { useState, useEffect, useCallback } from 'react';
import { socketManager } from '../utils/socketManager';

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

interface UseSocketReturn {
  // Connection state
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  isConnected: boolean;
  connectionError: string | null;
  
  // Room state
  roomState: RoomState | null;
  
  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  joinRoom: (roomCode: string, spotifyId: string) => void;
  setPlayerReady: (isReady: boolean) => void;
  
  // Game actions (for host)
  startGame: (gameId: string, totalQuestions: number) => void;
  sendQuestion: (questionData: any) => void;
  submitAnswer: (questionNumber: number, selectedAnswer: number, responseTime: number) => void;
  sendResults: (resultData: any) => void;
  
  // Event handlers
  onPlayerConnected: (callback: (data: any) => void) => void;
  onPlayerDisconnected: (callback: (data: any) => void) => void;
  onGameStarting: (callback: (data: any) => void) => void;
}

export function useSocket(): UseSocketReturn {
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);

  // Connect to Socket.IO server
  const connect = useCallback(async () => {
    try {
      setConnectionStatus('connecting');
      setConnectionError(null);
      
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      await socketManager.connect(apiUrl);
      
      setConnectionStatus('connected');
      console.log('Socket connection established');
      
    } catch (error) {
      setConnectionStatus('disconnected');
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
      console.error('Socket connection failed:', error);
    }
  }, []);

  // Disconnect from server
  const disconnect = useCallback(() => {
    socketManager.disconnect();
    setConnectionStatus('disconnected');
    setRoomState(null);
    console.log('Socket disconnected');
  }, []);

  // Join room
  const joinRoom = useCallback((roomCode: string, spotifyId: string) => {
    console.log(`Attempting to join room ${roomCode}`);
    socketManager.joinRoom(roomCode, spotifyId);
  }, []);

  // Set player ready status
  const setPlayerReady = useCallback((isReady: boolean) => {
    socketManager.setPlayerReady(isReady);
  }, []);

  // Game actions
  const startGame = useCallback((gameId: string, totalQuestions: number) => {
    socketManager.startGame(gameId, totalQuestions);
  }, []);

  const sendQuestion = useCallback((questionData: any) => {
    socketManager.sendQuestion(questionData);
  }, []);

  const submitAnswer = useCallback((questionNumber: number, selectedAnswer: number, responseTime: number) => {
    socketManager.submitAnswer(questionNumber, selectedAnswer, responseTime);
  }, []);

  const sendResults = useCallback((resultData: any) => {
    socketManager.sendResults(resultData);
  }, []);

  // Event handler registration
  const onPlayerConnected = useCallback((callback: (data: any) => void) => {
    socketManager.on('player-connected', callback);
    return () => socketManager.off('player-connected', callback);
  }, []);

  const onPlayerDisconnected = useCallback((callback: (data: any) => void) => {
    socketManager.on('player-disconnected', callback);
    return () => socketManager.off('player-disconnected', callback);
  }, []);

  const onGameStarting = useCallback((callback: (data: any) => void) => {
    socketManager.on('game-starting', callback);
    return () => socketManager.off('game-starting', callback);
  }, []);

  // Set up core event listeners
  useEffect(() => {
    // Connection events
    const handleConnect = () => {
      setConnectionStatus('connected');
      setConnectionError(null);
      console.log('Socket connected');
    };

    const handleDisconnect = () => {
      setConnectionStatus('disconnected');
      setRoomState(null);
      console.log('Socket disconnected');
    };

    const handleError = (error: { message: string }) => {
      setConnectionError(error.message);
      console.error('Socket error:', error);
    };

    // Room events
    const handleRoomState = (data: { room: RoomState }) => {
      console.log('Room state updated:', data.room);
      setRoomState(data.room);
    };

    const handlePlayerReadyUpdate = (data: { spotifyId: string; isReady: boolean }) => {
      console.log('Player ready status updated:', data);
      setRoomState(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          players: prev.players.map(player =>
            player.spotifyId === data.spotifyId
              ? { ...player, isReady: data.isReady }
              : player
          )
        };
      });
    };

    // Register event listeners
    socketManager.on('connect', handleConnect);
    socketManager.on('disconnect', handleDisconnect);
    socketManager.on('error', handleError);
    socketManager.on('room-state', handleRoomState);
    socketManager.on('player-ready-update', handlePlayerReadyUpdate);

    // Cleanup on unmount
    return () => {
      socketManager.off('connect', handleConnect);
      socketManager.off('disconnect', handleDisconnect);
      socketManager.off('error', handleError);
      socketManager.off('room-state', handleRoomState);
      socketManager.off('player-ready-update', handlePlayerReadyUpdate);
    };
  }, []);

  // Auto-connect on mount if not connected
  useEffect(() => {
    if (connectionStatus === 'disconnected') {
      // Small delay to prevent connection spam
      const timer = setTimeout(() => {
        connect();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [connect, connectionStatus]);

  return {
    // State
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    connectionError,
    roomState,
    
    // Actions
    connect,
    disconnect,
    joinRoom,
    setPlayerReady,
    
    // Game actions
    startGame,
    sendQuestion,
    submitAnswer,
    sendResults,
    
    // Event handlers
    onPlayerConnected,
    onPlayerDisconnected,
    onGameStarting
  };
}