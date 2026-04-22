# Project Structure

```
├── amplify/                  # AWS Amplify Gen 2 backend
│   ├── backend.ts            # Backend entry point (defineBackend)
│   ├── package.json          # ESM config for backend
│   └── tsconfig.json         # Separate TS config targeting ES2022
├── src/                      # Frontend source
│   ├── hooks/                # Custom React hooks
│   │   └── useEventsConnection.ts  # AppSync Events pub/sub hook
│   ├── amplify_outputs.json  # Generated Amplify config (gitignored)
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
- **Hooks directory** (`src/hooks/`) holds reusable stateful logic. New hooks for game mechanics, player state, etc. should go here.
- **No routing** is set up yet — the app is a single-page view. Add a router when multiple views are needed.
- **No test framework** is configured. When adding tests, Vitest is the natural choice given the Vite build system.
