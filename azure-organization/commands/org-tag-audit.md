---
name: org-tag-audit
description: Scan Azure resources for tag compliance, report missing required tags, inconsistent values, and suggest remediation actions.
argument-hint: "<scope> [--required-tags <tag1,tag2,...>] [--check-values] [--severity <high|medium|low>] [--export <json|csv>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Tag Audit

## Purpose
Evaluate tag compliance across Azure resources and resource groups, identify missing required tags, detect inconsistent tag values, and produce remediation recommendations.

## When to use
- Governance reviews require tag compliance metrics.
- Cost allocation reports show untagged resources.
- New tagging policy is being rolled out and baseline measurement is needed.
- Pre-enforcement audit before switching tag policies from Audit to Deny.

## Required inputs/prereqs
- Target scope (management group or subscription).
- List of required tags (default: `Environment`, `Owner`, `CostCenter`).
- `Reader` role on target subscriptions.
- Completed `org-setup` for context validation.

## Step-by-step execution procedure

### Step 1: Define Required Tag Schema

Confirm the required tag schema with the user. Default required tags:

| Tag | Required | Allowed Values (if enforced) |
|---|---|---|
| `Environment` | Yes | `Production`, `Staging`, `Development`, `Sandbox`, `Test` |
| `Owner` | Yes | Email or team alias |
| `CostCenter` | Yes | Cost center code pattern |
| `Project` | Yes | Project name |
| `Compliance` | Conditional | `HIPAA`, `PCI-DSS`, `SOC2`, `None` |
| `DataClassification` | Conditional | `Public`, `Internal`, `Confidential`, `Restricted` |

### Step 2: Scan Resources for Missing Tags

```bash
# Resources missing any required tag
az graph query -q "
  Resources
  | where isempty(tags['Environment']) or isempty(tags['Owner']) or isempty(tags['CostCenter']) or isempty(tags['Project'])
  | extend missing = strcat(
      iff(isempty(tags['Environment']), 'Environment ', ''),
      iff(isempty(tags['Owner']), 'Owner ', ''),
      iff(isempty(tags['CostCenter']), 'CostCenter ', ''),
      iff(isempty(tags['Project']), 'Project', '')
    )
  | project name, type, resourceGroup, subscriptionId, missing
  | order by type asc
" --first 500
```

### Step 3: Scan Resource Groups for Missing Tags

```bash
# Resource groups missing required tags
az graph query -q "
  ResourceContainers
  | where type == 'microsoft.resources/subscriptions/resourcegroups'
  | where isempty(tags['Environment']) or isempty(tags['Owner']) or isempty(tags['CostCenter'])
  | extend missing = strcat(
      iff(isempty(tags['Environment']), 'Environment ', ''),
      iff(isempty(tags['Owner']), 'Owner ', ''),
      iff(isempty(tags['CostCenter']), 'CostCenter ', '')
    )
  | project resourceGroup, subscriptionId, location, missing
  | order by missing desc
" --first 200
```

### Step 4: Check Tag Value Consistency

```bash
# Distinct Environment tag values (detect inconsistencies)
az graph query -q "
  Resources
  | where isnotempty(tags['Environment'])
  | summarize count() by tostring(tags['Environment'])
  | order by count_ desc
"

# Detect non-standard Environment values
az graph query -q "
  Resources
  | where isnotempty(tags['Environment'])
  | where tags['Environment'] !in ('Production', 'Staging', 'Development', 'Sandbox', 'Test')
  | summarize count() by tostring(tags['Environment'])
  | order by count_ desc
"

# Distinct Owner tag values (check for stale owners)
az graph query -q "
  Resources
  | where isnotempty(tags['Owner'])
  | summarize count() by tostring(tags['Owner'])
  | order by count_ desc
" --first 50
```

### Step 5: Calculate Compliance Metrics

```bash
# Overall tag compliance by tag name
az graph query -q "
  Resources
  | summarize
      total=count(),
      hasEnvironment=countif(isnotempty(tags['Environment'])),
      hasOwner=countif(isnotempty(tags['Owner'])),
      hasCostCenter=countif(isnotempty(tags['CostCenter'])),
      hasProject=countif(isnotempty(tags['Project']))
  | extend envPct=round(100.0*hasEnvironment/total,1),
           ownerPct=round(100.0*hasOwner/total,1),
           costPct=round(100.0*hasCostCenter/total,1),
           projPct=round(100.0*hasProject/total,1)
"

# Tag compliance by subscription
az graph query -q "
  Resources
  | extend hasAll = isnotempty(tags['Environment']) and isnotempty(tags['Owner']) and isnotempty(tags['CostCenter'])
  | summarize total=count(), compliant=countif(hasAll) by subscriptionId
  | extend pct = round(100.0 * compliant / total, 1)
  | order by pct asc
"
```

### Step 6: Remediation Recommendations

For each finding, recommend:
1. **Quick fix** — Apply missing tags via `az tag update --operation merge`
2. **Policy enforcement** — Deploy Deny policy for required tags
3. **Tag inheritance** — Deploy Modify policy to inherit from resource group
4. **Value standardization** — Update non-standard values to allowed vocabulary

**Concrete example invocation**
```text
/org-tag-audit /subscriptions/00000000-0000-0000-0000-000000000000 --required-tags Environment,Owner,CostCenter,Project --check-values --severity high
```

**Failure-mode example**
```text
/org-tag-audit --required-tags CostCenter
```
Expected assistant behavior: fail because scope is missing; return required argument list and a corrected command template.

## Output schema/format expected from the assistant
Return in this order:
1. `AuditSummary` (`Scope`, `TotalResources`, `FullyCompliant`, `OverallCompliancePct`, `RequiredTags`).
2. `ComplianceByTag` table: `TagName`, `Present`, `Missing`, `CompliancePct`.
3. `ComplianceBySubscription` table: `Subscription`, `Total`, `Compliant`, `Pct`.
4. `MissingTagFindings` table: `Resource`, `Type`, `ResourceGroup`, `MissingTags`, `Severity`.
5. `ValueInconsistencies` table: `TagName`, `NonStandardValue`, `Count`, `SuggestedCorrection`.
6. `RemediationPlan` ordered list: `Priority`, `Action`, `Scope`, `Impact`, `Command`.

## Validation checklist
- Command name is `org-tag-audit` and matches file name.
- Required tags list is explicit.
- Resource and resource group scans are both included.
- Tag value consistency is checked.
- Compliance percentages are computed per tag and per subscription.
- Output includes summary, compliance tables, findings, inconsistencies, and remediation plan.
