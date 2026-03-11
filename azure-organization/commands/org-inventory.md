---
name: org-inventory
description: Full tenant inventory using Azure Resource Graph — subscriptions, resource groups, resources by type, region, and tag coverage.
argument-hint: "<scope> [--group-by <type|region|subscription|tag>] [--include-empty-rgs] [--export <json|csv>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Organization Inventory

## Purpose
Build a comprehensive inventory of the Azure organizational hierarchy — subscriptions, resource groups, and resources — to understand the current landscape before governance improvements.

## When to use
- Initial assessment of a new or inherited Azure environment.
- Periodic inventory refresh for governance reviews.
- Pre-migration analysis of resource distribution.
- Cost optimization planning requiring resource counts by type and region.

## Required inputs/prereqs
- Target scope (management group or subscription).
- `Reader` role on all subscriptions in scope.
- Resource Graph access (`Microsoft.ResourceGraph` provider registered).
- Completed `org-setup` for context validation.

## Step-by-step execution procedure

### Step 1: Subscription Inventory

```bash
# List all subscriptions with state and tags
az graph query -q "
  ResourceContainers
  | where type == 'microsoft.resources/subscriptions'
  | project name, subscriptionId, properties.state, tags
  | order by name asc
"
```

### Step 2: Resource Group Inventory

```bash
# All resource groups with resource counts
az graph query -q "
  ResourceContainers
  | where type == 'microsoft.resources/subscriptions/resourcegroups'
  | project resourceGroup, subscriptionId, location, tags
  | join kind=leftouter (
      Resources
      | summarize resourceCount=count() by resourceGroup, subscriptionId
  ) on resourceGroup, subscriptionId
  | project resourceGroup, subscriptionId, location, resourceCount, tags
  | order by resourceCount desc
" --first 500

# Empty resource groups (candidates for cleanup)
az graph query -q "
  ResourceContainers
  | where type == 'microsoft.resources/subscriptions/resourcegroups'
  | project resourceGroup, subscriptionId
  | join kind=leftanti (
      Resources
      | project resourceGroup, subscriptionId
  ) on resourceGroup, subscriptionId
" --first 200
```

### Step 3: Resource Inventory by Type

```bash
# Resources by type
az graph query -q "
  Resources
  | summarize count() by type
  | order by count_ desc
  | take 30
"

# Resources by region
az graph query -q "
  Resources
  | summarize count() by location
  | order by count_ desc
"

# Resources by subscription
az graph query -q "
  Resources
  | summarize count() by subscriptionId
  | join kind=inner (
      ResourceContainers
      | where type == 'microsoft.resources/subscriptions'
      | project subscriptionId, subscriptionName=name
  ) on subscriptionId
  | project subscriptionName, subscriptionId, count_
  | order by count_ desc
"
```

### Step 4: Tag Coverage Summary

```bash
# Tag compliance percentage by subscription
az graph query -q "
  Resources
  | extend hasEnv = isnotempty(tags['Environment'])
  | extend hasOwner = isnotempty(tags['Owner'])
  | extend hasCost = isnotempty(tags['CostCenter'])
  | extend hasAll = hasEnv and hasOwner and hasCost
  | summarize total=count(), compliant=countif(hasAll) by subscriptionId
  | extend compliancePct = round(100.0 * compliant / total, 1)
  | join kind=inner (
      ResourceContainers
      | where type == 'microsoft.resources/subscriptions'
      | project subscriptionId, subscriptionName=name
  ) on subscriptionId
  | project subscriptionName, total, compliant, compliancePct
  | order by compliancePct asc
"
```

### Step 5: Orphaned Resources

```bash
# Unattached disks, unused public IPs, orphaned NICs
az graph query -q "
  Resources
  | where (type == 'microsoft.compute/disks' and properties.diskState == 'Unattached')
     or (type == 'microsoft.network/publicipaddresses' and isempty(properties.ipConfiguration))
     or (type == 'microsoft.network/networkinterfaces' and isempty(properties.virtualMachine))
  | project name, type, resourceGroup, subscriptionId, location
  | order by type asc
" --first 200
```

**Concrete example invocation**
```text
/org-inventory /providers/Microsoft.Management/managementGroups/mg-contoso --group-by type --include-empty-rgs
```

**Failure-mode example**
```text
/org-inventory
```
Expected assistant behavior: fail because scope is missing; return required argument list and a corrected command template.

## Output schema/format expected from the assistant
Return in this order:
1. `InventorySummary` (`TotalSubscriptions`, `TotalResourceGroups`, `TotalResources`, `EmptyResourceGroups`, `OrphanedResources`).
2. `SubscriptionTable` table: `Name`, `Id`, `State`, `ResourceCount`, `TagCoverage%`.
3. `ResourcesByType` table: `ResourceType`, `Count`, `TopRegion`.
4. `ResourcesByRegion` table: `Region`, `Count`, `TopResourceType`.
5. `TagCoverage` table: `Subscription`, `Total`, `Compliant`, `CompliancePct`.
6. `OrphanedResources` table: `Name`, `Type`, `ResourceGroup`, `Subscription`.
7. `Recommendations` bullets for cleanup and organization.

## Validation checklist
- Command name is `org-inventory` and matches file name.
- Scope is explicit.
- Resource Graph queries cover subscriptions, resource groups, resources, tags, and orphans.
- Output includes summary, subscription table, resource breakdowns, tag coverage, orphans, and recommendations.
