# defender-sentinel

Microsoft Sentinel SIEM/SOAR and Defender XDR plugin for Claude Code. Covers incident triage, KQL threat hunting, analytics rule authoring, SOAR playbook patterns, and cross-signal advanced hunting.

## What it covers

- **Microsoft Sentinel** — incidents, analytics rules (Scheduled, NRT, Fusion), watchlists, bookmarks, automation rules, SOAR playbooks (Logic Apps)
- **Microsoft Defender XDR** — unified incident queue, alert investigation with evidence, advanced hunting across MDE/MDI/MDO/MDCA tables
- **KQL** — threat hunting query templates, MITRE ATT&CK mapped detections, Log Analytics query API
- **Response actions** — device isolation, user disable, file hash blocking, indicator management

## Install

```bash
/plugin install defender-sentinel@claude-m-microsoft-marketplace
```

## Required permissions

| Workload | Role / Permission |
|---|---|
| Sentinel incidents (read + update) | `Microsoft Sentinel Responder` on the Log Analytics workspace |
| Sentinel analytics rules + watchlists | `Microsoft Sentinel Contributor` |
| Log Analytics KQL queries | `Log Analytics Reader` on the workspace |
| Defender XDR incidents | `SecurityIncident.Read.All` / `SecurityIncident.ReadWrite.All` (Graph) |
| Advanced hunting | `ThreatHunting.Read.All` (Graph) |
| MDE device actions | `Machine.Isolate` scope on MDE API |
| User disable | `User.ReadWrite.All` (Graph) |

## Setup

```
/defender-sentinel-setup
```

Validates workspace connectivity, RBAC, data connector status, and Defender XDR access.

## Commands

| Command | Description |
|---|---|
| `/defender-sentinel-setup` | Validate auth, workspace, RBAC, and data connectors |
| `/sentinel-incident-triage` | List open incidents, enrich with entities, suggest actions |
| `/sentinel-hunting-query` | Generate and run KQL threat hunting queries |
| `/sentinel-analytics-rule` | Create, update, tune, or list analytics rules |
| `/defender-alert-investigate` | Pivot on a Defender XDR alert — device, user, process tree |

## Example prompts

- "Use `defender-sentinel` to triage all High severity New incidents in the workspace"
- "Write a KQL hunting query for T1059.001 (PowerShell obfuscation) looking back 7 days"
- "Create a Scheduled analytics rule detecting off-hours privileged role assignments"
- "Investigate Defender alert {alert-id} — show the process tree and network connections"
- "List all Sentinel analytics rules and flag any that are disabled or have no MITRE mapping"

## Auth pattern

Uses the integration context contract (`docs/integration-context.md`). Required context:

```
tenantId + subscriptionId + SENTINEL_WORKSPACE_RESOURCE_ID
```

For Defender XDR: `tenantId` only (Graph Security API).
