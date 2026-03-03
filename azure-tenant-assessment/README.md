# azure-tenant-assessment

Entry-point plugin for any new Azure engagement. Surveys the tenant, produces a structured "lay of the land" assessment report, and maps discovered resources to the right plugins in this marketplace.

## What it does

1. **Surveys the Azure tenant** — subscriptions, resource groups, and full resource inventory using `microsoft-azure-mcp` MCP tools when available; falls back to a guided questionnaire when not.
2. **Produces a structured report** — saved to `azure-assessment-YYYY-MM-DD.md` and printed to screen. Covers: subscription inventory, resource catalog, resource distribution, security posture snapshot, and recommended plugins.
3. **Recommends plugins** — maps discovered ARM resource types to the relevant plugins in this marketplace and optionally installs them interactively.

## Commands

| Command | Purpose |
|---|---|
| `/azure-tenant-setup` | Validate auth context and test MCP connectivity before assessment |
| `/azure-tenant-assess` | Run the full tenant assessment and produce the report |
| `/azure-tenant-plugin-setup` | Recommend and optionally install plugins based on assessment findings |

## Quick start

```bash
# 1. Validate setup
/azure-tenant-setup

# 2. Run assessment
/azure-tenant-assess --depth quick

# 3. Install recommended plugins
/azure-tenant-plugin-setup --install
```

## Arguments

### `/azure-tenant-setup`
```
[--tenant-id <guid>]          Override tenant ID from integration context
[--subscription-id <guid>]    Validate against a specific subscription
[--cloud <AzureCloud|AzureUSGovernment|AzureChinaCloud>]
```

### `/azure-tenant-assess`
```
[--subscription <id>]         Assess a single subscription only
[--all-subscriptions]         Assess all accessible subscriptions (default)
[--depth <quick|full>]        quick = subscription-level resources; full = per-RG (default: quick)
[--output <path>]             Override report output path (default: azure-assessment-YYYY-MM-DD.md)
```

### `/azure-tenant-plugin-setup`
```
[--assessment-file <path>]    Read from a specific assessment file (auto-detects latest if omitted)
[--install]                   Interactively confirm and install each recommended plugin
```

## Modes

### Live mode (MCP available)
Requires `microsoft-azure-mcp` plugin to be installed. Uses `azure_list_subscriptions`, `azure_list_resource_groups`, and `azure_list_resources` MCP tools for real-time data.

### Guided mode (no MCP)
When `microsoft-azure-mcp` is not installed, falls back to a structured questionnaire. Produces the same report format with user-provided estimates.

## Report structure

```
azure-assessment-YYYY-MM-DD.md
├── Executive Summary
├── Subscription Inventory
├── Resource Catalog (type × count × recommended plugins)
├── Resource Distribution (by region, top RGs)
├── Security Posture Summary
├── Recommended Plugins (tiered table with install commands)
└── Next Steps
```

## Agent

The **Azure Tenant Assessment Reviewer** agent reviews completed assessment reports for:
- Inventory completeness
- Report accuracy
- Plugin recommendation quality
- Security coverage gaps
- Redaction compliance

Trigger it by asking: "review my azure assessment report"

## Design principles

- **Read-only**: Never creates, modifies, or deletes any Azure resource.
- **Live-first**: Uses MCP tools when available; graceful guided fallback when not.
- **Self-contained**: Works without any other plugin installed.
- **Marketplace-aware**: Maps all discovered resource types to plugins in this marketplace.

## Install

```bash
/plugin install azure-tenant-assessment@claude-m-microsoft-marketplace
```
