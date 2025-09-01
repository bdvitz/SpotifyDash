import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Music, Users, Play, Trophy } from 'lucide-react';

const Login: React.FC = () => {
  const { login, isLoading, error } = useAuth();

  const handleLogin = async () => {
    try {
      await login();
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Main Login Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 md:p-12 border border-white/20 shadow-2xl text-center animate-fade-in">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 tracking-wider bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text">
              INCLEW
            </h1>
            <p className="text-xl md:text-2xl text-purple-200 mb-2">
              Your Music, Your Game
            </p>
            <p className="text-lg text-purple-300">
              Connect with Spotify to explore your music taste and challenge friends
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10 group hover:bg-white/10 transition-all duration-300">
              <Music className="w-12 h-12 text-green-400 mb-4 mx-auto group-hover:scale-110 transition-transform duration-300" />
              <h3 className="text-xl font-semibold text-white mb-3">Music Statistics</h3>
              <p className="text-purple-200 leading-relaxed">
                Discover your top tracks, artists, and albums with beautiful visualizations
              </p>
            </div>
            
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10 group hover:bg-white/10 transition-all duration-300">
              <Users className="w-12 h-12 text-blue-400 mb-4 mx-auto group-hover:scale-110 transition-transform duration-300" />
              <h3 className="text-xl font-semibold text-white mb-3">Multiplayer Games</h3>
              <p className="text-purple-200 leading-relaxed">
                Create or join rooms with up to 8 players for epic music quizzes
              </p>
            </div>
            
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10 group hover:bg-white/10 transition-all duration-300">
              <Play className="w-12 h-12 text-purple-400 mb-4 mx-auto group-hover:scale-110 transition-transform duration-300" />
              <h3 className="text-xl font-semibold text-white mb-3">Real-time Gaming</h3>
              <p className="text-purple-200 leading-relaxed">
                Experience smooth, real-time gameplay with instant updates
              </p>
            </div>
            
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10 group hover:bg-white/10 transition-all duration-300">
              <Trophy className="w-12 h-12 text-yellow-400 mb-4 mx-auto group-hover:scale-110 transition-transform duration-300" />
              <h3 className="text-xl font-semibold text-white mb-3">Leaderboards</h3>
              <p className="text-purple-200 leading-relaxed">
                Compete with friends and climb the rankings in music knowledge
              </p>
            </div>
          </div>

          {/* Login Button */}
          <div className="space-y-4">
            {error && (
              <div className="bg-red-500/20 border border-red-400/50 rounded-lg p-4 mb-6">
                <p className="text-red-200 text-sm">
                  {error}
                </p>
              </div>
            )}
            
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-bold py-4 px-8 rounded-full text-lg transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center space-x-3 mx-auto min-w-[240px]"
            >
              {isLoading ? (
                <>
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.959-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.361 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                  <span>Connect with Spotify</span>
                </>
              )}
            </button>
            
            <p className="text-sm text-purple-300 max-w-md mx-auto leading-relaxed">
              We'll only access your music listening data to create your personal stats and gaming experience. 
              Your data is secure and never shared with third parties.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 space-y-2">
          <p className="text-purple-300 text-sm">
            Built with React, Tailwind CSS, and the Spotify Web API
          </p>
          <div className="flex justify-center space-x-4 text-purple-400 text-xs">
            <span>🎵 Secure OAuth</span>
            <span>🔒 Privacy First</span>
            <span>⚡ Real-time Gaming</span>
          </div>
        </div>
      </div>

      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.8s ease-in-out;
        }
        
        @keyframes fadeIn {
          from { 
            opacity: 0; 
            transform: translateY(30px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
      `}</style>
    </div>
  );
};

export default Login;