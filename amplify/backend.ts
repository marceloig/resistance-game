import { defineBackend } from '@aws-amplify/backend';
import { CfnApi } from 'aws-cdk-lib/aws-appsync';
import { PolicyStatement, Effect, Role } from 'aws-cdk-lib/aws-iam';
import { auth } from './auth/resource';
import { data } from './data/resource';

export const backend = defineBackend({
  auth,
  data,
});

// Create AppSync Events API for real-time game communication
const gameEventsStack = backend.createStack('GameEventsStack');
const gameEventsApi = new CfnApi(gameEventsStack, 'GameEventsApi', {
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

// Grant permissions to unauthenticated users to access AppSync Events
const unauthRole = backend.auth.resources.unauthenticatedUserIamRole as Role;
unauthRole.addToPolicy(new PolicyStatement({
  effect: Effect.ALLOW,
  actions: [
    'appsync:EventConnect',
    'appsync:EventSubscribe',
    'appsync:EventPublish'
  ],
  resources: [
    `arn:aws:appsync:${gameEventsStack.region}:${gameEventsStack.account}:apis/${gameEventsApi.attrApiId}/*`
  ]
}));

// Export the Events API configuration for frontend use
backend.addOutput({
  custom: {
    gameEventsApiId: gameEventsApi.attrApiId,
    gameEventsApiUrl: `https://${gameEventsApi.attrApiId}.appsync-realtime-api.${gameEventsStack.region}.amazonaws.com/event`,
    gameEventsRegion: gameEventsStack.region
  }
});