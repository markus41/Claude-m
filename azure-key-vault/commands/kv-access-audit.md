---
name: kv-access-audit
description: "Audit Key Vault RBAC assignments, review network rules, and check access logs"
argument-hint: "--vault <vault-name> [--check-logs] [--check-network]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Audit Key Vault Access

Review who has access to a Key Vault, network security posture, and recent access patterns.

## Instructions

### 1. Validate Inputs

- `--vault` -- Key Vault name. Ask if not provided.
- `--check-logs` -- Include diagnostic log analysis (requires Log Analytics workspace).
- `--check-network` -- Include network rule review.

### 2. Review RBAC Role Assignments

```bash
# Get the vault resource ID
VAULT_ID=$(az keyvault show --name <vault-name> --query id -o tsv)

# List all role assignments on the vault
az role assignment list \
  --scope "$VAULT_ID" \
  --query "[].{principal:principalName, role:roleDefinitionName, principalType:principalType, scope:scope}" \
  -o table

# Check if RBAC authorization is enabled (vs legacy access policies)
az keyvault show --name <vault-name> --query "properties.enableRbacAuthorization"
```

Flag the following:
- **Overly broad roles**: `Owner`, `Contributor`, or `Key Vault Administrator` assigned to service principals that only need read access.
- **Subscription-scoped assignments**: Role assignments at subscription or resource group level that grant unintended Key Vault access.
- **Stale principals**: Service principals or users that no longer exist (orphaned assignments).
- **Access policies in use**: If `enableRbacAuthorization` is `false`, list the legacy access policies and recommend migration to RBAC.

### 3. Review Legacy Access Policies (if applicable)

```bash
az keyvault show --name <vault-name> \
  --query "properties.accessPolicies[].{objectId:objectId, tenantId:tenantId, secrets:permissions.secrets, keys:permissions.keys, certificates:permissions.certificates}" \
  -o table
```

Flag access policies with:
- `all` permissions on any category
- `purge` permission granted broadly
- Unknown or unresolvable object IDs

### 4. Review Network Security (--check-network)

```bash
# Show network ACLs
az keyvault show --name <vault-name> \
  --query "properties.networkAcls.{defaultAction:defaultAction, bypass:bypass, ipRules:ipRules[].value, virtualNetworkRules:virtualNetworkRules[].id}"

# Check for private endpoints
az network private-endpoint-connection list \
  --id "$VAULT_ID" \
  --query "[].{name:name, status:privateLinkServiceConnectionState.status}" \
  -o table

# Check public network access
az keyvault show --name <vault-name> \
  --query "properties.publicNetworkAccess"
```

Flag:
- `defaultAction: "Allow"` in production environments.
- No private endpoint connections for production vaults.
- Overly broad IP ranges in firewall rules (e.g., `/8` or `/16` CIDR blocks).
- `bypass` set to `"AzureServices"` without understanding which Azure services this allows.

### 5. Review Diagnostic Logs (--check-logs)

If a Log Analytics workspace is connected:

```bash
# Check if diagnostics are configured
az monitor diagnostic-settings list --resource "$VAULT_ID" -o table
```

Provide KQL queries for the user to run in Log Analytics:

**Recent access events**:
```
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.KEYVAULT"
| where ResourceId contains "<vault-name>"
| where TimeGenerated > ago(7d)
| summarize count() by CallerIPAddress, OperationName, ResultType
| order by count_ desc
```

**Failed access attempts**:
```
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.KEYVAULT"
| where ResultType != "Success"
| where TimeGenerated > ago(7d)
| project TimeGenerated, CallerIPAddress, OperationName, ResultDescription
| order by TimeGenerated desc
```

**Secret access patterns**:
```
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.KEYVAULT"
| where OperationName == "SecretGet"
| where TimeGenerated > ago(30d)
| summarize count() by CallerIPAddress, identity_claim_oid_s
| order by count_ desc
```

### 6. Generate Report

Produce a summary table:

```
## Key Vault Access Audit: <vault-name>

### RBAC Assignments
| Principal | Type | Role | Scope | Finding |
|-----------|------|------|-------|---------|

### Network Security
| Check | Status | Details |
|-------|--------|---------|
| RBAC enabled | PASS/FAIL | |
| Firewall default deny | PASS/FAIL | |
| Private endpoints | PASS/FAIL | |
| Diagnostics enabled | PASS/FAIL | |

### Recommendations
- [ ] [Actionable recommendation]
```
