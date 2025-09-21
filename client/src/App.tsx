import React from 'react';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GameRoom from './pages/GameRoom';
import TestPage from './pages/TestPage';
import { LogOut, Home, Users, Settings } from 'lucide-react';
import TestAuth from './TestAuth';

interface GameSession {
  roomCode: string;
  gameId: string;
  timestamp: number;
}

interface AppState {
  currentView: 'dashboard' | 'room' | 'game' | 'test';
  roomCode: string | null;
  gameSession: GameSession | null;
}

function App() {
  const { isAuthenticated, user, isLoading, error, logout, clearError } = useAuth();
  const [appState, setAppState] = React.useState<AppState>({
    currentView: 'dashboard',
    roomCode: null,
    gameSession: null
  });

  // URL parsing and navigation
  const parseCurrentUrl = React.useCallback((): AppState => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);

    if (path === '/test') {
      return { currentView: 'test', roomCode: null, gameSession: null };
    } else if (path.startsWith('/room/')) {
      const roomCode = path.split('/')[2]?.toUpperCase() || null;
      return { currentView: 'room', roomCode, gameSession: null };
    } else if (path.startsWith('/game/')) {
      const roomCode = path.split('/')[2]?.toUpperCase() || null;
      const gameId = params.get('gameId');
      
      if (gameId && roomCode) {
        const gameSession: GameSession = {
          roomCode,
          gameId,
          timestamp: Date.now()
        };
        return { currentView: 'game', roomCode, gameSession };
      }
      // If no gameId, redirect to room
      return { currentView: 'room', roomCode, gameSession: null };
    } else {
      return { currentView: 'dashboard', roomCode: null, gameSession: null };
    }
  }, []);

  const navigateTo = React.useCallback((view: 'dashboard' | 'room' | 'game' | 'test', roomCode?: string, gameId?: string) => {
    let newUrl = '/';
    let newState: AppState = { currentView: view, roomCode: null, gameSession: null };

    switch (view) {
      case 'dashboard':
        newUrl = '/';
        break;
      case 'test':
        newUrl = '/test';
        break;
      case 'room':
        if (roomCode) {
          newUrl = `/room/${roomCode}`;
          newState.roomCode = roomCode;
        }
        break;
      case 'game':
        if (roomCode && gameId) {
          newUrl = `/game/${roomCode}?gameId=${gameId}`;
          newState.roomCode = roomCode;
          newState.gameSession = {
            roomCode,
            gameId,
            timestamp: Date.now()
          };
          // Save active game session
          localStorage.setItem('inclew_active_game', JSON.stringify(newState.gameSession));
        }
        break;
    }

    // Update browser URL without page reload
    window.history.pushState(null, '', newUrl);
    setAppState(newState);
  }, []);

  // Initialize app state from URL on mount and auth completion
  React.useEffect(() => {
    if (isAuthenticated && user) {
      const parsedState = parseCurrentUrl();
      setAppState(parsedState);

      // If we have a game session from URL, save it to localStorage
      if (parsedState.gameSession) {
        localStorage.setItem('inclew_active_game', JSON.stringify(parsedState.gameSession));
      }
    }
  }, [isAuthenticated, user, parseCurrentUrl]);

  // Handle browser back/forward buttons
  React.useEffect(() => {
    const handlePopState = () => {
      const parsedState = parseCurrentUrl();
      setAppState(parsedState);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [parseCurrentUrl]);

  // Check for expired game sessions and clean them up
  React.useEffect(() => {
    const checkGameSessionValidity = () => {
      const saved = localStorage.getItem('inclew_active_game');
      if (saved) {
        try {
          const session: GameSession = JSON.parse(saved);
          const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
          
          if (session.timestamp < twoHoursAgo) {
            localStorage.removeItem('inclew_active_game');
            if (appState.currentView === 'game') {
              navigateTo('dashboard');
            }
          }
        } catch {
          localStorage.removeItem('inclew_active_game');
        }
      }
    };

    // Check on mount and every 5 minutes
    checkGameSessionValidity();
    const interval = setInterval(checkGameSessionValidity, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [appState.currentView, navigateTo]);

  // Show loading screen during authentication
  if (isLoading) {
    const isCallback = window.location.search.includes('code');
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {isCallback ? 'Connecting to Spotify...' : 'Loading...'}
          </h2>
          <p className="text-purple-200">
            {isCallback ? 'Securing your connection and loading your music data' : 'Setting up your music experience'}
          </p>
        </div>
      </div>
    );
  }

  // Show error if authentication failed
  if (error) {
    const isAccessDenied = error.includes('access_denied') || error.includes('was denied');
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 max-w-md text-center">
          <div className={`w-16 h-16 ${isAccessDenied ? 'bg-yellow-500/20' : 'bg-red-500/20'} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <span className={`${isAccessDenied ? 'text-yellow-400' : 'text-red-400'} text-2xl`}>
              {isAccessDenied ? '⚠️' : '❌'}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">
            {isAccessDenied ? 'Access Denied' : 'Authentication Error'}
          </h2>
          <p className="text-purple-200 mb-6">
            {isAccessDenied 
              ? 'You need to grant access to your Spotify account to use Inclew. We only access your music listening data to create your stats and gaming experience.'
              : error
            }
          </p>
          <button
            onClick={() => {
              clearError();
              if (isAccessDenied) {
                window.location.href = window.location.origin;
              } else {
                window.location.reload();
              }
            }}
            className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg transition-all duration-200 font-semibold"
          >
            {isAccessDenied ? 'Try Again' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated || !user) {
    return <Login />;
  }

  // Navigation component
  const NavButton = ({ 
    icon: Icon, 
    label, 
    view, 
    active, 
    onClick 
  }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    view: string;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
        active 
          ? 'bg-purple-600 text-white shadow-lg transform scale-105' 
          : 'text-purple-200 hover:bg-purple-800 hover:text-white'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </button>
  );

  // Event handlers
  const handleJoinGame = (roomCode: string) => {
    navigateTo('room', roomCode);
  };

  const handleCreateGame = (roomCode: string) => {
    navigateTo('room', roomCode);
  };

  const handleGameStarted = (gameId: string, roomCode: string) => {
    navigateTo('game', roomCode, gameId);
  };

  const handleLeaveGame = () => {
    // Clear any saved game session
    localStorage.removeItem('inclew_active_game');
    navigateTo('dashboard');
  };

  const handleGameEnded = () => {
    // Clear saved game session but stay in room for post-game
    localStorage.removeItem('inclew_active_game');
    if (appState.roomCode) {
      navigateTo('room', appState.roomCode);
    } else {
      navigateTo('dashboard');
    }
  };

  // Generate navigation labels
  const getRoomNavLabel = () => {
    if (appState.gameSession) {
      return `Game (${appState.roomCode})`;
    } else if (appState.roomCode) {
      return `Room (${appState.roomCode})`;
    }
    return 'Room';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-purple-500/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 
              className="text-3xl font-bold text-white tracking-wider bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text cursor-pointer"
              onClick={() => navigateTo('dashboard')}
            >
              INCLEW
            </h1>
            <div className="flex items-center space-x-4">
              {/* Game Session Indicator */}
              {appState.gameSession && (
                <div className="bg-green-500/20 border border-green-400/50 rounded-full px-3 py-1 text-green-300 text-sm flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>Live Game: {appState.gameSession.roomCode}</span>
                </div>
              )}
              
              <div className="flex items-center space-x-3 bg-white/10 rounded-full px-4 py-2 border border-white/20">
                <img 
                  src={user.images?.[0]?.url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.display_name)}&background=7c3aed&color=fff`} 
                  alt={user.display_name} 
                  className="w-8 h-8 rounded-full" 
                />
                <span className="text-white font-medium hidden sm:block">{user.display_name}</span>
              </div>
              <button 
                onClick={logout}
                className="text-purple-200 hover:text-white transition-colors duration-200 p-2 rounded-lg hover:bg-white/10"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-black/10 backdrop-blur-sm border-b border-purple-500/10 sticky top-20 z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex space-x-2">
            <NavButton 
              icon={Home} 
              label="Dashboard" 
              view="dashboard" 
              active={appState.currentView === 'dashboard'} 
              onClick={() => navigateTo('dashboard')}
            />
            <NavButton 
              icon={Users} 
              label={getRoomNavLabel()}
              view="room" 
              active={appState.currentView === 'room' || appState.currentView === 'game'} 
              onClick={() => {
                if (appState.gameSession) {
                  navigateTo('game', appState.gameSession.roomCode, appState.gameSession.gameId);
                } else if (appState.roomCode) {
                  navigateTo('room', appState.roomCode);
                } else {
                  navigateTo('dashboard');
                }
              }}
            />
            <NavButton 
              icon={Settings} 
              label="Test" 
              view="test" 
              active={appState.currentView === 'test'} 
              onClick={() => navigateTo('test')}
            />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {appState.currentView === 'dashboard' && (
          <Dashboard 
            user={user}
            onJoinGame={handleJoinGame}
            onCreateGame={handleCreateGame}
          />
        )}
        {(appState.currentView === 'room' || appState.currentView === 'game') && (
          <GameRoom 
            user={user}
            roomCode={appState.roomCode}
            activeGameSession={appState.gameSession}
            onLeaveGame={handleLeaveGame}
            onGameStarted={handleGameStarted}
            onGameEnded={handleGameEnded}
          />
        )}
        {appState.currentView === 'test' && (
          <TestPage />
        )}
      </main>
      
      {/* Testing authorization statement */}
      <TestAuth />
    </div>
  );
}

export default App;