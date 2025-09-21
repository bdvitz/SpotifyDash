import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Generate collision-free 4-character room code
async function generateUniqueRoomCode(): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let attempts = 0;
  const maxAttempts = 50;
  
  while (attempts < maxAttempts) {
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const existing = await prisma.room.findUnique({ 
      where: { code },
      select: { id: true }
    });
    
    if (!existing) {
      console.log(`Generated unique room code: ${code} (attempt ${attempts + 1})`);
      return code;
    }
    
    attempts++;
    console.log(`Room code ${code} already exists, retrying... (attempt ${attempts})`);
  }
  
  throw new Error(`Failed to generate unique room code after ${maxAttempts} attempts`);
}

// Create new room
router.post('/', async (req: Request, res: Response) => {
  try {
    const { spotifyId, displayName, imageUrl } = req.body;

    if (!spotifyId || !displayName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const roomCode = await generateUniqueRoomCode();

    const result = await prisma.$transaction(async (tx) => {
      const room = await tx.room.create({
        data: {
          code: roomCode,
          hostId: spotifyId,
          status: 'WAITING'
        }
      });

      const hostPlayer = await tx.roomPlayer.create({
        data: {
          roomId: room.id,
          spotifyId,
          displayName,
          imageUrl: imageUrl || null,
          isHost: true,
          isReady: true
        }
      });

      return { room, hostPlayer };
    });

    console.log(`Room created: ${roomCode} by ${displayName} (host counts as player)`);

    res.json({
      roomCode: result.room.code,
      roomId: result.room.id,
      hostPlayer: {
        id: result.hostPlayer.id,
        spotifyId: result.hostPlayer.spotifyId,
        displayName: result.hostPlayer.displayName,
        imageUrl: result.hostPlayer.imageUrl,
        isHost: result.hostPlayer.isHost,
        isReady: result.hostPlayer.isReady
      }
    });

  } catch (error) {
    console.error('Error creating room:', error);
    
    if (error instanceof Error && error.message.includes('Failed to generate unique room code')) {
      res.status(503).json({ error: 'Service temporarily unavailable - please try again' });
    } else {
      res.status(500).json({ error: 'Failed to create room' });
    }
  }
});

// Get room information
router.get('/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    const room = await prisma.room.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        players: {
          select: {
            id: true,
            spotifyId: true,
            displayName: true,
            imageUrl: true,
            isHost: true,
            isReady: true,
            joinedAt: true
          },
          orderBy: { joinedAt: 'asc' }
        },
        games: {
          where: { status: { in: ['STARTING', 'IN_PROGRESS', 'PAUSED'] } },
          select: { id: true, status: true, currentQuestion: true }
        }
      }
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!room.isActive) {
      return res.status(410).json({ error: 'Room is no longer active' });
    }

    res.json({
      id: room.id,
      code: room.code,
      status: room.status,
      maxPlayers: room.maxPlayers,
      settings: room.settings,
      players: room.players,
      currentGame: room.games[0] || null,
      createdAt: room.createdAt,
      playerCount: room.players.length
    });

  } catch (error) {
    console.error('Error fetching room:', error);
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

// Join room - UPDATED to allow rejoining games in progress
router.post('/:code/join', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const { spotifyId, displayName, imageUrl } = req.body;

    if (!spotifyId || !displayName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const room = await prisma.room.findUnique({
      where: { code: code.toUpperCase() },
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

    if (!room.isActive) {
      return res.status(410).json({ error: 'Room is no longer active' });
    }

    // Check if player already in room (ALLOW REJOINING)
    const existingPlayer = room.players.find(p => p.spotifyId === spotifyId);
    if (existingPlayer) {
      console.log(`Player ${displayName} rejoining room ${code} (status: ${room.status})`);
      
      // Return existing player info - no error for game in progress
      return res.json({
        roomId: room.id,
        player: {
          id: existingPlayer.id,
          spotifyId: existingPlayer.spotifyId,
          displayName: existingPlayer.displayName,
          imageUrl: existingPlayer.imageUrl,
          isHost: existingPlayer.isHost,
          isReady: existingPlayer.isReady
        },
        playerCount: room.players.length,
        currentGame: room.games[0] || null,
        message: room.status === 'IN_GAME' ? 'Rejoined game in progress' : 'Player already in room'
      });
    }

    // For NEW players, prevent joining if game has started
    if (room.status === 'IN_GAME' || room.status === 'STARTING') {
      return res.status(409).json({ 
        error: 'Cannot join - game already in progress',
        canSpectate: true // Future feature
      });
    }

    if (room.players.length >= room.maxPlayers) {
      return res.status(409).json({ error: 'Room is full' });
    }

    const newPlayer = await prisma.roomPlayer.create({
      data: {
        roomId: room.id,
        spotifyId,
        displayName,
        imageUrl: imageUrl || null,
        isHost: false,
        isReady: false
      }
    });

    console.log(`New player joined room ${code}: ${displayName} (${room.players.length + 1} total players)`);

    res.json({
      roomId: room.id,
      player: {
        id: newPlayer.id,
        spotifyId: newPlayer.spotifyId,
        displayName: newPlayer.displayName,
        imageUrl: newPlayer.imageUrl,
        isHost: newPlayer.isHost,
        isReady: newPlayer.isReady
      },
      playerCount: room.players.length + 1
    });

  } catch (error) {
    console.error('Error joining room:', error);
    res.status(500).json({ error: 'Failed to join room' });
  }
});

// Share music data
router.post('/:code/share-data', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const { spotifyId, musicData } = req.body;

    if (!spotifyId || !musicData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const room = await prisma.room.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const updatedPlayer = await prisma.roomPlayer.update({
      where: {
        roomId_spotifyId: {
          roomId: room.id,
          spotifyId
        }
      },
      data: {
        musicData,
        isReady: true
      }
    });

    console.log(`Music data shared for ${updatedPlayer.displayName} in room ${code}`);

    res.json({ success: true, player: updatedPlayer });

  } catch (error) {
    console.error('Error sharing music data:', error);
    res.status(500).json({ error: 'Failed to share music data' });
  }
});

// Leave room
router.delete('/:code/leave', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const { spotifyId } = req.body;

    if (!spotifyId) {
      return res.status(400).json({ error: 'Missing spotifyId' });
    }

    const room = await prisma.room.findUnique({
      where: { code: code.toUpperCase() },
      include: { players: true }
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const player = room.players.find(p => p.spotifyId === spotifyId);
    if (!player) {
      return res.status(404).json({ error: 'Player not in room' });
    }

    // If host leaves, close the room
    if (player.isHost) {
      await prisma.room.update({
        where: { id: room.id },
        data: { isActive: false, status: 'FINISHED' }
      });
      console.log(`Room ${code} closed - host left`);
    } else {
      await prisma.roomPlayer.delete({
        where: { id: player.id }
      });
      console.log(`Player left room ${code}: ${player.displayName}`);
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Error leaving room:', error);
    res.status(500).json({ error: 'Failed to leave room' });
  }
});

export default router;