/**
 * PKCE (Proof Key for Code Exchange) implementation for Spotify OAuth
 * Following Spotify's recommended security practices
 */

/**
 * Generates a cryptographically secure random code verifier
 * @param length - Length of the code verifier (43-128 characters)
 * @returns Base64URL-encoded code verifier
 */
export function generateCodeVerifier(length: number = 128): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

/**
 * Generates SHA256 hash of the code verifier for the code challenge
 * @param codeVerifier - The code verifier to hash
 * @returns Base64URL-encoded code challenge
 */
export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Redirects user to Spotify's authorization page
 * @param clientId - Spotify application client ID
 * @param redirectUri - URI to redirect back to after authorization
 * @param scope - Requested permissions
 */
export async function redirectToAuthCodeFlow(
  clientId: string,
  redirectUri: string,
  scope: string
): Promise<void> {
  // Generate PKCE parameters
  const verifier = generateCodeVerifier(128);
  const challenge = await generateCodeChallenge(verifier);

  // Store verifier for later use
  localStorage.setItem('spotify_code_verifier', verifier);

  // Build authorization URL
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: scope,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    // Add state parameter for additional security (optional but recommended)
    state: generateState()
  });

  // Redirect to Spotify
  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

/**
 * Exchanges authorization code for access token
 * @param clientId - Spotify application client ID
 * @param code - Authorization code from Spotify
 * @param redirectUri - Same redirect URI used in authorization
 * @returns Access token and additional token info
 */
export async function getAccessToken(
  clientId: string,
  code: string,
  redirectUri: string
): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}> {
  const verifier = localStorage.getItem('spotify_code_verifier');
  
  if (!verifier) {
    throw new Error('No code verifier found. Please restart the authentication process.');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirectUri,
    code_verifier: verifier
  });

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Token exchange failed: ${errorData.error_description || response.statusText}`);
  }

  const tokenData = await response.json();
  
  // Clean up stored verifier
  localStorage.removeItem('spotify_code_verifier');
  
  return tokenData;
}

/**
 * Generates a random state parameter for additional security
 * @returns Random state string
 */
function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validates the state parameter returned from Spotify
 * @param returnedState - State returned from Spotify
 * @param originalState - Original state sent to Spotify
 * @returns True if states match
 */
export function validateState(returnedState: string | null, originalState: string): boolean {
  return returnedState === originalState;
}