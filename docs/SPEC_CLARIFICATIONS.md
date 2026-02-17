# Spec Clarifications

Single source of truth for the Hockey Event Ranking app.

## Player Score Formula

Score (0–100) = leagueTier × 0.32 + lineWeight × 0.28 + roleWeight × 0.20 + salaryWeight × 0.20

**Rule:** Non-NHL players always score lower than any NHL player. NHL range: 69–100. Non-NHL range: 0–68.

### Salary Weight (0–1)

Salary is mapped to 0–1 within the player's league range:

- **NHL:** $750K–$14M (elite contracts like Matthews ~$13.3M)
- **Other leagues:** Uses `estimatedSalaryMin`–`estimatedSalaryMax` from league metadata

### League Tier Weights (0–1)

| League          | Weight |
| --------------- | ------ |
| NHL             | 1.0    |
| KHL             | 0.7    |
| Swiss NL        | 0.58   |
| SHL             | 0.55   |
| Liiga           | 0.52   |
| DEL             | 0.5    |
| Czech Extraliga | 0.48   |
| AHL             | 0.45   |
| ICEHL           | 0.4    |
| Other           | 0.3    |

### Line Weights (0–1)

| Line     | Weight |
| -------- | ------ |
| 1L       | 1.0    |
| 2L       | 0.85   |
| 3L       | 0.65   |
| 4L       | 0.4    |
| top4D    | 0.9    |
| bottomD  | 0.5    |
| starterG | 1.0    |
| backupG  | 0.5    |

### Role Weights (0–1)

| Role    | Weight |
| ------- | ------ |
| top6    | 1.0    |
| bottom6 | 0.6    |
| top4    | 1.0    |
| bottom2 | 0.5    |
| starter | 1.0    |
| backup  | 0.5    |

## Absolute Value (Salary)

- Per team: `sum(salaryUsd)` over all players
- All values stored in USD
- `salaryEstimated: true` = league-based estimate, not actual data

## Team Metrics

- Total value = sum of salaries
- Total score = sum of player scores
- Average score = total score / player count
