# Tech Stack & Build

## Core Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| UI framework | React 19 | Functional components, hooks only |
| Build tool | Vite 8 | ESM-based, `@vitejs/plugin-react` |
| Language | TypeScript 6 (strict mode) | `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` |
| UI components | Cloudscape Design System v3 | AWS design system — import individual components, not barrel exports |
| Backend | AWS Amplify Gen 2 | Backend defined in `amplify/backend.ts` using `defineBackend()` |
| Real-time | AWS AppSync Events | WebSocket pub/sub via `aws-amplify/data` `events` API |

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | TypeScript check + Vite production build (outputs to `dist/`) |
| `npm run preview` | Preview production build locally |
| `npm run sandbox` | Start Amplify Gen 2 sandbox (generates `amplify_outputs.json`) |

## Key Conventions

- ESM throughout (`"type": "module"` in both root and `amplify/package.json`)
- Amplify configuration is loaded dynamically in `src/main.tsx` with a try/catch fallback when `amplify_outputs.json` is missing
- `amplify_outputs.json` is gitignored — it is generated per-environment by the Amplify sandbox or deploy process
- Cloudscape components are imported individually (e.g., `@cloudscape-design/components/app-layout`), not from a barrel index
- TypeScript strict mode is enabled in both frontend (`tsconfig.json`) and backend (`amplify/tsconfig.json`)
