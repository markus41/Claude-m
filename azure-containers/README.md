<!-- claude-m:premium-header:start -->
<div align="center">

<a id="top"></a>

# azure-containers

### Azure Container Apps, Container Instances, and Container Registry — build, push, deploy, and scale containerized workloads

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

<sub><code>microsoft</code> &nbsp;·&nbsp; <code>azure</code> &nbsp;·&nbsp; <code>containers</code> &nbsp;·&nbsp; <code>container-apps</code> &nbsp;·&nbsp; <code>aci</code> &nbsp;·&nbsp; <code>acr</code></sub>

<a href="#install"><b>Install</b></a> &nbsp;·&nbsp;
<a href="#overview"><b>Overview</b></a> &nbsp;·&nbsp;
<a href="#architecture"><b>Architecture</b></a> &nbsp;·&nbsp;
<a href="#related-plugins"><b>Related plugins</b></a> &nbsp;·&nbsp;
<a href="../README.md"><b>Marketplace</b></a>

</div>

---

> [!TIP]
> **One-line install** — `/plugin install azure-containers@claude-m-microsoft-marketplace`



## Overview

> Azure Container Apps, Container Instances, and Container Registry — build, push, deploy, and scale containerized workloads

<details>
<summary><b>What ships in this plugin</b> (commands, agents, skills)</summary>

| Component | Items |
|---|---|
| **Commands** | `/aci-run` · `/acr-build-push` · `/container-app-create` · `/container-app-deploy` · `/container-app-scale` · `/container-setup` |
| **Agents** | `container-reviewer` |
| **Skills** | `azure-containers` |

</details>


<details>
<summary><b>Quick example</b></summary>

```text
Use azure-containers to audit and operate Azure resources end-to-end.
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
    PG["azure-containers<br/>(plugin)"]:::plugin

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
/plugin install azure-containers@claude-m-microsoft-marketplace
```

> [!IMPORTANT]
> This plugin operates against **Azure ARM · Resource Graph · ARM REST · CLI**. Configure credentials via environment variables — never commit secrets.

[Back to top](#top)

---

<!-- claude-m:premium-header:end -->

Azure Container Apps, Container Instances, and Container Registry — build, push, deploy, and scale containerized workloads with ACR, Container Apps (with Dapr and KEDA), ACI for one-off tasks, and full CI/CD pipelines.

## What This Plugin Provides

This is a **knowledge plugin** — it gives Claude deep expertise in Azure container services so it can scaffold Dockerfiles, build and push images to ACR, create and deploy Container Apps with Dapr and KEDA autoscaling, run one-off containers in ACI, and guide CI/CD pipelines. It does not contain runtime code, MCP servers, or executable scripts.

## Setup

Run `/setup` to install Docker, Azure CLI, and create an ACR and Container Apps environment:

```
/setup              # Full guided setup
/setup --minimal    # Dependencies only
```

Requires an Azure subscription with Contributor access.

## Commands

| Command | Description |
|---------|-------------|
| `/setup` | Install Docker, Azure CLI, create ACR and Container Apps environment |
| `/acr-build-push` | Build and push a container image to Azure Container Registry |
| `/container-app-create` | Create a new Container App with ingress and scaling |
| `/container-app-deploy` | Deploy a new revision, manage traffic splitting |
| `/container-app-scale` | Configure KEDA scale rules (HTTP, queue, custom) |
| `/aci-run` | Run a container in ACI (quick one-off or scheduled) |

## Agent

| Agent | Description |
|-------|-------------|
| **Container Reviewer** | Reviews container projects for Dockerfile best practices, Container App configuration, security, networking, and resilience |

## Trigger Keywords

The skill activates automatically when conversations mention: `azure container`, `container apps`, `container instances`, `aci`, `acr`, `container registry`, `docker azure`, `dapr`, `container deploy`, `microservices azure`, `keda`, `revision`.

## Author

Markus Ahling
<!-- claude-m:premium-footer:start -->

---

<a id="related-plugins"></a>

## Related plugins

<table>
<tr><th>Plugin</th><th>What it does</th></tr>
<tr><td><a href="../agent-foundry/README.md"><code>agent-foundry</code></a></td><td>Azure AI Foundry agent lifecycle management — scaffold, deploy, test, and manage AI agents with Azure AI Foundry MCP integration</td></tr>
<tr><td><a href="../azure-ai-services/README.md"><code>azure-ai-services</code></a></td><td>Azure AI workloads — Azure OpenAI Service deployments, AI Search indexes, AI Studio/Foundry projects, Cognitive Services provisioning, content filtering, and responsible AI governance</td></tr>
<tr><td><a href="../azure-cost-governance/README.md"><code>azure-cost-governance</code></a></td><td>Azure FinOps and governance workflows — query costs, monitor budgets, detect anomalies, and identify idle resources for optimization</td></tr>
<tr><td><a href="../azure-document-intelligence/README.md"><code>azure-document-intelligence</code></a></td><td>Azure AI Document Intelligence — OCR, prebuilt models (invoices, receipts, IDs, tax forms), custom models, layout analysis, document classification, and batch processing</td></tr>
<tr><td><a href="../azure-functions/README.md"><code>azure-functions</code></a></td><td>Azure Functions — triggers, bindings, Durable Functions, deployment, and local development with Azure Functions Core Tools</td></tr>
<tr><td><a href="../azure-logic-apps/README.md"><code>azure-logic-apps</code></a></td><td>Azure Logic Apps — enterprise integration workflows, Workflow Definition Language, Standard and Consumption hosting, connectors, B2B/EDI integration accounts, and CI/CD deployment</td></tr>
</table>


<details>
<summary><b>Composable stacks that include <code>azure-containers</code></b></summary>

Combine with sibling plugins to build cross-surface runbooks. Browse the full [marketplace catalog](../README.md#plugin-catalog) for a tailored selection.

</details>

---

<div align="center">

<sub>Part of <a href="../README.md"><b>Claude-m</b></a> — the Microsoft plugin marketplace for Claude Code.</sub>

<sub>Licensed under <a href="../LICENSE">MIT</a>. Built for engineers, MSPs, SOC teams, and analytics leaders.</sub>

</div>

<!-- claude-m:premium-footer:end -->

