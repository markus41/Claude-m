---
name: azure-organization
description: >
  Deep expertise in Azure organizational hierarchy and governance — management groups, subscription
  management, resource group organization, resource tagging strategy, naming conventions (CAF),
  Azure Landing Zones, Resource Graph queries, RBAC at scale, cost management by organization,
  and tenant-level compliance and policy governance.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
triggers:
  - azure organization
  - management group
  - azure subscription management
  - resource group organization
  - azure tagging
  - naming convention
  - azure landing zone
  - tenant hierarchy
  - azure governance structure
  - subscription vending
  - resource tagging strategy
  - azure resource organization
---

# Azure Organization & Governance

## Shared Workflow Routing
- Use the shared workflow spec for deterministic multi-plugin routing: [`workflows/multi-plugin-workflows.md`](../../../workflows/multi-plugin-workflows.md).
- Apply the trigger phrases, handoff contracts, auth prerequisites, validation checkpoints, and stop conditions before escalating to the next plugin.

This skill provides comprehensive knowledge for designing, assessing, and governing the Azure organizational hierarchy — from the tenant root through management groups, subscriptions, resource groups, and individual resources — using Azure CLI, ARM REST API, Azure Resource Graph, and Infrastructure as Code.

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../../../docs/integration-context.md)

| Workflow | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Management group CRUD, hierarchy | required | — | `AzureCloud`\* | `delegated-user` or `service-principal` | `Management Group Contributor`, `Reader` |
| Subscription management | required | required | `AzureCloud`\* | `delegated-user` or `service-principal` | `Owner` or `Contributor` on subscription |
| Resource group operations | required | required | `AzureCloud`\* | `delegated-user` or `service-principal` | `Contributor` or `Reader` |
| Tag operations | required | required | `AzureCloud`\* | `delegated-user` or `service-principal` | `Tag Contributor` or `Contributor` |
| Resource Graph queries | required | — | `AzureCloud`\* | `delegated-user` or `service-principal` | `Reader` on target scopes |

\* Use sovereign cloud values from the canonical contract when applicable.

Fail fast before API calls when required context is missing or invalid. Redact tenant/subscription/object IDs in outputs.

---

## 1. Overview — Azure Organizational Hierarchy

Azure uses a four-level hierarchy for organizing resources and applying governance:

```
Tenant Root Group
  └── Management Group (up to 6 levels deep)
        └── Subscription
              └── Resource Group
                    └── Resource
```

### Why Organization Matters

| Concern | How Hierarchy Addresses It |
|---|---|
| **RBAC inheritance** | Roles assigned at a management group flow down to all child subscriptions, resource groups, and resources |
| **Policy inheritance** | Azure Policy assignments at management group scope apply to every child resource |
| **Cost allocation** | Subscriptions and tags enable precise cost attribution to business units |
| **Blast-radius containment** | Subscription boundaries limit the impact of misconfiguration or breach |
| **Compliance reporting** | Management group scope enables cross-subscription compliance dashboards |

### Cloud Adoption Framework (CAF) Alignment

The Microsoft Cloud Adoption Framework prescribes:
1. A well-defined management group hierarchy reflecting organizational structure
2. Subscription democratization — one subscription per workload or environment
3. Consistent naming conventions using CAF abbreviation tables
4. Mandatory tagging strategy enforced via Azure Policy
5. Azure Landing Zone architecture for platform and application workloads

---

## 2. Management Groups

Management groups are containers above subscriptions that enable governance at scale.

### Hierarchy Rules and Limits

| Constraint | Limit |
|---|---|
| Maximum hierarchy depth | 6 levels (excluding root and subscription level) |
| Management groups per directory | 10,000 |
| Subscriptions per management group | Unlimited |
| Parent management groups per group | Exactly 1 |
| Root management group | Auto-created, cannot be deleted or moved |

### Creating Management Groups

```bash
# Create a management group
az account management-group create \
  --name "mg-platform" \
  --display-name "Platform" \
  --parent-id "/providers/Microsoft.Management/managementGroups/mg-contoso"

# Create nested hierarchy
az account management-group create --name "mg-identity" --display-name "Identity" \
  --parent-id "/providers/Microsoft.Management/managementGroups/mg-platform"
az account management-group create --name "mg-connectivity" --display-name "Connectivity" \
  --parent-id "/providers/Microsoft.Management/managementGroups/mg-platform"
az account management-group create --name "mg-management" --display-name "Management" \
  --parent-id "/providers/Microsoft.Management/managementGroups/mg-platform"
```

### Listing and Visualizing Hierarchy

```bash
# List all management groups
az account management-group list -o table

# Show hierarchy tree for a specific group
az account management-group show \
  --name "mg-contoso" \
  --expand children \
  --recurse \
  -o json

# List subscriptions under a management group
az account management-group subscription show-sub-under-mg \
  --name "mg-workloads"
```

### Moving Subscriptions

```bash
# Move subscription to a management group
az account management-group subscription add \
  --name "mg-production" \
  --subscription "00000000-0000-0000-0000-000000000000"

# Remove subscription from management group (moves to root)
az account management-group subscription remove \
  --name "mg-production" \
  --subscription "00000000-0000-0000-0000-000000000000"
```

### RBAC Inheritance

Roles assigned at a management group scope propagate to all child management groups, subscriptions, resource groups, and resources.

```bash
# Assign Reader at management group scope
az role assignment create \
  --assignee "sg-cloud-readers@contoso.com" \
  --role "Reader" \
  --scope "/providers/Microsoft.Management/managementGroups/mg-contoso"

# Assign custom role at management group scope
az role assignment create \
  --assignee "sg-platform-ops@contoso.com" \
  --role "Platform Operator" \
  --scope "/providers/Microsoft.Management/managementGroups/mg-platform"
```

### Policy Inheritance

Policy assignments at management group scope apply to every resource in the hierarchy.

```bash
# Assign policy initiative at management group scope
az policy assignment create \
  --name "org-security-baseline" \
  --display-name "Organization Security Baseline" \
  --policy-set-definition "1f3afdf9-d0c9-4c3d-847f-89da613e70a8" \
  --scope "/providers/Microsoft.Management/managementGroups/mg-contoso" \
  --enforcement-mode Default
```

### Root Management Group

- Automatically created for every Azure AD tenant
- Cannot be deleted, moved, or renamed (display name can be changed)
- All new management groups and subscriptions default to root
- Requires `Elevated Access` toggle for Global Admin to manage

```bash
# Elevate access for Global Admin to manage root group
# (Portal: Azure Active Directory → Properties → Access management for Azure resources → Yes)

# Update root management group display name
az account management-group update \
  --name "<tenant-id>" \
  --display-name "Contoso Root"
```

---

## 3. Subscription Management

Subscriptions are the primary billing and access-control boundary in Azure.

### Subscription Types

| Type | Use Case | Billing Model |
|---|---|---|
| Enterprise Agreement (EA) | Large organizations with committed spend | Prepaid credits + overage |
| Microsoft Customer Agreement (MCA) | Direct or partner-managed billing | Invoice with billing profiles |
| Cloud Solution Provider (CSP) | Partner-managed tenants | Partner invoices customer |
| Pay-As-You-Go (PAYG) | Dev/test, small workloads | Credit card or invoice |
| Visual Studio / MSDN | Individual dev/test | Monthly credit |
| Free Trial | Evaluation | $200 credit for 30 days |

### Subscription Limits

| Resource | Limit |
|---|---|
| Resource groups per subscription | 980 |
| Deployments per resource group | 800 |
| Resources per resource group | 800 (varies by type) |
| Tags per resource or resource group | 50 |
| Tag name length | 512 characters |
| Tag value length | 256 characters |
| Role assignments per subscription | 4,000 |
| Policy assignments per subscription | 200 |

### Subscription Organization Patterns

| Pattern | When to Use |
|---|---|
| **By environment** | `sub-prod`, `sub-staging`, `sub-dev` — clear environment isolation |
| **By workload** | `sub-erp`, `sub-web-platform` — workload-level blast-radius control |
| **By team** | `sub-team-alpha`, `sub-team-beta` — team autonomy with guardrails |
| **By region** | `sub-eu`, `sub-us` — data residency and compliance |
| **Hybrid** | `sub-prod-erp-eu` — combining multiple dimensions |

### Subscription Vending (Automation)

Subscription vending automates new subscription creation with consistent configuration.

```bash
# List current subscriptions
az account list -o table

# Create subscription via EA enrollment (requires EA API)
# Typically done via ARM template, Bicep, or Terraform

# Set subscription-level tags
az tag create --resource-id "/subscriptions/00000000-0000-0000-0000-000000000000" \
  --tags Environment=Production CostCenter=CC-1234 Owner=platform-team

# Assign subscription to management group
az account management-group subscription add \
  --name "mg-production" \
  --subscription "00000000-0000-0000-0000-000000000000"
```

### Transferring Subscriptions

```bash
# Transfer subscription between management groups
az account management-group subscription add \
  --name "mg-target" \
  --subscription "00000000-0000-0000-0000-000000000000"

# Change subscription offer type (portal only for most types)
# Transfer billing ownership (requires billing admin)
```

---

## 4. Resource Group Strategy

Resource groups are logical containers that share a common lifecycle, permissions, and cost allocation boundary.

### Grouping Patterns

| Pattern | Example | Best For |
|---|---|---|
| **By lifecycle** | `rg-app-frontend`, `rg-app-backend` | Resources deployed and deleted together |
| **By workload** | `rg-erp-production`, `rg-website-prod` | All resources for a single workload |
| **By environment** | `rg-dev-shared`, `rg-prod-shared` | Shared services within an environment |
| **By resource type** | `rg-networking`, `rg-storage` | Centrally managed infrastructure |
| **By team** | `rg-team-alpha-sandbox` | Team-owned experimental resources |

### Resource Group Operations

```bash
# Create resource group
az group create --name "rg-app-prod-eastus" --location "eastus" \
  --tags Environment=Production CostCenter=CC-1234 Owner=app-team Project=WebApp

# List resource groups
az group list -o table

# List resource groups with specific tag
az group list --tag Environment=Production -o table

# Show resource group details
az group show --name "rg-app-prod-eastus"

# Delete resource group (and ALL contained resources)
az group delete --name "rg-app-dev-eastus" --yes --no-wait

# Export resource group as ARM template
az group export --name "rg-app-prod-eastus" > template.json
```

### Resource Group Locks

```bash
# Add CanNotDelete lock
az lock create --name "protect-production" \
  --resource-group "rg-app-prod-eastus" \
  --lock-type CanNotDelete \
  --notes "Production workload — requires approval to delete"

# Add ReadOnly lock
az lock create --name "freeze-config" \
  --resource-group "rg-app-prod-eastus" \
  --lock-type ReadOnly \
  --notes "Configuration freeze during release window"

# List locks
az lock list --resource-group "rg-app-prod-eastus" -o table

# Delete lock
az lock delete --name "freeze-config" --resource-group "rg-app-prod-eastus"
```

### Moving Resources Between Groups

```bash
# Move resources to another resource group
az resource move \
  --destination-group "rg-app-prod-eastus-v2" \
  --ids "/subscriptions/{id}/resourceGroups/rg-old/providers/Microsoft.Compute/virtualMachines/vm-001" \
        "/subscriptions/{id}/resourceGroups/rg-old/providers/Microsoft.Network/networkInterfaces/vm-001-nic"

# Validate move before executing
az resource move \
  --destination-group "rg-app-prod-eastus-v2" \
  --ids "/subscriptions/{id}/resourceGroups/rg-old/providers/Microsoft.Compute/virtualMachines/vm-001" \
  --validate-only
```

**Move limitations**: Not all resource types support move. Check `az provider operation show` or the [Move operation support matrix](https://learn.microsoft.com/azure/azure-resource-manager/management/move-support-resources) before attempting.

---

## 5. Tagging Strategy

Tags are key-value metadata pairs applied to resources and resource groups for cost allocation, automation, governance, and operations.

### Common Tag Schema

| Tag Name | Purpose | Example Values | Required |
|---|---|---|---|
| `Environment` | Deployment stage | `Production`, `Staging`, `Development`, `Sandbox` | Yes |
| `Owner` | Responsible team or individual | `platform-team`, `john.doe@contoso.com` | Yes |
| `CostCenter` | Financial allocation code | `CC-1234`, `IT-Operations` | Yes |
| `Project` | Project or initiative name | `WebApp`, `ERP-Migration`, `DataPlatform` | Yes |
| `Compliance` | Regulatory framework | `HIPAA`, `PCI-DSS`, `SOC2`, `None` | Conditional |
| `DataClassification` | Data sensitivity | `Public`, `Internal`, `Confidential`, `Restricted` | Conditional |
| `CreatedBy` | Automation or deployer identity | `terraform`, `bicep-pipeline`, `manual` | Recommended |
| `CreatedDate` | Resource creation timestamp | `2026-03-01` | Recommended |
| `ExpirationDate` | Planned decommission date | `2026-12-31` | Recommended |
| `ApplicationId` | CMDB application identifier | `APP-0042` | Recommended |

### Tag Operations

```bash
# Apply tags to a resource group
az tag create --resource-id "/subscriptions/{id}/resourceGroups/rg-app-prod" \
  --tags Environment=Production CostCenter=CC-1234 Owner=app-team Project=WebApp

# Update tags (merge with existing)
az tag update --resource-id "/subscriptions/{id}/resourceGroups/rg-app-prod" \
  --operation merge \
  --tags Compliance=SOC2 DataClassification=Confidential

# Replace all tags
az tag update --resource-id "/subscriptions/{id}/resourceGroups/rg-app-prod" \
  --operation replace \
  --tags Environment=Production CostCenter=CC-1234 Owner=app-team

# Delete all tags
az tag delete --resource-id "/subscriptions/{id}/resourceGroups/rg-app-prod" --yes

# Apply tags to individual resource
az tag create --resource-id "/subscriptions/{id}/resourceGroups/rg-app-prod/providers/Microsoft.Compute/virtualMachines/vm-001" \
  --tags Environment=Production CostCenter=CC-1234

# List all tags in a subscription
az tag list -o table
```

### Tag Inheritance

Tags do NOT automatically inherit from resource groups to resources. Use Azure Policy to enforce tag inheritance.

```bash
# Assign built-in policy: Inherit a tag from the resource group if missing
az policy assignment create \
  --name "inherit-env-tag" \
  --display-name "Inherit Environment tag from resource group" \
  --policy "cd3aa116-8754-49c9-a813-ad46512ece54" \
  --scope "/subscriptions/{id}" \
  --params '{"tagName":{"value":"Environment"}}' \
  --mi-system-assigned \
  --location "eastus" \
  --enforcement-mode Default
```

### Policy Enforcement for Tags

```bash
# Require tag on resource groups (Deny effect)
az policy assignment create \
  --name "require-costcenter-rg" \
  --display-name "Require CostCenter tag on resource groups" \
  --policy "96670d01-0a4d-4649-9c89-2d3abc0a5025" \
  --scope "/providers/Microsoft.Management/managementGroups/mg-contoso" \
  --params '{"tagName":{"value":"CostCenter"}}' \
  --enforcement-mode Default

# Require tag on resources (Deny effect)
az policy assignment create \
  --name "require-env-resources" \
  --display-name "Require Environment tag on resources" \
  --policy "871b6d14-10aa-478d-b466-ef06f0e20513" \
  --scope "/providers/Microsoft.Management/managementGroups/mg-contoso" \
  --params '{"tagName":{"value":"Environment"}}' \
  --enforcement-mode Default

# Add or replace tag via Modify effect
az policy assignment create \
  --name "add-createdby-tag" \
  --display-name "Add CreatedBy tag with default value" \
  --policy "4f9dc7db-30c1-420c-b61a-e1d640128d26" \
  --scope "/subscriptions/{id}" \
  --params '{"tagName":{"value":"CreatedBy"},"tagValue":{"value":"unknown"}}' \
  --mi-system-assigned \
  --location "eastus" \
  --enforcement-mode Default
```

### Tag Governance Best Practices

1. **Define required tags** — Enforce via Deny policy at management group scope
2. **Use consistent casing** — `CostCenter` not `costcenter` or `cost_center`
3. **Validate tag values** — Use Azure Policy `allowedValues` for controlled vocabularies
4. **Inherit from resource groups** — Use Modify policy for tag inheritance
5. **Audit before enforcing** — Deploy with `DoNotEnforce` mode first, review compliance, then switch to `Default`
6. **Limit tag count** — Maximum 50 tags per resource; keep schemas lean

---

## 6. Naming Conventions

Consistent naming enables resource identification, searching, cost allocation, and automation.

### CAF Naming Pattern

```
{resource-type-prefix}-{workload/app}-{environment}-{region}-{instance}
```

Examples:
- `rg-webshop-prod-eastus` — resource group
- `vnet-hub-prod-eastus` — virtual network
- `pip-agw-prod-eastus-001` — public IP
- `nsg-web-prod-eastus` — network security group
- `kv-app-prod-eastus-001` — key vault
- `st-app-prod-eastus-001` — storage account (no hyphens allowed)

### CAF Abbreviation Table (Core Resource Types)

| Resource Type | Abbreviation | Naming Example |
|---|---|---|
| Resource group | `rg-` | `rg-webshop-prod-eastus` |
| Virtual network | `vnet-` | `vnet-hub-prod-eastus` |
| Subnet | `snet-` | `snet-web-prod-eastus` |
| Network security group | `nsg-` | `nsg-web-prod-eastus` |
| Public IP address | `pip-` | `pip-agw-prod-eastus-001` |
| Load balancer | `lb-` | `lb-web-prod-eastus` |
| Application gateway | `agw-` | `agw-web-prod-eastus` |
| Virtual machine | `vm-` | `vm-web-prod-001` |
| Virtual machine scale set | `vmss-` | `vmss-web-prod-eastus` |
| Storage account | `st` | `stwebprodeastus001` |
| Key vault | `kv-` | `kv-app-prod-eastus-001` |
| App Service plan | `asp-` | `asp-web-prod-eastus` |
| App Service (web app) | `app-` | `app-webshop-prod-eastus` |
| Function app | `func-` | `func-orders-prod-eastus` |
| SQL server | `sql-` | `sql-app-prod-eastus` |
| SQL database | `sqldb-` | `sqldb-orders-prod-eastus` |
| Cosmos DB account | `cosmos-` | `cosmos-app-prod-eastus` |
| Log Analytics workspace | `log-` | `log-platform-prod-eastus` |
| Application Insights | `appi-` | `appi-web-prod-eastus` |
| Container registry | `cr` | `crwebprodeastus` |
| AKS cluster | `aks-` | `aks-platform-prod-eastus` |
| Front Door | `afd-` | `afd-web-prod` |
| API Management | `apim-` | `apim-api-prod-eastus` |
| Service Bus namespace | `sbns-` | `sbns-orders-prod-eastus` |
| Event Hub namespace | `evhns-` | `evhns-telemetry-prod-eastus` |
| Managed identity | `id-` | `id-app-prod-eastus` |
| Private endpoint | `pep-` | `pep-sql-prod-eastus` |
| Private DNS zone | `pdnsz-` | `pdnsz-privatelink-database` |
| Network interface | `nic-` | `nic-vm-web-prod-001` |
| Disk | `osdisk-` / `disk-` | `osdisk-vm-web-prod-001` |
| Availability set | `avail-` | `avail-web-prod-eastus` |
| Route table | `rt-` | `rt-spoke-prod-eastus` |
| Management group | `mg-` | `mg-platform`, `mg-workloads` |
| Subscription | `sub-` | `sub-prod-webshop`, `sub-dev-shared` |
| Budget | `budget-` | `budget-prod-monthly` |
| Policy assignment | `pa-` | `pa-require-tags-prod` |
| Policy definition | `pd-` | `pd-require-costcenter` |
| Policy initiative | `psd-` | `psd-org-security-baseline` |

### Naming Constraints by Resource Type

| Resource Type | Max Length | Allowed Characters | Hyphens |
|---|---|---|---|
| Resource group | 90 | Alphanumeric, hyphens, underscores, periods, parentheses | Yes |
| Storage account | 24 | Lowercase alphanumeric only | No |
| Key vault | 24 | Alphanumeric and hyphens, start with letter | Yes |
| Virtual machine | 64 (Linux) / 15 (Windows) | Alphanumeric and hyphens | Yes |
| Container registry | 50 | Alphanumeric only | No |
| App Service | 60 | Alphanumeric and hyphens | Yes |
| SQL server | 63 | Lowercase alphanumeric and hyphens, start/end with alphanumeric | Yes |
| AKS cluster | 63 | Alphanumeric, hyphens, underscores | Yes |
| Management group | 90 | Alphanumeric, hyphens, underscores, periods, parentheses | Yes |

### Validation Regex Patterns

```bash
# Resource group: rg-{workload}-{env}-{region}
^rg-[a-z0-9]+-[a-z]+-[a-z]+[0-9]*$

# Storage account: st{workload}{env}{region}{instance} (no hyphens, lowercase)
^st[a-z0-9]{3,22}$

# Key vault: kv-{workload}-{env}-{region}-{instance}
^kv-[a-z0-9]+-[a-z]+-[a-z]+[0-9]*(-[0-9]+)?$

# Virtual machine: vm-{workload}-{env}-{instance}
^vm-[a-z0-9]+-[a-z]+-[0-9]+$

# Virtual network: vnet-{workload}-{env}-{region}
^vnet-[a-z0-9]+-[a-z]+-[a-z]+[0-9]*$

# Network security group: nsg-{workload}-{env}-{region}
^nsg-[a-z0-9]+-[a-z]+-[a-z]+[0-9]*$
```

### Common Naming Anti-Patterns

| Anti-Pattern | Problem | Correction |
|---|---|---|
| `MyResourceGroup1` | No prefix, no environment, not descriptive | `rg-app-prod-eastus` |
| `test-vm` | No environment prefix, no instance number | `vm-app-dev-001` |
| `Storage123` | Meaningless name, uppercase | `stappdeveastus001` |
| `rg-prod` | Too generic, no workload identifier | `rg-erp-prod-eastus` |
| `vnet1` | No prefix convention, no context | `vnet-hub-prod-eastus` |

---

## 7. Azure Landing Zones

Azure Landing Zones provide a prescriptive architecture for organizing subscriptions, networking, identity, and governance.

### Conceptual Architecture

```
Tenant Root Group
├── mg-platform
│   ├── mg-identity          (Entra ID, Domain Services)
│   ├── mg-connectivity      (Hub networking, DNS, Firewall)
│   └── mg-management        (Log Analytics, Automation, Monitoring)
├── mg-landing-zones
│   ├── mg-corp              (Corporate connected workloads)
│   ├── mg-online            (Internet-facing workloads)
│   └── mg-sap              (SAP workloads — optional)
├── mg-sandbox               (Dev/test, no connectivity)
├── mg-decommissioned        (Retired subscriptions)
└── mg-connectivity-canary   (Network changes testing — optional)
```

### Platform vs Application Landing Zones

| Aspect | Platform Landing Zone | Application Landing Zone |
|---|---|---|
| **Purpose** | Shared infrastructure (networking, identity, management) | Individual workloads and applications |
| **Managed by** | Platform/cloud team | Application/workload teams |
| **Subscriptions** | `sub-identity`, `sub-connectivity`, `sub-management` | `sub-app-prod`, `sub-app-dev` |
| **RBAC** | Platform team has Owner | App team has Contributor, platform team has Reader |
| **Policy** | Strict guardrails, no exemptions | Guardrails with workload-specific exemptions |
| **Connectivity** | Hub VNet, Azure Firewall, ExpressRoute/VPN | Spoke VNet peered to hub |

### Connectivity Patterns

| Pattern | When to Use | Components |
|---|---|---|
| **Hub-spoke** | Most organizations, moderate complexity | Hub VNet + Azure Firewall + spokes peered to hub |
| **Virtual WAN** | Large-scale, many branches, global reach | Azure Virtual WAN hub + automated routing |
| **Mesh** | Peer-to-peer traffic between spokes | VNet peering between all spoke VNets |
| **No connectivity** | Sandbox/isolated workloads | Standalone VNets, no peering |

### Deploying Landing Zones

```bash
# ALZ Bicep accelerator — clone the repo
git clone https://github.com/Azure/ALZ-Bicep.git
cd ALZ-Bicep

# Deploy management group hierarchy
az deployment tenant create \
  --template-file infra-as-code/bicep/modules/managementGroups/managementGroups.bicep \
  --parameters parTopLevelManagementGroupPrefix="alz" \
  --location "eastus"

# Deploy custom policy definitions
az deployment mg create \
  --management-group-id "alz" \
  --template-file infra-as-code/bicep/modules/policy/definitions/customPolicyDefinitions.bicep \
  --location "eastus"

# Deploy policy assignments (default)
az deployment mg create \
  --management-group-id "alz" \
  --template-file infra-as-code/bicep/modules/policy/assignments/policyAssignmentManagementGroup.bicep \
  --location "eastus"
```

### Terraform ALZ Module

```hcl
module "enterprise_scale" {
  source  = "Azure/caf-enterprise-scale/azurerm"
  version = "~> 5.0"

  default_location = "eastus"

  providers = {
    azurerm              = azurerm
    azurerm.connectivity = azurerm.connectivity
    azurerm.management   = azurerm.management
  }

  root_parent_id = data.azurerm_client_config.core.tenant_id
  root_id        = "contoso"
  root_name      = "Contoso"

  deploy_connectivity_resources = true
  deploy_identity_resources     = true
  deploy_management_resources   = true
}
```

---

## 8. Resource Graph Queries

Azure Resource Graph enables cross-subscription resource queries with near-instant results. Use `az graph query -q "<KQL>"` for all queries.

### Key Queries

```bash
# Count all resources by type
az graph query -q "
  Resources | summarize count() by type | order by count_ desc | take 20
" --first 20

# Tag compliance percentage by subscription
az graph query -q "
  Resources
  | extend hasAllTags = isnotempty(tags['Environment']) and isnotempty(tags['Owner']) and isnotempty(tags['CostCenter'])
  | summarize total=count(), compliant=countif(hasAllTags) by subscriptionId
  | extend compliancePct = round(100.0 * compliant / total, 1)
  | order by compliancePct asc
"

# Orphaned resources (unattached disks, unused PIPs, unattached NICs)
az graph query -q "
  Resources
  | where (type == 'microsoft.compute/disks' and properties.diskState == 'Unattached')
     or (type == 'microsoft.network/publicipaddresses' and isempty(properties.ipConfiguration))
     or (type == 'microsoft.network/networkinterfaces' and isempty(properties.virtualMachine))
  | project name, type, resourceGroup, subscriptionId, location
"

# Empty resource groups
az graph query -q "
  ResourceContainers
  | where type == 'microsoft.resources/subscriptions/resourcegroups'
  | project resourceGroup, subscriptionId
  | join kind=leftanti (Resources | project resourceGroup, subscriptionId) on resourceGroup, subscriptionId
"

# Cross-subscription inventory
az graph query -q "
  Resources | summarize resourceCount=count() by subscriptionId
  | join kind=inner (ResourceContainers | where type == 'microsoft.resources/subscriptions' | project subscriptionId, subscriptionName=name) on subscriptionId
  | project subscriptionName, subscriptionId, resourceCount | order by resourceCount desc
" --management-groups "mg-contoso"
```

See `commands/org-inventory.md` and `commands/org-tag-audit.md` for full query sets.

---

## 9. RBAC at Scale

```bash
# Assign role at management group scope (inherits to all children)
az role assignment create \
  --assignee "sg-security-readers@contoso.com" \
  --role "Reader" \
  --scope "/providers/Microsoft.Management/managementGroups/mg-contoso"

# List role assignments at management group scope
az role assignment list \
  --scope "/providers/Microsoft.Management/managementGroups/mg-contoso" \
  -o table
```

### RBAC Best Practices at Scale

| Practice | Rationale |
|---|---|
| Never assign Owner at root management group | Prevents accidental tenant-wide changes |
| Use groups, not individual users | Simplifies management and auditing |
| Assign at highest necessary scope | Reduces assignment sprawl |
| Prefer built-in roles | Custom roles add maintenance overhead |
| Require PIM for privileged roles | Just-in-time reduces standing access risk |
| Audit assignments quarterly | Remove stale assignments |

See `references/management-groups.md` for custom role definitions and PIM integration.

---

## 10. Cost Management by Organization

```bash
# Query costs by CostCenter tag
az cost query --type "ActualCost" \
  --timeframe "MonthToDate" \
  --dataset-grouping name="TagKey:CostCenter" type="TagKey"

# Create monthly budget with notifications
az consumption budget create \
  --budget-name "budget-prod-monthly" \
  --amount 10000 \
  --time-grain "Monthly" \
  --start-date "2026-01-01" \
  --end-date "2026-12-31" \
  --category "Cost"

# Resource inventory by cost center
az graph query -q "
  Resources
  | extend costCenter = tostring(tags['CostCenter'])
  | summarize resourceCount=count() by costCenter, type
  | order by costCenter asc, resourceCount desc
"
```

For detailed cost governance, use the `azure-cost-governance` plugin.

---

## 11. Compliance & Policy at Organization Scale

```bash
# List policy assignments at management group scope
az policy assignment list \
  --scope "/providers/Microsoft.Management/managementGroups/mg-contoso" -o table

# Assign initiative at management group scope
az policy assignment create \
  --name "org-tagging-initiative" \
  --display-name "Organization Tagging Initiative" \
  --policy-set-definition "/providers/Microsoft.Management/managementGroups/mg-contoso/providers/Microsoft.Authorization/policySetDefinitions/org-tags" \
  --scope "/providers/Microsoft.Management/managementGroups/mg-contoso" \
  --enforcement-mode Default

# Compliance summary
az policy state summarize --management-group "mg-contoso"
```

### Key Initiatives for Organization-Wide Governance

| Initiative | Purpose | Scope |
|---|---|---|
| Microsoft Cloud Security Benchmark | Security posture baseline | Root management group |
| Require tags on resource groups | Cost allocation | Root management group |
| Allowed locations | Data residency | Root management group |
| Allowed VM SKUs | Cost control | Landing zones management group |
| Require diagnostics settings | Observability | Root management group |
| Deny public IP creation | Network security | Corp landing zone |

For detailed policy management, use the `azure-policy-security` plugin.

---

## Decision Tree

1. Need to set up or verify organizational hierarchy, scope, and access? -> `org-setup`
2. Need a full inventory of subscriptions, resource groups, and resources? -> `org-inventory`
3. Need to audit tags for compliance with the tagging strategy? -> `org-tag-audit`
4. Need to validate resource names against CAF naming conventions? -> `org-naming-check`
5. Need to deploy or assess an Azure Landing Zone? -> `org-landing-zone`
6. Full organizational review? Run: `org-setup` -> `org-inventory` -> `org-tag-audit` / `org-naming-check` -> `org-landing-zone`

## Required Permissions Summary

| Task | Minimum Role |
|---|---|
| Read management group hierarchy | Reader |
| Create/update management groups | Management Group Contributor |
| Move subscriptions between groups | Management Group Contributor + Contributor on subscription |
| Read resource groups and resources | Reader |
| Create/update resource groups | Contributor |
| Apply/modify tags | Tag Contributor or Contributor |
| Run Resource Graph queries | Reader on target scopes |
| Read policy assignments/compliance | Reader or Policy Insights Data Reader |
| Create policy assignments | Resource Policy Contributor |
| Create custom role definitions | User Access Administrator |

## Error Handling

| Status Code | Meaning | Common Cause |
|---|---|---|
| 400 Bad Request | Malformed request | Invalid management group name, bad tag format, invalid query |
| 403 Forbidden | Insufficient permissions | Missing RBAC role for management group or policy operations |
| 404 Not Found | Resource not found | Wrong management group name, subscription ID, or resource group name |
| 409 Conflict | Resource conflict | Management group name collision, concurrent modification |
| 429 Too Many Requests | API throttling | Reduce request rate, implement exponential backoff |

## Minimal References

- `azure-organization/commands/org-setup.md`
- `azure-organization/commands/org-inventory.md`
- `azure-organization/commands/org-tag-audit.md`
- `azure-organization/commands/org-naming-check.md`
- `azure-organization/commands/org-landing-zone.md`
- `azure-organization/README.md`

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| Full management group CLI commands, hierarchy visualization, subscription moves, RBAC inheritance rules, limits | [`references/management-groups.md`](./references/management-groups.md) |
| Complete CAF abbreviation table (50+ resource types), naming pattern templates, validation script, common anti-patterns | [`references/naming-conventions.md`](./references/naming-conventions.md) |
| Azure Landing Zone architecture diagrams, ALZ Bicep modules, connectivity patterns, identity patterns, management patterns | [`references/landing-zones.md`](./references/landing-zones.md) |
