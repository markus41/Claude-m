c# CLAUDE.md

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
| `sharepoint-file-intelligence` | productivity | Scan, categorize, deduplicate, and organize SharePoint and OneDrive files at scale using Microsoft Graph |
| `microsoft-excel-mcp` | productivity | Read/write workbooks, worksheets, and tables |
| `excel-office-scripts` | productivity | Excel Office Scripts + Power Automate flows |
| `excel-automation` | productivity | Pandas data cleaning, Office Scripts, VBA fallback |
| `m365-platform-clients` | cloud | Typed Graph + Dataverse clients with shared Azure Identity |
| `m365-admin` | cloud | Tenant admin: users, groups, licenses, Exchange, SharePoint |
| `dataverse-schema` | cloud | Dataverse tables, columns, relationships, FetchXML |
| `powerbi-fabric` | analytics | DAX, Power Query M, Fabric workspaces, PBIP projects |
| `powerbi-paginated-reports` | analytics | Paginated reports through Fabric — RDL, expressions, data sources, export, SSRS migration |
| `powerplatform-alm` | devops | Solution transport, CI/CD pipelines, PCF scaffolding |
| `onedrive` | productivity | Upload, download, share, delta sync via Graph |
| `planner-todo` | productivity | Planner plans, buckets, tasks, and To Do lists |
| `azure-devops` | devops | Comprehensive Azure DevOps — Git repos with passwordless auth (GCM, WIF, SSH), YAML and Classic pipelines, environments, agents, work items, boards, test plans, security, dashboards, wikis, service hooks, Analytics OData, CLI, and extensions |
| `azure-devops-orchestrator` | devops | Intelligent orchestration for Azure DevOps — ship work items with Claude Code, triage backlogs, plan sprints, coordinate releases, monitor pipelines, track DORA metrics, balance workloads, and run retrospectives |
| `entra-id-admin` | security | Users, groups, PIM, MFA, admin units, licenses, B2B, entitlement management |
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
| `onenote-knowledge-base` | productivity | Headless-first OneNote automation for advanced notebooks, rich page design, task boards, and patchable knowledge workflows. |
| `microsoft-loop` | productivity | Microsoft Loop workspaces, pages, and portable Loop components — collaborative spaces with real-time sync across Teams, Outlook, and OneNote via Graph API |
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
| `fabric-semantic-models` | analytics | Microsoft Fabric Semantic Models — Direct Lake modeling, DAX governance, calculation groups, XMLA deployment, and semantic link automation |
| `fabric-gitops-cicd` | devops | Microsoft Fabric GitOps CI/CD — workspace Git integration, deployment pipelines, artifact promotion, branch strategy, and release validation |
| `fabric-capacity-ops` | analytics | Microsoft Fabric Capacity Operations — CU monitoring, throttling diagnostics, workload tuning, autoscale planning, and cost-performance optimization |
| `fabric-mirroring` | analytics | Microsoft Fabric Mirroring — source onboarding, CDC replication, latency monitoring, schema drift handling, and reconciliation workflows |
| `fabric-data-prep-jobs` | analytics | Microsoft Fabric data preparation jobs - Dataflow Gen1, Apache Airflow jobs, mounted Azure Data Factory pipelines, and dbt job governance for deterministic prep workflows. |
| `fabric-data-store` | analytics | Microsoft Fabric data store operations - Cosmos DB database, SQL database, Snowflake database links, datamarts, and Event Schema Set governance. |
| `fabric-ai-agents` | analytics | Microsoft Fabric AI and operations agents - anomaly detector, data agent, operations agent, ontology, and digital twin builder workflows with preview guardrails. |
| `fabric-graph-geo` | analytics | Microsoft Fabric graph and geospatial analytics - graph model, graph queryset, map, and exploration workflows with preview guardrails. |
| `fabric-developer-runtime` | devops | Microsoft Fabric developer runtime operations - GraphQL API, environments, user data functions, and variable library governance. |
| `fabric-distribution-apps` | productivity | Microsoft Fabric org app distribution - package, permission model, release, and adoption workflows for organizational app rollout. |
| `fabric-mirroring-azure` | analytics | Microsoft Fabric mirroring for Azure-native sources - Cosmos DB, PostgreSQL, Databricks catalog, Azure SQL Database, and SQL Managed Instance. |
| `fabric-mirroring-external` | analytics | Microsoft Fabric mirroring for external sources - generic databases, BigQuery, Oracle, SAP, Snowflake, and SQL Server with preview caveats where applicable. |
| `fabric-security-governance` | security | Microsoft Fabric Security Governance — workspace RBAC, RLS/OLS patterns, sensitivity labels, lineage controls, and audit readiness |
| `fabric-observability` | analytics | Microsoft Fabric Observability — Monitor Hub triage, notebook/pipeline reliability runbooks, SLA tracking, alert design, and incident diagnostics |
| `azure-graph-dotnet` | devops | Scaffold and build Microsoft Graph C# / .NET solutions on Azure — Functions, Container Jobs, Azure Identity, Polly resilience, and SharePoint file intelligence implementations |
| `azure-dotnet-webapp` | devops | Scaffold and build ASP.NET Core Web API and Blazor apps on Azure — Minimal API, controllers, Microsoft.Identity.Web, EF Core, SignalR, OpenAPI, App Service deployment, and Graph API integration patterns. |
| `lighthouse-operations` | security | Deep operational tooling for Azure Lighthouse delegation and M365 Lighthouse multi-tenant management — GDAP lifecycle, Bicep delegation templates, baseline compliance, cross-tenant governance, alert management, and monthly MSP health reports. |
| `msp-tenant-provisioning` | cloud | End-to-end new customer onboarding for MSPs and CSPs — CSP tenant creation via Partner Center API, M365 security baseline (CA policies, PIM, break-glass), custom domain DNS setup, Azure subscription and Defender for Cloud, and full Lighthouse management enrollment. |
| `azure-tenant-assessment` | cloud | Entry-point Azure tenant assessment — subscription inventory, resource catalog, security posture snapshot, and plugin setup recommendations. |
| `marketplace-dev-tools` | devops | Research APIs, scaffold plugins, audit coverage |
| `microsoft-docs-mcp` | devops | Search and fetch official Microsoft documentation via the Learn MCP server |
| `process-task-mining` | analytics | Process and task mining from M365, Power Automate, and Azure Monitor logs — extract event logs, discover process models, analyze performance, and check conformance |
| `agent-foundry` | cloud | Azure AI Foundry agent lifecycle — scaffold, deploy, test, and manage AI agents with Azure AI Foundry MCP integration |
| `defender-sentinel` | security | Microsoft Sentinel SIEM/SOAR and Defender XDR — incident triage, KQL threat hunting, analytics rules, SOAR playbooks, and advanced hunting |
| `azure-ai-services` | cloud | Azure OpenAI deployments, AI Search indexes and RAG pipelines, AI Studio/Foundry projects, Cognitive Services, content filtering, and responsible AI governance |
| `azure-openai` | cloud | Azure OpenAI Service — model deployments, fine-tuning, content filtering, prompt engineering, batch API, and quota management |
| `azure-document-intelligence` | cloud | Azure AI Document Intelligence — OCR, prebuilt models (invoices, receipts, IDs), custom models, layout analysis, and document classification |
| `azure-organization` | cloud | Azure organization and governance — management groups, subscriptions, resource tagging, naming conventions, and landing zones |
| `dynamics-365-crm` | productivity | Dynamics 365 Sales and Customer Service — leads, opportunities, cases, SLAs, queues, pipeline reporting, and CRM workflow automation |
| `dynamics-365-field-service` | productivity | Dynamics 365 Field Service — work orders, bookings, resource scheduling, service accounts, assets, and IoT-triggered service events |
| `dynamics-365-project-ops` | productivity | Dynamics 365 Project Operations — projects, WBS, time and expense tracking, resource assignments, project contracts, and billing |
| `business-central` | productivity | Dynamics 365 Business Central ERP — finance (GL, journal entries, AP/AR), supply chain (sales invoices, purchase orders), and inventory management |
| `microsoft-intune` | security | Device lifecycle and compliance management for Microsoft Intune and Endpoint Manager - non-compliant device detection, lost device actions, compliance policy rollout, and app protection policy review. |
| `defender-endpoint` | security | Microsoft Defender for Endpoint operations - incident triage, machine isolation, live response package metadata checks, and evidence summary generation. |
| `azure-logic-apps` | cloud | Azure Logic Apps — enterprise integration workflows, Workflow Definition Language, Standard and Consumption hosting, connectors, B2B/EDI integration accounts, and CI/CD deployment |
| `azure-kubernetes` | cloud | Azure Kubernetes Service operations - cluster inventory, pod failure diagnostics, node pool scaling, and policy posture checks. |
| `azure-backup-recovery` | cloud | Azure Backup and Site Recovery operations - job health checks, restore drill readiness, recovery plan audits, and cross-region resilience checks. |
| `azure-api-management` | cloud | Azure API Management operations - API inventory, policy drift detection, key rotation workflows, and contract diff checks across revisions. |
| `azure-service-bus` | cloud | Azure messaging operations for Service Bus and event-driven workloads - lag scans, dead-letter replay planning, stale subscription cleanup, and namespace quota checks. |
| `azure-service-health` | cloud | Azure Service Health operations - active incident watchlists, impact scoring, runbook mapping, and communications-ready outage summaries. |
| `m365-meeting-intelligence` | productivity | Meeting transcript intelligence for Teams and Outlook - transcript fetch, commitment extraction, task handoff, and owner reminder workflows. |
| `entra-access-reviews` | security | Microsoft Entra access review automation - stale privileged access detection, review cycle drafting, remediation ticket generation, and status reporting. |
| `planner-orchestrator` | productivity | Intelligent orchestration for Microsoft Planner — ship tasks with Claude Code, triage backlogs, plan sprint buckets, monitor deadlines, and balance workloads across plans. Integrates with microsoft-teams-mcp, microsoft-outlook-mcp, and powerbi-fabric when installed. |
| `fluent-ui-design` | devops | Microsoft Fluent 2 design system mastery — design tokens, color system, typography, layout, components, Teams theming, Griffel styling, accessibility, responsive design, and Figma design kits |
| `notion` | productivity | Comprehensive Notion mastery — page design, every block type, databases, formulas, AI features, MCP integration, REST API, and professional templates |

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
