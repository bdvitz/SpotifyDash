# README.md
# 🎵 Inclew - Spotify Music Quiz Game (incomplete)

A basic Spotify dashboard to see your most played tracks and artists
Planned: A modern, real-time multiplayer music quiz game that integrates with your Spotify account to create personalized gaming experiences.

## ✨ Features (Current and Planned)

- **Spotify Integration**: Secure OAuth authentication with PKCE flow
- **Music Statistics**: View your top tracks, artists, and albums with beautiful visualizations
- **Real-time Multiplayer**: Create or join rooms with up to 8 players
- **Interactive Games**: Music quiz games based on your Spotify listening history
- **Modern UI**: Beautiful glassmorphism design with smooth animations
- **Responsive Design**: Works perfectly on desktop and mobile devices

- **Spotify OAuth Login Example**
![Demo](assets/login.gif)

- **Music Song Display Example**
![Demo](assets/song_count.gif)

## 🚀 Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite** for blazing fast development
- **Tailwind CSS 4** for styling
- **Socket.IO Client** for real-time communication
- **Lucide React** for icons

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **Socket.IO** for real-time features
- **Prisma ORM** with PostgreSQL
- **JWT** for session management

## 📦 Project Structure

```
inclew/
├── client/                 # React frontend
│   ├── src/
│   │   ├── auth/          # Authentication logic
│   │   ├── components/    # Reusable components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── pages/         # Page components
│   │   ├── utils/         # Utility functions
│   │   └── styles/        # CSS files
│   └── public/            # Static assets
├── server/                # Node.js backend
│   ├── src/
│   │   ├── controllers/   # Route handlers
│   │   ├── models/        # Database models
│   │   ├── sockets/       # Socket.IO handlers
│   │   └── utils/         # Utility functions
│   └── prisma/            # Database schema
└── README.md
```

## 🛠 Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Spotify Developer App

### Environment Variables

Create `.env` files:

**client/.env:**
```
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id
VITE_API_URL=http://localhost:3001
```

**server/.env:**
```
DATABASE_URL=postgresql://username:password@localhost:5432/inclew
PORT=3001
JWT_SECRET=your-secret-key
NODE_ENV=development
```

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd inclew
   ```

2. **Install dependencies:**
   ```bash
   # Install client dependencies
   cd client
   npm install
   
   # Install server dependencies
   cd ../server
   npm install
   ```

3. **Database setup:**
   ```bash
   cd server
   npx prisma generate
   npx prisma db push
   ```

4. **Start development servers:**
   ```bash
   # Terminal 1 - Start server
   cd server
   npm run dev
   
   # Terminal 2 - Start client
   cd client
   npm run dev
   ```

5. **Open your browser:**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001

## 🎮 How to Play (Incomplete)

1. **Connect Spotify**: Login with your Spotify account
2. **View Stats**: Explore your music statistics and preferences
3. **Create/Join Room**: Host a game or join with a 4-character room code
4. **Play Quiz**: Answer questions about music based on your listening history
5. **Compete**: See who knows their music taste best!

## 🚀 Deployment

### Frontend (Vercel)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Backend (Railway/Render)
1. Connect your GitHub repository
2. Set up PostgreSQL database
3. Configure environment variables
4. Deploy backend service

## 📝 License

N/A

---

# .gitignore
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
dist/
build/
.next/

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Prisma
prisma/migrations/

# Temporary folders
tmp/
temp/
