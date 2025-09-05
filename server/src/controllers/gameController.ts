import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Start game
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { roomCode, hostSpotifyId, questionHash } = req.body;

    if (!roomCode || !hostSpotifyId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const room = await prisma.room.findUnique({
      where: { code: roomCode.toUpperCase() },
      include: {
        players: true,
        games: {
          where: { status: { in: ['STARTING', 'IN_PROGRESS', 'PAUSED'] } }
        }
      }
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Verify host
    const host = room.players.find(p => p.spotifyId === hostSpotifyId && p.isHost);
    if (!host) {
      return res.status(403).json({ error: 'Only the host can start the game' });
    }

    // Check if game already active
    if (room.games.length > 0) {
      return res.status(409).json({ error: 'Game already in progress' });
    }

    // Verify all players are ready (have shared music data)
    const unreadyPlayers = room.players.filter(p => !p.isReady || !p.musicData);
    if (unreadyPlayers.length > 0) {
      return res.status(409).json({ 
        error: 'Not all players are ready',
        unreadyPlayers: unreadyPlayers.map(p => p.displayName)
      });
    }

    // Minimum 2 players required
    if (room.players.length < 2) {
      return res.status(409).json({ error: 'At least 2 players required to start' });
    }

    // Create game and initialize scores
    const result = await prisma.$transaction(async (tx) => {
      // Update room status
      await tx.room.update({
        where: { id: room.id },
        data: { status: 'IN_GAME' }
      });

      // Create game
      const game = await tx.game.create({
        data: {
          roomId: room.id,
          status: 'STARTING',
          totalQuestions: (room.settings as any)?.questionsCount || 10,
          hostQuestionHash: questionHash,
          startedAt: new Date()
        }
      });

      // Initialize scores for all players
      const scorePromises = room.players.map(player =>
        tx.gameScore.create({
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

      return game;
    });

    console.log(`Game started in room ${roomCode} with ${room.players.length} players`);

    res.json({
      gameId: result.id,
      totalQuestions: result.totalQuestions,
      players: room.players.map(p => ({
        id: p.id,
        displayName: p.displayName,
        imageUrl: p.imageUrl
      }))
    });

  } catch (error) {
    console.error('Error starting game:', error);
    res.status(500).json({ error: 'Failed to start game' });
  }
});

// Submit answer
router.post('/:gameId/answer', async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const { spotifyId, questionNumber, selectedAnswer, responseTime } = req.body;

    if (selectedAnswer === undefined || questionNumber === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        room: {
          include: {
            players: true
          }
        }
      }
    });

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (game.status !== 'IN_PROGRESS') {
      return res.status(409).json({ error: 'Game not in progress' });
    }

    const player = game.room.players.find(p => p.spotifyId === spotifyId);
    if (!player) {
      return res.status(404).json({ error: 'Player not in game' });
    }

    // Check if answer already submitted for this question
    const existingAnswer = await prisma.gameAnswer.findUnique({
      where: {
        gameId_playerId_questionNumber: {
          gameId,
          playerId: player.id,
          questionNumber
        }
      }
    });

    if (existingAnswer) {
      return res.status(409).json({ error: 'Answer already submitted for this question' });
    }

    // Note: We don't validate the correct answer here since questions are generated client-side
    // The host will provide the correct answer when revealing results
    const answer = await prisma.gameAnswer.create({
      data: {
        gameId,
        playerId: player.id,
        questionNumber,
        selectedAnswer,
        isCorrect: false, // Will be updated when results are revealed
        responseTime: responseTime || 20000
      }
    });

    console.log(`Answer submitted: ${player.displayName} answered ${selectedAnswer} for Q${questionNumber}`);

    res.json({ success: true, answerId: answer.id });

  } catch (error) {
    console.error('Error submitting answer:', error);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
});

// Update question results (called by host)
router.post('/:gameId/results', async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const { hostSpotifyId, questionNumber, correctAnswer, questionHash } = req.body;

    if (correctAnswer === undefined || questionNumber === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        room: {
          include: {
            players: true
          }
        },
        answers: {
          where: { questionNumber },
          include: { player: true }
        }
      }
    });

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Verify host
    const host = game.room.players.find(p => p.spotifyId === hostSpotifyId && p.isHost);
    if (!host) {
      return res.status(403).json({ error: 'Only the host can submit results' });
    }

    // Update answer correctness and scores
    const updates = await prisma.$transaction(async (tx) => {
      // Update answers with correct/incorrect status
      const answerUpdates = game.answers.map(async (answer) => {
        const isCorrect = answer.selectedAnswer === correctAnswer;
        return tx.gameAnswer.update({
          where: { id: answer.id },
          data: { isCorrect }
        });
      });

      await Promise.all(answerUpdates);

      // Update player scores
      const scoreUpdates = game.answers.map(async (answer) => {
        const isCorrect = answer.selectedAnswer === correctAnswer;
        const score = isCorrect ? 100 : 0; // Simple scoring: 100 points per correct answer

        return tx.gameScore.update({
          where: {
            gameId_playerId: {
              gameId,
              playerId: answer.playerId
            }
          },
          data: {
            totalScore: { increment: score },
            correctAnswers: isCorrect ? { increment: 1 } : undefined,
            totalAnswers: { increment: 1 }
          }
        });
      });

      await Promise.all(scoreUpdates);

      // Update game current question
      await tx.game.update({
        where: { id: gameId },
        data: { currentQuestion: questionNumber }
      });

      return game.answers;
    });

    console.log(`Results updated for Q${questionNumber} in game ${gameId}, correct answer: ${correctAnswer}`);

    res.json({
      success: true,
      questionNumber,
      correctAnswer,
      results: game.answers.map(answer => ({
        playerId: answer.playerId,
        playerName: answer.player.displayName,
        selectedAnswer: answer.selectedAnswer,
        isCorrect: answer.selectedAnswer === correctAnswer,
        responseTime: answer.responseTime
      }))
    });

  } catch (error) {
    console.error('Error updating results:', error);
    res.status(500).json({ error: 'Failed to update results' });
  }
});

// Get current scores
router.get('/:gameId/scores', async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;

    const scores = await prisma.gameScore.findMany({
      where: { gameId },
      include: {
        player: {
          select: {
            displayName: true,
            imageUrl: true,
            spotifyId: true
          }
        }
      },
      orderBy: { totalScore: 'desc' }
    });

    res.json({
      scores: scores.map(score => ({
        playerId: score.playerId,
        playerName: score.player.displayName,
        imageUrl: score.player.imageUrl,
        spotifyId: score.player.spotifyId,
        totalScore: score.totalScore,
        correctAnswers: score.correctAnswers,
        totalAnswers: score.totalAnswers,
        averageTime: score.averageTime
      }))
    });

  } catch (error) {
    console.error('Error fetching scores:', error);
    res.status(500).json({ error: 'Failed to fetch scores' });
  }
});

// End game
router.post('/:gameId/end', async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const { hostSpotifyId } = req.body;

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        room: {
          include: {
            players: true
          }
        }
      }
    });

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Verify host
    const host = game.room.players.find(p => p.spotifyId === hostSpotifyId && p.isHost);
    if (!host) {
      return res.status(403).json({ error: 'Only the host can end the game' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.game.update({
        where: { id: gameId },
        data: {
          status: 'FINISHED',
          endedAt: new Date()
        }
      });

      await tx.room.update({
        where: { id: game.roomId },
        data: { status: 'WAITING' }
      });
    });

    console.log(`Game ended: ${gameId}`);

    res.json({ success: true });

  } catch (error) {
    console.error('Error ending game:', error);
    res.status(500).json({ error: 'Failed to end game' });
  }
});

export default router;