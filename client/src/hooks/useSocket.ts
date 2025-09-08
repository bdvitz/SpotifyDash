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
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  isConnected: boolean;
  connectionError: string | null;
  
  roomState: RoomState | null;
  
  connect: () => Promise<void>;
  disconnect: () => void;
  joinRoom: (roomCode: string, spotifyId: string, musicData?: any) => void;
  setPlayerReady: (isReady: boolean) => void;
  attemptReconnection: () => Promise<boolean>;
  clearReconnectionData: () => void;
  
  startGame: (gameId: string, totalQuestions: number) => void;
  sendQuestion: (questionData: any) => void;
  submitAnswer: (questionNumber: number, selectedAnswer: number, responseTime: number) => void;
  sendResults: (resultData: any) => void;
  
  onPlayerConnected: (callback: (data: any) => void) => () => void;
  onPlayerDisconnected: (callback: (data: any) => void) => () => void;
  onPlayerReconnected: (callback: (data: any) => void) => () => void;
  onGameStarting: (callback: (data: any) => void) => () => void;
}

export function useSocket(): UseSocketReturn {
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);

  const connect = useCallback(async () => {
    try {
      setConnectionStatus('connecting');
      setConnectionError(null);
      
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      await socketManager.connect(apiUrl);
      
      // Update status after successful connection
      setConnectionStatus('connected');
      
    } catch (error) {
      setConnectionStatus('disconnected');
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
      console.error('Socket connection failed:', error);
    }
  }, []);

  const disconnect = useCallback(() => {
    socketManager.disconnect();
    setConnectionStatus('disconnected');
    setRoomState(null);
    setConnectionError(null);
    console.log('Socket disconnected');
  }, []);

  const joinRoom = useCallback((roomCode: string, spotifyId: string, musicData?: any) => {
    console.log(`Attempting to join room ${roomCode}`);
    socketManager.joinRoom(roomCode, spotifyId, musicData);
  }, []);

  const setPlayerReady = useCallback((isReady: boolean) => {
    socketManager.setPlayerReady(isReady);
  }, []);

  const attemptReconnection = useCallback(async () => {
    return await socketManager.attemptReconnection();
  }, []);

  const clearReconnectionData = useCallback(() => {
    socketManager.clearReconnectionData();
  }, []);

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

  const onPlayerConnected = useCallback((callback: (data: any) => void) => {
    socketManager.on('player-connected', callback);
    return () => socketManager.off('player-connected', callback);
  }, []);

  const onPlayerDisconnected = useCallback((callback: (data: any) => void) => {
    socketManager.on('player-disconnected', callback);
    return () => socketManager.off('player-disconnected', callback);
  }, []);

  const onPlayerReconnected = useCallback((callback: (data: any) => void) => {
    socketManager.on('player-reconnected', callback);
    return () => socketManager.off('player-reconnected', callback);
  }, []);

  const onGameStarting = useCallback((callback: (data: any) => void) => {
    socketManager.on('game-starting', callback);
    return () => socketManager.off('game-starting', callback);
  }, []);

  // Sync connection status with socketManager
  useEffect(() => {
    const syncStatus = () => {
      const managerStatus = socketManager.getConnectionStatus();
      if (managerStatus !== connectionStatus) {
        setConnectionStatus(managerStatus);
      }
    };

    // Check status every 100ms to keep in sync
    const statusInterval = setInterval(syncStatus, 100);
    
    return () => clearInterval(statusInterval);
  }, [connectionStatus]);

  useEffect(() => {
    const handleConnect = () => {
      setConnectionStatus('connected');
      setConnectionError(null);
      console.log('Socket connected successfully');
    };

    const handleDisconnect = () => {
      setConnectionStatus('disconnected');
      setRoomState(null);
      setConnectionError(null);
      console.log('Socket disconnected');
    };

    const handleError = (error: { message: string }) => {
      setConnectionError(error.message);
      console.error('Socket error:', error);
    };

    const handleRoomState = (data: { room: RoomState }) => {
      console.log('Room state updated:', data.room);
      setRoomState(data.room);
    };

    const handlePlayerConnected = (data: { playerId: string; displayName: string }) => {
      console.log('Player connected:', data.displayName);
    };

    const handlePlayerDisconnected = (data: { playerId: string; displayName: string; isHost: boolean }) => {
      console.log('Player disconnected:', data.displayName);
      
      if (data.isHost) {
        setConnectionError('Host left the room');
        setRoomState(null);
        return;
      }

      setRoomState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          players: prev.players.filter(p => p.id !== data.playerId)
        };
      });
    };

    const handlePlayerReconnected = (data: { playerId: string; displayName: string }) => {
      console.log('Player reconnected:', data.displayName);
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

    // Register all event listeners
    socketManager.on('connect', handleConnect);
    socketManager.on('disconnect', handleDisconnect);
    socketManager.on('error', handleError);
    socketManager.on('room-state', handleRoomState);
    socketManager.on('player-connected', handlePlayerConnected);
    socketManager.on('player-disconnected', handlePlayerDisconnected);
    socketManager.on('player-reconnected', handlePlayerReconnected);
    socketManager.on('player-ready-update', handlePlayerReadyUpdate);

    // Cleanup function
    return () => {
      socketManager.off('connect', handleConnect);
      socketManager.off('disconnect', handleDisconnect);
      socketManager.off('error', handleError);
      socketManager.off('room-state', handleRoomState);
      socketManager.off('player-connected', handlePlayerConnected);
      socketManager.off('player-disconnected', handlePlayerDisconnected);
      socketManager.off('player-reconnected', handlePlayerReconnected);
      socketManager.off('player-ready-update', handlePlayerReadyUpdate);
    };
  }, []);

  // Auto-connect logic - only attempt if disconnected
  useEffect(() => {
    if (connectionStatus === 'disconnected') {
      const timer = setTimeout(() => {
        connect();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [connect, connectionStatus]);

  return {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    connectionError,
    roomState,
    
    connect,
    disconnect,
    joinRoom,
    setPlayerReady,
    attemptReconnection,
    clearReconnectionData,
    
    startGame,
    sendQuestion,
    submitAnswer,
    sendResults,
    
    onPlayerConnected,
    onPlayerDisconnected,
    onPlayerReconnected,
    onGameStarting
  };
}