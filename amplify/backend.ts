import { defineBackend } from "@aws-amplify/backend";
import {
    EventApi,
    AppSyncAuthorizationType,
    Code,
} from "aws-cdk-lib/aws-appsync";
import { Table, AttributeType, BillingMode } from "aws-cdk-lib/aws-dynamodb";
import { RemovalPolicy } from "aws-cdk-lib";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const backend = defineBackend({});

// Stack dedicada para os recursos do AppSync Events + DynamoDB
const eventsStack = backend.createStack("appsync-events");

/**
 * Tabela DynamoDB para persistir o estado das salas de jogo.
 * Usada pelo handler do AppSync Events para bloquear entrada durante partidas.
 *
 * Schema:
 * - roomCode (PK): código de 5 caracteres da sala
 * - status: "waiting" | "active" | "finished"
 * - players: lista de nomes dos jogadores
 * - updatedAt: timestamp ISO 8601
 */
const roomsTable = new Table(eventsStack, "GameRoomsTable", {
    // tableName omitido: CloudFormation gera um nome único por stack/ambiente,
    // evitando conflito entre sandbox e deploy de produção.
    partitionKey: { name: "roomCode", type: AttributeType.STRING },
    billingMode: BillingMode.PAY_PER_REQUEST,
    removalPolicy: RemovalPolicy.DESTROY,
});

/**
 * Event API com autenticação via API Key.
 * Permite connect, publish e subscribe sem necessidade de login (Cognito).
 */
const eventApi = new EventApi(eventsStack, "GameEventApi", {
    apiName: "game-event-api",
    authorizationConfig: {
        authProviders: [
            { authorizationType: AppSyncAuthorizationType.API_KEY },
        ],
        connectionAuthModeTypes: [AppSyncAuthorizationType.API_KEY],
        defaultPublishAuthModeTypes: [AppSyncAuthorizationType.API_KEY],
        defaultSubscribeAuthModeTypes: [AppSyncAuthorizationType.API_KEY],
    },
});

// Data source DynamoDB vinculado à Event API
const ddbDataSource = eventApi.addDynamoDbDataSource(
    "GameRoomsDataSource",
    roomsTable,
);

/**
 * Namespace "default" com handler que intercepta eventos para:
 * - Bloquear novos jogadores quando o jogo está ativo (player_joined → room_locked)
 * - Marcar a sala como ativa no DynamoDB (game_started)
 * - Marcar a sala como finalizada (game_over)
 */
eventApi.addChannelNamespace("default", {
    code: Code.fromAsset(join(__dirname, "handlers", "gameEventHandler.js")),
    publishHandlerConfig: {
        dataSource: ddbDataSource,
    },
});

/**
 * Exporta a configuração do Event API para amplify_outputs.json.
 * O Amplify client lê a seção "custom.events" para configurar events.connect().
 */
backend.addOutput({
    custom: {
        events: {
            url: `https://${eventApi.httpDns}/event`,
            aws_region: eventsStack.region,
            default_authorization_type: "API_KEY",
            api_key: eventApi.apiKeys?.["Default"]?.attrApiKey ?? "",
        },
    },
});
