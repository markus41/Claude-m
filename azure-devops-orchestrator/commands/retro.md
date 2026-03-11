---
name: azure-devops-orchestrator:retro
description: >
  Sprint retrospective analysis for Azure DevOps. Analyze completed iterations for velocity
  trends, completion rates, scope changes, escaped defects, and cycle time patterns.
argument-hint: "<project> <team> [--iteration <path>] [--sprints <n>] [--format <table|json>]"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Task
---

# azure-devops-orchestrator:retro

Sprint retrospective analysis for Azure DevOps — velocity trends, completion rates, and cycle time patterns.

## Arguments

- `<project>` — Azure DevOps project name (required)
- `<team>` — Team name (required)
- `--iteration <path>` — Iteration path to analyze (default: `@CurrentIteration-1`, the last completed sprint)
- `--sprints <n>` — Number of sprints to include in trend analysis (default: 6)
- `--format <table|json>` — Output format (default: table)

## Workflow

Invoke the **retrospective-analyzer** agent to:

1. **Query iterations** — Fetch the target iteration and previous N iterations for trending
2. **Collect work items** — Query completed, carried-over, and added items per iteration
3. **Compute metrics** — Calculate key retrospective metrics for each sprint
4. **Trend analysis** — Identify patterns and anomalies across sprints
5. **Generate insights** — Produce actionable observations and recommendations

### Metrics Computed

| Metric | Description |
|--------|-------------|
| **Velocity** | Total story points completed per sprint |
| **Completion Rate** | Percentage of planned items completed vs. total committed |
| **Scope Change** | Items added or removed after sprint start |
| **Escaped Defects** | Bugs created in production traced to items shipped in the sprint |
| **Cycle Time** | Median time from Active to Closed for completed items |
| **Throughput** | Number of work items completed (count, regardless of size) |
| **Carry-Over Rate** | Percentage of items carried from one sprint to the next |

### Trend Analysis

The agent analyzes trends across the requested number of sprints:
- Velocity trend (increasing, stable, or declining)
- Completion rate trend with standard deviation
- Scope change patterns (chronic mid-sprint additions indicate planning issues)
- Cycle time trends (increasing cycle time may signal complexity growth)
- Carry-over patterns (repeated carry-overs on same items flagged)

## Output

A retrospective report with:
- Single-sprint summary table (target iteration)
- Multi-sprint trend table with sparkline indicators
- Top insights and observations (e.g., "Velocity dropped 30% — 3 team members on PTO")
- Recommended discussion topics for the retro meeting

## Examples

```bash
# Analyze last completed sprint for Platform Team
/azure-devops-orchestrator:retro MyProject "Platform Team"

# Analyze a specific iteration
/azure-devops-orchestrator:retro MyProject "Platform Team" --iteration "MyProject\Sprint 13"

# Trend over 12 sprints for API Team
/azure-devops-orchestrator:retro MyProject "API Team" --sprints 12

# JSON output for further analysis
/azure-devops-orchestrator:retro MyProject "Platform Team" --format json
```

## Tips

- Run before the sprint retrospective meeting to have data ready for discussion
- Use `--sprints 12` for quarterly reviews to see longer-term trends
- High carry-over rates often indicate estimation or scoping issues — discuss in retro
- Pair with `/azure-devops-orchestrator:sprint` to apply retro learnings to next sprint planning
- Escaped defects metric requires bugs to be linked to originating work items via Related links
