# Plugin Capability Matrix

Maps ARM resource type prefixes to recommended marketplace plugins. Use this table when building plugin recommendations from a resource inventory.

## Resource Type → Plugin Mapping

| ARM resource type prefix | Recommended plugin(s) | Reason |
|---|---|---|
| `Microsoft.Compute/*` | `azure-containers` | VM, VMSS, and managed compute workloads |
| `Microsoft.App/*` | `azure-containers` | Container Apps environment and jobs |
| `Microsoft.ContainerRegistry/*` | `azure-containers` | Container image storage and replication |
| `Microsoft.ContainerInstance/*` | `azure-containers` | Container Instances (serverless containers) |
| `Microsoft.Web/sites` | `azure-web-apps`, `azure-functions` | App Service web apps and Function Apps |
| `Microsoft.Web/serverFarms` | `azure-web-apps` | App Service plans |
| `Microsoft.Web/staticSites` | `azure-static-web-apps` | JAMstack/SPA static web apps |
| `Microsoft.Storage/*` | `azure-storage` | Blob, Queue, Table, Files storage accounts |
| `Microsoft.Sql/*` | `azure-sql-database` | Azure SQL databases and managed instances |
| `Microsoft.DocumentDB/*` | `azure-sql-database` | Cosmos DB accounts and databases |
| `Microsoft.DBforPostgreSQL/*` | `azure-sql-database` | Azure Database for PostgreSQL |
| `Microsoft.DBforMySQL/*` | `azure-sql-database` | Azure Database for MySQL |
| `Microsoft.KeyVault/*` | `azure-key-vault` | Key vaults, HSMs, managed HSMs |
| `Microsoft.Network/*` | `azure-networking` | VNets, NSGs, load balancers, DNS, VPN gateways |
| `Microsoft.Cdn/*` | `azure-networking` | CDN profiles and endpoints |
| `Microsoft.FrontDoor/*` | `azure-networking` | Azure Front Door and WAF policies |
| `Microsoft.Insights/*` | `azure-monitor` | Application Insights components |
| `Microsoft.OperationalInsights/*` | `azure-monitor` | Log Analytics workspaces |
| `Microsoft.Monitor/*` | `azure-monitor` | Azure Monitor workspaces and dashboards |
| `Microsoft.Fabric/*` | `fabric-data-engineering`, `fabric-data-warehouse`, `fabric-data-factory` | Microsoft Fabric workspaces and capacities |
| `Microsoft.Synapse/*` | `fabric-data-warehouse`, `fabric-data-engineering` | Synapse Analytics workspaces |
| `Microsoft.DevCenter/*` | `azure-devops` | Dev Box and deployment environments |
| `Microsoft.Logic/*` | `power-automate` | Logic Apps (Standard and Consumption) |
| `Microsoft.ServiceBus/*` | `azure-functions` | Service Bus namespaces and queues |
| `Microsoft.EventHub/*` | `fabric-real-time-analytics` | Event Hub namespaces |
| `Microsoft.EventGrid/*` | `azure-functions` | Event Grid topics and domains |
| `Microsoft.MachineLearningServices/*` | `fabric-data-science` | Azure ML workspaces |
| `Microsoft.CognitiveServices/*` | `azure-web-apps` | Azure AI/Cognitive Services accounts |

## Always-Recommend Baseline

These plugins are recommended for **every** Azure tenant regardless of discovered resource types:

| Plugin | Reason |
|---|---|
| `microsoft-azure-mcp` | Core MCP tool for live Azure resource inspection |
| `azure-cost-governance` | FinOps baseline — every tenant has costs to manage |
| `azure-policy-security` | Policy compliance and drift detection for any subscription |
| `entra-id-security` | Identity and access security for any AAD/Entra tenant |

## Tenant Profile Classification

Use detected resource type distribution to classify the tenant profile:

| Profile | Signal |
|---|---|
| **Compute-heavy** | >30% `Microsoft.Compute/*` or `Microsoft.App/*` resources |
| **Data-heavy** | >30% `Microsoft.Sql/*`, `Microsoft.DocumentDB/*`, `Microsoft.Storage/*`, or `Microsoft.Fabric/*` resources |
| **Networking-heavy** | >20% `Microsoft.Network/*` resources with VPN gateways or ExpressRoute |
| **Security-focused** | Multiple `Microsoft.KeyVault/*` and `Microsoft.Insights/*` resources relative to compute |
| **Mixed** | No single category exceeds the above thresholds |

## Priority Tiers

Rank plugin recommendations by relevance when presenting to the user:

| Tier | Description | Examples |
|---|---|---|
| **Tier 1 – Critical** | Directly matches discovered resource types (3+ resources) | `azure-storage` when 10 storage accounts found |
| **Tier 2 – Recommended** | Matches discovered resource types (1–2 resources) or baseline always-recommend | `azure-key-vault` when 1 key vault found |
| **Tier 3 – Consider** | Related to tenant profile but no direct resource match | `fabric-data-science` for data-heavy tenants without ML workspaces |
