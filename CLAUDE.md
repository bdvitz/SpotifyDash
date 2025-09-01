# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Inclew is a real-time multiplayer music quiz game that integrates with Spotify. It's a full-stack TypeScript application with a React frontend and Node.js/Express backend, using PostgreSQL for data persistence and Socket.IO for real-time features.

## Architecture

### Frontend (client/)
- **Framework**: React 19 with TypeScript, built with Vite
- **Styling**: Tailwind CSS v4 with glassmorphism design
- **Real-time**: Socket.IO client for multiplayer features
- **Key directories**:
  - `src/auth/` - Spotify OAuth with PKCE flow implementation
  - `src/components/` - Reusable UI components (ArtistCard, TrackCard, PlayerList)
  - `src/pages/` - Main application pages (Login, Dashboard, GameRoom)
  - `src/hooks/` - Custom React hooks
  - `src/utils/` - Utility functions

### Backend (server/)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: Socket.IO for multiplayer game mechanics
- **Key features**: 
  - Game room management with 4-character codes
  - Music quiz gameplay with scoring system
  - User management and game state persistence

### Database Schema
The Prisma schema defines a comprehensive gaming system:
- `User` - Spotify user profiles and authentication
- `Room` - Game rooms with host/player relationships
- `Game`/`GameRound` - Quiz game logic and round management
- `GameScore`/`PlayerAnswer` - Scoring and answer tracking

## Development Commands

### Frontend (client/)
```bash
npm run dev        # Start development server (http://localhost:5173)
npm run build      # Build for production (tsc + vite build)
npm run lint       # Run ESLint
npm run preview    # Preview production build
```

### Backend (server/)
```bash
npm run dev         # Start development server with nodemon (http://localhost:3001)
npm run build       # Compile TypeScript to dist/
npm start           # Run production build
npm run db:generate # Generate Prisma client
npm run db:push     # Push schema changes to database
npm run db:migrate  # Run database migrations
npm run db:studio   # Open Prisma Studio
```

### Development Workflow
1. Start both services in split terminal:
   - Terminal 1: `cd client && npm run dev`
   - Terminal 2: `cd server && npm run dev`
2. Frontend runs on port 5173, backend on port 3001
3. Database setup requires PostgreSQL and running `npm run db:push` in server/

## Environment Configuration

### Required Environment Files
- `client/.env` - Spotify client ID and API URL
- `server/.env` - Database URL, JWT secret, and server configuration

Both directories have `.env.example` files showing required variables.

## Key Technical Details

- **Authentication**: Spotify OAuth with PKCE flow for security
- **Real-time Features**: Socket.IO handles room management and game state synchronization
- **Database**: PostgreSQL with comprehensive game state tracking
- **Build Process**: TypeScript compilation with Vite bundling for frontend
- **Game Logic**: Music quiz system with configurable rounds and scoring