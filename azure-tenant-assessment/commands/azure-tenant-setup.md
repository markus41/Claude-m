---
name: azure-tenant-setup
description: Validate Azure auth context and test MCP connectivity before running a tenant assessment.
argument-hint: "[--tenant-id <guid>] [--subscription-id <guid>] [--cloud <AzureCloud|AzureUSGovernment|AzureChinaCloud>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Azure Tenant Setup

Use this command before running `/azure-tenant-assess` to confirm auth context and MCP tool availability.

## Step 1: Integration Context Fail-Fast Check

Before any external call, validate integration context from [`docs/integration-context.md`](../../docs/integration-context.md):

- `tenantId` — required. If not provided via `--tenant-id`, check the integration context file.
- `environmentCloud` — default `AzureCloud`; override with `--cloud`.
- `subscriptionId` — optional at setup stage (required for resource enumeration in assess).
- `principalType` — `delegated-user` or `service-principal`.
- `scopesOrRoles` — minimum Azure `Reader` role on at least one subscription.

If `tenantId` is missing and not provided as an argument, stop with error code `MissingIntegrationContext` and instruct the user to set it.

Redact all tenant/subscription/object IDs in output using `xxxx...yyyy` format.

## Step 2: Detect MCP Tool Availability

Attempt to call the `azure_list_subscriptions` MCP tool with no parameters.

- **If the call succeeds**: MCP tools are available. Proceed to Step 3.
- **If the call fails** (unknown tool, tool not found, or connection error): MCP tools are not available. Record status as GUIDED-ONLY and proceed to Step 4.

Do not throw an error for MCP unavailability — it is an expected state and guided mode is a supported fallback.

## Step 3: Connectivity Test (MCP Available Only)

If MCP tools are available, use the subscription list from Step 2 to report:

- Number of accessible subscriptions
- First subscription display name (redact ID to `xxxx...yyyy`)
- Confirmed cloud environment

Print a brief connectivity confirmation:
```
MCP connectivity: OK
Subscriptions accessible: N
Cloud: AzureCloud
```

## Step 4: Report Readiness Status

Print one of the following status blocks:

**READY (MCP available):**
```
╔══════════════════════════════════════╗
║  Azure Tenant Setup: READY           ║
╠══════════════════════════════════════╣
║  Mode:          Live (MCP)           ║
║  Tenant:        xxxx...yyyy          ║
║  Subscriptions: N accessible         ║
║  Cloud:         AzureCloud           ║
╚══════════════════════════════════════╝

Next: /azure-tenant-assess [--depth quick|full] [--all-subscriptions]
```

**GUIDED-ONLY (no MCP):**
```
╔══════════════════════════════════════╗
║  Azure Tenant Setup: GUIDED-ONLY     ║
╠══════════════════════════════════════╣
║  Mode:    Guided (no MCP tools)      ║
║  Tenant:  xxxx...yyyy                ║
║  Cloud:   AzureCloud                 ║
╚══════════════════════════════════════╝

MCP tools not detected. Guided mode will ask structured questions
to produce the assessment report without live Azure access.

To enable live mode: /plugin install microsoft-azure-mcp@claude-m-microsoft-marketplace

Next: /azure-tenant-assess (will run in guided mode)
```

## Step 5: Suggest Next Command

Always end setup with the recommended next command:

```
Run: /azure-tenant-assess --depth quick
```

For large tenants (>5 subscriptions), recommend `--depth quick` first, then `--depth full` per subscription.
