# Hockey Event Ranking

**Team Value Comparison** – Compare national hockey teams for international competitions (Olympics, World Championship). Ranks teams by roster value (salary sum) and player score. Supports head-to-head comparison of top teams.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Features

- **Competition selection** – Olympics 2026, etc.
- **Team rankings** – Sort by total value (salary), total score, or average score
- **Team detail** – Roster with position, league, club, salary, estimated badge, score, line, role
- **Head-to-head comparison** – Compare top 3 teams side by side
- **National teams** – Canada, USA, Sweden, Finland, and more

## Player Score

Each player receives a score 0–100 from:

- **League tier (40%)** – NHL=1.0, KHL≈0.7, European leagues 0.4–0.6
- **Line (35%)** – 1st line > 4th line; top-4 D > bottom pair; starter > backup goalie
- **Role (25%)** – top-6 > bottom-6; top-4 > bottom-2

## Salary & Estimates

- **Absolute value** = sum of yearly salaries (USD)
- NHL: actual salaries when available
- European leagues: estimates marked with \* in roster

## Data

Roster data is AI-generated using web scraping and scripts. It is stored in `public/data/competitions/{competitionId}.json` (summary) + `competitions/{competitionId}/{teamId}.json` (per team). An optional `overrides.json` per competition allows manual corrections; overrides are always applied at load time and are never overwritten by generated data.

```bash
npm run update-data           # Validate JSON
npm run update-data -- --write-sample   # Write sample data
```

## Scripts

| Script                | Description                      |
| --------------------- | -------------------------------- |
| `npm run dev`         | Start dev server                 |
| `npm run build`       | Production build                 |
| `npm test`            | Run unit tests                   |
| `npm run lint`        | Lint with ESLint                 |
| `npm run validate`    | Lint, type-check, test, build    |
| `npm run update-data` | Validate or generate roster JSON |

## Deploy

Static site. Deploy `dist/` to any static host. Live at [https://ttu.github.io/hockey-event-ranking/](https://ttu.github.io/hockey-event-ranking/).
