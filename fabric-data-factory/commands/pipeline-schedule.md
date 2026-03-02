---
name: pipeline-schedule
description: "Create or update a schedule trigger for a Fabric Data Factory pipeline"
argument-hint: "<pipeline-name> --cron <cron-expression> [--start <datetime>] [--end <datetime>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Schedule a Pipeline

Create or update a schedule trigger for a Fabric Data Factory pipeline.

## Instructions

### 1. Validate Inputs

- `<pipeline-name>` — Name of the pipeline to schedule. Ask if not provided.
- `--cron` — Cron expression or recurrence description. Examples:
  - `"0 6 * * *"` — Daily at 6:00 AM UTC
  - `"0 */4 * * *"` — Every 4 hours
  - `"0 8 * * 1-5"` — Weekdays at 8:00 AM UTC
  - `"0 0 1 * *"` — First day of each month at midnight
- `--start` — Start date/time in ISO 8601 format (default: now).
- `--end` — End date/time (optional, no end by default).

Ask the user for the schedule if not provided. Offer common presets:
1. Every hour
2. Every 4 hours
3. Daily at a specific time
4. Weekdays only
5. Weekly on a specific day
6. Monthly on a specific day
7. Custom cron expression

### 2. Configure the Schedule Trigger

Build the trigger configuration:

```json
{
  "properties": {
    "type": "ScheduleTrigger",
    "typeProperties": {
      "recurrence": {
        "frequency": "Day",
        "interval": 1,
        "startTime": "2025-01-01T06:00:00Z",
        "endTime": null,
        "timeZone": "UTC",
        "schedule": {
          "hours": [6],
          "minutes": [0]
        }
      }
    },
    "pipelines": [
      {
        "pipelineReference": {
          "referenceName": "<pipeline-name>",
          "type": "PipelineReference"
        },
        "parameters": {}
      }
    ]
  }
}
```

**Frequency options**:
| Frequency | Interval | Example |
|-----------|----------|---------|
| `Minute` | 15 | Every 15 minutes |
| `Hour` | 1 | Every hour |
| `Day` | 1 | Daily |
| `Week` | 1 | Weekly |
| `Month` | 1 | Monthly |

### 3. Configure Pipeline Parameters at Trigger Time

Ask if the pipeline has parameters that should be set at trigger time:

```json
"parameters": {
  "loadDate": "@trigger().scheduledTime",
  "environment": "production",
  "fullLoad": false
}
```

Common trigger-time expressions:
- `@trigger().scheduledTime` — Scheduled trigger time
- `@trigger().startTime` — Actual trigger start time
- `@formatDateTime(trigger().scheduledTime, 'yyyy-MM-dd')` — Date string

### 4. Set Time Zone

Ask the user for their preferred time zone (default: UTC). Common options:
- `UTC` — Coordinated Universal Time
- `Eastern Standard Time` — US Eastern
- `Central European Standard Time` — EU Central
- `Pacific Standard Time` — US Pacific

### 5. Deploy the Trigger

```bash
# Create the schedule via Fabric REST API
az rest --method POST \
  --url "https://api.fabric.microsoft.com/v1/workspaces/${FABRIC_WORKSPACE_ID}/items/<pipeline-id>/schedules" \
  --headers "Content-Type=application/json" \
  --body '<trigger-json>'
```

### 6. Display Summary

Show the user:
- Schedule configuration (frequency, time, time zone)
- Next 5 scheduled run times
- Pipeline parameters passed at trigger time
- How to modify: re-run `/pipeline-schedule` with updated `--cron`
- How to pause: disable the trigger via Fabric workspace UI or REST API
- How to monitor runs: use `/pipeline-monitor`
