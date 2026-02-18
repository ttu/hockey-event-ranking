# Development Guide

## Setup

### Prerequisites

- Node.js 20+
- npm

### Create Project

```bash
npm create vite@latest . -- --template react-ts
npm install
```

### Install Dependencies

See [architecture.md](architecture.md) for full dev dependency list. Key additions:

- ESLint, Prettier, Husky, lint-staged
- Vitest, @testing-library/react, jsdom
- tsx (for update-data script)

## Scripts

| Command                | Description                  |
| ---------------------- | ---------------------------- |
| `npm run dev`          | Start dev server             |
| `npm run build`        | Production build             |
| `npm run preview`      | Preview production build     |
| `npm run lint`         | ESLint (zero warnings)       |
| `npm run lint:fix`     | Fix ESLint issues            |
| `npm run format`       | Format with Prettier         |
| `npm run format:check` | Check formatting             |
| `npm run type-check`   | TypeScript check             |
| `npm test`             | Run Vitest                   |
| `npm run test:watch`   | Vitest watch mode            |
| `npm run validate`     | Format + lint + test + build |
| `npm run update-data`  | Validate/fill roster data    |

## Data Updates

Roster data is AI-generated using web scraping and scripts.

- **Structure:** `data/competitions/{id}.json` (summary) + `data/competitions/{id}/{teamId}.json` (per team) + optional `overrides.json` (manual corrections; always applied at load time, never overwritten by scripts)
- **Validate:** `npm run update-data`
- **Fill nationalLine:** `npx tsx scripts/update-data.ts --fill-national` (uses Daily Faceoff data when `scripts/data/{id}/national-lines.json` exists)
- **Fetch national team lines:** `npx tsx scripts/fetch-national-lines.ts [--competition=<id>]` fetches national team line combinations from [Daily Faceoff](https://www.dailyfaceoff.com/teams/team-switzerland/line-combinations) into `scripts/data/{id}/national-lines.json`. Then run `--fill-national` to apply.
- **Fill summary (team metrics):** `npx tsx scripts/update-data.ts --fill-summary`
- **Validate headshots:** `npx tsx scripts/validate-headshots.ts [competition-id]` checks all headshot URLs (HTTP reachable, no duplicate URLs). Use `--fix` to remove invalid/duplicate headshotUrl, then run fetch-headshots to refill.
- **Validate NHL_IDS:** `npx tsx scripts/validate-nhl-ids.ts` checks that each ID in `scripts/fetch-headshots.ts` resolves to the expected player (via api-web.nhle.com). Fix reported mismatches by updating IDs from roster API or removing entries so roster lookup is used.
- **Fetch headshots:** `npx tsx scripts/fetch-headshots.ts [competitionId]`
- **Event rosters with NHL lines:** `npx tsx scripts/fetch-nhl-lines.ts [--competition=<id>]` fetches NHL lineup data from DailyFaceoff into `scripts/data/{id}/nhl-club-lines.json` (event-specific; Olympics and World Championship use separate snapshots). Then run the event’s generate script (e.g. `npx tsx scripts/generate-olympics-2026.ts`).

See [data model](datamodel.md) for schema.

## Git Hooks

- **Pre-commit:** lint-staged, type-check, test, build
- **Pre-push:** Rebase-on-main check

Run `npm install` to install Husky hooks.

## Debugging

- Dev server: `http://localhost:5173`
- Vitest: `npm run test:watch` for TDD
