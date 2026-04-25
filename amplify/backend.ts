import { defineBackend } from "@aws-amplify/backend";
import {
    CfnApi,
    CfnApiKey,
    CfnChannelNamespace,
    AuthorizationType,
} from "aws-cdk-lib/aws-appsync";

const backend = defineBackend({});

// Stack dedicada para os recursos do AppSync Events
const eventsStack = backend.createStack("appsync-events");

/**
 * Event API com autenticação via API Key.
 * Permite connect, publish e subscribe sem necessidade de login (Cognito).
 * Ideal para a fase inicial do jogo — pode ser migrado para User Pool depois.
 */
const cfnEventApi = new CfnApi(eventsStack, "GameEventApi", {
    name: "game-event-api",
    eventConfig: {
        authProviders: [
            { authType: AuthorizationType.API_KEY },
        ],
        connectionAuthModes: [{ authType: AuthorizationType.API_KEY }],
        defaultPublishAuthModes: [{ authType: AuthorizationType.API_KEY }],
        defaultSubscribeAuthModes: [{ authType: AuthorizationType.API_KEY }],
    },
});

// API Key para autenticação — expira em 365 dias
const apiKey = new CfnApiKey(eventsStack, "GameEventApiKey", {
    apiId: cfnEventApi.attrApiId,
    expires: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
});

// Namespace "default" — os canais seguem o padrão default/game-<CÓDIGO>
const namespace = new CfnChannelNamespace(eventsStack, "DefaultNamespace", {
    apiId: cfnEventApi.attrApiId,
    name: "default",
});
namespace.addDependency(cfnEventApi);

/**
 * Exporta a configuração do Event API para amplify_outputs.json.
 * O Amplify client lê a seção "custom.events" para configurar events.connect().
 */
backend.addOutput({
    custom: {
        events: {
            url: `https://${cfnEventApi.getAtt("Dns.Http").toString()}/event`,
            aws_region: eventsStack.region,
            default_authorization_type: AuthorizationType.API_KEY,
            api_key: apiKey.attrApiKey,
        },
    },
});
