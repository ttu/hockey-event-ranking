# Calculation Reference

Formulas used in the Hockey Event Ranking app. See also [SPEC_CLARIFICATIONS.md](./SPEC_CLARIFICATIONS.md) and [datamodel.md](./datamodel.md).

## 1. Player Score

**Function:** `getPlayerScore(player)` in `src/lib/playerScore.ts`

**Formula:**

```
raw = leagueTier × 0.32 + lineWeight × 0.28 + roleWeight × 0.20 + salaryWeight × 0.20
```

Salary weight (0–1) is derived from where the player's salary falls within their league's range. NHL uses $750K–$14M; other leagues use `estimatedSalaryMin`/`Max` from leagues.ts.

- NHL: `playerScore = round(raw × 100)` → range 69–100
- Non-NHL: rescaled to [0, 68] so best non-NHL player scores below worst NHL player

**Range:** 0–100 (NHL: 69–100, non-NHL: 0–68)

**Sources:**

- League tier: `src/data/leagues.ts`
- Line weight: 1L=1.0, 2L=0.85, 3L=0.65, 4L=0.4; top4D=0.9, bottomD=0.5; starterG=1.0, backupG=0.5
- Role weight: top6=1.0, bottom6=0.6; top4=1.0, bottom2=0.5; starter=1.0, backup=0.5
- Salary weight: 0–1 from salary within league range (NHL $750K–$14M)

## 2. Team Metrics

**Function:** `getTeamMetrics(roster)` in `src/lib/teamMetrics.ts`

| Metric       | Formula                               |
| ------------ | ------------------------------------- |
| totalSalary  | sum(players.salaryUsd)                |
| totalScore   | sum(getPlayerScore(player))           |
| playerCount  | players.length                        |
| averageScore | totalScore / playerCount (0 if empty) |

## 3. League Tier Fallback

Unknown `leagueId` uses tier weight 0.3.

## 4. Summary Flow

```
Roster JSON → loadCompetition()
    ↓
getTeamMetrics(roster) → totalSalary, totalScore, averageScore
getPlayersWithScores(players) → players with score appended
```
