/**
 * Spotify API integration and authentication management
 */

import { redirectToAuthCodeFlow, getAccessToken } from './pkce';

// Configuration
const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI || window.location.origin;
const SCOPE = 'user-read-private user-read-email user-top-read user-read-recently-played';

// Types
export interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  images: Array<{ url: string; height?: number; width?: number }>;
  country: string;
  followers: { total: number };
  external_urls: { spotify: string };
  href: string;
  uri: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ id: string; name: string }>;
  album: {
    id: string;
    name: string;
    images: Array<{ url: string; height?: number; width?: number }>;
  };
  duration_ms: number;
  external_urls: { spotify: string };
  preview_url: string | null;
  popularity: number;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  images: Array<{ url: string; height?: number; width?: number }>;
  followers: { total: number };
  external_urls: { spotify: string };
  popularity: number;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  artists: Array<{ id: string; name: string }>;
  images: Array<{ url: string; height?: number; width?: number }>;
  release_date: string;
  total_tracks: number;
  external_urls: { spotify: string };
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  expires_at: number; // Calculated expiration timestamp
}

/**
 * Initiates Spotify OAuth flow
 */
export async function loginWithSpotify(): Promise<void> {
  if (!SPOTIFY_CLIENT_ID) {
    throw new Error('Spotify Client ID not configured. Please set VITE_SPOTIFY_CLIENT_ID in your .env file.');
  }

  await redirectToAuthCodeFlow(SPOTIFY_CLIENT_ID, REDIRECT_URI, SCOPE);
}

/**
 * Handles the OAuth callback and exchanges code for tokens
 * @param code - Authorization code from Spotify
 * @returns Token information
 */
export async function handleSpotifyCallback(code: string): Promise<AuthTokens> {
  if (!SPOTIFY_CLIENT_ID) {
    throw new Error('Spotify Client ID not configured.');
  }

  const tokenData = await getAccessToken(SPOTIFY_CLIENT_ID, code, REDIRECT_URI);
  
  // Calculate expiration timestamp
  const expiresAt = Date.now() + (tokenData.expires_in * 1000);
  
  const tokens: AuthTokens = {
    ...tokenData,
    expires_at: expiresAt
  };

  // Store tokens securely
  localStorage.setItem('spotify_tokens', JSON.stringify(tokens));
  
  return tokens;
}

/**
 * Gets stored authentication tokens
 * @returns Stored tokens or null if not found/expired
 */
export function getStoredTokens(): AuthTokens | null {
  try {
    const storedTokens = localStorage.getItem('spotify_tokens');
    if (!storedTokens) return null;

    const tokens: AuthTokens = JSON.parse(storedTokens);
    
    // Check if token is expired (with 5 minute buffer)
    if (Date.now() > (tokens.expires_at - 5 * 60 * 1000)) {
      localStorage.removeItem('spotify_tokens');
      return null;
    }

    return tokens;
  } catch (error) {
    console.error('Error parsing stored tokens:', error);
    localStorage.removeItem('spotify_tokens');
    return null;
  }
}

/**
 * Clears authentication data
 */
export function logout(): void {
  localStorage.removeItem('spotify_tokens');
  localStorage.removeItem('code_verifier');
  localStorage.removeItem('spotify_user');
}

/**
 * Makes authenticated requests to Spotify API
 * @param endpoint - API endpoint (without base URL)
 * @param options - Fetch options
 * @returns API response
 */
export async function spotifyApiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const tokens = getStoredTokens();
  
  if (!tokens) {
    throw new Error('No valid authentication tokens. Please log in again.');
  }

  const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${tokens.access_token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Token expired or invalid
      logout();
      throw new Error('Authentication expired. Please log in again.');
    }
    
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Spotify API error: ${errorData.error?.message || response.statusText}`);
  }

  return response.json();
}

/**
 * Fetches current user profile
 * @returns User profile data
 */
export async function fetchUserProfile(): Promise<SpotifyUser> {
  const profile = await spotifyApiRequest<SpotifyUser>('/me');
  
  // Cache user profile
  localStorage.setItem('spotify_user', JSON.stringify(profile));
  
  return profile;
}

/**
 * Fetches user's top tracks
 * @param limit - Number of tracks to fetch (1-50)
 * @param timeRange - Time range for top tracks
 * @returns Array of top tracks
 */
export async function fetchTopTracks(
  limit: number = 20,
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term'
): Promise<SpotifyTrack[]> {
  const response = await spotifyApiRequest<{ items: SpotifyTrack[] }>(
    `/me/top/tracks?limit=${limit}&time_range=${timeRange}`
  );
  
  return response.items;
}

/**
 * Fetches user's top artists
 * @param limit - Number of artists to fetch (1-50)
 * @param timeRange - Time range for top artists
 * @returns Array of top artists
 */
export async function fetchTopArtists(
  limit: number = 20,
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term'
): Promise<SpotifyArtist[]> {
  const response = await spotifyApiRequest<{ items: SpotifyArtist[] }>(
    `/me/top/artists?limit=${limit}&time_range=${timeRange}`
  );
  
  return response.items;
}

/**
 * Gets cached user profile
 * @returns Cached user profile or null
 */
export function getCachedUser(): SpotifyUser | null {
  try {
    const cachedUser = localStorage.getItem('spotify_user');
    return cachedUser ? JSON.parse(cachedUser) : null;
  } catch (error) {
    console.error('Error parsing cached user:', error);
    localStorage.removeItem('spotify_user');
    return null;
  }
}

/**
 * Checks if user is authenticated
 * @returns True if user has valid tokens
 */
export function isAuthenticated(): boolean {
  return getStoredTokens() !== null;
}