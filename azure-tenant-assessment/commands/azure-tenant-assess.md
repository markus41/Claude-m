---
name: azure-tenant-assess
description: Run a full Azure tenant assessment — subscription inventory, resource catalog, security posture snapshot — and save a structured markdown report.
argument-hint: "[--subscription <id>] [--all-subscriptions] [--depth <quick|full>] [--output <path>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Azure Tenant Assess

Produces a structured Azure tenant assessment report and saves it to `azure-assessment-YYYY-MM-DD.md`.

## Step 1: Integration Context Fail-Fast Check

Validate integration context from [`docs/integration-context.md`](../../docs/integration-context.md):
- `tenantId` — required.
- `environmentCloud` — default `AzureCloud`.
- Minimum role: Azure `Reader` at subscription scope.

If context is missing, stop with `MissingIntegrationContext` and instruct the user to run `/azure-tenant-setup` first.

Determine depth from arguments: `--depth quick` (default) or `--depth full`. Default output path: `azure-assessment-YYYY-MM-DD.md` in current directory. Override with `--output <path>`.

## Step 2: Detect Mode (Live vs. Guided)

Attempt `azure_list_subscriptions`:
- **Success** → live mode. Continue from Step 3.
- **Failure** → guided mode. Skip to Guided Steps section below.

---

## Live Mode Steps

### Step 3: List Subscriptions

Call `azure_list_subscriptions`. Collect for each subscription:
- `subscriptionId` (redact to `xxxx...yyyy` in output)
- `displayName`
- `state` (Enabled / Disabled / Warned)
- `tenantId`

If `--subscription <id>` is provided, filter to that subscription only. If `--all-subscriptions` is provided (or no filter), process all enabled subscriptions.

### Step 4: List Resource Groups

For each subscription, call `azure_list_resource_groups`. Collect:
- `name`
- `location`
- `provisioningState`

### Step 5: List Resources

For `--depth quick`: Call `azure_list_resources` at subscription scope for each subscription. Collect: `name`, `type`, `location`, `resourceGroup`.

For `--depth full`: Additionally call `azure_list_resources` per resource group for completeness and cross-check counts.

Handle pagination: if the MCP tool returns a continuation token or `nextLink`, follow it until exhausted. Note in the report if pagination was truncated.

### Step 6: Build Resource Type Taxonomy

1. Normalize all `type` values to title case (e.g., `microsoft.compute/virtualmachines` → `Microsoft.Compute/virtualMachines`).
2. Group by normalized type and count occurrences.
3. Extract ARM namespace prefix (e.g., `Microsoft.Compute`).
4. Sort by count descending.
5. Compute top resource groups by resource count.
6. Compute region distribution from `location` field.

### Step 7: Classify Tenant Profile

Using namespace prefix counts from Step 6, classify per `skills/azure-tenant-assessment/references/plugin-capability-matrix.md`:
- Compute-heavy, Data-heavy, Networking-heavy, Security-focused, or Mixed.

### Step 8: Map to Plugins

Load `skills/azure-tenant-assessment/references/plugin-capability-matrix.md`.
- Match each discovered namespace prefix to the plugin mapping table.
- Add the four baseline plugins: `microsoft-azure-mcp`, `azure-cost-governance`, `azure-policy-security`, `entra-id-security`.
- Deduplicate. Rank by: Tier 1 (≥3 matching resources), Tier 2 (1–2 resources or baseline), Tier 3 (profile-based inference).

### Step 9: Write Report

Construct the report following the exact template in `skills/azure-tenant-assessment/SKILL.md`.

Key sections:
1. **Executive Summary** — subscription count, RG count, resource count, region count, profile, mode
2. **Subscription Inventory** — table with redacted IDs
3. **Resource Catalog** — table: type | count | recommended plugins
4. **Resource Distribution** — by region + top RGs
5. **Security Posture Summary** — key vault presence, monitoring, policy resources
6. **Recommended Plugins** — tiered table: priority | plugin | why | install command
7. **Next Steps** — 4 numbered actions

Write to `--output` path (or default `azure-assessment-YYYY-MM-DD.md`). Confirm write with file path.

### Step 10: Print Report and Suggest Next Command

Print the full report to screen. Then display:

```
Report saved: azure-assessment-YYYY-MM-DD.md

Next: /azure-tenant-plugin-setup --assessment-file azure-assessment-YYYY-MM-DD.md
```

---

## Guided Mode Steps

When MCP tools are not available, collect assessment data through structured questions.

### Guided Step 1: Collect Tenant Profile

Ask the user:
1. How many Azure subscriptions does this tenant have?
2. Which resource categories are present? (select all that apply): Virtual Machines/Compute, Containers/AKS, Web Apps/Functions, Static Web Apps, Storage Accounts, SQL/Cosmos DB, Key Vaults, Networking (VNets/NSGs/LBs), Monitoring/App Insights, Fabric/Synapse, DevOps/Dev Center, Other
3. Roughly how many total resources are deployed? (<100 / 100–500 / 500–2000 / 2000+)
4. Which Azure regions are primarily used?
5. Which cloud environment? (AzureCloud / AzureUSGovernment / AzureChinaCloud)

### Guided Step 2: Build Estimated Report

From the answers, construct the same report format as live mode:
- Mark as `**Mode**: Guided (estimated)`
- Use "N/A (estimated)" for resource counts where not provided
- Build plugin recommendations from selected resource categories using the capability matrix

### Guided Step 3: Write and Print Report

Same as live mode Steps 9–10. Note in the Executive Summary:
> *This assessment was produced in guided mode without live Azure access. Resource counts and distributions are user-provided estimates. Run `/azure-tenant-setup` to check if live MCP access can be enabled.*
