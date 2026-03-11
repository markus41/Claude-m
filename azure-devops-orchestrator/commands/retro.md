---
name: azure-devops-orchestrator:retro
description: >
  Sprint retrospective analysis: velocity trends, commitment accuracy, escaped defects, deployment
  stats, and actionable insights. Produces a data-driven retrospective report for team review.
argument-hint: "<projectName> [--team <team>] [--iteration <path>] [--last <N>]"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Task
---

# azure-devops-orchestrator:retro

Data-driven sprint retrospective analysis for Azure DevOps — metrics, trends, and actionable insights.

## Arguments

- `<projectName>` — Azure DevOps project name (required)
- `--team <team>` — Team name (default: project's default team)
- `--iteration <path>` — Specific iteration to analyze (default: most recently completed iteration)
- `--last <N>` — Include trend data from last N sprints (default: 3)
- `--compare` — Side-by-side comparison of last 2 sprints
- `--format table` — Output as formatted tables (default)
- `--format json` — Output as structured JSON
- `--teams` — Post retro summary to Teams (requires `microsoft-teams-mcp`)

## Workflow

Invoke the **retrospective-analyzer** agent to:

1. **Identify sprint** — Resolve the target iteration and its date boundaries
2. **Collect data** — Query work items, pipeline runs, bugs, and PRs for the sprint period
3. **Calculate metrics** — Velocity, commitment accuracy, scope creep, cycle time, escaped defects
4. **Detect patterns** — Recurring blockers, estimation drift, burnout signals, carryover trends
5. **Generate insights** — Data-driven "What went well", "What needs improvement", action items
6. **Trend analysis** — Compare against last N sprints for trajectory

## Metrics Calculated

| Metric | Description |
|--------|-------------|
| Velocity | Story points completed in the sprint |
| Commitment Accuracy | Completed / Committed points (target: > 80%) |
| Scope Creep | Items added mid-sprint / original items (target: < 20%) |
| Estimation Accuracy | Actual effort / estimated effort per item |
| Escaped Defect Rate | Post-sprint bugs / completed items (target: < 10%) |
| Cycle Time | Average days from Active to Closed |
| Deployment Success Rate | Successful pipeline runs / total runs |
| Carryover Rate | Incomplete items / committed items |

## Output

```
## Sprint Retrospective — {iterationName}

**Project**: {project} | **Team**: {team}
**Sprint Period**: {startDate} — {endDate}
**Team Size**: {n} contributors

### Key Metrics

| Metric | Value | Target | Trend | Status |
|--------|-------|--------|-------|--------|
| Velocity | {pts} | {avg} | {arrow} | OK/Below/Above |
| Commitment Accuracy | {pct}% | > 80% | {arrow} | OK/Low |
| Scope Creep | {pct}% | < 20% | {arrow} | OK/High |
| Estimation Accuracy | {ratio} | 0.75-1.25 | {arrow} | OK/Off |
| Escaped Defects | {pct}% | < 10% | {arrow} | OK/High |
| Deploy Success Rate | {pct}% | > 95% | {arrow} | OK/Low |

### Velocity Trend

Sprint 12:  ========          16 pts
Sprint 13:  ===========       22 pts
Sprint 14:  ==========        20 pts  (current)
Average:    19.3 pts

### What Went Well
1. {insight backed by data}
2. {insight backed by data}
3. {insight backed by data}

### What Needs Improvement
1. {concern backed by data}
2. {concern backed by data}
3. {concern backed by data}

### Recommended Action Items
1. **{action}** — {rationale from metrics}
   Suggested owner: {person}
2. **{action}** — {rationale}
   Suggested owner: {person}
3. **{action}** — {rationale}
   Suggested owner: {person}

### Detailed Breakdown

#### Completed ({n} items, {pts} pts)
{table of completed work items}

#### Carried Over ({n} items, {pts} pts)
{table with carryover reasons}

#### Added Mid-Sprint ({n} items)
{table of scope creep items}

#### Escaped Defects ({n} bugs)
{table with severity and related items}

### Cross-Sprint Patterns
- {multi-sprint pattern observation}
- {multi-sprint pattern observation}
```

## Sprint Comparison (--compare)

When `--compare` is passed, show a side-by-side comparison:

```
### Sprint Comparison

| Metric | {Sprint N-1} | {Sprint N} | Delta |
|--------|-------------|-----------|-------|
| Velocity | 22 pts | 20 pts | -2 (-9%) |
| Commitment | 85% | 75% | -10% |
| Scope Creep | 12% | 28% | +16% |
| ...    |     |     |       |
```

## Cross-Plugin Actions

After generating the report:
- **Teams** (if `--teams` and `microsoft-teams-mcp` installed): Post retro summary card
- **Power BI** (if `powerbi-fabric` installed): Export metrics JSON for trend dashboards

## Examples

```bash
# Retro for most recent sprint
/azure-devops-orchestrator:retro platform-api

# Retro for a specific iteration
/azure-devops-orchestrator:retro platform-api --iteration "platform-api\Sprint 14"

# Include 5 sprints of trend data
/azure-devops-orchestrator:retro platform-api --last 5

# Compare last 2 sprints
/azure-devops-orchestrator:retro platform-api --compare

# Specific team
/azure-devops-orchestrator:retro platform-api --team "Backend Team"

# Post to Teams
/azure-devops-orchestrator:retro platform-api --teams

# Export as JSON
/azure-devops-orchestrator:retro platform-api --format json
```

## Tips

- Run before the retrospective meeting to prepare data-driven discussion topics
- Use `--last 5` for meaningful trend analysis — 3 sprints may not show patterns clearly
- `--compare` is great for before/after analysis when the team made process changes
- Pair with `/azure-devops-orchestrator:sprint` to feed retro insights into the next sprint plan
- Action items from the retro can be created as work items using `/azure-devops-orchestrator:ship`
