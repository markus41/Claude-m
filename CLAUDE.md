# CLAUDE.md

## Quick start

```bash
# 1. Add the marketplace
/plugin marketplace add markus41/Claude-m

# 2. Install a plugin
/plugin install microsoft-azure-mcp@claude-m-microsoft-marketplace
```

## Troubleshooting: SSH auth error

If you see `git@github.com: Permission denied (publickey)` when adding the marketplace,
Git is trying SSH but no key is configured. Fix it by switching to HTTPS:

```bash
git config --global url."https://github.com/".insteadOf "git@github.com:"
```

Then re-run `/plugin marketplace add markus41/Claude-m`.

## Available plugins

| Plugin name (install slug) | Category | Description |
|---|---|---|
| `microsoft-azure-mcp` | cloud | Inspect subscriptions, resource groups, and resources |
| `microsoft-teams-mcp` | productivity | Messages, meetings, and channel management |
| `microsoft-outlook-mcp` | productivity | Send email, manage inbox and calendar |
| `microsoft-sharepoint-mcp` | productivity | Browse and transfer SharePoint files |
| `microsoft-excel-mcp` | productivity | Read/write workbooks, worksheets, and tables |
| `excel-office-scripts` | productivity | Excel Office Scripts + Power Automate flows |
| `excel-automation` | productivity | Pandas data cleaning, Office Scripts, VBA fallback |
| `m365-platform-clients` | cloud | Typed Graph + Dataverse clients with shared Azure Identity |
| `m365-admin` | cloud | Tenant admin: users, groups, licenses, Exchange, SharePoint |
| `dataverse-schema` | cloud | Dataverse tables, columns, relationships, FetchXML |
| `powerbi-fabric` | analytics | DAX, Power Query M, Fabric workspaces, PBIP projects |
| `powerplatform-alm` | devops | Solution transport, CI/CD pipelines, PCF scaffolding |
| `onedrive` | productivity | Upload, download, share, delta sync via Graph |
| `planner-todo` | productivity | Planner plans, buckets, tasks, and To Do lists |
| `azure-devops` | devops | Git repos, YAML pipelines, work items, pull requests |
| `entra-id-security` | security | App registrations, conditional access, sign-in risk |
| `powerapps` | productivity | Canvas Power Fx, model-driven apps, custom connectors |
| `azure-cost-governance` | cloud | FinOps queries, budget alerts, idle resource detection |
| `power-automate` | productivity | Cloud flow design, diagnostics, retries |
| `purview-compliance` | security | DLP, retention, sensitivity labels, eDiscovery |
| `azure-policy-security` | security | Policy compliance, drift analysis, guardrails |
| `lighthouse-health` | security | Multi-tenant health scoring for MSPs/CSPs |
| `license-optimizer` | cloud | Inactive license detection, savings estimates |
| `exchange-mailflow` | productivity | Mail delivery diagnostics, SPF/DKIM/DMARC checks |
| `sharing-auditor` | security | Overshared links and stale guest user audits |
| `teams-lifecycle` | productivity | Team templates, naming governance, expiration reviews |
| `servicedesk-runbooks` | productivity | Guided IT ticket workflows with approval gates |
| `microsoft-bookings` | productivity | Appointment calendars, services, staff availability |
| `microsoft-forms-surveys` | productivity | Create surveys, collect responses, summarize results |
| `microsoft-lists-tracker` | productivity | Lists for process tracking, issue logs, project trackers |
| `copilot-studio-bots` | productivity | Bot topics, trigger phrases, generative AI orchestration |
| `onenote-knowledge-base` | productivity | Notebooks, sections, pages — team wiki and meeting notes |
| `power-pages` | productivity | Power Pages sites, Liquid templates, web forms, table permissions |
| `azure-web-apps` | cloud | App Service web apps, deployment slots, custom domains, CI/CD |
| `azure-static-web-apps` | cloud | JAMstack/SPA hosting, built-in auth, PR preview environments |
| `teams-app-dev` | devops | Custom Teams app development — Adaptive Cards, message extensions, bot handlers, tab apps, manifest authoring, and Teams Toolkit CLI workflows |
| `azure-storage` | cloud | Azure Storage — Blob, Queue, Table, and Files services with lifecycle policies, SAS tokens, and managed identity access |
| `azure-functions` | cloud | Azure Functions — triggers, bindings, Durable Functions, deployment, and local development with Azure Functions Core Tools |
| `azure-containers` | cloud | Azure Container Apps, Container Instances, and Container Registry — build, push, deploy, and scale containerized workloads |
| `azure-sql-database` | cloud | Azure SQL Database and Cosmos DB — provisioning, schema management, query optimization, security hardening, and backup/restore |
| `azure-key-vault` | security | Azure Key Vault — secrets, keys, and certificates management with RBAC, rotation policies, and managed identity integration |
| `azure-monitor` | cloud | Azure Monitor, Application Insights, and Log Analytics — metrics, alerts, KQL queries, dashboards, and diagnostic settings |
| `azure-networking` | cloud | Azure Networking — VNets, subnets, NSGs, Load Balancers, Front Door, DNS zones, VPN gateways, and Private Link |
| `fabric-data-engineering` | analytics | Microsoft Fabric Data Engineering — lakehouses, Spark notebooks, data pipelines, Delta Lake tables, and lakehouse SQL endpoints |
| `fabric-data-warehouse` | analytics | Microsoft Fabric Data Warehouse — Synapse warehouses, T-SQL DDL/DML, cross-database queries, stored procedures, and data modeling |
| `fabric-real-time-analytics` | analytics | Microsoft Fabric Real-Time Analytics — Eventhouse, KQL databases, eventstreams, Real-Time Dashboards, and streaming ingestion |
| `fabric-data-factory` | analytics | Microsoft Fabric Data Factory — data pipelines, Dataflow Gen2, Copy activity, orchestration patterns, and scheduling |
| `fabric-data-science` | analytics | Microsoft Fabric Data Science — ML experiments, model training, MLflow tracking, PREDICT function, and semantic link integration |
| `fabric-data-activator` | analytics | Microsoft Fabric Data Activator — Reflex triggers, condition-based alerts, real-time actions, and event-driven automation on Fabric data |
| `fabric-onelake` | analytics | Microsoft Fabric OneLake — unified data lake, shortcuts, file explorer, ADLS Gen2 APIs, and cross-workspace data access |
| `marketplace-dev-tools` | devops | Research APIs, scaffold plugins, audit coverage |

Install any plugin with:
```bash
/plugin install <plugin-name>@claude-m-microsoft-marketplace
```

## Validation

```bash
# Inside Claude
/plugin validate .

# CLI / CI
claude plugin validate .
npm run validate:all
```

## Prompt examples

- "Use `microsoft-azure-mcp` to list resource groups in subscription `<id>` and flag idle resources."
- "Use `microsoft-teams-mcp` to draft and send a standup update to channel `<channel-id>`."
- "Use `microsoft-outlook-mcp` to summarize unread inbox messages and schedule a follow-up."
- "Use `azure-cost-governance` to find resources with no activity in the last 30 days and estimate savings."
- "Use `entra-id-security` to report service principals with excessive permissions."
- "Use `license-optimizer` to identify inactive M365 licenses and produce a savings report."

## Opinionated flows

1. **Microsoft collaboration stack**
   Install: `microsoft-teams-mcp` + `microsoft-outlook-mcp` + `microsoft-sharepoint-mcp`
   Prompt: "Audit communication and file handoff risks for this week and produce actions."

2. **Azure governance review**
   Install: `microsoft-azure-mcp` + `azure-cost-governance` + `azure-policy-security`
   Prompt: "List subscriptions/resource groups/resources, flag policy drift, and estimate cost waste."

3. **Entra security sweep**
   Install: `entra-id-security` + `purview-compliance` + `sharing-auditor`
   Prompt: "Review conditional access gaps, overshared files, and DLP policy coverage."

4. **MSP multi-tenant health**
   Install: `lighthouse-health` + `license-optimizer` + `servicedesk-runbooks`
   Prompt: "Score all tenants for security posture and generate a monthly customer-ready report."
