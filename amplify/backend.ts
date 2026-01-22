import { defineBackend } from '@aws-amplify/backend';
import { CfnApi } from 'aws-cdk-lib/aws-appsync';
import { auth } from './auth/resource';
import { data } from './data/resource';

export const backend = defineBackend({
  auth,
  data,
});

// Create AppSync Events API for real-time game communication
const gameEventsApi = new CfnApi(backend.createStack('GameEventsStack'), 'GameEventsApi', {
  name: 'resistance-game-events-api',
  eventConfig: {
    authProviders: [{
      authType: 'AWS_IAM'
    }],
    connectionAuthModes: [{
      authType: 'AWS_IAM'
    }],
    defaultPublishAuthModes: [{
      authType: 'AWS_IAM'
    }],
    defaultSubscribeAuthModes: [{
      authType: 'AWS_IAM'
    }]
  }
});

// Export the Events API endpoint for frontend use
backend.addOutput({
  custom: {
    gameEventsApiEndpoint: gameEventsApi.attrApiId,
    gameEventsApiUrl: `https://${gameEventsApi.attrApiId}.appsync-api.${backend.stack.region}.amazonaws.com/event`
  }
});