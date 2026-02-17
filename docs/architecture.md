# Architecture

## Tech Stack

From [emergency-supply-tracker](https://github.com/ttu/emergency-supply-tracker). Omit: Storybook, Playwright, Stryker, i18n.

| Category   | Tools                                     |
| ---------- | ----------------------------------------- |
| Build      | Vite 7                                    |
| Framework  | React 19, @vitejs/plugin-react            |
| Language   | TypeScript 5.9                            |
| Testing    | Vitest 4, @testing-library/react, jsdom   |
| Linting    | ESLint 9 (flat config), typescript-eslint |
| Formatting | Prettier 3, eslint-config-prettier        |
| Git hooks  | Husky, lint-staged                        |

## Folder Layout

```
src/
  types.ts        # TypeScript interfaces (RosterPlayer, Competition, etc.)
  components/     # React components
  lib/            # Calculation logic (player score, team metrics)
  data/           # Leagues, national teams, data loading
public/
  data/           # JSON files (competitions/{id}.json, competitions/{id}/{teamId}.json)
scripts/
  update-data.ts      # Validate/write roster JSON
  generate-og-image.ts # Generate OG image for social sharing
```

## Build & Runtime

- **Build:** Static (Vite). No backend, no database.
- **Data:** Loaded at runtime from JSON files in `public/data/`.
- **Hosting:** Vercel, Netlify, GitHub Pages.

## Data Flow

1. App loads `public/data/competitions/{competitionId}.json` (summary) and `competitions/{competitionId}/{teamId}.json` (per team) for selected competition.
2. Computes team metrics (total salary, total score) and player scores.
3. Rankings view or team detail renders.
