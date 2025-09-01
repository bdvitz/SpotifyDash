import React, { useEffect } from 'react';
import { generateCodeVerifier, generateCodeChallenge } from './auth/pkce';
import { setStorageItem, getStorageItem } from './utils/storage';
import { checkApiHealth } from './utils/api';

const TestComponent: React.FC = () => {
  useEffect(() => {
    const runTests = async () => {
      console.log('=== PHASE 2 TESTS ===');
      
      // Test 1: Environment Variables
      console.log('Client ID:', import.meta.env.VITE_SPOTIFY_CLIENT_ID);
      
      // Test 2: PKCE Functions
      const verifier = generateCodeVerifier();
      console.log('Code verifier:', verifier);
      
      const challenge = await generateCodeChallenge(verifier);
      console.log('Code challenge:', challenge);
      
      // Test 3: Storage Utils
      setStorageItem('test', { hello: 'world' });
      console.log('Retrieved:', getStorageItem('test'));
      
      // Test 4: API Health Check
      const healthy = await checkApiHealth();
      console.log('API healthy:', healthy);
    };
    
    runTests();
  }, []);

  return <div>Check console for test results</div>;
};

export default TestComponent;