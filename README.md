# Amplify Game Base

Projeto base para um jogo online utilizando AWS Amplify Gen 2, AppSync Events, React, Vite e Cloudscape Design System.

## Stack

| Tecnologia | Versão | Descrição |
|---|---|---|
| React | 19.2.5 | Biblioteca de UI |
| Vite | 8.0.9 | Build tool e dev server |
| TypeScript | 6.0.3 | Tipagem estática |
| AWS Amplify | 6.16.4 | SDK client-side (Gen 2) |
| @aws-amplify/backend | 1.22.0 | Definição do backend |
| Cloudscape Design | 3.0.1281 | Componentes visuais AWS |
| AppSync Events | via aws-amplify | WebSocket pub/sub em tempo real |

## Estrutura do Projeto

```
├── amplify/
│   ├── backend.ts          # Ponto de entrada do backend Amplify Gen 2
│   ├── package.json        # ESM config para o backend
│   └── tsconfig.json       # TypeScript config do backend
├── src/
│   ├── hooks/
│   │   └── useEventsConnection.ts  # Hook para AppSync Events (pub/sub)
│   ├── amplify_outputs.json        # Config gerada pelo Amplify (placeholder)
│   ├── App.tsx                     # Componente principal com Cloudscape
│   └── main.tsx                    # Entry point com configuração do Amplify
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

## Desenvolvimento

```bash
npm run dev
```

## Backend (Amplify Sandbox)

Para iniciar o sandbox local do Amplify Gen 2:

```bash
npm run sandbox
```

Isso vai gerar o arquivo `amplify_outputs.json` com as configurações do backend.

## AppSync Events

O projeto inclui o hook `useEventsConnection` que encapsula a API do AppSync Events:

```tsx
import { useEventsConnection } from "./hooks/useEventsConnection";

// Conectar a um canal e receber eventos
const { status, publish, publishViaChannel, disconnect } = useEventsConnection(
  "default/game",
  (event) => console.log("Evento recebido:", event)
);

// Publicar via HTTP
await publish("default/game", { action: "move", x: 10, y: 20 });

// Publicar via WebSocket (requer conexão ativa)
await publishViaChannel({ action: "move", x: 10, y: 20 });
```

### Configuração da Event API

1. Acesse o console do AWS AppSync
2. Crie uma Event API
3. Baixe o `amplify_outputs.json` da aba Integration
4. Salve em `src/amplify_outputs.json`

O formato esperado:

```json
{
  "API": {
    "Events": {
      "endpoint": "https://abc123.aws-appsync.us-east-1.amazonaws.com/event",
      "region": "us-east-1",
      "defaultAuthMode": "apiKey",
      "apiKey": "da2-xxxxxxxxxx"
    }
  }
}
```

## Build

```bash
npm run build
```

Os arquivos de produção serão gerados em `dist/`.
