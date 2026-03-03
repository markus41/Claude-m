---
name: defender-sentinel-setup
description: Set up the Defender Sentinel plugin — validate required RBAC roles, confirm workspace connectivity, check data connector status, and verify API access for Sentinel and Defender XDR
argument-hint: "[--sentinel-only] [--defender-only] [--workspace-id <id>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Defender Sentinel Plugin Setup

Interactive guided setup for the Defender Sentinel plugin. Validates Azure and Microsoft 365 prerequisites, checks RBAC role assignments, verifies Sentinel workspace connectivity, and confirms Defender XDR API access.

## Flags

- `--sentinel-only`: Check only Sentinel (skip Defender XDR validation)
- `--defender-only`: Check only Defender XDR (skip Sentinel workspace validation)
- `--workspace-id <id>`: Provide the Log Analytics workspace GUID directly (skips interactive prompt)

Default: Full setup covering both Sentinel and Defender XDR.

## Integration Context Fail-Fast Check

Before any external API call, validate integration context from [`docs/integration-context.md`](../../docs/integration-context.md):

- `tenantId` (always required)
- `subscriptionId` (required for Sentinel ARM operations)
- `environmentCloud`
- `principalType`
- `scopesOrRoles`

If validation fails, stop immediately and return a structured error using contract codes. Redact tenant/subscription/workspace identifiers in all output.

## Step 1: Check Prerequisites

### Azure CLI

```bash
az --version
```

- Required for ARM operations.
- If missing, instruct user to install from https://learn.microsoft.com/en-us/cli/azure/install-azure-cli.

### Azure CLI Authentication

```bash
az account show
```

- Confirm the signed-in account and tenant match the target.
- If not signed in: `az login --tenant {tenantId}`

### Node.js (optional — for scripted operations)

```bash
node --version
```

- Required for scripted KQL query execution via the Log Analytics REST API.

## Step 2: Locate Sentinel Workspace

If `--workspace-id` was not provided, ask the user for the Log Analytics workspace details.

Use `AskUserQuestion` to collect:
1. Sentinel workspace resource group name
2. Sentinel workspace name (Log Analytics workspace name)

Retrieve workspace details:

```bash
az monitor log-analytics workspace show --resource-group {rg} --workspace-name {workspaceName} --query "{workspaceId: customerId, resourceId: id, location: location}" -o json
```

Record:
- `workspaceId` (GUID — used for Log Analytics query API)
- `resourceId` (ARM resource ID — used for Sentinel ARM API)
- `location`

## Step 3: Validate Sentinel RBAC

Check the current service principal / user has the required roles on the workspace:

```bash
az role assignment list --scope {workspaceResourceId} --assignee {principalId} --output table
```

Required roles:

| Operation | Required role |
|---|---|
| Read incidents | `Microsoft Sentinel Reader` |
| Update incidents | `Microsoft Sentinel Responder` |
| Create/modify analytics rules | `Microsoft Sentinel Contributor` |
| Full administration | `Microsoft Sentinel Contributor` |
| Log Analytics queries | `Log Analytics Reader` (on workspace) |

If roles are missing, display a remediation command:

```bash
az role assignment create --role "Microsoft Sentinel Responder" --assignee {principalId} --scope {workspaceResourceId}
```

## Step 4: Verify Sentinel Connectivity

Test connectivity by listing the 5 most recent incidents:

```bash
az rest --method GET \
  --uri "https://management.azure.com{workspaceResourceId}/providers/Microsoft.SecurityInsights/incidents?api-version=2023-02-01&\$top=5&\$orderby=properties/createdTimeUtc desc" \
  --query "value[].{Number:properties.incidentNumber, Title:properties.title, Severity:properties.severity, Status:properties.status}"
```

- If successful: report incident count and most recent incident details.
- If 403: report RBAC issue and which roles are missing.
- If 404: confirm the workspace has Microsoft Sentinel enabled (Sentinel must be added via the Azure portal).

### Verify Sentinel is Enabled

```bash
az rest --method GET \
  --uri "https://management.azure.com{workspaceResourceId}/providers/Microsoft.SecurityInsights/onboardingStates/default?api-version=2023-02-01"
```

If this returns 404, Sentinel is not yet enabled on the workspace. Instruct the user to enable it via Azure Portal > Microsoft Sentinel > Add.

## Step 5: Check Data Connectors

List enabled data connectors to assess signal coverage:

```bash
az rest --method GET \
  --uri "https://management.azure.com{workspaceResourceId}/providers/Microsoft.SecurityInsights/dataConnectors?api-version=2023-02-01" \
  --query "value[].{Kind:kind, Name:properties.displayName, State:properties.dataTypes.alerts.state}"
```

Report which connectors are enabled and flag any critical missing connectors:

| Connector | Why it matters |
|---|---|
| `MicrosoftThreatProtection` | Enables M365 Defender / MDE / MDI / MDO alert ingestion |
| `AzureActiveDirectory` | Entra sign-in and audit logs |
| `AzureActivity` | Azure control-plane operations |
| `MicrosoftDefenderAdvancedThreatProtection` | Legacy MDE connector |

## Step 6: Validate Log Analytics Query API

Test KQL query execution:

```bash
az monitor log-analytics query --workspace {workspaceId} \
  --analytics-query "SecurityAlert | where TimeGenerated > ago(24h) | summarize count() by AlertName | order by count_ desc | limit 5" \
  --output table
```

- If successful: display top 5 alert types from the last 24 hours.
- If empty: inform the user that no security alerts have been ingested in the last 24 hours (normal for new workspaces).
- If error: check that `Microsoft.OperationalInsights` provider is registered and the `Log Analytics Reader` role is assigned.

## Step 7: Validate Defender XDR Access (skip if --sentinel-only)

### Check Graph Security API Access

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/security/incidents?\$top=3&\$orderby=createdDateTime desc" \
  --query "value[].{Id:id, Title:displayName, Severity:severity, Status:status}"
```

Required permission: `SecurityIncident.Read.All` (application) or `SecurityEvents.Read.All` (delegated).

If successful: display recent incidents from the Defender XDR unified queue.

### Check Advanced Hunting Access

```bash
az rest --method POST \
  --uri "https://graph.microsoft.com/v1.0/security/runHuntingQuery" \
  --body '{"query": "DeviceProcessEvents | where Timestamp > ago(1h) | count"}' \
  --query "results"
```

Required permission: `ThreatHunting.Read.All`.

## Step 8: Configure Environment Variables

Create or update `.env` file with workspace and API configuration:

```
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<client-secret>
SENTINEL_WORKSPACE_ID=<workspace-guid>
SENTINEL_WORKSPACE_RESOURCE_ID=<full-arm-resource-id>
SENTINEL_SUBSCRIPTION_ID=<subscription-id>
SENTINEL_RESOURCE_GROUP=<resource-group-name>
SENTINEL_WORKSPACE_NAME=<workspace-name>
```

- Write the file using the `Write` tool.
- Verify `.gitignore` contains `.env`; add if missing.
- Warn the user never to commit this file.

## Step 9: Output Setup Report

```markdown
# Defender Sentinel Setup Report

| Component | Status | Details |
|---|---|---|
| Azure CLI | OK / MISSING | v2.x.x |
| Azure authentication | OK / NOT_SIGNED_IN | Tenant: {tenantId} |
| Sentinel workspace | FOUND / NOT_FOUND | {workspaceName} in {rg} |
| Sentinel enabled | YES / NO | — |
| Sentinel RBAC | SUFFICIENT / INSUFFICIENT | Roles: ... |
| Sentinel connectivity | OK / FAILED | {incidentCount} incidents accessible |
| Data connectors | {N} enabled | MDE, Entra ID, Azure Activity... |
| Log Analytics queries | OK / FAILED | Top alert: ... |
| Defender XDR access | OK / FAILED / SKIPPED | {incidentCount} incidents |
| Advanced hunting | OK / FAILED / SKIPPED | Query executed |
| .env file | CREATED / EXISTS / SKIPPED | — |

Setup completed at <timestamp>.
```

## Important Notes

- `Microsoft Sentinel Contributor` includes `Microsoft Sentinel Responder` — no need to assign both.
- The Log Analytics `Reader` role is separate from Sentinel roles and is required for KQL queries.
- Automation rules and playbook permissions require additional Logic App roles (`Logic App Contributor`).
- For production, use managed identity instead of client secrets.
- Sovereign cloud deployments (GovCloud) use different API endpoints — see `docs/integration-context.md`.
