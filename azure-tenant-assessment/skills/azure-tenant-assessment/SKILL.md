---
name: azure-tenant-assessment
description: >
  Deep expertise in running an initial Azure tenant assessment - subscription inventory,
  resource catalog, security posture snapshot, cost overview, and plugin setup recommendations
  via ARM REST API and microsoft-azure-mcp tools. Acts as the entry point for any new Azure
  engagement, surveying the tenant and mapping discovered resource types to the right plugins.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
triggers:
  - assess azure tenant
  - initial azure assessment
  - azure tenant survey
  - azure tenant overview
  - lay of the land azure
  - what's in my azure
  - azure resource inventory
  - azure setup wizard
  - set up azure plugins
  - which azure plugins
  - azure onboarding
  - new azure engagement
  - azure baseline
  - tenant assessment
  - subscription inventory
  - azure first-run
  - azure kickoff
  - azure tenant profile
  - start azure
---

# Azure Tenant Assessment

This skill provides the entry-point workflow for any new Azure engagement — surveying the tenant, cataloging resources, snapshotting security posture, and recommending the right plugins from this marketplace.

## Integration Context Contract

Canonical contract: [`docs/integration-context.md`](../../../docs/integration-context.md)

| Workflow | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| List subscriptions | required | not required | `AzureCloud`* | `delegated-user` or `service-principal` | Azure `Reader` on any subscription |
| List resource groups + resources | required | required | `AzureCloud`* | `delegated-user` or `service-principal` | Azure `Reader` at subscription scope |
| Cost overview (optional) | required | required | `AzureCloud`* | `delegated-user` or `service-principal` | `CostManagement.Read` + Azure `Reader` |
| Security snapshot (optional) | required | required | `AzureCloud`* | `delegated-user` or `service-principal` | `SecurityCenter.Read` + Azure `Reader` |

\* Use sovereign cloud values (`AzureUSGovernment`, `AzureChinaCloud`) when applicable.

Fail fast before API calls when required context is missing. Redact tenant/subscription/object IDs in all outputs.

## MCP Tool Detection

Before attempting live assessment, detect whether `microsoft-azure-mcp` MCP tools are available:

1. Attempt to call `azure_list_subscriptions` with no parameters.
2. If the call succeeds → **live mode**: proceed with full MCP-based assessment.
3. If the call fails with "unknown tool" or similar → **guided mode**: switch to the fallback guided checklist.

Never assume MCP availability. Always detect and adapt.

## Assessment Methodology

Execute in this order for live mode:

1. **Subscriptions** — Call `azure_list_subscriptions`. Collect: `subscriptionId`, `displayName`, `state`, `tenantId`.
2. **Resource Groups** — For each subscription, call `azure_list_resource_groups`. Collect: `name`, `location`, `provisioningState`, resource count (from resources step).
3. **Resources** — For each subscription, call `azure_list_resources`. For `--depth full`: also call per-RG for completeness. Collect: `name`, `type`, `location`, `resourceGroup`.
4. **Taxonomy** — Normalize resource types (title case), group by type, count occurrences, extract ARM namespace prefixes.
5. **Tenant Profile** — Classify as compute-heavy / data-heavy / networking-heavy / security-focused / mixed per `references/plugin-capability-matrix.md`.
6. **Plugin Mapping** — Map discovered ARM prefixes to plugins using the capability matrix; add baseline always-recommend plugins.
7. **Report** — Write markdown report and print to screen.

For `--depth quick`: skip per-RG resource calls; use subscription-level resource list only.

## Assessment Report Format

Save report as `azure-assessment-YYYY-MM-DD.md` where YYYY-MM-DD is today's date.

```markdown
# Azure Tenant Assessment
**Date**: YYYY-MM-DD
**Tenant**: xxxx...yyyy
**Assessed by**: azure-tenant-assessment v1.0.0
**Mode**: Live (microsoft-azure-mcp) | Guided

---

## Executive Summary

| Item | Value |
|---|---|
| Subscriptions | N |
| Resource Groups | N |
| Total Resources | N |
| Regions | N |
| Tenant Profile | compute-heavy / data-heavy / networking-heavy / mixed |
| Assessment Mode | Live / Guided |

<2–3 sentence narrative summary of what was found.>

---

## Subscription Inventory

| Subscription | ID (redacted) | State | Resource Groups |
|---|---|---|---|
| Name | xxxx...yyyy | Enabled | N |

---

## Resource Catalog

| Resource Type | Count | Recommended Plugin(s) |
|---|---|---|
| Microsoft.Compute/virtualMachines | N | azure-containers |
| ... | | |

---

## Resource Distribution

### By Region
| Region | Resources |
|---|---|
| eastus | N |

### Top Resource Groups
| Resource Group | Subscription | Resources |
|---|---|---|
| rg-production | xxxx...yyyy | N |

---

## Security Posture Summary

| Check | Status | Notes |
|---|---|---|
| Key Vault present | Yes / No / Unknown | |
| Monitoring/Insights resources | Yes / No / Unknown | |
| Policy resources | Yes / No / Unknown | |
| Entra ID coverage | Assumed / Confirmed | |

---

## Recommended Plugins

| Priority | Plugin | Why | Install |
|---|---|---|---|
| Tier 1 | azure-storage | 12 storage accounts found | `/plugin install azure-storage@claude-m-microsoft-marketplace` |
| Tier 2 | azure-cost-governance | Baseline — every tenant | `/plugin install azure-cost-governance@claude-m-microsoft-marketplace` |

---

## Next Steps

1. Run `/azure-tenant-plugin-setup` to install recommended plugins
2. Run `azure-cost-governance` cost query for spend baseline
3. Run `azure-policy-security` policy compliance check
4. Review security posture gaps noted above
```

## Plugin Capability Matrix Reference

Full resource type → plugin mapping: [`references/plugin-capability-matrix.md`](./references/plugin-capability-matrix.md)

Always include the four baseline plugins regardless of what resources are found:
- `microsoft-azure-mcp` (unless already installed)
- `azure-cost-governance`
- `azure-policy-security`
- `entra-id-security`

## Fallback Guided Checklist

When MCP tools are not available, ask the user the following structured questions:

1. **Subscription count**: How many Azure subscriptions does this tenant have?
2. **Resource types**: Which of the following resource categories are present? (Compute/VMs, Containers, Web Apps, Storage, Databases, Networking, Key Vaults, Monitoring, Fabric/Analytics, DevOps)
3. **Estimated resources**: Roughly how many total resources are deployed? (<100 / 100–500 / 500–2000 / 2000+)
4. **Primary regions**: Which Azure regions are primarily used?
5. **Cloud environment**: AzureCloud (global) / AzureUSGovernment / AzureChinaCloud

Build the report from these answers using the same format as live mode. Mark the report `**Mode**: Guided` and note that counts are estimates.

## Reference Files

| File | Purpose |
|---|---|
| `references/plugin-capability-matrix.md` | ARM resource type → plugin mapping table |
| `references/operational-knowledge.md` | ARM API endpoints, pagination, prerequisites, failure modes |
| `commands/azure-tenant-setup.md` | Auth and MCP connectivity validation |
| `commands/azure-tenant-assess.md` | Full assessment execution |
| `commands/azure-tenant-plugin-setup.md` | Plugin recommendation and installation |
| `agents/azure-tenant-assessment-reviewer.md` | Post-assessment report review |

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| ARM API endpoints, pagination, prerequisites, failure modes | [`references/operational-knowledge.md`](./references/operational-knowledge.md) |
| ARM resource type to plugin mapping table | [`references/plugin-capability-matrix.md`](./references/plugin-capability-matrix.md) |
| Composite health scoring across identity, security, compliance, collaboration, governance | [`references/tenant-health-scoring.md`](./references/tenant-health-scoring.md) |
| CIS M365 Benchmark gap checks, NIST CSF and ISO 27001 mapping, priority matrix | [`references/compliance-gaps.md`](./references/compliance-gaps.md) |
| 30/60/90-day remediation phases, rollback procedures, stakeholder templates, re-assessment | [`references/remediation-roadmap.md`](./references/remediation-roadmap.md) |
