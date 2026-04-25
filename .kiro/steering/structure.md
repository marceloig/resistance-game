# Project Structure

```
├── amplify/                  # AWS Amplify Gen 2 backend
│   ├── backend.ts            # Backend entry point (EventApi + DynamoDB)
│   ├── handlers/
│   │   └── gameEventHandler.js  # AppSync Events onPublish handler
│   ├── package.json          # ESM config for backend
│   └── tsconfig.json         # Separate TS config targeting ES2022
├── src/                      # Frontend source
│   ├── components/           # React UI components (one per game phase)
│   ├── game/
│   │   ├── avalonConfig.ts   # Game constants (team sizes, roles, thresholds)
│   │   ├── avalonEngine.ts   # Pure game logic functions (no state)
│   │   └── __tests__/        # Unit and integration tests
│   │       ├── avalonConfig.test.ts
│   │       ├── avalonEngine.test.ts
│   │       └── gameFlow.integration.test.ts
│   ├── hooks/                # Custom React hooks
│   │   ├── useAvalonGame.ts        # Game state + event handling
│   │   ├── useEventsConnection.ts  # AppSync Events pub/sub hook
│   │   └── useGameRoom.ts         # Room management + audit log
│   ├── types/
│   │   └── avalon.ts         # Types, roles, events, game state
│   ├── App.tsx               # Root component (Cloudscape layout)
│   └── main.tsx              # Entry point — Amplify.configure + React root
├── dist/                     # Production build output (gitignored)
├── index.html                # Vite HTML entry (lang="pt-BR")
├── vite.config.ts            # Vite configuration
├── tsconfig.json             # Frontend TypeScript config
└── package.json              # Dependencies and scripts
```

## Architecture Notes

- **Frontend and backend are co-located** but have separate TypeScript configs. The `amplify/` directory is excluded from the frontend `tsconfig.json` (which only includes `src/`).
- **Hooks directory** (`src/hooks/`) holds reusable stateful logic. `useAvalonGame` manages game state, `useGameRoom` manages room lifecycle, `useEventsConnection` wraps AppSync Events.
- **Game logic** (`src/game/`) contains pure functions with no side effects. `avalonEngine.ts` handles all game rules (The Resistance), `avalonConfig.ts` holds constants. Both are fully unit-tested.
- **DynamoDB integration** — The AppSync Events `onPublish` handler in `amplify/handlers/gameEventHandler.js` uses DynamoDB to persist room state and enforce server-side room locking during active games.
- **Tests** — Vitest is configured with unit tests for config/engine and integration tests that simulate full game flows through the event state reducer.
- **No routing** is set up — the app is a single-page view. Add a router when multiple views are needed.
