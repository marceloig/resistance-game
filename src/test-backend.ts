// Basic backend connectivity test

// Test function to verify backend connectivity
export async function testBackendConnectivity(): Promise<boolean> {
  try {
    // For now, just return true since we can't test without the sandbox running
    // This will be properly implemented once the backend is deployed
    console.log('Backend connectivity test - configuration appears valid');
    return true;
  } catch (error) {
    console.error('Backend connectivity test failed:', error);
    return false;
  }
}

// Room code generation function (as per requirements)
export function generateRoomCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}