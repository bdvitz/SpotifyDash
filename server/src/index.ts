import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { PrismaClient } from '@prisma/client';
import roomController from './controllers/roomController';
import gameController from './controllers/gameController';
import testController from './controllers/testController';
import { setupGameSocket } from './sockets/gameSocket';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ["http://localhost:5173"],
    methods: ["GET", "POST"]
  }
});

const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: { error: 'Too many requests, please try again later' }
});

// Test routes rate limiting (more lenient for development)
const testLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute for test operations
  message: { error: 'Too many test requests, please try again later' }
});

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ["http://localhost:5173"]
}));
app.use(express.json({ limit: '10mb' })); // Allow larger payloads for music data
app.use('/api/', apiLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/rooms', roomController);
app.use('/api/games', gameController);

// Test routes (with special rate limiting)
app.use('/api/test', testLimiter, testController);

// Socket.IO setup
setupGameSocket(io, prisma);

// Scheduled cleanup task
async function runScheduledCleanup() {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Clean up finished games older than 1 hour
    const expiredGames = await prisma.game.deleteMany({
      where: {
        status: 'FINISHED',
        endedAt: {
          lt: oneHourAgo
        }
      }
    });

    // Clean up inactive rooms older than 24 hours
    const expiredRooms = await prisma.room.deleteMany({
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
      }
    });

    if (expiredGames.count > 0 || expiredRooms.count > 0) {
      console.log(`🧹 Scheduled cleanup: ${expiredGames.count} games, ${expiredRooms.count} rooms removed`);
    }

  } catch (error) {
    console.error('❌ Scheduled cleanup failed:', error);
  }
}

// Run cleanup every hour
setInterval(runScheduledCleanup, 60 * 60 * 1000);

// Error handling
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log('🧪 Test endpoints available at /api/test/*');
  }
});