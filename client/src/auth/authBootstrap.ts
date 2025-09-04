/**
 * Handle OAuth callback before React starts to prevent StrictMode issues
 */

import { getAccessToken } from './pkce';
import { fetchUserProfile } from './spotifyAuth';

export async function handleAuthBeforeReact() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const error = urlParams.get('error');

  if (code && !(window as any).__SPOTIFY_AUTH_RESULT__) {
    console.log('Processing OAuth callback before React starts');
    
    try {
      const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
      const redirectUri = import.meta.env.VITE_REDIRECT_URI || window.location.origin;
      
      const tokens = await getAccessToken(clientId, code, redirectUri);
      console.log('Tokens received successfully');
      
      const expiresAt = Date.now() + (tokens.expires_in * 1000);
      const authTokens = { ...tokens, expires_at: expiresAt };
      localStorage.setItem('spotify_tokens', JSON.stringify(authTokens));
      
      const user = await fetchUserProfile();
      console.log('User profile fetched:', user.display_name);
      localStorage.setItem('spotify_user', JSON.stringify(user));
      
      (window as any).__SPOTIFY_AUTH_RESULT__ = {
        success: true,
        user,
        tokens: authTokens
      };
      
      window.history.replaceState({}, document.title, window.location.pathname);
      
    } catch (err) {
      console.error('OAuth callback failed:', err);
      (window as any).__SPOTIFY_AUTH_RESULT__ = {
        success: false,
        error: err instanceof Error ? err.message : 'Authentication failed'
      };
    }
  } else if (error) {
    (window as any).__SPOTIFY_AUTH_RESULT__ = {
      success: false,
      error: `Spotify authentication ${error === 'access_denied' ? 'was denied' : 'failed'}: ${error}`
    };
  }
}