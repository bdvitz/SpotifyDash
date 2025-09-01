/**
 * Custom React hook for fetching and managing Spotify API data
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  fetchTopTracks, 
  fetchTopArtists, 
  SpotifyTrack, 
  SpotifyArtist 
} from '../auth/spotifyAuth';
import { getUIPreferences, updateUIPreferences } from '../utils/storage';

interface SpotifyAPIState {
  topTracks: SpotifyTrack[] | null;
  topArtists: SpotifyArtist[] | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

interface UseSpotifyAPIReturn extends SpotifyAPIState {
  trackLimit: number;
  setTrackLimit: (limit: number) => void;
  refreshData: () => Promise<void>;
  clearError: () => void;
}

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

/**
 * Hook for managing Spotify API data with caching and error handling
 */
export function useSpotifyAPI(): UseSpotifyAPIReturn {
  const [state, setState] = useState<SpotifyAPIState>({
    topTracks: null,
    topArtists: null,
    isLoading: false,
    error: null,
    lastUpdated: null
  });

  const [trackLimit, setTrackLimitState] = useState<number>(() => {
    return getUIPreferences().trackLimit;
  });

  /**
   * Updates the track limit and saves preference
   */
  const setTrackLimit = useCallback((limit: number) => {
    setTrackLimitState(limit);
    updateUIPreferences({ trackLimit: limit });
  }, []);

  /**
   * Updates state with partial updates
   */
  const updateState = useCallback((updates: Partial<SpotifyAPIState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Handles API errors
   */
  const handleError = useCallback((error: unknown, context: string) => {
    console.error(`Spotify API error in ${context}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch music data';
    updateState({ error: errorMessage, isLoading: false });
  }, [updateState]);

  /**
   * Clears the current error state
   */
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  /**
   * Checks if cached data is still valid
   */
  const isCacheValid = useCallback((lastUpdated: number | null) => {
    if (!lastUpdated) return false;
    return Date.now() - lastUpdated < CACHE_DURATION;
  }, []);

  /**
   * Fetches fresh data from Spotify API
   */
  const fetchData = useCallback(async (limit: number, forceRefresh = false) => {
    // Check cache validity
    if (!forceRefresh && state.topTracks && state.topArtists && isCacheValid(state.lastUpdated)) {
      // If we have cached data but need different track limit, slice existing data
      if (state.topTracks.length >= limit) {
        updateState({ 
          topTracks: state.topTracks.slice(0, limit),
          error: null 
        });
        return;
      }
    }

    updateState({ isLoading: true, error: null });

    try {
      // Fetch data in parallel
      const [tracks, artists] = await Promise.all([
        fetchTopTracks(Math.max(limit, 50), 'medium_term'), // Fetch at least 50 for better caching
        fetchTopArtists(5, 'medium_term') // Always get top 5 artists
      ]);

      updateState({
        topTracks: tracks.slice(0, limit), // Only show requested amount
        topArtists: artists,
        isLoading: false,
        lastUpdated: Date.now()
      });

    } catch (error) {
      handleError(error, 'fetchData');
    }
  }, [state.topTracks, state.topArtists, state.lastUpdated, isCacheValid, updateState, handleError]);

  /**
   * Force refresh data from API
   */
  const refreshData = useCallback(async () => {
    await fetchData(trackLimit, true);
  }, [fetchData, trackLimit]);

  /**
   * Initial data fetch on mount
   */
  useEffect(() => {
    fetchData(trackLimit);
  }, []); // Only run on mount

  /**
   * Fetch data when track limit changes
   */
  useEffect(() => {
    if (state.topTracks || state.topArtists) {
      fetchData(trackLimit);
    }
  }, [trackLimit]); // Run when track limit changes

  /**
   * Auto-refresh data periodically
   */
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.lastUpdated && !isCacheValid(state.lastUpdated)) {
        fetchData(trackLimit);
      }
    }, CACHE_DURATION);

    return () => clearInterval(interval);
  }, [state.lastUpdated, trackLimit, fetchData, isCacheValid]);

  return {
    ...state,
    trackLimit,
    setTrackLimit,
    refreshData,
    clearError
  };
}