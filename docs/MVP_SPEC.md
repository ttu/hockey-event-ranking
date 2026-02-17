# Hockey Event Ranking

## MVP Technical Specification

---

## 1. Objective

Build a **front-end-only**, fully static website that compares national hockey teams for international competitions (Olympics, 4 Nations, World Championship) using:

- Roster salary/value (total team cap)
- Player score (league tier + line + role)
- National team position (L1–L4, D1–D2, G1–G2)

The site must:

- Support multiple competitions and national teams (CAN, USA, SWE, FIN, etc.)
- Rank teams by total value, total score, or average score
- Compare top teams head-to-head
- Load all data from version-controlled JSON files
- Require no backend or database

---

## 2. Tech Stack

- Build tool: **Vite**
- Framework: **React**
- Language: TypeScript
- Hosting: Static (Vercel, Netlify, GitHub Pages)
- Data source: `public/data/competitions/*.json`

All calculations are done client-side.

---

## 3. Player Score Formula

Player score (0–100) from:

- League tier weight (32%)
- Line weight (28%): 1L, 2L, 3L, 4L, top4D, bottomD, starterG, backupG
- Role weight (20%): top6, bottom6, top4, bottom2, starter, backup
- Salary weight (20%): salary within league range (NHL $750K–$14M)

See [docs/calculations.md](calculations.md) and [docs/SPEC_CLARIFICATIONS.md](SPEC_CLARIFICATIONS.md) for weights.

---

## 4. Team Metrics

- Total salary (roster value)
- Total score (sum of player scores)
- Average score
- Player count

---

## 5. Acceptance Criteria

MVP complete when:

- Competition and team selection works
- Rankings display correctly (sort by salary/score)
- Team detail shows roster with player scores
- Compare view works for top 3 teams
- Static build works without backend
