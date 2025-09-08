import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';

interface PlayerSocket extends Socket {
  roomCode?: string;
  spotifyId?: string;
  playerId?: string;
}

export function setupGameSocket(io: Server, prisma: PrismaClient) {
  io.on('connection', (socket: PlayerSocket) => {
    console.log('Client connected:', socket.id);

    // Join room - handles both existing players and new connections
    socket.on('join-room', async (data) => {
      try {
        const { roomCode, spotifyId, reconnectionToken, deviceId, musicData } = data;
        
        if (!roomCode || !spotifyId) {
          socket.emit('error', { message: 'Missing room code or player ID' });
          return;
        }

        console.log(`Join room request: ${roomCode} by ${spotifyId}`);

        // Verify room exists and is active
        const room = await prisma.room.findUnique({
          where: { code: roomCode.toUpperCase() },
          include: { players: true }
        });

        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        if (!room.isActive) {
          socket.emit('error', { message: 'Room is no longer active' });
          return;
        }

        // Find existing player or prepare for new player
        let player = room.players.find(p => p.spotifyId === spotifyId);
        
        if (player) {
          // Existing player reconnecting via Socket.IO
          console.log(`Player ${player.displayName} connecting via Socket.IO to room ${room.code}`);
          
          // Update reconnection data if provided
          if (reconnectionToken && deviceId) {
            await prisma.roomPlayer.update({
              where: { id: player.id },
              data: {
                reconnectionToken,
                deviceId,
                lastActiveAt: new Date()
              }
            });
          }
        } else {
          // New player - this should only happen in test scenarios
          // In normal flow, players join via HTTP API first
          console.log(`New player ${spotifyId} joining room ${room.code} directly via Socket.IO`);
          
          if (room.status !== 'WAITING') {
            socket.emit('error', { message: 'Game already in progress' });
            return;
          }

          if (room.players.length >= room.maxPlayers) {
            socket.emit('error', { message: 'Room is full' });
            return;
          }

          // Allow direct socket join for testing purposes
          // Create the player record
          player = await prisma.roomPlayer.create({
            data: {
              roomId: room.id,
              spotifyId,
              displayName: `Player_${spotifyId.slice(-4)}`, // Fallback name
              imageUrl: null,
              isHost: false,
              isReady: false,
              reconnectionToken,
              deviceId,
              musicData
            }
          });

          console.log(`Created new player ${player.displayName} via Socket.IO join`);
        }

        // Store connection info on socket
        socket.roomCode = room.code;
        socket.spotifyId = spotifyId;
        socket.playerId = player.id;

        // Join socket room
        socket.join(room.code);

        console.log(`Player ${player.displayName} connected to room ${room.code}`);

        // Get updated room data including the new player
        const updatedRoom = await prisma.room.findUnique({
          where: { code: room.code },
          include: { players: { orderBy: { joinedAt: 'asc' } } }
        });

        if (updatedRoom) {
          // Send current room state to new connection
          socket.emit('room-state', {
            room: {
              code: updatedRoom.code,
              status: updatedRoom.status,
              players: updatedRoom.players.map(p => ({
                id: p.id,
                displayName: p.displayName,
                imageUrl: p.imageUrl,
                isHost: p.isHost,
                isReady: p.isReady,
                spotifyId: p.spotifyId
              }))
            }
          });

          // Notify others of connection (but not the connecting player)
          socket.to(room.code).emit('player-connected', {
            playerId: player.id,
            displayName: player.displayName
          });
        }

      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Host starts game
    socket.on('start-game', async (data) => {
      try {
        if (!socket.roomCode || !socket.spotifyId) {
          socket.emit('error', { message: 'Not connected to room' });
          return;
        }

        const room = await prisma.room.findUnique({
          where: { code: socket.roomCode },
          include: { players: true }
        });

        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Verify player is host
        const host = room.players.find(p => p.spotifyId === socket.spotifyId && p.isHost);
        if (!host) {
          socket.emit('error', { message: 'Only the host can start the game' });
          return;
        }

        // Check minimum player count (1 for testing)
        if (room.players.length < 1) {
          socket.emit('error', { message: 'At least 1 player required to start' });
          return;
        }

        // Update room status to starting
        await prisma.room.update({
          where: { id: room.id },
          data: { status: 'STARTING' }
        });

        console.log(`Host ${host.displayName} starting game in room ${room.code} with ${room.players.length} players`);

        // Notify all players that game is starting
        io.to(socket.roomCode).emit('game-start-initiated', {
          hostName: host.displayName,
          playerCount: room.players.length,
          estimatedLoadTime: 10000 // 10 seconds for question generation
        });

        // Simulate question generation process
        setTimeout(async () => {
          try {
            // Create game record
            const game = await prisma.game.create({
              data: {
                roomId: room.id,
                status: 'IN_PROGRESS',
                totalQuestions: 10,
                startedAt: new Date()
              }
            });

            // Update room status
            await prisma.room.update({
              where: { id: room.id },
              data: { status: 'IN_GAME' }
            });

            // Initialize scores for all players
            const scorePromises = room.players.map(player =>
              prisma.gameScore.create({
                data: {
                  gameId: game.id,
                  playerId: player.id,
                  totalScore: 0,
                  correctAnswers: 0,
                  totalAnswers: 0,
                  averageTime: 0
                }
              })
            );

            await Promise.all(scorePromises);

            // Notify all players that game has started
            io.to(socket.roomCode!).emit('game-started', {
              gameId: game.id,
              totalQuestions: game.totalQuestions,
              players: room.players.map(p => ({
                id: p.id,
                displayName: p.displayName,
                imageUrl: p.imageUrl
              }))
            });

            console.log(`Game ${game.id} started in room ${room.code}`);

          } catch (error) {
            console.error('Error creating game:', error);
            io.to(socket.roomCode!).emit('game-start-failed', {
              message: 'Failed to initialize game'
            });
          }
        }, 3000); // 3 second delay for loading

      } catch (error) {
        console.error('Error starting game:', error);
        socket.emit('error', { message: 'Failed to start game' });
      }
    });

    // Player ready status update
    socket.on('player-ready', async (data) => {
      try {
        const { isReady } = data;
        
        if (!socket.roomCode || !socket.spotifyId) {
          socket.emit('error', { message: 'Not connected to room' });
          return;
        }

        const room = await prisma.room.findUnique({
          where: { code: socket.roomCode }
        });

        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Update player ready status
        await prisma.roomPlayer.update({
          where: {
            roomId_spotifyId: {
              roomId: room.id,
              spotifyId: socket.spotifyId
            }
          },
          data: { isReady }
        });

        // Broadcast to room
        io.to(socket.roomCode).emit('player-ready-update', {
          spotifyId: socket.spotifyId,
          isReady
        });

        console.log(`Player ${socket.spotifyId} ready status: ${isReady}`);

      } catch (error) {
        console.error('Error updating ready status:', error);
        socket.emit('error', { message: 'Failed to update ready status' });
      }
    });

    // Reconnection handler (keep existing logic)
    socket.on('reconnect-to-room', async (data) => {
      try {
        const { roomCode, spotifyId, reconnectionToken, deviceId } = data;
        
        const room = await prisma.room.findUnique({
          where: { code: roomCode.toUpperCase() },
          include: { players: true }
        });

        if (!room || !room.isActive) {
          socket.emit('error', { message: 'Room no longer exists' });
          return;
        }

        const player = room.players.find(p => 
          p.spotifyId === spotifyId && 
          p.reconnectionToken === reconnectionToken &&
          p.deviceId === deviceId
        );

        if (!player) {
          socket.emit('error', { message: 'Invalid reconnection credentials' });
          return;
        }

        const maxAge = 30 * 60 * 1000;
        if (Date.now() - player.lastActiveAt.getTime() > maxAge) {
          socket.emit('error', { message: 'Reconnection expired' });
          return;
        }

        socket.roomCode = room.code;
        socket.spotifyId = spotifyId;
        socket.playerId = player.id;
        socket.join(room.code);

        await prisma.roomPlayer.update({
          where: { id: player.id },
          data: { lastActiveAt: new Date() }
        });

        console.log(`Player ${player.displayName} reconnected to room ${room.code}`);

        socket.emit('room-state', {
          room: {
            code: room.code,
            status: room.status,
            players: room.players.map(p => ({
              id: p.id,
              displayName: p.displayName,
              imageUrl: p.imageUrl,
              isHost: p.isHost,
              isReady: p.isReady,
              spotifyId: p.spotifyId
            }))
          }
        });

        socket.to(room.code).emit('player-reconnected', {
          playerId: player.id,
          displayName: player.displayName
        });

      } catch (error) {
        console.error('Error handling reconnection:', error);
        socket.emit('error', { message: 'Reconnection failed' });
      }
    });

    // Keep all other existing handlers (game events, disconnect, etc.)
    // ... [rest of existing socket handlers] ...

    // Player disconnection
    socket.on('disconnect', async () => {
      console.log('Client disconnected:', socket.id);
      
      if (socket.roomCode && socket.spotifyId) {
        try {
          const room = await prisma.room.findUnique({
            where: { code: socket.roomCode },
            include: { players: true }
          });

          if (room) {
            const player = room.players.find(p => p.spotifyId === socket.spotifyId);
            
            if (player) {
              socket.to(socket.roomCode).emit('player-disconnected', {
                playerId: player.id,
                displayName: player.displayName,
                isHost: player.isHost
              });

              console.log(`Player ${player.displayName} disconnected from room ${socket.roomCode}`);
            }
          }
        } catch (error) {
          console.error('Error handling disconnect:', error);
        }
      }
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });
}