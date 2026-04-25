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

## Code style

- Functions: 4-20 lines. Split if longer.
- Files: under 500 lines. Split by responsibility.
- One thing per function, one responsibility per module (SRP).
- Names: specific and unique. Avoid `data`, `handler`, `Manager`.
  Prefer names that return <5 grep hits in the codebase.
- Types: explicit. No `any`, no `Dict`, no untyped functions.
- No code duplication. Extract shared logic into a function/module.
- Early returns over nested ifs. Max 2 levels of indentation.
- Exception messages must include the offending value and expected shape.

## Comments

- Keep your own comments. Don't strip them on refactor — they carry
  intent and provenance.
- Write WHY, not WHAT. Skip `// increment counter` above `i++`.
- Docstrings on public functions: intent + one usage example.
- Reference issue numbers / commit SHAs when a line exists because
  of a specific bug or upstream constraint.

## Tests

- Tests run with a single command: `<project-specific>`.
- Every new function gets a test. Bug fixes get a regression test.
- Mock external I/O (API, DB, filesystem) with named fake classes,
  not inline stubs.
- Tests must be F.I.R.S.T: fast, independent, repeatable,
  self-validating, timely.

## Dependencies

- Inject dependencies through constructor/parameter, not global/import.
- Wrap third-party libs behind a thin interface owned by this project.

## Structure

- Follow the framework's convention (Rails, Django, Next.js, etc.).
- Prefer small focused modules over god files.
- Predictable paths: controller/model/view, src/lib/test, etc.

## Formatting

- Use the language default formatter (`cargo fmt`, `gofmt`, `prettier`,
  `black`, `rubocop -A`). Don't discuss style beyond that.

## Logging

- Structured JSON when logging for debugging / observability.
- Plain text only for user-facing CLI output.