import React from 'react';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GameRoom from './pages/GameRoom';
import TestPage from './pages/TestPage';
import { LogOut, Home, Users, Settings } from 'lucide-react';
import TestAuth from './TestAuth';

type Page = 'dashboard' | 'game' | 'test';

function App() {
  const { isAuthenticated, user, isLoading, error, logout, clearError } = useAuth();
  const [currentPage, setCurrentPage] = React.useState<Page>('dashboard');
  const [gameRoomCode, setGameRoomCode] = React.useState<string | null>(null);

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
              // Clear any error state and restart auth flow
              clearError();
              if (isAccessDenied) {
                // For access denied, redirect to login to try again
                window.location.href = window.location.origin;
              } else {
                // For other errors, just reload
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
    page, 
    active, 
    onClick 
  }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    page: Page;
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

  const handleJoinGame = (roomCode: string) => {
    setGameRoomCode(roomCode);
    setCurrentPage('game');
  };

  const handleCreateGame = (roomCode: string) => {
    setGameRoomCode(roomCode);
    setCurrentPage('game');
  };

  const handleLeaveGame = () => {
    setGameRoomCode(null);
    setCurrentPage('dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-purple-500/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-white tracking-wider bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text">
              INCLEW
            </h1>
            <div className="flex items-center space-x-4">
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
              page="dashboard" 
              active={currentPage === 'dashboard'} 
              onClick={() => setCurrentPage('dashboard')}
            />
            <NavButton 
              icon={Users} 
              label="Game" 
              page="game" 
              active={currentPage === 'game'} 
              onClick={() => setCurrentPage('game')}
            />
            <NavButton 
              icon={Settings} 
              label="Test" 
              page="test" 
              active={currentPage === 'test'} 
              onClick={() => setCurrentPage('test')}
            />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {currentPage === 'dashboard' && (
          <Dashboard 
            user={user}
            onJoinGame={handleJoinGame}
            onCreateGame={handleCreateGame}
          />
        )}
        {currentPage === 'game' && (
          <GameRoom 
            user={user}
            roomCode={gameRoomCode}
            onLeaveGame={handleLeaveGame}
          />
        )}
        {currentPage === 'test' && (
          <TestPage />
        )}
      </main>
      {/* Testing authorization in phase 2 statement */}
      <TestAuth />
    </div>
  );
}

export default App;