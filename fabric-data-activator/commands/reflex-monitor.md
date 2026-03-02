---
name: reflex-monitor
description: "Monitor Reflex trigger health — view trigger history, action execution logs, and diagnose issues"
argument-hint: "[--reflex <reflex-name>] [--trigger <trigger-name>] [--hours <lookback-hours>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
---

# Monitor Reflex Triggers

Inspect trigger execution history, action delivery status, and diagnose issues with Data Activator monitoring.

## Instructions

### 1. Validate Inputs

- `--reflex` — Reflex item name or ID. If not provided, list all Reflex items in the workspace and ask.
- `--trigger` — Specific trigger name to inspect. If not provided, show all triggers in the Reflex item.
- `--hours` — Lookback period in hours (default: 24).

### 2. List Reflex Items and Triggers

```bash
TOKEN=$(az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken -o tsv)
WORKSPACE_ID=<workspace-id>

# List Reflex items
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/workspaces/$WORKSPACE_ID/reflexes" | jq '.value[] | {id, displayName}'

# List triggers for a Reflex item
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/workspaces/$WORKSPACE_ID/reflexes/{reflexId}/triggers" | jq '.value[] | {id, displayName, state}'
```

### 3. Display Trigger Status Overview

For each trigger, show:

```
Trigger Status Overview — Last 24 hours
────────────────────────────────────────────────────
Trigger Name              | Status  | Firings | Errors
──────────────────────────|─────────|─────────|───────
High Temperature Alert    | Running | 12      | 0
Low Throughput Warning    | Running | 3       | 1
Device Offline Detection  | Stopped | 0       | 0
```

### 4. Inspect Trigger History (when --trigger is specified)

Show detailed execution history:

```
Trigger: High Temperature Alert
Object: Machine | Lookback: 24 hours
──────────────────────────────────────────────────────────
Time                 | Object Key | Property Value | Result
─────────────────────|────────────|────────────────|────────
2025-03-15 14:30:00  | MCH-042    | 92.5           | Fired → Email sent
2025-03-15 14:35:00  | MCH-042    | 91.0           | Cooldown (skipped)
2025-03-15 15:10:00  | MCH-017    | 88.2           | Fired → Email sent
2025-03-15 15:45:00  | MCH-042    | 93.1           | Fired → Email sent
```

### 5. Check Action Execution Logs

For each firing, show action delivery status:

```
Action Execution Log — High Temperature Alert
──────────────────────────────────────────────────────────
Time                 | Action Type | Recipient              | Status
─────────────────────|─────────────|────────────────────────|────────
2025-03-15 14:30:00  | Email       | ops-team@contoso.com   | Delivered
2025-03-15 15:10:00  | Email       | ops-team@contoso.com   | Delivered
2025-03-15 15:10:00  | Webhook     | https://api.contoso.com| Failed (503)
```

### 6. Diagnose Common Issues

Based on the history and logs, check for:

| Symptom | Diagnosis | Recommendation |
|---------|-----------|----------------|
| Zero firings, trigger running | Condition may be too strict or no data | Check data preview; relax threshold temporarily |
| Many firings per hour | Condition too lenient or no cooldown | Add cooldown; add "remains true for" duration |
| Firings but action failures | Endpoint unreachable or invalid recipient | Verify webhook URL; check email address |
| Firings only for some objects | Key column may have data quality issues | Check key column uniqueness in data preview |
| No recent data in preview | Eventstream disconnected or Power BI not refreshing | Check eventstream health; verify dataset refresh |

### 7. Display Summary

```
Monitoring Summary — Factory-Temperature-Monitor
─────────────────────────────────────────────────
Active triggers: 2 of 3
Total firings (24h): 15
Failed actions (24h): 1 (webhook to api.contoso.com returned 503)
Objects tracked: 200 machines

Recommendations:
- Fix webhook endpoint (503 errors since 15:10 UTC)
- Consider starting "Device Offline Detection" trigger
```
