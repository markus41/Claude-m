---
name: reflex-from-report
description: "Create a Reflex trigger directly from a Power BI report visual — guided no-code alert setup"
argument-hint: "--report <report-name> [--workspace <workspace-id>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Create Reflex from Power BI Report

Guide the user through creating a Data Activator trigger directly from a Power BI report visual using the no-code "Set alert" experience.

## Instructions

### 1. Validate Inputs

- `--report` — Name of the Power BI report. Ask if not provided.
- `--workspace` — Fabric workspace ID. If not provided, use `FABRIC_WORKSPACE_ID` from `.env` or ask.

### 2. Verify Report Access

List reports in the workspace:
```bash
TOKEN=$(az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken -o tsv)

curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/reports" | jq '.value[] | {id, displayName}'
```

Confirm the specified report exists and the user has access.

### 3. Guide Visual Selection

Since visual selection must happen in the portal UI, instruct the user:

1. Open the Power BI report in the Fabric portal: `https://app.fabric.microsoft.com/groups/{workspaceId}/reports/{reportId}`
2. Navigate to the page containing the visual they want to monitor.
3. Identify the visual type and the data it displays.

Ask the user to describe:
- **Visual type**: Bar chart, line chart, table, card, KPI, etc.
- **Dimensions**: What categories are on the axis/legend (e.g., Region, Product, Date).
- **Measures**: What numeric values are displayed (e.g., Revenue, Units Sold, Profit Margin).

### 4. Plan the Object Model

Based on the visual description, suggest:

- **Object**: The dimension that represents the tracked entity.
  - Bar chart with Region on axis: Object = `Region`
  - Table with ProductName column: Object = `Product`
  - Single KPI card: Object = `BusinessMetric` (singleton)
- **Key column**: The dimension column that uniquely identifies each object.
- **Property (measure)**: The numeric value to monitor.

Display the planned mapping:
```
Visual: Revenue by Region (bar chart)
  Object: Region (key: regionName)
  Property: revenue (from bar values)

Suggested trigger: revenue < 50000
```

### 5. Guide Alert Creation

Instruct the user step-by-step:

1. In the Power BI report, right-click the visual (or click `...` > **Set alert**).
2. Data Activator opens with the visual's data pre-loaded.
3. Select the **key column** (dimension) as suggested above.
4. Select the **measure** to monitor.
5. Define the **condition** (e.g., `revenue < 50000`).
6. Add an optional **duration** ("remains true for").
7. Configure the **action** (email or Teams message).
8. Click **Start** to activate the trigger.

### 6. Verify Trigger Creation

After the user completes the portal setup, verify the Reflex item was created:
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/reflexes" | jq '.value[] | {id, displayName}'
```

### 7. Display Summary

Show the user:
- Created Reflex item name and ID
- Object model derived from the visual
- Active trigger condition
- Configured action
- Reminder: Data freshness depends on the Power BI dataset refresh schedule
- Next steps: Add more triggers with `/trigger-define`, or add actions with `/action-configure`
