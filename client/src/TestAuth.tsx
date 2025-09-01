import React from 'react';

const TestAuth: React.FC = () => {
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  
  return (
    <div style={{ color: 'white', padding: '20px' }}>
      <h2>Phase 2 Tests</h2>
      <p>Spotify Client ID: {clientId ? '✅ Found' : '❌ Missing'}</p>
      <p>Actual ID: {clientId}</p>
      {!clientId && (
        <p style={{ color: 'red' }}>
          Add VITE_SPOTIFY_CLIENT_ID=17fc919046544e67b1a3fcbeb9fc8b52 to your client/.env file
        </p>
      )}
    </div>
  );
};

export default TestAuth;