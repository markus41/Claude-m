---
name: azure-tenant-plugin-setup
description: Recommend and optionally install marketplace plugins based on Azure tenant assessment findings.
argument-hint: "[--assessment-file <path>] [--install]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Azure Tenant Plugin Setup

Reads assessment findings and recommends (or interactively installs) the right plugins for this Azure tenant.

## Step 1: Load Assessment Data

**If `--assessment-file <path>` is provided:**
- Read the specified file.
- Parse the `## Resource Catalog` section to extract resource types and counts.
- Parse the `## Recommended Plugins` section if present (use as a starting point).
- Parse the `## Executive Summary` to confirm tenant profile classification.

**If no assessment file is provided:**
- Check if `azure-assessment-*.md` exists in the current directory (most recent by name).
- If found, use it automatically and notify the user.
- If not found, run a quick in-memory assessment: attempt `azure_list_subscriptions` and `azure_list_resources` for the first subscription. If MCP is unavailable, ask the user directly:
  - "Which Azure resource types does this tenant use?" (with the same category list as `/azure-tenant-assess` guided mode)

## Step 2: Load Plugin Capability Matrix

Read `skills/azure-tenant-assessment/references/plugin-capability-matrix.md`.

Build a lookup from ARM namespace prefix to plugin name(s).

## Step 3: Map Resource Types to Plugins

For each resource type found in the assessment:
1. Extract the ARM namespace prefix (e.g., `Microsoft.Compute` from `Microsoft.Compute/virtualMachines`).
2. Look up matching plugins in the capability matrix.
3. Collect the resource count that drives each plugin recommendation.

Deduplicate: if a plugin appears multiple times (from different resource types), record it once with the aggregate resource count and a combined reason.

## Step 4: Build Prioritized Recommendations

Always include the four baseline plugins:
- `microsoft-azure-mcp` — core inspection tool (include unless already installed)
- `azure-cost-governance` — FinOps baseline
- `azure-policy-security` — compliance and drift detection
- `entra-id-security` — identity and access security

Rank all plugins:
- **Tier 1** — 3 or more resources of a matching type discovered
- **Tier 2** — 1–2 resources matching, or baseline always-recommend
- **Tier 3** — profile-based inference (no direct match but related to tenant profile)

## Step 5: Print Recommendations Table

Print the prioritized recommendations to screen:

```
## Plugin Recommendations for This Azure Tenant

| Priority | Plugin | Why | Install Command |
|---|---|---|---|
| Tier 1 | azure-storage | 12 storage accounts found | /plugin install azure-storage@claude-m-microsoft-marketplace |
| Tier 1 | azure-networking | 8 VNets + 5 NSGs found | /plugin install azure-networking@claude-m-microsoft-marketplace |
| Tier 2 | azure-cost-governance | Baseline — every Azure tenant | /plugin install azure-cost-governance@claude-m-microsoft-marketplace |
| Tier 2 | azure-policy-security | Baseline — policy compliance | /plugin install azure-policy-security@claude-m-microsoft-marketplace |
| Tier 2 | entra-id-security | Baseline — identity security | /plugin install entra-id-security@claude-m-microsoft-marketplace |
| Tier 2 | microsoft-azure-mcp | Core MCP inspection tool | /plugin install microsoft-azure-mcp@claude-m-microsoft-marketplace |
| Tier 3 | azure-monitor | No monitoring resources found — gap | /plugin install azure-monitor@claude-m-microsoft-marketplace |

Total: N plugins recommended (N Tier 1, N Tier 2, N Tier 3)
```

## Step 6: Interactive Installation (--install flag only)

If `--install` is provided, proceed through the recommendation list interactively:

For each recommended plugin (Tier 1 first, then Tier 2, then Tier 3):

1. Show the plugin name, reason, and install command.
2. Ask the user: "Install `<plugin-name>`?" with options: Yes / Skip / Stop installing.
3. If Yes: run `/plugin install <name>@claude-m-microsoft-marketplace`.
4. If Skip: move to next plugin.
5. If Stop: end the installation loop and summarize what was installed.

After completing all confirmations, print a summary:

```
## Installation Summary

Installed (N):
- azure-storage
- azure-networking
- azure-cost-governance

Skipped (N):
- azure-monitor

All recommended plugins processed. Run /azure-tenant-assess --depth full for an updated assessment.
```

If `--install` is not provided, end with:

```
To install all recommended plugins interactively, run:
  /azure-tenant-plugin-setup --install

To install a specific plugin:
  /plugin install <name>@claude-m-microsoft-marketplace
```
