import { defineBackend } from '@aws-amplify/backend';
import { CfnApi } from 'aws-cdk-lib/aws-appsync';
import { auth } from './auth/resource';
import { data } from './data/resource';

export const backend = defineBackend({
  auth,
  data,
});

const gameEventsApi = new CfnApi(backend.createStack('GameEventsStack'), 'GameEventsApi', {
  name: 'game-events-api',
  eventConfig: {
    authProviders: [{
      authType: 'API_KEY'
    }],
    connectionAuthModes: [{
      authType: 'API_KEY'
    }],
    defaultPublishAuthModes: [{
      authType: 'API_KEY'
    }],
    defaultSubscribeAuthModes: [{
      authType: 'API_KEY'
    }]
  }
});