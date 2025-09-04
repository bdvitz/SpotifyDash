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
      // Clear any partial auth state
      localStorage.removeItem('spotify_tokens');
      localStorage.removeItem('spotify_user');
      handleAuthError(error, 'handleCallback');
    }
  }, [updateAuthState, handleAuthError]);

  /**
   * Initialize authentication state on mount
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check for OAuth callback
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');

        // Handle OAuth error
        if (error) {
          updateAuthState({
            error: `Spotify authentication failed: ${error}`,
            isLoading: false
          });
          return;
        }

        // Handle OAuth callback
        if (code) {
          await handleCallback(code);
          return;
        }

        // Check existing authentication
        if (isAuthenticated()) {
          const cachedUser = getCachedUser();
          
          if (cachedUser) {
            // Use cached user data
            updateAuthState({
              isAuthenticated: true,
              user: cachedUser,
              isLoading: false
            });
          } else {
            // Fetch fresh user data
            await refreshUser();
          }
        } else {
          // Not authenticated
          updateAuthState({
            isAuthenticated: false,
            user: null,
            isLoading: false
          });
        }
      } catch (error) {
        handleAuthError(error, 'initializeAuth');
      }
    };

    initializeAuth();
  }, [handleCallback, refreshUser, handleAuthError, updateAuthState]);

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