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

    // Join room
    socket.on('join-room', async (data) => {
      try {
        const { roomCode, spotifyId } = data;
        
        if (!roomCode || !spotifyId) {
          socket.emit('error', { message: 'Missing room code or player ID' });
          return;
        }

        // Verify room and player exist
        const room = await prisma.room.findUnique({
          where: { code: roomCode.toUpperCase() },
          include: { players: true }
        });

        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        const player = room.players.find(p => p.spotifyId === spotifyId);
        if (!player) {
          socket.emit('error', { message: 'Player not in room' });
          return;
        }

        // Store connection info
        socket.roomCode = room.code;
        socket.spotifyId = spotifyId;
        socket.playerId = player.id;

        // Join socket room
        socket.join(room.code);

        console.log(`Player ${player.displayName} connected to room ${room.code}`);

        // Notify others of connection
        socket.to(room.code).emit('player-connected', {
          playerId: player.id,
          displayName: player.displayName
        });

        // Send current room state to new connection
        socket.emit('room-state', {
          room: {
            code: room.code,
            status: room.status,
            players: room.players.map(p => ({
              id: p.id,
              displayName: p.displayName,
              imageUrl: p.imageUrl,
              isHost: p.isHost,
              isReady: p.isReady
            }))
          }
        });

      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { message: 'Failed to join room' });
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

        // Update player ready status
        await prisma.roomPlayer.update({
          where: {
            roomId_spotifyId: {
              roomId: (await prisma.room.findUnique({ where: { code: socket.roomCode } }))!.id,
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

      } catch (error) {
        console.error('Error updating ready status:', error);
        socket.emit('error', { message: 'Failed to update ready status' });
      }
    });

    // Game started event
    socket.on('game-started', (data) => {
      if (!socket.roomCode) return;
      
      // Broadcast to all players in room
      socket.to(socket.roomCode).emit('game-starting', {
        gameId: data.gameId,
        totalQuestions: data.totalQuestions
      });
    });

    // New question event
    socket.on('new-question', (data) => {
      if (!socket.roomCode) return;
      
      const { questionNumber, question, options, timeLimit } = data;
      
      // Broadcast question to all players (except host)
      socket.to(socket.roomCode).emit('question-start', {
        questionNumber,
        question,
        options,
        timeLimit,
        startTime: Date.now()
      });
    });

    // Answer submitted event
    socket.on('answer-submitted', async (data) => {
      if (!socket.roomCode) return;
      
      try {
        const { questionNumber, selectedAnswer, responseTime } = data;
        
        // Get room info to check how many players have answered
        const room = await prisma.room.findUnique({
          where: { code: socket.roomCode },
          include: {
            players: true,
            games: {
              where: { status: 'IN_PROGRESS' },
              include: {
                answers: {
                  where: { questionNumber }
                }
              }
            }
          }
        });

        if (room && room.games[0]) {
          const game = room.games[0];
          const totalPlayers = room.players.length;
          const answersReceived = game.answers.length;

          // Broadcast answer count to room
          io.to(socket.roomCode).emit('answer-received', {
            playerId: socket.playerId,
            answersReceived: answersReceived + 1,
            totalPlayers,
            allAnswered: answersReceived + 1 >= totalPlayers
          });
        }

      } catch (error) {
        console.error('Error handling answer submission:', error);
      }
    });

    // Question results event
    socket.on('question-results', (data) => {
      if (!socket.roomCode) return;
      
      const { questionNumber, correctAnswer, explanation, results } = data;
      
      // Broadcast results to all players
      io.to(socket.roomCode).emit('question-results', {
        questionNumber,
        correctAnswer,
        explanation,
        results
      });
    });

    // Game scores update
    socket.on('scores-update', (data) => {
      if (!socket.roomCode) return;
      
      // Broadcast current scores to all players
      io.to(socket.roomCode).emit('scores-updated', {
        scores: data.scores,
        questionNumber: data.questionNumber
      });
    });

    // Game ended event
    socket.on('game-ended', (data) => {
      if (!socket.roomCode) return;
      
      // Broadcast final results to all players
      io.to(socket.roomCode).emit('game-finished', {
        finalScores: data.finalScores,
        gameStats: data.gameStats
      });
    });

    // Host controls
    socket.on('pause-game', (data) => {
      if (!socket.roomCode) return;
      
      socket.to(socket.roomCode).emit('game-paused', {
        reason: data.reason || 'Host paused the game'
      });
    });

    socket.on('resume-game', (data) => {
      if (!socket.roomCode) return;
      
      socket.to(socket.roomCode).emit('game-resumed', {
        timeRemaining: data.timeRemaining
      });
    });

    // Player disconnection
    socket.on('disconnect', async () => {
      console.log('Client disconnected:', socket.id);
      
      if (socket.roomCode && socket.spotifyId) {
        try {
          // Find player info
          const room = await prisma.room.findUnique({
            where: { code: socket.roomCode },
            include: { players: true }
          });

          if (room) {
            const player = room.players.find(p => p.spotifyId === socket.spotifyId);
            
            if (player) {
              // Notify others of disconnection
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

    // Error handling
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });
}