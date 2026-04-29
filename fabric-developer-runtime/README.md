<!-- claude-m:premium-header:start -->
<div align="center">

<a id="top"></a>

# fabric-developer-runtime

### Microsoft Fabric developer runtime operations - GraphQL API, environments, user data functions, and variable library governance.

<sub>Ship reliably with first-class CI/CD and ALM.</sub>

<br />

<table align="center">
<tr>
<td align="center"><b>Category</b><br /><code>DevOps</code></td>
<td align="center"><b>Surfaces</b><br /><sub>Azure DevOps · GitHub · Pipelines · ALM · IaC</sub></td>
<td align="center"><b>Version</b><br /><code>1.0.0</code></td>
<td align="center"><b>Marketplace</b><br /><code>claude-m-microsoft-marketplace</code></td>
</tr>
</table>

<sub><code>microsoft</code> &nbsp;·&nbsp; <code>fabric</code> &nbsp;·&nbsp; <code>runtime</code> &nbsp;·&nbsp; <code>graphql</code> &nbsp;·&nbsp; <code>environment</code> &nbsp;·&nbsp; <code>udf</code></sub>

<a href="#install"><b>Install</b></a> &nbsp;·&nbsp;
<a href="#overview"><b>Overview</b></a> &nbsp;·&nbsp;
<a href="#architecture"><b>Architecture</b></a> &nbsp;·&nbsp;
<a href="#related-plugins"><b>Related plugins</b></a> &nbsp;·&nbsp;
<a href="../README.md"><b>Marketplace</b></a>

</div>

---

> [!TIP]
> **One-line install** — `/plugin install fabric-developer-runtime@claude-m-microsoft-marketplace`



## Overview

> Microsoft Fabric developer runtime operations - GraphQL API, environments, user data functions, and variable library governance.

<details>
<summary><b>What ships in this plugin</b> (commands, agents, skills)</summary>

| Component | Items |
|---|---|
| **Commands** | `/environment-manage` · `/graphql-api-manage` · `/runtime-setup` · `/user-data-function-manage` · `/variable-library-manage` |
| **Agents** | `fabric-developer-runtime-reviewer` |
| **Skills** | `fabric-developer-runtime` |

</details>


<details>
<summary><b>Quick example</b></summary>

```text
Use fabric-developer-runtime to ship work through pipelines with full ALM.
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
    PG["fabric-developer-runtime<br/>(plugin)"]:::plugin

    subgraph MS[" Microsoft surfaces "]
        direction TB
        S0["Azure DevOps REST"]:::msft
        S1["GitHub API"]:::msft
        S2["Pipelines"]:::msft
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
/plugin install fabric-developer-runtime@claude-m-microsoft-marketplace
```

> [!IMPORTANT]
> This plugin operates against **Azure DevOps · GitHub · Pipelines · ALM · IaC**. Configure credentials via environment variables — never commit secrets.

[Back to top](#top)

---

<!-- claude-m:premium-header:end -->

Microsoft Fabric developer runtime operations - GraphQL API, environments, user data functions, and variable library governance.

## Purpose

This plugin is a knowledge plugin for Fabric developer runtime workflows. It provides deterministic command guidance and review patterns, and does not include runtime MCP servers.

## Prerequisites

- Microsoft Fabric tenant access for the target workspace.
- Runtime and environment administration rights for target Fabric workspaces.
- Required permissions baseline: `Fabric Workspace Admin` or equivalent runtime governance role.

## Install

```bash
/plugin install fabric-developer-runtime@claude-m-microsoft-marketplace
```

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../docs/integration-context.md)

| Command family | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Fabric developer runtime operations | required | optional | `AzureCloud`* | delegated-user or service-principal | `Fabric Workspace Admin` (or equivalent runtime governance role) |

* Use sovereign cloud values from the canonical contract when applicable.

Commands must fail fast before network calls when required context is missing or invalid. All outputs must redact sensitive IDs, secrets, and credential material.

## Commands

| Command | Description |
|---|---|
| `/runtime-setup` | Baseline runtime governance context and execution safety gates. |
| `/graphql-api-manage` | Create, update, validate, or retire Fabric GraphQL API assets with deterministic checks. |
| `/environment-manage` | Manage Fabric runtime environments with explicit lifecycle controls. |
| `/user-data-function-manage` | Manage user data function packaging, deployment, and version governance. |
| `/variable-library-manage` | Govern variable libraries with least-privilege and redacted output controls. |

## Agent

| Agent | Description |
|---|---|
| `fabric-developer-runtime-reviewer` | Reviews runtime docs for context integrity, permissions, fail-fast checks, and redaction safety. |

## Trigger Keywords

- `fabric developer runtime`
- `fabric graphql api`
- `fabric environment runtime`
- `fabric user data function`
- `fabric variable library`
<!-- claude-m:premium-footer:start -->

---

<a id="related-plugins"></a>

## Related plugins

<table>
<tr><th>Plugin</th><th>What it does</th></tr>
<tr><td><a href="../fabric-gitops-cicd/README.md"><code>fabric-gitops-cicd</code></a></td><td>Microsoft Fabric GitOps CI/CD — workspace Git integration, deployment pipelines, artifact promotion, branch strategy, and release validation</td></tr>
<tr><td><a href="../powerplatform-alm/README.md"><code>powerplatform-alm</code></a></td><td>Power Platform ALM — environments, solution transport, CI/CD pipelines, PCF controls, and deployment automation</td></tr>
<tr><td><a href="../azure-devops/README.md"><code>azure-devops</code></a></td><td>Comprehensive Azure DevOps expertise — Git repos with passwordless auth (GCM, WIF, SSH), YAML and Classic pipelines, deployment environments, agent pools, work items, boards, sprints, test plans, security namespaces, dashboards, wikis, service hooks, Analytics OData, CLI, and extensions</td></tr>
<tr><td><a href="../azure-devops-orchestrator/README.md"><code>azure-devops-orchestrator</code></a></td><td>Intelligent orchestration for Azure DevOps — ship work items with Claude Code, triage backlogs, plan sprints, coordinate releases, monitor pipelines, and balance workloads across projects. Integrates with microsoft-teams-mcp and microsoft-outlook-mcp when installed.</td></tr>
<tr><td><a href="../azure-dotnet-webapp/README.md"><code>azure-dotnet-webapp</code></a></td><td>Scaffold and build ASP.NET Core Web API and Blazor apps on Azure — Minimal API, controllers, Microsoft.Identity.Web, EF Core, SignalR, OpenAPI, App Service deployment, and Graph API integration patterns.</td></tr>
<tr><td><a href="../azure-graph-dotnet/README.md"><code>azure-graph-dotnet</code></a></td><td>Scaffold and build Microsoft Graph C# / .NET solutions on Azure — Functions, Container Jobs, Azure Identity, Polly resilience, and SharePoint file intelligence implementations.</td></tr>
</table>


<details>
<summary><b>Composable stacks that include <code>fabric-developer-runtime</code></b></summary>

Combine with sibling plugins to build cross-surface runbooks. Browse the full [marketplace catalog](../README.md#plugin-catalog) for a tailored selection.

</details>

---

<div align="center">

<sub>Part of <a href="../README.md"><b>Claude-m</b></a> — the Microsoft plugin marketplace for Claude Code.</sub>

<sub>Licensed under <a href="../LICENSE">MIT</a>. Built for engineers, MSPs, SOC teams, and analytics leaders.</sub>

</div>

<!-- claude-m:premium-footer:end -->

