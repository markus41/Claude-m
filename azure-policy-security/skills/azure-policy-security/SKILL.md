---
name: azure-policy-security
description: >
  Deep expertise in Azure Policy governance — policy assignments, definitions, initiatives,
  compliance state queries, exemptions, enforcement modes, built-in benchmarks (CIS, NIST,
  Azure Security Benchmark), drift analysis, and remediation planning via the Azure Policy REST API.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
triggers:
  - azure policy
  - policy compliance
  - policy assignment
  - policy initiative
  - security benchmark
  - compliance drift
  - policy exemption
  - governance posture
  - cis benchmark
  - nist compliance
  - policy remediation
  - cost policy optimization workflow
---

# Azure Policy & Security Governance

## Shared Workflow Routing
- Use the shared workflow spec for deterministic multi-plugin routing: [`workflows/multi-plugin-workflows.md`](../../../workflows/multi-plugin-workflows.md#cost--policy-optimization-azure-cost-governance--azure-policy-security--microsoft-azure-mcp).
- Apply the trigger phrases, handoff contracts, auth prerequisites, validation checkpoints, and stop conditions before escalating to the next plugin.


This skill provides comprehensive knowledge for assessing Azure governance posture via the Azure Policy REST API — policy assignments, compliance state queries, initiatives, exemptions, and drift analysis with actionable remediation plans.

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../../../docs/integration-context.md)

| Workflow | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Policy coverage, drift, remediation | required | required | `AzureCloud`\* | `delegated-user` or `service-principal` | `PolicyInsights.Read`, `Policy.Read.All`, Azure `Reader` |

\* Use sovereign cloud values from the canonical contract when applicable.

Fail fast before API calls when required context is missing or invalid. Redact tenant/subscription/object IDs in outputs.

## Base URL

```
https://management.azure.com/{scope}/providers/Microsoft.Authorization
https://management.azure.com/{scope}/providers/Microsoft.PolicyInsights
```

## API Endpoints

### Policy Assignments

| Method | Endpoint | API Version | Purpose |
|--------|----------|-------------|---------|
| PUT | `/{scope}/providers/Microsoft.Authorization/policyAssignments/{name}` | `2023-04-01` | Create or update assignment |
| GET | `/{scope}/providers/Microsoft.Authorization/policyAssignments/{name}` | `2023-04-01` | Get assignment |
| GET | `/subscriptions/{id}/providers/Microsoft.Authorization/policyAssignments` | `2023-04-01` | List assignments for subscription |
| DELETE | `/{scope}/providers/Microsoft.Authorization/policyAssignments/{name}` | `2023-04-01` | Delete assignment |

### Policy Definitions

| Method | Endpoint | API Version | Purpose |
|--------|----------|-------------|---------|
| GET | `/providers/Microsoft.Authorization/policyDefinitions` | `2023-04-01` | List built-in definitions |
| GET | `/subscriptions/{id}/providers/Microsoft.Authorization/policyDefinitions` | `2023-04-01` | List custom + built-in definitions |
| GET | `/providers/Microsoft.Authorization/policyDefinitions/{name}` | `2023-04-01` | Get specific definition |
| PUT | `/subscriptions/{id}/providers/Microsoft.Authorization/policyDefinitions/{name}` | `2023-04-01` | Create custom definition |

### Policy Set Definitions (Initiatives)

| Method | Endpoint | API Version | Purpose |
|--------|----------|-------------|---------|
| GET | `/providers/Microsoft.Authorization/policySetDefinitions` | `2023-04-01` | List built-in initiatives |
| GET | `/subscriptions/{id}/providers/Microsoft.Authorization/policySetDefinitions` | `2023-04-01` | List custom initiatives |
| GET | `/providers/Microsoft.Authorization/policySetDefinitions/{name}` | `2023-04-01` | Get specific initiative |

### Policy States (Compliance Data)

| Method | Endpoint | API Version | Purpose |
|--------|----------|-------------|---------|
| POST | `/{scope}/providers/Microsoft.PolicyInsights/policyStates/latest/queryResults` | `2019-10-01` | Query compliance data |
| POST | `/{scope}/providers/Microsoft.PolicyInsights/policyStates/latest/summarize` | `2019-10-01` | Summarize compliance |
| POST | `/subscriptions/{id}/providers/Microsoft.PolicyInsights/policyStates/latest/triggerEvaluation` | `2019-10-01` | Trigger on-demand evaluation |

### Policy Exemptions

| Method | Endpoint | API Version | Purpose |
|--------|----------|-------------|---------|
| PUT | `/{scope}/providers/Microsoft.Authorization/policyExemptions/{name}` | `2022-07-01-preview` | Create or update exemption |
| GET | `/{scope}/providers/Microsoft.Authorization/policyExemptions/{name}` | `2022-07-01-preview` | Get exemption |
| GET | `/subscriptions/{id}/providers/Microsoft.Authorization/policyExemptions` | `2022-07-01-preview` | List exemptions |
| DELETE | `/{scope}/providers/Microsoft.Authorization/policyExemptions/{name}` | `2022-07-01-preview` | Delete exemption |

## Policy Assignment Request Body

```json
PUT /{scope}/providers/Microsoft.Authorization/policyAssignments/{name}?api-version=2023-04-01
{
  "properties": {
    "displayName": "Require tags on resource groups",
    "description": "Enforce CostCenter and Environment tags on all resource groups",
    "policyDefinitionId": "/providers/Microsoft.Authorization/policyDefinitions/{guid}",
    "enforcementMode": "Default",
    "notScopes": [
      "/subscriptions/{id}/resourceGroups/rg-sandbox"
    ],
    "parameters": {
      "tagName": {
        "value": "CostCenter"
      }
    },
    "nonComplianceMessages": [
      {
        "message": "This resource group must have a CostCenter tag."
      }
    ],
    "metadata": {
      "assignedBy": "Cloud Center of Excellence"
    }
  },
  "identity": {
    "type": "SystemAssigned"
  },
  "location": "eastus"
}
```

### Key Assignment Properties

| Property | Type | Description |
|----------|------|-------------|
| `policyDefinitionId` | string | Full ARM resource ID of definition or initiative |
| `enforcementMode` | enum | `Default` (enforce) or `DoNotEnforce` (what-if mode) |
| `notScopes` | string[] | Up to 400 child scopes excluded from evaluation |
| `parameters` | object | Key-value pairs matching definition parameters |
| `nonComplianceMessages` | array | Custom messages shown for non-compliant resources |
| `identity.type` | enum | `SystemAssigned` or `UserAssigned` — required for `deployIfNotExists` or `modify` |

## Policy State Query

### Query Non-Compliant Resources

```
POST /subscriptions/{id}/providers/Microsoft.PolicyInsights/policyStates/latest/queryResults
  ?api-version=2019-10-01
  &$filter=ComplianceState eq 'NonCompliant'
  &$top=100
  &$orderby=timestamp desc
```

### Summarize Compliance (Aggregation)

```
POST /subscriptions/{id}/providers/Microsoft.PolicyInsights/policyStates/latest/queryResults
  ?api-version=2019-10-01
  &$apply=groupby((ComplianceState), aggregate($count as Count))
```

### Query by Policy Definition

```
POST /subscriptions/{id}/providers/Microsoft.PolicyInsights/policyStates/latest/queryResults
  ?api-version=2019-10-01
  &$filter=ComplianceState eq 'NonCompliant' and PolicyDefinitionId eq '/providers/microsoft.authorization/policydefinitions/{guid}'
  &$top=50
```

### OData Query Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `$filter` | OData filter | `ComplianceState eq 'NonCompliant'` |
| `$orderby` | Sort order | `timestamp desc` |
| `$top` | Max results | `100` |
| `$select` | Field projection | `resourceId,complianceState,policyDefinitionAction` |
| `$from` / `$to` | Time window (ISO 8601) | `2026-02-01T00:00:00Z` |
| `$apply` | Aggregation | `groupby((ComplianceState), aggregate($count as Count))` |
| `$expand` | Include details | `PolicyEvaluationDetails` |
| `$skiptoken` | Pagination | Returned in `@odata.nextLink` |

### Filterable Fields

| Field | Example Values |
|-------|---------------|
| `ComplianceState` | `'Compliant'`, `'NonCompliant'`, `'Exempt'` |
| `PolicyDefinitionId` | Full ARM resource ID |
| `PolicyAssignmentId` | Full ARM resource ID |
| `PolicySetDefinitionId` | Full ARM resource ID |
| `ResourceType` | `'Microsoft.Network/virtualNetworks'` |
| `PolicyDefinitionAction` | `'audit'`, `'deny'`, `'modify'` |

## Policy Exemption Request Body

```json
PUT /{scope}/providers/Microsoft.Authorization/policyExemptions/{name}?api-version=2022-07-01-preview
{
  "properties": {
    "policyAssignmentId": "/subscriptions/{id}/providers/Microsoft.Authorization/policyAssignments/{name}",
    "exemptionCategory": "Waiver",
    "displayName": "Exempt sandbox cluster from SKU limit",
    "description": "Temporary exemption for dev/test cluster — approved by IA",
    "expiresOn": "2026-06-30T23:59:00Z",
    "policyDefinitionReferenceIds": [
      "Limit_Skus"
    ],
    "metadata": {
      "requestedBy": "Platform team",
      "approvedBy": "Information Assurance",
      "ticketRef": "CHG-2026-0042"
    }
  }
}
```

### Exemption Properties

| Property | Required | Description |
|----------|----------|-------------|
| `policyAssignmentId` | Yes | ARM ID of the assignment being exempted |
| `exemptionCategory` | Yes | `Waiver` (accepted risk) or `Mitigated` (compensating control) |
| `expiresOn` | No | ISO 8601 date — exemption stops being honored after this date |
| `policyDefinitionReferenceIds` | No | Specific definitions within an initiative — omit to exempt all |
| `displayName` | No | Max 128 characters |
| `description` | No | Max 512 characters |

## Compliance State Reference

| State | Description |
|-------|-------------|
| `Compliant` | Resource meets the policy requirement |
| `NonCompliant` | Resource violates the policy rule |
| `Exempt` | Resource has an active exemption |
| `Conflicting` | Contradicting rules at same scope |
| `Unknown` | Default state for `manual` effect policies |
| `Error` | Evaluation error occurred |
| `Protected` | Resource covered by `denyAction` effect |

**Compliance percentage formula:**
```
(Compliant + Exempt + Unknown + Protected) / Total resources * 100
```

## Enforcement Mode Reference

| Mode | JSON Value | Effect Enforced | Activity Log |
|------|-----------|----------------|--------------|
| Enabled | `Default` | Yes — deny/audit/modify effects applied | Yes |
| Disabled | `DoNotEnforce` | No — compliance data generated but no effect | No |

`DoNotEnforce` is different from the `Disabled` effect — `Disabled` prevents evaluation entirely; `DoNotEnforce` evaluates but does not act. Use `DoNotEnforce` for "what-if" testing.

## Policy Effect Reference

| Effect | Description | Identity Required |
|--------|-------------|-------------------|
| `Audit` | Log non-compliance, no block | No |
| `Deny` | Block non-compliant resource create/update | No |
| `Modify` | Add/update/remove tags or properties at create/update | Yes |
| `DeployIfNotExists` | Deploy remediation template if condition met | Yes |
| `AuditIfNotExists` | Audit when related resource is missing | No |
| `Append` | Add fields to resource during create/update | No |
| `DenyAction` | Block specific actions (e.g., delete) | No |
| `Disabled` | Policy is not evaluated at all | No |
| `Manual` | Requires manual attestation | No |

## Built-in Initiative Reference

| Initiative | GUID | Description |
|-----------|------|-------------|
| Microsoft Cloud Security Benchmark | `1f3afdf9-d0c9-4c3d-847f-89da613e70a8` | Default for Defender for Cloud |
| NIST SP 800-53 Rev. 5 | `179d1daa-458f-4e47-8086-2a68d0d6c38f` | US federal compliance |
| CIS Azure Foundations v2.1.0 | `fe7782e4-6ff3-4e39-8d8a-64b6f7b82c85` | CIS benchmark |
| CIS Azure Foundations v2.0.0 | `06f19060-9e68-4070-92ca-f15cc126059e` | CIS benchmark |
| ISO 27001:2013 | `89c6cddc-1c73-4ac1-b19c-54d1a15a42f2` | International standard |

Full ARM ID format: `/providers/Microsoft.Authorization/policySetDefinitions/{guid}`

## Required Permissions

| Task | Minimum Role |
|------|-------------|
| Read compliance state, definitions, assignments | Reader or Security Reader |
| Query compliance data (PolicyInsights) | Policy Insights Data Reader |
| Create/update policy assignments | Resource Policy Contributor |
| Create/update policy definitions | Resource Policy Contributor |
| Create/update exemptions | Resource Policy Contributor + `exempt/Action` on assignment |
| Trigger remediation tasks | Contributor or Resource Policy Contributor |
| Assign managed identity for remediation | User Access Administrator |

## Error Handling

| Status Code | Meaning | Common Cause |
|-------------|---------|--------------|
| 400 Bad Request | Malformed request | Invalid parameter values, policy rule syntax error, bad filter |
| 403 Forbidden | Insufficient permissions | Missing RBAC role for policy operations or `exempt/Action` |
| 404 Not Found | Resource not found | Wrong definition/assignment/exemption name at scope |
| 409 Conflict | Resource conflict | Concurrent modification, name collision |

### Error Response Format

```json
{
  "error": {
    "code": "PolicyAssignmentNotFound",
    "message": "The policy assignment 'XYZ' could not be found.",
    "target": "policyAssignmentName"
  }
}
```

## OData Filter Reference

```
# All non-compliant resources
$filter=ComplianceState eq 'NonCompliant'

# Non-compliant for a specific policy
$filter=ComplianceState eq 'NonCompliant' and PolicyDefinitionId eq '/providers/...'

# Non-compliant by resource type
$filter=ComplianceState eq 'NonCompliant' and ResourceType eq 'Microsoft.Compute/virtualMachines'

# Audit or deny actions only
$filter=PolicyDefinitionAction eq 'audit' or PolicyDefinitionAction eq 'deny'

# Aggregate by compliance state
$apply=groupby((ComplianceState), aggregate($count as Count))

# Count non-compliant per policy
$apply=groupby((PolicyAssignmentId, PolicyDefinitionId), aggregate($count as NumNonCompliant))
```

## Common Posture Patterns

### Pattern 1: Baseline Coverage Assessment

1. `GET /providers/Microsoft.Authorization/policySetDefinitions/{cis-guid}` — get CIS initiative details
2. `GET /subscriptions/{id}/providers/Microsoft.Authorization/policyAssignments` — list assignments
3. Verify the baseline initiative is assigned at the target scope
4. `POST .../policyStates/latest/summarize` — get compliance summary
5. Calculate coverage: `Compliant / (Compliant + NonCompliant) * 100`
6. Flag control areas below 90% coverage for remediation

### Pattern 2: Compliance Drift Detection

1. `POST .../policyStates/latest/queryResults` with `$from` = last scan date — get new non-compliant resources
2. Compare current non-compliance count vs baseline snapshot
3. Identify resources that were compliant but are now non-compliant
4. Check for new exemptions that may mask drift
5. Produce drift report with severity classification and change attribution

### Pattern 3: Exemption Lifecycle Review

1. `GET /subscriptions/{id}/providers/Microsoft.Authorization/policyExemptions` — list all exemptions
2. Flag exemptions past `expiresOn` date — expired but still present
3. Flag exemptions without `expiresOn` — permanent waivers requiring justification review
4. Verify each exemption has metadata: `requestedBy`, `approvedBy`, `ticketRef`
5. Produce aging report with time-since-creation and days-until-expiry

### Pattern 4: Remediation Wave Planning

1. `POST .../policyStates/latest/queryResults` — get all non-compliant resources
2. Group by `PolicyDefinitionAction` — separate `deny` (blocking) from `audit` (informational)
3. Prioritize: blocking violations first, then high-severity audits
4. Group by resource group and owner for batch remediation
5. Create remediation waves: Quick Wins (tag fixes, config changes) → Structural (architecture changes)
6. Assign owners and due dates per wave

## Decision Tree

1. Need to establish scope, baseline, severity model, or ownership? → `setup`
2. Need baseline adherence/guardrail completeness metrics? → `policy-coverage`
3. Need changes/regressions over time, including exemption aging? → `drift-analysis`
4. Need execution roadmap from existing coverage/drift findings? → `remediation-plan`
5. Full posture-to-execution workflow? Run: `setup` → `policy-coverage` / `drift-analysis` → `remediation-plan`

## Minimal References

- `azure-policy-security/commands/setup.md`
- `azure-policy-security/commands/policy-coverage.md`
- `azure-policy-security/commands/drift-analysis.md`
- `azure-policy-security/commands/remediation-plan.md`
- `azure-policy-security/README.md`
