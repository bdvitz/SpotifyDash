import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Reset database tables (development/testing only)
router.post('/reset-database', async (req: Request, res: Response) => {
  try {
    // Only allow in development/test environments
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Database reset not allowed in production' });
    }

    console.log('🗑️ Resetting database tables...');

    // Delete in correct order to respect foreign key constraints
    await prisma.gameAnswer.deleteMany({});
    await prisma.gameScore.deleteMany({});
    await prisma.game.deleteMany({});
    await prisma.roomPlayer.deleteMany({});
    await prisma.room.deleteMany({});

    console.log('✅ Database tables reset successfully');

    res.json({ 
      success: true, 
      message: 'Database tables reset successfully',
      tablesCleared: ['gameAnswer', 'gameScore', 'game', 'roomPlayer', 'room']
    });

  } catch (error) {
    console.error('❌ Error resetting database:', error);
    res.status(500).json({ error: 'Failed to reset database' });
  }
});

// Clean up expired data
router.post('/cleanup-expired', async (req: Request, res: Response) => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago

    console.log('🧹 Cleaning up expired data...');

    // Clean up finished games older than 1 hour
    const expiredGames = await prisma.game.findMany({
      where: {
        status: 'FINISHED',
        endedAt: {
          lt: oneHourAgo
        }
      },
      include: { room: true }
    });

    if (expiredGames.length > 0) {
      console.log(`Found ${expiredGames.length} expired games to clean up`);

      // Delete game-related data
      for (const game of expiredGames) {
        await prisma.gameAnswer.deleteMany({
          where: { gameId: game.id }
        });
        await prisma.gameScore.deleteMany({
          where: { gameId: game.id }
        });
        await prisma.game.delete({
          where: { id: game.id }
        });
      }
    }

    // Clean up inactive rooms older than 24 hours
    const expiredRooms = await prisma.room.findMany({
      where: {
        OR: [
          {
            isActive: false,
            updatedAt: { lt: oneDayAgo }
          },
          {
            status: 'FINISHED',
            updatedAt: { lt: oneDayAgo }
          }
        ]
      },
      include: { players: true }
    });

    if (expiredRooms.length > 0) {
      console.log(`Found ${expiredRooms.length} expired rooms to clean up`);

      for (const room of expiredRooms) {
        // Delete room players first
        await prisma.roomPlayer.deleteMany({
          where: { roomId: room.id }
        });
        // Delete room
        await prisma.room.delete({
          where: { id: room.id }
        });
      }
    }

    const totalCleaned = expiredGames.length + expiredRooms.length;
    console.log(`✅ Cleanup complete: ${totalCleaned} items removed`);

    res.json({
      success: true,
      message: 'Expired data cleaned up successfully',
      cleaned: {
        expiredGames: expiredGames.length,
        expiredRooms: expiredRooms.length,
        total: totalCleaned
      }
    });

  } catch (error) {
    console.error('❌ Error cleaning up expired data:', error);
    res.status(500).json({ error: 'Failed to clean up expired data' });
  }
});

// Get database statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await prisma.$transaction([
      prisma.room.count(),
      prisma.roomPlayer.count(),
      prisma.game.count(),
      prisma.gameAnswer.count(),
      prisma.gameScore.count(),
      
      // Active rooms
      prisma.room.count({
        where: { isActive: true }
      }),
      
      // Games in progress
      prisma.game.count({
        where: { status: 'IN_PROGRESS' }
      }),
      
      // Recent activity (last hour)
      prisma.room.count({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000)
          }
        }
      })
    ]);

    res.json({
      success: true,
      stats: {
        totalRooms: stats[0],
        totalPlayers: stats[1],
        totalGames: stats[2],
        totalAnswers: stats[3],
        totalScores: stats[4],
        activeRooms: stats[5],
        gamesInProgress: stats[6],
        recentActivity: stats[7]
      }
    });

  } catch (error) {
    console.error('Error fetching database stats:', error);
    res.status(500).json({ error: 'Failed to fetch database stats' });
  }
});

export default router;