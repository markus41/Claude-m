---
name: alert-create
description: "Create a metric or log alert with action groups for Azure Monitor"
argument-hint: "<metric|log> --name <alert-name> [--severity <0-4>] [--resource <resource-id>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Create an Azure Monitor Alert

Create a metric alert or log (KQL-based) alert with an action group for notifications.

## Instructions

### 1. Validate Inputs

- `<type>` — One of: `metric`, `log`. Ask if not provided.
- `--name` — Alert rule name (e.g., "High CPU Alert", "Error Rate Spike"). Ask if not provided.
- `--severity` — Severity level 0-4 (0=Critical, 1=Error, 2=Warning, 3=Informational, 4=Verbose). Default: 2.
- `--resource` — Target Azure resource ID. Ask if not provided.

### 2. Gather Alert Details

**For metric alerts**, ask the user for:
- **Metric name** (e.g., `Percentage CPU`, `Http5xx`, `HttpResponseTime`, `dtu_consumption_percent`)
- **Aggregation** (avg, max, min, total, count)
- **Operator and threshold** (e.g., `> 85`)
- **Window size** (evaluation period: 1m, 5m, 10m, 15m, 30m, 1h)
- **Evaluation frequency** (how often to check: 1m, 5m, 15m)
- **Threshold type** — static (fixed value) or dynamic (ML-based)

**For log alerts**, ask the user for:
- **KQL query** — or describe what they want to detect and generate the query
- **Condition** (e.g., `count > 50`, `avg > 1000`)
- **Window size** and **evaluation frequency**
- **Dimensions** (optional, to split alerts by field like `cloud_RoleName`)

### 3. Verify or Create Action Group

Check if an action group exists:
```bash
az monitor action-group list --resource-group <rg> --query "[].{Name:name, ShortName:groupShortName}" -o table
```

If no action group exists, create one:
```bash
az monitor action-group create \
  --name <action-group-name> \
  --resource-group <rg> \
  --short-name <short-name> \
  --email-receiver name=<name> email=<email>
```

Ask the user for notification preferences (email, SMS, webhook, Teams, PagerDuty).

### 4. Create the Alert Rule

**Metric alert (static threshold)**:
```bash
az monitor metrics alert create \
  --name "<alert-name>" \
  --resource-group <rg> \
  --scopes "<resource-id>" \
  --condition "<aggregation> <metric> <operator> <threshold>" \
  --window-size <window> \
  --evaluation-frequency <frequency> \
  --severity <severity> \
  --action "<action-group-id>" \
  --description "<description>"
```

**Metric alert (dynamic threshold)**:
```bash
az monitor metrics alert create \
  --name "<alert-name>" \
  --resource-group <rg> \
  --scopes "<resource-id>" \
  --condition "<aggregation> <metric> > dynamic <sensitivity> <min-failing> of <eval-periods>" \
  --window-size <window> \
  --evaluation-frequency <frequency> \
  --severity <severity> \
  --action "<action-group-id>"
```

**Log alert (scheduled query rule)**:
```bash
az monitor scheduled-query create \
  --name "<alert-name>" \
  --resource-group <rg> \
  --scopes "<workspace-or-appinsights-id>" \
  --condition "<aggregation> <operator> <threshold>" \
  --condition-query "<kql-query>" \
  --evaluation-frequency <frequency> \
  --window-size <window> \
  --severity <severity> \
  --action-groups "<action-group-id>" \
  --description "<description>" \
  --auto-mitigate true
```

### 5. Verify the Alert

```bash
az monitor metrics alert show --name "<alert-name>" --resource-group <rg>
# or
az monitor scheduled-query show --name "<alert-name>" --resource-group <rg>
```

### 6. Display Summary

Show the user:
- Alert rule name, type, and severity
- Condition and threshold
- Action group and notification targets
- Evaluation frequency and window size
- How to view alert history: Azure Portal > Monitor > Alerts
- How to test: temporarily lower the threshold and verify the notification is received, then restore
