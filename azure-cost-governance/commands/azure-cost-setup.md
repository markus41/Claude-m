---
name: azure-cost-setup
description: Prepare Azure cost governance analysis by confirming scope, timeframe, dimensions, and an execution plan.
argument-hint: "[--scope <subscription|management-group|tenant>] [--period <last-30-days|last-90-days|custom>] [--currency <code>] [--dimensions <service,resource-group,tag,...>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Setup

Use this command before cost analysis tasks.

## Integration Context Fail-Fast Check

Before any external API call, validate integration context from [`docs/integration-context.md`](../../docs/integration-context.md):
- `tenantId` (always required)
- `subscriptionId` (required for Azure-scope workflows)
- `environmentCloud`
- `principalType`
- `scopesOrRoles`

If validation fails, stop immediately and return a structured error using contract codes (`MissingIntegrationContext`, `InvalidIntegrationContext`, `ContextCloudMismatch`, `InsufficientScopesOrRoles`).
Redact tenant/subscription/object identifiers in setup output using contract redaction rules.

## Step 1: Confirm Billing Scope

Confirm the billing scope for analysis: subscription, management group, or tenant. Provide the explicit scope path (e.g., `/subscriptions/<id>` or `/providers/Microsoft.Management/managementGroups/<name>`).

## Step 2: Confirm Target Period

Confirm the target time period for analysis. Common presets: last 30 days, last 90 days, month-to-date (MTD), quarter-to-date (QTD). Custom date ranges use explicit `start` and `end` dates.

## Step 3: Confirm Currency and Dimensions

Confirm the reporting currency (e.g., USD, EUR) and the cost analysis dimensions to group by — service name, resource group, tag, meter category, or location.

## Step 4: Produce Execution Plan

Produce a short execution plan before running optimization actions — specify which commands to run and in what order.

## Azure CLI Setup Commands

Use these commands to verify prerequisites and confirm scope before analysis.

```bash
# Sign in and set active subscription
az login
az account set --subscription "<sub-id>"

# Verify subscription context
az account show --output table

# Install or upgrade required extensions
az extension add --name costmanagement --upgrade
az extension add --name resource-graph --upgrade

# Validate cost management access — list budgets as a quick permission check
az consumption budget list --output table

# List available cost dimensions for the active subscription
az costmanagement dimension list \
  --scope "subscriptions/<sub-id>" --output table
```
