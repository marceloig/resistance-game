import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  Game: a
    .model({
      id: a.id(),
      name: a.string().required(),
      status: a.enum(['waiting', 'in_progress', 'completed']),
      players: a.hasMany('Player', 'gameId'),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.authenticated(),
      allow.unauthenticated().to(['read', 'create', 'update'])
    ]),

  Player: a
    .model({
      id: a.id(),
      username: a.string().required(),
      gameId: a.id(),
      game: a.belongsTo('Game', 'gameId'),
      role: a.enum(['resistance', 'spy']),
      isLeader: a.boolean(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.authenticated(),
      allow.unauthenticated().to(['read', 'create', 'update'])
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'identityPool',
    identityPoolAuthorizationMode: {
      authenticatedUserRole: 'ALLOW',
      unauthenticatedUserRole: 'ALLOW'
    }
  },
});