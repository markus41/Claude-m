---
name: org-landing-zone
description: Deploy or assess Azure Landing Zone architecture — management group hierarchy, connectivity patterns, policy assignments, and platform readiness.
argument-hint: "<scope> [--mode <assess|deploy>] [--pattern <hub-spoke|vwan>] [--check-connectivity] [--check-policy]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Landing Zone Assessment / Deployment

## Purpose
Assess an existing Azure environment against Azure Landing Zone best practices, or guide the deployment of a new landing zone using ALZ Bicep or Terraform accelerators.

## When to use
- Greenfield deployment of a new Azure environment.
- Assessment of an existing environment for ALZ alignment.
- Post-deployment validation of landing zone components.
- Migration planning that requires landing zone readiness.

## Required inputs/prereqs
- Target scope (tenant or top-level management group).
- Mode: `assess` (evaluate existing) or `deploy` (guide new deployment).
- Connectivity pattern preference: `hub-spoke` or `vwan`.
- `Reader` role on all subscriptions for assessment; `Owner` on target subscriptions for deployment.
- Completed `org-setup` for context validation.

## Step-by-step execution procedure

### Step 1: Assess Management Group Hierarchy

```bash
# Verify management group hierarchy matches ALZ pattern
az account management-group show \
  --name "<root-mg>" \
  --expand children \
  --recurse \
  -o json

# Check for required management groups
# Expected: platform (identity, connectivity, management), landing-zones (corp, online), sandbox, decommissioned
```

Assessment checklist:
- [ ] Platform management group exists
- [ ] Identity child management group exists under platform
- [ ] Connectivity child management group exists under platform
- [ ] Management child management group exists under platform
- [ ] Landing zones management group exists
- [ ] Corp and Online child management groups exist under landing zones
- [ ] Sandbox management group exists
- [ ] Decommissioned management group exists
- [ ] No subscriptions remain in root management group

### Step 2: Assess Connectivity

```bash
# Check for hub VNet in connectivity subscription
az graph query -q "
  Resources
  | where type == 'microsoft.network/virtualnetworks'
  | where subscriptionId == '<connectivity-sub-id>'
  | project name, location, properties.addressSpace.addressPrefixes, resourceGroup
"

# Check for Azure Firewall
az graph query -q "
  Resources
  | where type == 'microsoft.network/azurefirewalls'
  | project name, location, resourceGroup, subscriptionId,
            properties.sku.tier, properties.threatIntelMode
"

# Check for VPN/ExpressRoute gateways
az graph query -q "
  Resources
  | where type in ('microsoft.network/virtualnetworkgateways', 'microsoft.network/expressroutecircuits')
  | project name, type, location, resourceGroup, subscriptionId
"

# Check for VNet peerings
az graph query -q "
  Resources
  | where type == 'microsoft.network/virtualnetworks'
  | mv-expand peering = properties.virtualNetworkPeerings
  | project vnetName=name, peerName=peering.name,
            peerState=peering.properties.peeringState,
            remoteVnet=peering.properties.remoteVirtualNetwork.id
  | order by vnetName asc
"

# Check for Private DNS zones
az graph query -q "
  Resources
  | where type == 'microsoft.network/privatednszones'
  | project name, resourceGroup, subscriptionId
  | order by name asc
"
```

### Step 3: Assess Policy Assignments

```bash
# Policy assignments at management group scope
az policy assignment list \
  --scope "/providers/Microsoft.Management/managementGroups/<root-mg>" \
  -o table

# Check for key governance policies
# Expected: allowed locations, required tags, security benchmark, diagnostics settings
az policy assignment list \
  --scope "/providers/Microsoft.Management/managementGroups/<root-mg>" \
  --query "[].{Name:name, DisplayName:displayName, Scope:scope, Enforcement:enforcementMode}"

# Compliance summary at management group scope
az policy state summarize \
  --management-group "<root-mg>" \
  --query "value[0].{NonCompliantResources:results.nonCompliantResources, NonCompliantPolicies:results.nonCompliantPolicies}"
```

### Step 4: Assess Identity and RBAC

```bash
# RBAC assignments at root management group
az role assignment list \
  --scope "/providers/Microsoft.Management/managementGroups/<root-mg>" \
  -o table

# Check for Owner assignments at root (should be minimized)
az role assignment list \
  --scope "/providers/Microsoft.Management/managementGroups/<root-mg>" \
  --role "Owner" \
  -o table

# Check for PIM-eligible assignments (requires Graph API)
```

### Step 5: Assess Management and Monitoring

```bash
# Check for Log Analytics workspace in management subscription
az graph query -q "
  Resources
  | where type == 'microsoft.operationalinsights/workspaces'
  | project name, location, resourceGroup, subscriptionId,
            sku=properties.sku.name, retentionDays=properties.retentionInDays
"

# Check for Defender for Cloud
az graph query -q "
  Resources
  | where type == 'microsoft.security/pricings'
  | project name, properties.pricingTier, subscriptionId
"

# Check for diagnostic settings on subscriptions
az monitor diagnostic-settings subscription list \
  --subscription "<subscription-id>" \
  -o table
```

### Step 6: Generate Assessment Report or Deployment Plan

**For assessment mode**: Score each design area (management groups, connectivity, identity, governance, management) and provide a gap analysis with prioritized remediation.

**For deployment mode**: Provide step-by-step deployment guidance using ALZ Bicep or Terraform, starting with management groups and proceeding through policies, connectivity, and logging.

**Concrete example invocation**
```text
/org-landing-zone /providers/Microsoft.Management/managementGroups/mg-contoso --mode assess --pattern hub-spoke --check-connectivity --check-policy
```

**Failure-mode example**
```text
/org-landing-zone --mode deploy
```
Expected assistant behavior: fail because scope is missing; return required argument list and a corrected command template.

## Output schema/format expected from the assistant
Return in this order:
1. `LandingZoneSummary` (`Scope`, `Mode`, `Pattern`, `OverallScore`, `DesignAreasAssessed`).
2. `DesignAreaScores` table: `Area`, `Score`, `MaxScore`, `Status`, `TopGap`.
3. `HierarchyAssessment` — management group tree with pass/fail indicators.
4. `ConnectivityAssessment` — hub VNet, firewall, gateways, peerings, DNS.
5. `GovernanceAssessment` — policy assignments, tag enforcement, compliance metrics.
6. `IdentityAssessment` — RBAC assignments, Owner count at root, PIM status.
7. `ManagementAssessment` — Log Analytics, Defender, diagnostics.
8. `GapBacklog` table: `Gap`, `DesignArea`, `Priority`, `RecommendedAction`, `Effort`.
9. `NextSteps` — deployment commands or remediation sequence.

## Validation checklist
- Command name is `org-landing-zone` and matches file name.
- Mode (assess or deploy) is explicit.
- All five design areas are evaluated.
- Connectivity check includes hub, firewall, gateways, peering, and DNS.
- Policy check includes assignments and compliance summary.
- Output includes summary, scores, area assessments, gap backlog, and next steps.
