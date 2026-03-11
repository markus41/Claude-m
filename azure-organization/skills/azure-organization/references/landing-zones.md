# Azure Landing Zones — Reference

## Overview

Azure Landing Zones (ALZ) provide a prescriptive, well-architected reference implementation for organizing Azure resources at enterprise scale. A landing zone is a pre-provisioned subscription with networking, identity, governance, and security configurations that enable workload teams to deploy immediately within guardrails. The architecture separates platform responsibilities (networking, identity, management) from application workloads and uses management groups, RBAC, and Azure Policy to enforce governance at scale.

---

## Conceptual Architecture (Text Diagram)

```
Tenant Root Group
│
├── mg-platform
│   ├── mg-identity
│   │   └── sub-identity-prod
│   │       ├── Entra ID Domain Services
│   │       └── Identity infrastructure
│   │
│   ├── mg-connectivity
│   │   └── sub-connectivity-prod
│   │       ├── Hub VNet (or Virtual WAN)
│   │       ├── Azure Firewall
│   │       ├── ExpressRoute / VPN Gateway
│   │       ├── Azure DNS (Private + Public)
│   │       └── DDoS Protection Plan
│   │
│   └── mg-management
│       └── sub-management-prod
│           ├── Log Analytics workspace
│           ├── Automation Account
│           ├── Azure Monitor
│           └── Microsoft Defender for Cloud
│
├── mg-landing-zones
│   ├── mg-corp (corporate connected workloads)
│   │   ├── sub-erp-prod
│   │   ├── sub-erp-dev
│   │   ├── sub-hr-prod
│   │   └── sub-hr-dev
│   │
│   ├── mg-online (internet-facing workloads)
│   │   ├── sub-webshop-prod
│   │   ├── sub-webshop-dev
│   │   └── sub-marketing-prod
│   │
│   └── mg-sap (optional, SAP-specific)
│       ├── sub-sap-prod
│       └── sub-sap-nonprod
│
├── mg-sandbox (experimentation, no peering)
│   ├── sub-sandbox-team-alpha
│   └── sub-sandbox-team-beta
│
└── mg-decommissioned (retired subscriptions)
    └── sub-old-project
```

---

## ALZ Design Areas

| Design Area | Responsibility | Key Decisions |
|---|---|---|
| **Billing and Azure AD tenant** | Tenant structure, billing hierarchy | Single vs multi-tenant, EA vs MCA enrollment |
| **Identity and access** | Authentication, authorization | Entra ID, PIM, RBAC inheritance model |
| **Resource organization** | Management groups, subscriptions, naming, tagging | Hierarchy depth, subscription vending model |
| **Network topology** | Connectivity model | Hub-spoke vs Virtual WAN, DNS strategy |
| **Security** | Threat protection, encryption | Defender for Cloud, Key Vault, NSG strategy |
| **Management** | Monitoring, patching, backup | Log Analytics, Azure Monitor, Update Management |
| **Governance** | Policy, compliance, cost | Azure Policy, budgets, tag enforcement |
| **Platform automation** | IaC, CI/CD, deployment | Bicep/Terraform, GitHub Actions/Azure DevOps |

---

## Connectivity Patterns

### Hub-Spoke

```
                   ┌──────────────────────┐
                   │   Hub VNet            │
                   │   (sub-connectivity)  │
                   │                       │
                   │  ┌─────────────────┐  │
                   │  │ Azure Firewall  │  │
                   │  └─────────────────┘  │
                   │  ┌─────────────────┐  │
                   │  │ VPN / ER GW     │  │
                   │  └─────────────────┘  │
                   │  ┌─────────────────┐  │
                   │  │ Azure Bastion   │  │
                   │  └─────────────────┘  │
                   └───────┬──────┬────────┘
                           │      │
              ┌────────────┘      └────────────┐
              │                                │
     ┌────────┴────────┐            ┌──────────┴──────────┐
     │  Spoke VNet 1   │            │  Spoke VNet 2       │
     │  (sub-erp-prod) │            │  (sub-webshop-prod) │
     │                 │            │                     │
     │  App + DB tiers │            │  App + DB tiers     │
     └─────────────────┘            └─────────────────────┘
```

**Hub-spoke characteristics:**
- Hub VNet centrally managed by platform team
- Spoke VNets peered to hub; no spoke-to-spoke direct peering by default
- All outbound traffic routes through Azure Firewall in hub
- On-premises connectivity via ExpressRoute or VPN in hub
- DNS forwarding from spokes to hub DNS resolver
- Each spoke = one application landing zone subscription

**When to use:** Most organizations, up to ~500 spokes, moderate routing complexity.

### Virtual WAN

```
     ┌──────────────────────────────────────────┐
     │           Azure Virtual WAN              │
     │                                          │
     │  ┌──────────────┐   ┌──────────────┐    │
     │  │ vHub East US │   │ vHub West EU │    │
     │  │ (secured)    │   │ (secured)    │    │
     │  └──────┬───────┘   └──────┬───────┘    │
     └─────────┼──────────────────┼─────────────┘
               │                  │
    ┌──────────┼──────┐    ┌──────┼──────────┐
    │          │      │    │      │          │
  Spoke 1   Spoke 2  ER  Spoke 3  Spoke 4  VPN
  (ERP)     (Web)   GW   (SAP)    (HR)    (Branch)
```

**Virtual WAN characteristics:**
- Microsoft-managed routing infrastructure
- Automatic spoke-to-spoke routing (no UDR management)
- Secured virtual hubs with Azure Firewall integration
- Global transit for multi-region deployments
- Built-in ExpressRoute, VPN, and SD-WAN integration

**When to use:** Large enterprises with 500+ spokes, multi-region, many branch offices, global transit needs.

---

## ALZ Bicep Modules

The ALZ Bicep repository provides modular deployments for each component of the landing zone architecture.

### Module Structure

| Module | Purpose | Scope |
|---|---|---|
| `managementGroups` | Create management group hierarchy | Tenant deployment |
| `customPolicyDefinitions` | Deploy custom policy definitions | Management group deployment |
| `policyAssignments` | Assign policies at management group scope | Management group deployment |
| `roleAssignments` | Configure RBAC at management group scope | Management group deployment |
| `subscriptionPlacement` | Move subscriptions to correct management groups | Tenant deployment |
| `hubNetworking` | Deploy hub VNet, Azure Firewall, gateways | Subscription deployment |
| `vwanConnectivity` | Deploy Virtual WAN and secured hubs | Subscription deployment |
| `logging` | Deploy Log Analytics, Automation Account | Subscription deployment |
| `spokeNetworking` | Deploy spoke VNet with peering | Subscription deployment |

### Deploying Management Group Hierarchy

```bash
# Clone ALZ Bicep repository
git clone https://github.com/Azure/ALZ-Bicep.git
cd ALZ-Bicep

# Deploy management group hierarchy
az deployment tenant create \
  --template-file infra-as-code/bicep/modules/managementGroups/managementGroups.bicep \
  --parameters @infra-as-code/bicep/modules/managementGroups/parameters/managementGroups.parameters.all.json \
  --location "eastus" \
  --name "deploy-mg-hierarchy-$(date +%Y%m%d)"
```

### Parameter File Example (Management Groups)

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "parTopLevelManagementGroupPrefix": {
      "value": "contoso"
    },
    "parTopLevelManagementGroupDisplayName": {
      "value": "Contoso"
    },
    "parLandingZoneMgAlzDefaultsEnable": {
      "value": true
    },
    "parPlatformMgAlzDefaultsEnable": {
      "value": true
    },
    "parLandingZoneMgConfidentialEnable": {
      "value": false
    }
  }
}
```

### Deploying Custom Policy Definitions

```bash
az deployment mg create \
  --management-group-id "contoso" \
  --template-file infra-as-code/bicep/modules/policy/definitions/customPolicyDefinitions.bicep \
  --parameters @infra-as-code/bicep/modules/policy/definitions/parameters/customPolicyDefinitions.parameters.all.json \
  --location "eastus" \
  --name "deploy-policies-$(date +%Y%m%d)"
```

### Deploying Hub Networking

```bash
az deployment sub create \
  --subscription "sub-connectivity-prod-id" \
  --template-file infra-as-code/bicep/modules/hubNetworking/hubNetworking.bicep \
  --parameters @infra-as-code/bicep/modules/hubNetworking/parameters/hubNetworking.parameters.all.json \
  --location "eastus" \
  --name "deploy-hub-$(date +%Y%m%d)"
```

### Deploying Logging

```bash
az deployment sub create \
  --subscription "sub-management-prod-id" \
  --template-file infra-as-code/bicep/modules/logging/logging.bicep \
  --parameters @infra-as-code/bicep/modules/logging/parameters/logging.parameters.all.json \
  --location "eastus" \
  --name "deploy-logging-$(date +%Y%m%d)"
```

---

## Terraform CAF Enterprise Scale Module

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

  # Feature toggles
  deploy_connectivity_resources    = true
  deploy_identity_resources        = true
  deploy_management_resources      = true
  deploy_corp_landing_zones        = true
  deploy_online_landing_zones      = true
  deploy_sap_landing_zones         = false
  deploy_demo_landing_zones        = false

  # Connectivity configuration
  configure_connectivity_resources = local.connectivity_settings
  configure_management_resources   = local.management_settings

  # Subscription placement
  subscription_id_connectivity = var.connectivity_subscription_id
  subscription_id_identity     = var.identity_subscription_id
  subscription_id_management   = var.management_subscription_id
}

locals {
  connectivity_settings = {
    settings = {
      hub_networks = [
        {
          enabled = true
          config = {
            address_space                = ["10.0.0.0/16"]
            location                     = "eastus"
            link_to_ddos_protection_plan = true
            dns_servers                  = []
            bgp_community               = ""
            subnets                      = []
            virtual_network_gateway = {
              enabled = true
              config = {
                address_prefix           = ["10.0.1.0/24"]
                gateway_sku_expressroute = "ErGw1AZ"
                gateway_sku_vpn          = ""
              }
            }
            azure_firewall = {
              enabled = true
              config = {
                address_prefix   = ["10.0.2.0/24"]
                enable_dns_proxy = true
                sku_tier         = "Premium"
                base_policy_id   = ""
              }
            }
          }
        }
      ]
    }
  }

  management_settings = {
    settings = {
      log_analytics = {
        enabled = true
        config = {
          retention_in_days                           = 90
          enable_monitoring_for_vm                    = true
          enable_monitoring_for_vmss                  = true
          enable_solution_for_agent_health_assessment = true
          enable_solution_for_anti_malware            = true
          enable_solution_for_change_tracking         = true
          enable_solution_for_service_map             = true
          enable_solution_for_sql_assessment          = true
          enable_solution_for_sql_vulnerability_assessment = true
          enable_solution_for_sql_advanced_threat_detection = true
          enable_sentinel                             = true
        }
      }
    }
  }
}
```

---

## Identity Design Patterns

| Pattern | Description | When to Use |
|---|---|---|
| **Centralized identity** | Single Entra ID tenant, RBAC managed by platform team | Most organizations |
| **Federated identity** | Entra ID with on-premises AD DS sync (Entra Connect) | Hybrid environments |
| **Domain services** | Azure AD DS in identity subscription for legacy apps | Lift-and-shift workloads needing NTLM/Kerberos |
| **B2B/B2C** | External identity federation | Customer-facing or partner apps |

---

## Management Design Patterns

| Pattern | Description | Components |
|---|---|---|
| **Centralized logging** | All subscriptions send diagnostics to central workspace | Log Analytics in management subscription |
| **Centralized monitoring** | Azure Monitor alerts managed by platform team | Action groups, alert rules, dashboards |
| **Update management** | Automated patching across all VMs | Azure Update Manager |
| **Backup** | Centralized backup policies | Recovery Services vaults per region |
| **Cost management** | Budgets and alerts at management group scope | Azure Cost Management + budgets |

---

## Landing Zone Assessment Checklist

Use this checklist to assess an existing Azure environment against ALZ best practices:

### Management Group Hierarchy
- [ ] Root management group has a meaningful display name
- [ ] Platform management group exists with identity, connectivity, management children
- [ ] Landing zones management group exists with corp and online children
- [ ] Sandbox management group exists for experimentation
- [ ] Decommissioned management group exists for retired subscriptions
- [ ] Hierarchy depth is 4 levels or fewer
- [ ] All subscriptions are placed in appropriate management groups (none in root)

### Connectivity
- [ ] Hub VNet or Virtual WAN deployed in connectivity subscription
- [ ] Azure Firewall or NVA deployed for centralized egress filtering
- [ ] ExpressRoute or VPN gateway deployed for on-premises connectivity
- [ ] Private DNS zones hosted in connectivity subscription
- [ ] Spoke VNets peered to hub with appropriate routing
- [ ] DDoS Protection Plan enabled

### Identity
- [ ] Identity subscription exists under platform management group
- [ ] Entra Connect configured (if hybrid)
- [ ] PIM enabled for privileged roles
- [ ] Conditional Access policies deployed
- [ ] Break-glass accounts configured and tested

### Governance
- [ ] Azure Policy assignments at root management group for baseline
- [ ] Tagging policy enforced (required tags via Deny effect)
- [ ] Naming conventions documented and validated
- [ ] Allowed locations policy applied
- [ ] Budgets configured at subscription level
- [ ] RBAC assignments use groups (not individual users)
- [ ] No Owner assignments at root management group

### Management
- [ ] Log Analytics workspace deployed in management subscription
- [ ] Diagnostic settings configured for all subscriptions
- [ ] Azure Monitor alerts configured for critical resources
- [ ] Microsoft Defender for Cloud enabled with Security Benchmark
- [ ] Automation Account deployed for runbooks
- [ ] Azure Update Manager configured

---

## Error Codes

| Code | Meaning | Remediation |
|------|---------|-------------|
| `DeploymentFailed` | Bicep/ARM deployment failed | Check deployment operation details with `az deployment tenant show` |
| `InvalidTemplate` | Template syntax error | Validate template with `az bicep build` before deploying |
| `LinkedAuthorizationFailed` | Identity lacks required role at target scope | Grant required role to deployment identity |
| `SubscriptionNotRegistered` | Resource provider not registered | Register provider: `az provider register --namespace Microsoft.XXX` |
| `QuotaExceeded` | Subscription-level quota reached | Request quota increase via Azure Support |
| `PeeringAlreadyExists` | VNet peering name collision | Use unique peering names per VNet |

---

## Common Patterns and Gotchas

**1. Start with management groups before deploying anything**
The management group hierarchy must exist before policy assignments, RBAC, and subscriptions can be properly organized. Deploy management groups first, then policies, then subscriptions.

**2. Do not assign Owner at the root management group**
Owner at root grants unrestricted access to every resource in the tenant. Use PIM for time-limited Owner access at lower scopes.

**3. Use DoNotEnforce for initial policy rollout**
When deploying ALZ policies to an existing environment, start with `enforcementMode: DoNotEnforce` to avoid blocking existing workloads. Review compliance data for 2-4 weeks before switching to `Default`.

**4. Hub VNet address space planning**
Plan the hub VNet address space to accommodate all future spokes. Changing the hub address space after spoke peering is established requires re-creating peerings. Use a /16 or larger CIDR block for the hub.

**5. Spoke VNet CIDR must not overlap**
Every spoke VNet must have a unique, non-overlapping address space. Maintain a central IP address management (IPAM) spreadsheet or use Azure IPAM to prevent conflicts.

**6. Private DNS zones must be linked to hub VNet**
For private endpoint DNS resolution to work across spokes, Private DNS zones must be linked to the hub VNet. Spokes use DNS forwarding through the hub to resolve private endpoint FQDNs.

**7. Subscription vending should be automated**
Manual subscription creation leads to inconsistent configuration. Implement a subscription vending pipeline that creates subscriptions, places them in the correct management group, configures networking, applies tags, and assigns RBAC automatically.
