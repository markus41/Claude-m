<!-- claude-m:premium-header:start -->
<div align="center">

<a id="top"></a>

# azure-service-bus

### Azure messaging operations for Service Bus and event-driven workloads - lag scans, dead-letter replay planning, stale subscription cleanup, and namespace quota checks.

<sub>Inventory, govern, and operate Azure resources at any scale.</sub>

<br />

<table align="center">
<tr>
<td align="center"><b>Category</b><br /><code>Cloud</code></td>
<td align="center"><b>Surfaces</b><br /><sub>Azure ARM · Resource Graph · ARM REST · CLI</sub></td>
<td align="center"><b>Version</b><br /><code>1.0.0</code></td>
<td align="center"><b>Marketplace</b><br /><code>claude-m-microsoft-marketplace</code></td>
</tr>
</table>

<sub><code>azure</code> &nbsp;·&nbsp; <code>service</code> &nbsp;·&nbsp; <code>bus</code></sub>

<a href="#install"><b>Install</b></a> &nbsp;·&nbsp;
<a href="#overview"><b>Overview</b></a> &nbsp;·&nbsp;
<a href="#architecture"><b>Architecture</b></a> &nbsp;·&nbsp;
<a href="#related-plugins"><b>Related plugins</b></a> &nbsp;·&nbsp;
<a href="../README.md"><b>Marketplace</b></a>

</div>

---

> [!TIP]
> **One-line install** — `/plugin install azure-service-bus@claude-m-microsoft-marketplace`



## Overview

> Azure messaging operations for Service Bus and event-driven workloads - lag scans, dead-letter replay planning, stale subscription cleanup, and namespace quota checks.

<details>
<summary><b>What ships in this plugin</b> (commands, agents, skills)</summary>

| Component | Items |
|---|---|
| **Commands** | `/service-bus-deadletter-replay-plan` · `/service-bus-lag-scan` · `/service-bus-namespace-quota-check` · `/service-bus-setup` · `/service-bus-stale-subscription-cleanup` |
| **Agents** | `azure-service-bus-reviewer` |
| **Skills** | `azure-service-bus` |

</details>


<details>
<summary><b>Quick example</b></summary>

```text
Use azure-service-bus to audit and operate Azure resources end-to-end.
```

</details>

<a id="architecture"></a>

## Architecture

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#0078D4','primaryTextColor':'#FFFFFF','lineColor':'#5B9BD5','fontFamily':'Segoe UI, Arial, sans-serif'}}}%%
flowchart LR
    classDef user fill:#1E1E1E,stroke:#FFFFFF,color:#FFFFFF,stroke-width:2px
    classDef cc fill:#D97757,stroke:#7A3E2A,color:#FFFFFF
    classDef plugin fill:#0078D4,stroke:#003E6B,color:#FFFFFF,stroke-width:2px
    classDef msft fill:#FFB900,stroke:#B07F00,color:#000000

    U["You"]:::user
    CC["Claude Code"]:::cc
    PG["azure-service-bus<br/>(plugin)"]:::plugin

    subgraph MS[" Microsoft surfaces "]
        direction TB
        S0["Azure ARM REST"]:::msft
        S1["Azure Resource Graph"]:::msft
        S2["Azure CLI"]:::msft
    end

    U -->|prompts| CC
    CC -->|loads| PG
    PG ==> S0
    PG ==> S1
    PG ==> S2
```

<a id="install"></a>

## Install

```bash
/plugin marketplace add markus41/Claude-m
/plugin install azure-service-bus@claude-m-microsoft-marketplace
```

> [!IMPORTANT]
> This plugin operates against **Azure ARM · Resource Graph · ARM REST · CLI**. Configure credentials via environment variables — never commit secrets.

[Back to top](#top)

---

<!-- claude-m:premium-header:end -->

Azure messaging operations for Service Bus and event-driven workloads - lag scans, dead-letter replay planning, stale subscription cleanup, and namespace quota checks.

## Purpose

This plugin is a knowledge plugin for Azure Service Bus workflows. It provides deterministic command guidance and review patterns, and does not include runtime MCP servers.

## Prerequisites

- Microsoft tenant access for the target workload.
- Required scopes or roles: `Azure Service Bus Data Owner`, `Reader`
- Redaction and fail-fast behavior must follow the shared integration contract.

## Install

```bash
/plugin install azure-service-bus@claude-m-microsoft-marketplace
```

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../docs/integration-context.md)

| Command family | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Azure Service Bus operations | required | required | `AzureCloud`* | service-principal or delegated-user | `Azure Service Bus Data Owner`, `Reader` |

* Use sovereign cloud values from the canonical contract when applicable.

Commands must fail fast before network calls when required context is missing or invalid. All outputs must redact sensitive IDs and secrets.

## Commands

| Command | Description |
|---|---|
| `/service-bus-setup` | Run service bus setup workflow. |
| `/service-bus-lag-scan` | Run service bus lag scan workflow. |
| `/service-bus-deadletter-replay-plan` | Run service bus deadletter replay plan workflow. |
| `/service-bus-stale-subscription-cleanup` | Run service bus stale subscription cleanup workflow. |
| `/service-bus-namespace-quota-check` | Run service bus namespace quota check workflow. |

## Agent

| Agent | Description |
|---|---|
| `azure-service-bus-reviewer` | Reviews command and skill docs for API correctness, permissions, and safety checks. |

## Trigger Keywords

- `azure service bus`
- `queue lag`
- `dead letter`
- `subscription cleanup`
- `namespace quota`
<!-- claude-m:premium-footer:start -->

---

<a id="related-plugins"></a>

## Related plugins

<table>
<tr><th>Plugin</th><th>What it does</th></tr>
<tr><td><a href="../azure-service-health/README.md"><code>azure-service-health</code></a></td><td>Azure Service Health operations - active incident watchlists, impact scoring, runbook mapping, and communications-ready outage summaries.</td></tr>
<tr><td><a href="../agent-foundry/README.md"><code>agent-foundry</code></a></td><td>Azure AI Foundry agent lifecycle management — scaffold, deploy, test, and manage AI agents with Azure AI Foundry MCP integration</td></tr>
<tr><td><a href="../azure-ai-services/README.md"><code>azure-ai-services</code></a></td><td>Azure AI workloads — Azure OpenAI Service deployments, AI Search indexes, AI Studio/Foundry projects, Cognitive Services provisioning, content filtering, and responsible AI governance</td></tr>
<tr><td><a href="../azure-api-management/README.md"><code>azure-api-management</code></a></td><td>Azure API Management operations - API inventory, policy drift detection, key rotation workflows, and contract diff checks across revisions.</td></tr>
<tr><td><a href="../azure-backup-recovery/README.md"><code>azure-backup-recovery</code></a></td><td>Azure Backup and Site Recovery operations - job health checks, restore drill readiness, recovery plan audits, and cross-region resilience checks.</td></tr>
<tr><td><a href="../azure-containers/README.md"><code>azure-containers</code></a></td><td>Azure Container Apps, Container Instances, and Container Registry — build, push, deploy, and scale containerized workloads</td></tr>
</table>


<details>
<summary><b>Composable stacks that include <code>azure-service-bus</code></b></summary>

Combine with sibling plugins to build cross-surface runbooks. Browse the full [marketplace catalog](../README.md#plugin-catalog) for a tailored selection.

</details>

---

<div align="center">

<sub>Part of <a href="../README.md"><b>Claude-m</b></a> — the Microsoft plugin marketplace for Claude Code.</sub>

<sub>Licensed under <a href="../LICENSE">MIT</a>. Built for engineers, MSPs, SOC teams, and analytics leaders.</sub>

</div>

<!-- claude-m:premium-footer:end -->

