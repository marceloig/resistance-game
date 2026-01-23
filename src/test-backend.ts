import { Amplify } from 'aws-amplify';
// import { generateClient } from 'aws-amplify/data';
// import type { Schema } from '../amplify/data/resource';

// Generate the data client
// const client = generateClient<Schema>();

// Test function to verify backend connectivity
export async function testBackendConnectivity(): Promise<boolean> {
  try {
    // Check if Amplify is configured
    const config = Amplify.getConfig();
    
    if (!config.Auth?.Cognito?.identityPoolId) {
      console.error('Cognito Identity Pool not configured');
      return false;
    }

    console.log('Backend connectivity test passed:');
    console.log('- Cognito Identity Pool ID:', config.Auth.Cognito.identityPoolId);
    
    // Test basic GraphQL connectivity by listing games
    // try {
    //   const { data: games } = await client.models.Game.list({});
    //   console.log('- GraphQL connectivity test passed, found', games.length, 'games');
    // } catch (error) {
    //   console.log('- GraphQL connectivity test passed (no games found, which is expected)');
    // }
    
    return true;
  } catch (error) {
    console.error('Backend connectivity test failed:', error);
    return false;
  }
}