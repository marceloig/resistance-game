import { defineBackend } from "@aws-amplify/backend";

/**
 * Backend Amplify Gen 2.
 *
 * Este é o ponto de entrada do backend. Recursos como auth, data, storage
 * e functions podem ser adicionados aqui conforme a necessidade do jogo.
 *
 * Para AppSync Events, a configuração da Event API é feita diretamente
 * no console da AWS ou via CDK/CloudFormation, e o endpoint é referenciado
 * no amplify_outputs.json.
 *
 * Exemplo de como adicionar auth:
 *   import { auth } from "./auth/resource";
 *   defineBackend({ auth });
 */
defineBackend({});
