/**
 * Custom React hook for managing Spotify authentication state
 */

import { useState, useEffect, useCallback } from 'react';
import {
  loginWithSpotify,
  handleSpotifyCallback,
  logout as spotifyLogout,
  isAuthenticated,
  fetchUserProfile,
  getCachedUser,
  type SpotifyUser,
  type AuthTokens
} from '../auth/spotifyAuth';

interface AuthState {
  isAuthenticated: boolean;
  user: SpotifyUser | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: () => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

type UseAuthReturn = AuthState & AuthActions;

// Global state to handle StrictMode double execution
let authPromise: Promise<any> | null = null;
let authResult: any = null;

/**
 * Hook for managing Spotify authentication
 * Handles login, logout, token management, and user state
 */
export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
    error: null
  });

  /**
   * Updates authentication state
   */
  const updateAuthState = useCallback((updates: Partial<AuthState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Handles authentication errors
   */
  const handleAuthError = useCallback((error: unknown, context: string) => {
    console.error(`Auth error in ${context}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    updateAuthState({ 
      error: errorMessage, 
      isLoading: false,
      isAuthenticated: false,
      user: null 
    });
  }, [updateAuthState]);

  /**
   * Initiates Spotify OAuth login
   */
  const login = useCallback(async () => {
    try {
      updateAuthState({ isLoading: true, error: null });
      await loginWithSpotify();
      // Note: This will redirect, so the component will unmount
    } catch (error) {
      handleAuthError(error, 'login');
    }
  }, [updateAuthState, handleAuthError]);

  /**
   * Logs out the user and clears all auth data
   */
  const logout = useCallback(() => {
    console.log('🚪 Logging out user...');
    spotifyLogout(); // This clears localStorage
    updateAuthState({
      isAuthenticated: false,
      user: null,
      error: null,
      isLoading: false
    });
  }, [updateAuthState]);

  /**
   * Refreshes user profile data
   */
  const refreshUser = useCallback(async () => {
    if (!isAuthenticated()) {
      return;
    }

    try {
      updateAuthState({ isLoading: true, error: null });
      const user = await fetchUserProfile();
      updateAuthState({
        user,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error) {
      handleAuthError(error, 'refreshUser');
    }
  }, [updateAuthState, handleAuthError]);

  /**
   * Clears the current error state
   */
  const clearError = useCallback(() => {
    updateAuthState({ error: null });
  }, [updateAuthState]);

  /**
   * Handles OAuth callback from Spotify
   */
  const handleCallback = useCallback(async (code: string) => {
    try {
      updateAuthState({ isLoading: true, error: null });
      
      const tokens: AuthTokens = await handleSpotifyCallback(code);
      console.log('Tokens received:', { expires_in: tokens.expires_in });
      
      const user = await fetchUserProfile();
      console.log('User profile fetched:', user.display_name);
      
      updateAuthState({
        isAuthenticated: true,
        user,
        isLoading: false
      });

      // Clean up URL after successful authentication
      const newUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
    } catch (error) {
      console.error('Callback handling failed:', error);
      // Only clear storage on actual authentication failure, not processing issues
      if (error instanceof Error && error.message.includes('Token exchange failed')) {
        localStorage.removeItem('spotify_tokens');
        localStorage.removeItem('spotify_user');
      }
      handleAuthError(error, 'handleCallback');
    }
  }, [updateAuthState, handleAuthError]);

  /**
   * Initialize authentication state on mount
   */
  useEffect(() => {
    const initializeAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      // Handle OAuth callback FIRST, before checking existing auth
      if (code) {
        console.log('Processing OAuth callback...');
        try {
          await handleCallback(code);
        } catch (err) {
          console.error('Callback failed:', err);
          handleAuthError(err, 'OAuth callback');
        }
        return;
      }

      // Handle OAuth error
      if (error) {
        console.log('OAuth error received:', error);
        updateAuthState({
          error: `Spotify authentication ${error === 'access_denied' ? 'was denied' : 'failed'}: ${error}`,
          isLoading: false
        });
        return;
      }

      // No callback - check existing authentication
      try {
        if (isAuthenticated()) {
          const cachedUser = getCachedUser();
          
          if (cachedUser) {
            console.log('Using cached user data');
            updateAuthState({
              isAuthenticated: true,
              user: cachedUser,
              isLoading: false
            });
          } else {
            console.log('Fetching fresh user data');
            await refreshUser();
          }
        } else {
          console.log('No existing authentication');
          updateAuthState({
            isAuthenticated: false,
            user: null,
            isLoading: false
          });
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        handleAuthError(err, 'initializeAuth');
      }
    };

    initializeAuth();
  }, []); // Remove dependencies to prevent re-running

  /**
   * Periodic token validation
   */
  useEffect(() => {
    if (!state.isAuthenticated) return;

    const validateToken = () => {
      if (!isAuthenticated()) {
        logout();
      }
    };

    // Check token validity every 5 minutes
    const interval = setInterval(validateToken, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [state.isAuthenticated, logout]);

  return {
    ...state,
    login,
    logout,
    refreshUser,
    clearError
  };
}