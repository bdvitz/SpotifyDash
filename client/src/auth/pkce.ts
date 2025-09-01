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
  localStorage.setItem('code_verifier', verifier);

  // Build authorization URL parameters (matching Spotify docs exactly)
  const params = new URLSearchParams();
  params.append('client_id', clientId);
  params.append('response_type', 'code');
  params.append('redirect_uri', redirectUri);
  params.append('scope', scope);
  params.append('code_challenge_method', 'S256');
  params.append('code_challenge', challenge);

  // Redirect to Spotify
  document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
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
  const verifier = localStorage.getItem('code_verifier');
  
  if (!verifier) {
    throw new Error('No code verifier found. Please restart the authentication process.');
  }

  // Build form data (matching Spotify docs exactly)
  const params = new URLSearchParams();
  params.append('client_id', clientId);
  params.append('grant_type', 'authorization_code');
  params.append('code', code);
  params.append('redirect_uri', redirectUri);
  params.append('code_verifier', verifier);

  console.log('Token exchange params:', {
    client_id: clientId,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code_length: code.length,
    verifier_length: verifier.length
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
    console.error('Token exchange failed:', {
      status: response.status,
      statusText: response.statusText,
      error: errorData
    });
    throw new Error(`Token exchange failed: ${errorData.error_description || errorData.error || response.statusText}`);
  }

  const tokenData = await response.json();
  
  // Clean up stored verifier
  localStorage.removeItem('code_verifier');
  
  return tokenData;
}