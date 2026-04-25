# The Resistance

Jogo online de dedução social baseado em The Resistance, utilizando AWS Amplify Gen 2, AppSync Events, DynamoDB, React, Vite e Cloudscape Design System.

## Stack

| Tecnologia | Versão | Descrição |
|---|---|---|
| React | 19.2.5 | Biblioteca de UI |
| Vite | 8.0.9 | Build tool e dev server |
| TypeScript | 6.0.3 | Tipagem estática |
| Vitest | 4.1.5 | Framework de testes |
| AWS Amplify | 6.16.4 | SDK client-side (Gen 2) |
| @aws-amplify/backend | 1.22.0 | Definição do backend |
| Cloudscape Design | 3.0.1281 | Componentes visuais AWS |
| AppSync Events | via aws-amplify | WebSocket pub/sub em tempo real |
| DynamoDB | via aws-cdk-lib | Persistência de estado das salas |

## Estrutura do Projeto

```
├── amplify/
│   ├── backend.ts              # Backend Amplify Gen 2 (EventApi + DynamoDB)
│   ├── handlers/
│   │   └── gameEventHandler.js # Handler onPublish do AppSync Events
│   ├── package.json
│   └── tsconfig.json
├── src/
│   ├── components/             # Componentes React do jogo
│   │   ├── AssassinPhase.tsx
│   │   ├── AuditLog.tsx
│   │   ├── AvalonBoard.tsx
│   │   ├── GameLobby.tsx
│   │   ├── GameOver.tsx
│   │   ├── GameRoom.tsx
│   │   ├── MissionResult.tsx
│   │   ├── MissionTracker.tsx
│   │   ├── MissionVote.tsx
│   │   ├── RoleReveal.tsx
│   │   ├── TeamProposal.tsx
│   │   ├── TeamVote.tsx
│   │   └── WaitingRoom.tsx
│   ├── game/
│   │   ├── avalonConfig.ts     # Configurações do jogo (tamanhos, papéis)
│   │   ├── avalonEngine.ts     # Lógica pura do jogo (funções sem estado)
│   │   └── __tests__/
│   │       ├── avalonConfig.test.ts          # Testes unitários da config
│   │       ├── avalonEngine.test.ts          # Testes unitários do engine
│   │       └── gameFlow.integration.test.ts  # Testes de integração do fluxo
│   ├── hooks/
│   │   ├── useAvalonGame.ts        # Estado e eventos do jogo
│   │   ├── useEventsConnection.ts  # Hook para AppSync Events (pub/sub)
│   │   └── useGameRoom.ts         # Gerenciamento de salas
│   ├── types/
│   │   └── avalon.ts           # Tipos, papéis e eventos do jogo
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vite-env.d.ts
```

## Pré-requisitos

- Node.js 20+
- Conta AWS configurada (`aws configure`)
- npm

## Instalação

```bash
npm install
```

## Comandos

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia o servidor de desenvolvimento Vite |
| `npm run build` | Verificação TypeScript + build de produção |
| `npm run preview` | Preview do build de produção |
| `npm run test` | Executa todos os testes (unitários + integração) |
| `npm run test:watch` | Executa testes em modo watch |
| `npm run sandbox` | Inicia o sandbox Amplify Gen 2 |

## Testes

O projeto usa **Vitest** como framework de testes. A suíte cobre:

### Testes unitários (67 testes)

- **`avalonConfig.test.ts`** — Tamanhos de equipe, missões com 2 falhas, distribuição de papéis, proporção Resistência/Espiões para 5-10 jogadores
- **`avalonEngine.test.ts`** — Todas as funções do engine: criação de estado, visibilidade por papel, votação de equipe, resolução de missão, rotação de líder, proposta forçada, fase do assassino, determinação do vencedor

### Testes de integração (23 testes)

- **`gameFlow.integration.test.ts`** — Fluxos completos do jogo simulando sequências de eventos: início → revelação → proposta → votação → missão → resultado → próxima missão. Cobre cenários de vitória da Resistência, vitória dos Espiões, fase do assassino, proposta forçada e jogos de 5 missões.

```bash
npm run test
```

## Backend — AppSync Events + DynamoDB

O backend usa **AWS AppSync Events** (L2 `EventApi` construct) com **DynamoDB** como data source para persistir o estado das salas e bloquear entrada de novos jogadores durante partidas.

### Tabela DynamoDB: `game-rooms`

| Atributo | Tipo | Descrição |
|----------|------|-----------|
| `roomCode` (PK) | String | Código de 5 caracteres da sala |
| `status` | String | `"active"` ou `"finished"` |
| `players` | List | Nomes dos jogadores |
| `updatedAt` | String | Timestamp ISO 8601 |

### Handler do AppSync Events (`amplify/handlers/gameEventHandler.js`)

O handler `onPublish` intercepta eventos publicados no canal:

| Evento | Ação no DynamoDB | Comportamento |
|--------|-----------------|---------------|
| `player_joined` | `get(roomCode)` | Se `status === "active"`, transforma em `room_locked` (bloqueia entrada) |
| `game_started` | `put(...)` | Cria/atualiza sala com `status: "active"` |
| `game_over` | `update(...)` | Atualiza para `status: "finished"` |
| Outros | Nenhum (`earlyReturn`) | Passa direto sem acessar DynamoDB |

### Sandbox

```bash
npm run sandbox
```

Gera `amplify_outputs.json` com as configurações do Event API e cria a tabela DynamoDB automaticamente.

## AppSync Events — Hook

O hook `useEventsConnection` encapsula a API do AppSync Events:

```tsx
const { status, publish, disconnect } = useEventsConnection(
  "default/game-XXXXX",
  (event) => console.log("Evento:", event)
);

await publish("default/game-XXXXX", { type: "player_joined", playerName: "João" });
```

## Build

```bash
npm run build
```

Os arquivos de produção são gerados em `dist/`.
