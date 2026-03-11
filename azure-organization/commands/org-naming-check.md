---
name: org-naming-check
description: Validate Azure resource names against Cloud Adoption Framework naming conventions, report violations, and suggest corrections.
argument-hint: "<scope> [--convention <caf|custom>] [--resource-types <rg,vm,st,...>] [--fix-suggestions] [--export <json|csv>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Naming Convention Check

## Purpose
Validate resource names across the Azure environment against CAF naming conventions, identify resources that violate the naming standard, and provide corrective suggestions.

## When to use
- Governance reviews require naming convention compliance metrics.
- New naming standard is being adopted and a baseline is needed.
- Automated deployment pipelines need naming validation.
- Pre-audit preparation for organizational standards.

## Required inputs/prereqs
- Target scope (management group or subscription).
- Naming convention standard (default: CAF with `{prefix}-{workload}-{env}-{region}` pattern).
- `Reader` role on target subscriptions.
- Completed `org-setup` for context validation.

## Step-by-step execution procedure

### Step 1: Confirm Naming Convention

Confirm the naming convention with the user. Default CAF pattern:

```
{resource-type-prefix}-{workload}-{environment}-{region}-{instance}
```

Prefixes follow the CAF abbreviation table:
| Resource Type | Expected Prefix |
|---|---|
| Resource group | `rg-` |
| Virtual network | `vnet-` |
| Subnet | `snet-` |
| NSG | `nsg-` |
| Public IP | `pip-` |
| Virtual machine | `vm-` |
| Storage account | `st` (no hyphen, lowercase alphanumeric) |
| Key vault | `kv-` |
| App Service | `app-` |
| Function app | `func-` |
| AKS cluster | `aks-` |
| SQL server | `sql-` |
| Container registry | `cr` (no hyphen, alphanumeric) |

### Step 2: Query Resources and Validate Names

```bash
# Virtual machines not following vm- prefix
az graph query -q "
  Resources
  | where type == 'microsoft.compute/virtualmachines'
  | where not(name startswith 'vm-')
  | project name, resourceGroup, subscriptionId, location
  | order by name asc
" --first 200

# Virtual networks not following vnet- prefix
az graph query -q "
  Resources
  | where type == 'microsoft.network/virtualnetworks'
  | where not(name startswith 'vnet-')
  | project name, resourceGroup, subscriptionId, location
  | order by name asc
" --first 200

# NSGs not following nsg- prefix
az graph query -q "
  Resources
  | where type == 'microsoft.network/networksecuritygroups'
  | where not(name startswith 'nsg-')
  | project name, resourceGroup, subscriptionId, location
  | order by name asc
" --first 200

# Key vaults not following kv- prefix
az graph query -q "
  Resources
  | where type == 'microsoft.keyvault/vaults'
  | where not(name startswith 'kv-')
  | project name, resourceGroup, subscriptionId, location
  | order by name asc
" --first 200

# App Services not following app- or func- prefix
az graph query -q "
  Resources
  | where type == 'microsoft.web/sites'
  | where not(name startswith 'app-') and not(name startswith 'func-')
  | project name, kind, resourceGroup, subscriptionId, location
  | order by name asc
" --first 200

# AKS clusters not following aks- prefix
az graph query -q "
  Resources
  | where type == 'microsoft.containerservice/managedclusters'
  | where not(name startswith 'aks-')
  | project name, resourceGroup, subscriptionId, location
  | order by name asc
" --first 200

# SQL servers not following sql- prefix
az graph query -q "
  Resources
  | where type == 'microsoft.sql/servers'
  | where not(name startswith 'sql-')
  | project name, resourceGroup, subscriptionId, location
  | order by name asc
" --first 200
```

### Step 3: Validate Resource Groups

```bash
# Resource groups not following rg- prefix
az graph query -q "
  ResourceContainers
  | where type == 'microsoft.resources/subscriptions/resourcegroups'
  | where not(name startswith 'rg-')
  | project name, subscriptionId, location
  | order by name asc
" --first 200
```

### Step 4: Comprehensive Naming Compliance Summary

```bash
# Overall naming compliance by resource type
az graph query -q "
  Resources
  | extend isCompliant = case(
      type == 'microsoft.compute/virtualmachines' and name startswith 'vm-', true,
      type == 'microsoft.network/virtualnetworks' and name startswith 'vnet-', true,
      type == 'microsoft.network/networksecuritygroups' and name startswith 'nsg-', true,
      type == 'microsoft.keyvault/vaults' and name startswith 'kv-', true,
      type == 'microsoft.web/sites' and (name startswith 'app-' or name startswith 'func-'), true,
      type == 'microsoft.containerservice/managedclusters' and name startswith 'aks-', true,
      type == 'microsoft.sql/servers' and name startswith 'sql-', true,
      type == 'microsoft.network/publicipaddresses' and name startswith 'pip-', true,
      type == 'microsoft.network/loadbalancers' and (name startswith 'lbi-' or name startswith 'lbe-' or name startswith 'lb-'), true,
      type == 'microsoft.network/applicationgateways' and name startswith 'agw-', true,
      false
    )
  | where type in (
      'microsoft.compute/virtualmachines',
      'microsoft.network/virtualnetworks',
      'microsoft.network/networksecuritygroups',
      'microsoft.keyvault/vaults',
      'microsoft.web/sites',
      'microsoft.containerservice/managedclusters',
      'microsoft.sql/servers',
      'microsoft.network/publicipaddresses',
      'microsoft.network/loadbalancers',
      'microsoft.network/applicationgateways'
    )
  | summarize total=count(), compliant=countif(isCompliant) by type
  | extend pct = round(100.0 * compliant / total, 1)
  | order by pct asc
"
```

### Step 5: Generate Fix Suggestions

For each non-compliant resource, suggest a corrected name based on the CAF pattern. Consider:
- Infer workload from resource group name or tags
- Infer environment from tags or resource group
- Use the resource location as region component
- Add instance number suffix

### Step 6: Report Additional Anti-Patterns

Check for common anti-patterns:
- Names with uppercase characters (should be lowercase)
- Names with spaces (invalid for most resources)
- Generic names (`test`, `temp`, `default`, `resource1`)
- Names exceeding maximum length for the resource type

**Concrete example invocation**
```text
/org-naming-check /subscriptions/00000000-0000-0000-0000-000000000000 --convention caf --resource-types rg,vm,vnet,nsg,kv --fix-suggestions
```

**Failure-mode example**
```text
/org-naming-check --resource-types vm
```
Expected assistant behavior: fail because scope is missing; return required argument list and a corrected command template.

## Output schema/format expected from the assistant
Return in this order:
1. `NamingSummary` (`Scope`, `TotalChecked`, `Compliant`, `NonCompliant`, `OverallCompliancePct`).
2. `ComplianceByType` table: `ResourceType`, `Total`, `Compliant`, `NonCompliant`, `Pct`.
3. `Violations` table: `Resource`, `Type`, `CurrentName`, `SuggestedName`, `Issue`, `Severity`.
4. `AntiPatterns` table: `Pattern`, `Count`, `Examples`, `Correction`.
5. `RemediationNotes` — explanation of which resources can be renamed in-place vs require recreation.

## Validation checklist
- Command name is `org-naming-check` and matches file name.
- Naming convention is explicit.
- Resource types to check are specified.
- Compliance percentages are computed per resource type.
- Fix suggestions include corrected names.
- Output includes summary, compliance table, violations, anti-patterns, and remediation notes.
