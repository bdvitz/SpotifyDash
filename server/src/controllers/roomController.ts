import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Generate 4-character room code
function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Create new room
router.post('/', async (req: Request, res: Response) => {
  try {
    const { spotifyId, displayName, imageUrl } = req.body;

    if (!spotifyId || !displayName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate unique room code
    let roomCode: string;
    let attempts = 0;
    do {
      roomCode = generateRoomCode();
      attempts++;
      const existing = await prisma.room.findUnique({ where: { code: roomCode } });
      if (!existing) break;
    } while (attempts < 10);

    if (attempts >= 10) {
      return res.status(500).json({ error: 'Could not generate unique room code' });
    }

    // Create room and host player in transaction
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
          imageUrl,
          isHost: true,
          isReady: true
        }
      });

      return { room, hostPlayer };
    });

    console.log(`Room created: ${roomCode} by ${displayName}`);

    res.json({
      roomCode: result.room.code,
      roomId: result.room.id,
      hostPlayer: result.hostPlayer
    });

  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room' });
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
          where: { status: 'IN_PROGRESS' },
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
      createdAt: room.createdAt
    });

  } catch (error) {
    console.error('Error fetching room:', error);
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

// Join room
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
        players: true
      }
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!room.isActive) {
      return res.status(410).json({ error: 'Room is no longer active' });
    }

    if (room.status !== 'WAITING') {
      return res.status(409).json({ error: 'Game already in progress' });
    }

    if (room.players.length >= room.maxPlayers) {
      return res.status(409).json({ error: 'Room is full' });
    }

    // Check if player already in room
    const existingPlayer = room.players.find(p => p.spotifyId === spotifyId);
    if (existingPlayer) {
      return res.status(409).json({ error: 'Already in this room' });
    }

    const newPlayer = await prisma.roomPlayer.create({
      data: {
        roomId: room.id,
        spotifyId,
        displayName,
        imageUrl,
        isHost: false,
        isReady: false
      }
    });

    console.log(`Player joined room ${code}: ${displayName}`);

    res.json({
      roomId: room.id,
      player: newPlayer,
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