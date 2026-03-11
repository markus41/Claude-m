# Azure Naming Conventions — Reference

## Overview

Consistent naming conventions are critical for resource identification, operational efficiency, cost allocation, and automation in Azure. The Microsoft Cloud Adoption Framework (CAF) provides a prescriptive naming standard that uses resource type abbreviations, workload identifiers, environment designators, region codes, and instance numbers. This reference provides the complete CAF abbreviation table, naming pattern templates, validation scripts, and common anti-patterns to avoid.

---

## CAF Naming Pattern

```
{prefix}-{workload}-{environment}-{region}-{instance}
```

| Component | Description | Examples |
|---|---|---|
| `prefix` | Resource type abbreviation from CAF table | `rg-`, `vnet-`, `vm-`, `st` |
| `workload` | Application or workload name | `webshop`, `erp`, `dataplatform` |
| `environment` | Deployment stage | `prod`, `staging`, `dev`, `sandbox` |
| `region` | Azure region short name | `eastus`, `westeu`, `aue` |
| `instance` | Unique instance number | `001`, `002` |

---

## Complete CAF Abbreviation Table

### General

| Resource Type | Abbreviation | Example |
|---|---|---|
| Management group | `mg-` | `mg-platform` |
| Subscription | `sub-` | `sub-prod-webshop` |
| Resource group | `rg-` | `rg-webshop-prod-eastus` |
| Policy definition | `pd-` | `pd-require-costcenter` |
| Policy assignment | `pa-` | `pa-require-tags-prod` |
| Policy initiative (set definition) | `psd-` | `psd-org-security-baseline` |
| Budget | `budget-` | `budget-prod-monthly` |

### Networking

| Resource Type | Abbreviation | Example |
|---|---|---|
| Virtual network | `vnet-` | `vnet-hub-prod-eastus` |
| Subnet | `snet-` | `snet-web-prod-eastus` |
| Network security group | `nsg-` | `nsg-web-prod-eastus` |
| Application security group | `asg-` | `asg-web-prod-eastus` |
| Public IP address | `pip-` | `pip-agw-prod-eastus-001` |
| Load balancer (internal) | `lbi-` | `lbi-web-prod-eastus` |
| Load balancer (external) | `lbe-` | `lbe-web-prod-eastus` |
| Application gateway | `agw-` | `agw-web-prod-eastus` |
| Front Door | `afd-` | `afd-web-prod` |
| Traffic Manager profile | `traf-` | `traf-web-prod` |
| Network interface | `nic-` | `nic-vm-web-prod-001` |
| Route table | `rt-` | `rt-spoke-prod-eastus` |
| User-defined route | `udr-` | `udr-default-eastus` |
| VPN gateway | `vpng-` | `vpng-hub-prod-eastus` |
| ExpressRoute circuit | `erc-` | `erc-hub-prod-eastus` |
| ExpressRoute gateway | `ergw-` | `ergw-hub-prod-eastus` |
| Azure Firewall | `afw-` | `afw-hub-prod-eastus` |
| Azure Firewall policy | `afwp-` | `afwp-hub-prod-eastus` |
| DNS zone (public) | `dnsz-` | `dnsz-contoso-com` |
| Private DNS zone | `pdnsz-` | `pdnsz-privatelink-database` |
| Private endpoint | `pep-` | `pep-sql-prod-eastus` |
| Private link service | `pls-` | `pls-api-prod-eastus` |
| Virtual WAN | `vwan-` | `vwan-hub-prod` |
| Virtual WAN hub | `vhub-` | `vhub-prod-eastus` |
| NAT gateway | `ng-` | `ng-prod-eastus` |
| Bastion host | `bas-` | `bas-hub-prod-eastus` |
| DDoS protection plan | `ddos-` | `ddos-prod` |
| CDN profile | `cdnp-` | `cdnp-web-prod` |
| CDN endpoint | `cdne-` | `cdne-web-prod` |
| IP group | `ipg-` | `ipg-trusted-prod` |
| Network watcher | `nw-` | `nw-prod-eastus` |
| Web Application Firewall policy | `wafp-` | `wafp-agw-prod-eastus` |

### Compute

| Resource Type | Abbreviation | Example |
|---|---|---|
| Virtual machine | `vm-` | `vm-web-prod-001` |
| Virtual machine scale set | `vmss-` | `vmss-web-prod-eastus` |
| Availability set | `avail-` | `avail-web-prod-eastus` |
| Managed disk (OS) | `osdisk-` | `osdisk-vm-web-prod-001` |
| Managed disk (data) | `disk-` | `disk-vm-web-prod-001-data01` |
| Proximity placement group | `ppg-` | `ppg-web-prod-eastus` |
| VM image | `img-` | `img-web-2026q1` |
| Snapshot | `snap-` | `snap-vm-web-prod-001` |
| Azure Batch account | `ba-` | `ba-render-prod-eastus` |

### Containers

| Resource Type | Abbreviation | Example |
|---|---|---|
| AKS cluster | `aks-` | `aks-platform-prod-eastus` |
| Container registry | `cr` | `crwebprodeastus` |
| Container instance | `ci-` | `ci-worker-prod-eastus-001` |
| Container app | `ca-` | `ca-api-prod-eastus` |
| Container app environment | `cae-` | `cae-prod-eastus` |

### Web

| Resource Type | Abbreviation | Example |
|---|---|---|
| App Service plan | `asp-` | `asp-web-prod-eastus` |
| App Service (web app) | `app-` | `app-webshop-prod-eastus` |
| Function app | `func-` | `func-orders-prod-eastus` |
| Static web app | `stapp-` | `stapp-docs-prod` |
| API Management | `apim-` | `apim-api-prod-eastus` |
| SignalR service | `sigr-` | `sigr-chat-prod-eastus` |

### Storage

| Resource Type | Abbreviation | Example |
|---|---|---|
| Storage account | `st` | `stwebprodeastus001` |
| Storage account (ADLS Gen2) | `st` | `stdlprodeastus001` |
| Azure Data Lake | `dls` | `dlsprodeastus001` |
| Azure Files share | `share-` | `share-app-prod` |
| Blob container | `blob-` | `blob-backups-prod` |

### Databases

| Resource Type | Abbreviation | Example |
|---|---|---|
| Azure SQL server | `sql-` | `sql-app-prod-eastus` |
| Azure SQL database | `sqldb-` | `sqldb-orders-prod-eastus` |
| Azure SQL elastic pool | `sqlep-` | `sqlep-shared-prod-eastus` |
| Cosmos DB account | `cosmos-` | `cosmos-app-prod-eastus` |
| Azure Cache for Redis | `redis-` | `redis-sessions-prod-eastus` |
| MySQL server | `mysql-` | `mysql-app-prod-eastus` |
| PostgreSQL server | `psql-` | `psql-app-prod-eastus` |
| SQL Managed Instance | `sqlmi-` | `sqlmi-app-prod-eastus` |

### Messaging

| Resource Type | Abbreviation | Example |
|---|---|---|
| Service Bus namespace | `sbns-` | `sbns-orders-prod-eastus` |
| Service Bus queue | `sbq-` | `sbq-order-processing` |
| Service Bus topic | `sbt-` | `sbt-notifications` |
| Event Hub namespace | `evhns-` | `evhns-telemetry-prod-eastus` |
| Event Hub | `evh-` | `evh-ingest-prod` |
| Event Grid topic | `evgt-` | `evgt-events-prod-eastus` |
| Event Grid subscription | `evgs-` | `evgs-handler-prod` |
| Notification Hub | `ntf-` | `ntf-push-prod-eastus` |

### Security

| Resource Type | Abbreviation | Example |
|---|---|---|
| Key vault | `kv-` | `kv-app-prod-eastus-001` |
| Managed identity (user-assigned) | `id-` | `id-app-prod-eastus` |
| Managed identity (system-assigned) | — | Implicit, no naming needed |

### Monitoring

| Resource Type | Abbreviation | Example |
|---|---|---|
| Log Analytics workspace | `log-` | `log-platform-prod-eastus` |
| Application Insights | `appi-` | `appi-web-prod-eastus` |
| Action group | `ag-` | `ag-critical-prod` |
| Alert rule | `ar-` | `ar-cpu-high-prod` |
| Data collection rule | `dcr-` | `dcr-vm-perf-prod` |
| Diagnostic setting | `diag-` | `diag-kv-prod-la` |
| Dashboard | `dash-` | `dash-platform-prod` |
| Automation account | `aa-` | `aa-ops-prod-eastus` |

### AI & Machine Learning

| Resource Type | Abbreviation | Example |
|---|---|---|
| Azure OpenAI | `oai-` | `oai-chat-prod-eastus` |
| Cognitive Services account | `cog-` | `cog-vision-prod-eastus` |
| Machine Learning workspace | `mlw-` | `mlw-forecast-prod-eastus` |
| Azure AI Search | `srch-` | `srch-catalog-prod-eastus` |

---

## Naming Constraints Reference

| Resource Type | Min Length | Max Length | Allowed Characters | Case Sensitive | Global Unique |
|---|---|---|---|---|---|
| Resource group | 1 | 90 | Alphanumeric, `_`, `-`, `.`, `()` | No | No (unique per subscription) |
| Storage account | 3 | 24 | Lowercase alphanumeric only | No | Yes (globally) |
| Key vault | 3 | 24 | Alphanumeric, `-`; start with letter, end with alphanumeric | No | Yes (globally) |
| Virtual machine (Linux) | 1 | 64 | Alphanumeric, `_`, `-` | Yes | No (unique per RG) |
| Virtual machine (Windows) | 1 | 15 | Alphanumeric, `-` | No | No (unique per RG) |
| Container registry | 5 | 50 | Alphanumeric only | No | Yes (globally) |
| AKS cluster | 1 | 63 | Alphanumeric, `_`, `-` | No | No (unique per RG) |
| App Service | 2 | 60 | Alphanumeric, `-` | No | Yes (globally, per domain) |
| Function app | 2 | 60 | Alphanumeric, `-` | No | Yes (globally, per domain) |
| SQL server | 1 | 63 | Lowercase alphanumeric, `-`; start/end with alphanumeric | No | Yes (globally) |
| Cosmos DB | 3 | 44 | Lowercase alphanumeric, `-`; start/end with alphanumeric | No | Yes (globally) |
| Virtual network | 2 | 64 | Alphanumeric, `_`, `-`, `.` | No | No (unique per RG) |
| Subnet | 1 | 80 | Alphanumeric, `_`, `-`, `.` | No | No (unique per VNet) |
| NSG | 1 | 80 | Alphanumeric, `_`, `-`, `.` | No | No (unique per RG) |
| Public IP | 1 | 80 | Alphanumeric, `_`, `-`, `.` | No | No (unique per RG) |
| Load balancer | 1 | 80 | Alphanumeric, `_`, `-`, `.` | No | No (unique per RG) |
| Management group | 1 | 90 | Alphanumeric, `_`, `-`, `.`, `()` | No | No (unique per tenant) |
| Log Analytics workspace | 4 | 63 | Alphanumeric, `-`; start with letter | No | Yes (globally) |

---

## Validation Script (Bash)

```bash
#!/bin/bash
# Validate Azure resource names against CAF naming conventions.
# Usage: ./validate-names.sh <resource-type> <name>

RESOURCE_TYPE="$1"
NAME="$2"

if [ -z "$RESOURCE_TYPE" ] || [ -z "$NAME" ]; then
  echo "Usage: $0 <resource-type> <name>"
  echo "Supported types: rg, vm, st, kv, vnet, nsg, aks, func, sql, cosmos, cr"
  exit 1
fi

validate() {
  local pattern="$1"
  local max_len="$2"
  local name="$3"
  local type_label="$4"

  if [ ${#name} -gt "$max_len" ]; then
    echo "FAIL: ${type_label} name '${name}' exceeds max length ${max_len} (actual: ${#name})"
    return 1
  fi

  if echo "$name" | grep -Pq "$pattern"; then
    echo "PASS: ${type_label} name '${name}' matches CAF convention"
    return 0
  else
    echo "FAIL: ${type_label} name '${name}' does not match pattern: ${pattern}"
    return 1
  fi
}

case "$RESOURCE_TYPE" in
  rg)
    validate '^rg-[a-z0-9]+-[a-z]+-[a-z]+[0-9]*$' 90 "$NAME" "Resource group"
    ;;
  vm)
    validate '^vm-[a-z0-9]+-[a-z]+-[0-9]+$' 64 "$NAME" "Virtual machine"
    ;;
  st)
    validate '^st[a-z0-9]{3,22}$' 24 "$NAME" "Storage account"
    ;;
  kv)
    validate '^kv-[a-z0-9]+-[a-z]+-[a-z]+[0-9]*(-[0-9]+)?$' 24 "$NAME" "Key vault"
    ;;
  vnet)
    validate '^vnet-[a-z0-9]+-[a-z]+-[a-z]+[0-9]*$' 64 "$NAME" "Virtual network"
    ;;
  nsg)
    validate '^nsg-[a-z0-9]+-[a-z]+-[a-z]+[0-9]*$' 80 "$NAME" "Network security group"
    ;;
  aks)
    validate '^aks-[a-z0-9]+-[a-z]+-[a-z]+[0-9]*$' 63 "$NAME" "AKS cluster"
    ;;
  func)
    validate '^func-[a-z0-9]+-[a-z]+-[a-z]+[0-9]*$' 60 "$NAME" "Function app"
    ;;
  sql)
    validate '^sql-[a-z0-9]+-[a-z]+-[a-z]+[0-9]*$' 63 "$NAME" "SQL server"
    ;;
  cosmos)
    validate '^cosmos-[a-z0-9]+-[a-z]+-[a-z]+[0-9]*$' 44 "$NAME" "Cosmos DB"
    ;;
  cr)
    validate '^cr[a-z0-9]{3,48}$' 50 "$NAME" "Container registry"
    ;;
  *)
    echo "Unknown resource type: $RESOURCE_TYPE"
    echo "Supported: rg, vm, st, kv, vnet, nsg, aks, func, sql, cosmos, cr"
    exit 1
    ;;
esac
```

---

## Resource Graph Naming Audit Query

```bash
# Find resources that do NOT follow CAF naming conventions
az graph query -q "
  Resources
  | extend prefix = extract('^([a-z]+)-', 1, name)
  | where type == 'microsoft.compute/virtualmachines' and not(name startswith 'vm-')
     or type == 'microsoft.network/virtualnetworks' and not(name startswith 'vnet-')
     or type == 'microsoft.network/networksecuritygroups' and not(name startswith 'nsg-')
     or type == 'microsoft.keyvault/vaults' and not(name startswith 'kv-')
     or type == 'microsoft.web/sites' and not(name startswith 'app-') and not(name startswith 'func-')
     or type == 'microsoft.containerservice/managedclusters' and not(name startswith 'aks-')
  | project name, type, resourceGroup, subscriptionId
  | order by type asc, name asc
" --first 200
```

---

## Common Anti-Patterns

| Anti-Pattern | Why It Is Problematic | Correction |
|---|---|---|
| No prefix | Cannot determine resource type from name | Use CAF prefix: `rg-`, `vnet-`, `vm-` |
| Uppercase characters | Inconsistent; some resources are case-insensitive | Use lowercase throughout |
| Spaces in names | Most Azure resources prohibit spaces | Use hyphens as delimiters |
| Meaningless names (`test1`, `foo`) | Impossible to identify purpose or owner | Include workload and environment |
| Missing environment segment | Cannot distinguish prod from dev | Always include `prod`, `dev`, `staging`, `sandbox` |
| Sequential numbering only (`vm-001`) | No context about workload or location | Include workload and environment before instance |
| Embedding secrets in names | Resource names are visible in logs and URLs | Never embed passwords, keys, or PII in names |
| Region as abbreviation (`eus` instead of `eastus`) | Inconsistent unless standardized | Pick one convention and document it |
| Exceeding max length | Resource creation fails silently or truncates | Validate against constraints table before deployment |
| Using underscores for resources that disallow them | Creation fails | Check the constraints table per resource type |

---

## Environment Abbreviations

| Full Name | Short Code | When to Use |
|---|---|---|
| Production | `prod` | Live workloads serving end users |
| Staging | `staging` | Pre-production validation and load testing |
| Development | `dev` | Active development and debugging |
| Test | `test` | Automated and manual testing |
| Sandbox | `sandbox` | Experimentation, no SLA |
| Shared | `shared` | Cross-environment shared services |
| DR | `dr` | Disaster recovery standby |

---

## Region Abbreviations

Use the official Azure region short names (as returned by `az account list-locations --query "[].name"`) for consistency. Common examples:

| Region | Short Name |
|---|---|
| East US | `eastus` |
| East US 2 | `eastus2` |
| West US | `westus` |
| West US 2 | `westus2` |
| West US 3 | `westus3` |
| Central US | `centralus` |
| North Europe | `northeurope` |
| West Europe | `westeurope` |
| UK South | `uksouth` |
| Australia East | `australiaeast` |
| Southeast Asia | `southeastasia` |
| Japan East | `japaneast` |
| Canada Central | `canadacentral` |
| Germany West Central | `germanywestcentral` |
| Switzerland North | `switzerlandnorth` |
