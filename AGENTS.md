# AI Agents & Workflows

Guide for AI-assisted development on Hockey Event Ranking. All relevant info below; see `docs/` for full specs.

---

## Project Context

**Hockey Event Ranking** – Front-end-only static site comparing national hockey teams for international competitions (Olympics, World Championship). React + TypeScript + Vite, JSON roster data, no backend. Ranks teams by total roster value (salary) and player score (league + line + role). Reference: [docs/SPEC_CLARIFICATIONS.md](docs/SPEC_CLARIFICATIONS.md), [docs/datamodel.md](docs/datamodel.md), [docs/architecture.md](docs/architecture.md).

---

## Common Workflows

**1. New component** – In `src/components/`. TypeScript props, integration tests (React Testing Library). Follow implementation plan in `docs/plans/`.

**2. Business logic** – Pure utils in `src/lib/`, full types, unit tests. Reference [docs/SPEC_CLARIFICATIONS.md](docs/SPEC_CLARIFICATIONS.md) for formulas.

**3. Data script** – `scripts/update-data.ts` validates roster JSON; can write sample data. NHL salary fetch optional (API key required).

**4. Refactor** – Keep behavior and coverage; run tests. Describe current issues and goal.

**5. Debug** – Provide: current vs expected behavior, steps to reproduce, relevant files, error message.

---

## Code Review Checklist

- TypeScript types correct and complete
- Test coverage for new logic
- Accessible, responsive
- Error handling
- JSDoc for complex logic

---

## Conventions

- **Naming:** Components in `src/components/`, logic in `src/lib/`, data in `src/data/`, `public/data/`.
- **Player data order:** Roster JSON (`public/data/competitions/.../...json`) always orders the `players` array by `playerId` (localeCompare). This keeps diffs meaningful when updating data.
- **Tests:** Unit `[function].test.ts`, component `[Component].test.tsx`.
- **Commits:** Conventional (`feat`, `fix`, `docs`, etc.). Never `--no-verify`.

---

## Documentation

| Doc                                                        | Purpose                              |
| ---------------------------------------------------------- | ------------------------------------ |
| [docs/SPEC_CLARIFICATIONS.md](docs/SPEC_CLARIFICATIONS.md) | League weights, player score formula |
| [docs/calculations.md](docs/calculations.md)               | Detailed calculation reference       |
| [docs/datamodel.md](docs/datamodel.md)                     | Types, JSON schema                   |
| [docs/architecture.md](docs/architecture.md)               | Tech stack, folder layout            |
| [docs/development.md](docs/development.md)                 | Setup, scripts                       |

---

## Version Control & PR Workflow

**Commits:** `type: description` + optional bullet details. Types: `feat`, `fix`, `refactor`, `test`, `docs`, `style`, `chore`, `ci`. Never `--no-verify`.
