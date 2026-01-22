import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  access: (allow) => [
    allow.unauthenticatedUserAccess().to(['read', 'write'])
  ]
});