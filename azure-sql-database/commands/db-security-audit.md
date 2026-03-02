---
name: db-security-audit
description: "Audit Azure SQL and Cosmos DB security posture — firewall rules, TDE, data masking, AAD auth, network isolation"
argument-hint: "--server <server> [--cosmos-account <account>] --rg <resource-group>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Database Security Audit

Audit the security posture of Azure SQL Database and/or Cosmos DB resources.

## Instructions

### 1. Validate Inputs

- `--server` — Azure SQL logical server name. Optional if only auditing Cosmos DB.
- `--cosmos-account` — Cosmos DB account name. Optional if only auditing SQL.
- `--rg` — Resource group name. Required.

At least one of `--server` or `--cosmos-account` must be provided.

### 2. Azure SQL Security Checks

#### 2a. Firewall Rules
```bash
az sql server firewall-rule list --server <server> --resource-group <rg> -o table
```

Flag:
- Rules with `startIpAddress=0.0.0.0` and `endIpAddress=255.255.255.255` (allow all)
- More than 10 individual IP rules (suggest virtual network rules instead)
- Missing `AllowAzureServices` rule if Azure-hosted apps need access

#### 2b. Azure AD Authentication
```bash
az sql server ad-admin list --server <server> --resource-group <rg>
```

Flag:
- No Azure AD admin configured (SQL-only auth is less secure)
- Recommend enabling Azure AD-only authentication for production

#### 2c. TDE (Transparent Data Encryption)
```bash
az sql db tde show --server <server> --resource-group <rg> --database <db>
```

Flag:
- TDE status is `Disabled` on any database
- TDE using service-managed key (recommend customer-managed key for compliance)

#### 2d. Auditing
```bash
az sql db audit-policy show --server <server> --resource-group <rg> --name <db>
```

Flag:
- Auditing is disabled
- Audit logs not sent to Log Analytics or storage account

#### 2e. Advanced Threat Protection
```bash
az sql db threat-policy show --server <server> --resource-group <rg> --name <db>
```

Flag:
- Threat detection is disabled
- Email notifications not configured for alerts

#### 2f. Data Masking
```bash
az sql db data-masking-rule list --server <server> --resource-group <rg> --name <db>
```

Flag:
- No masking rules on tables with columns named `email`, `ssn`, `phone`, `creditcard`, `password`

#### 2g. Private Endpoint
```bash
az sql server list --resource-group <rg> --query "[].publicNetworkAccess" -o table
az network private-endpoint list --resource-group <rg> --query "[?privateLinkServiceConnections[?groupIds[?contains(@,'sqlServer')]]]"
```

Flag:
- Public network access enabled without private endpoint

### 3. Cosmos DB Security Checks

#### 3a. Network Isolation
```bash
az cosmosdb show --name <account> --resource-group <rg> --query "{publicAccess:publicNetworkAccess, ipRules:ipRules, vnetRules:virtualNetworkRules}"
```

Flag:
- Public network access enabled without IP or VNET restrictions
- No private endpoints configured for production accounts

#### 3b. Authentication
```bash
az cosmosdb show --name <account> --resource-group <rg> --query "{disableLocalAuth:disableLocalAuth, disableKeyBasedMetadataWriteAccess:disableKeyBasedMetadataWriteAccess}"
```

Flag:
- Local (key-based) authentication enabled on production accounts
- Recommend enabling Azure AD RBAC and disabling key-based auth

#### 3c. Encryption
```bash
az cosmosdb show --name <account> --resource-group <rg> --query "keyVaultKeyUri"
```

Flag:
- No customer-managed encryption key (using service-managed is acceptable but CMK is better for compliance)

#### 3d. CORS
```bash
az cosmosdb show --name <account> --resource-group <rg> --query "cors"
```

Flag:
- CORS allows `*` origin

### 4. Generate Report

Produce a security audit report:

```
## Database Security Audit Report

**Date**: <current date>
**Resources Audited**: <list of servers/accounts>

### Azure SQL: <server-name>

| Check | Status | Detail |
|-------|--------|--------|
| Firewall rules | PASS/WARN/FAIL | <detail> |
| Azure AD auth | PASS/WARN/FAIL | <detail> |
| TDE | PASS/WARN/FAIL | <detail> |
| Auditing | PASS/WARN/FAIL | <detail> |
| Threat detection | PASS/WARN/FAIL | <detail> |
| Data masking | PASS/WARN/FAIL | <detail> |
| Private endpoint | PASS/WARN/FAIL | <detail> |

### Cosmos DB: <account-name>

| Check | Status | Detail |
|-------|--------|--------|
| Network isolation | PASS/WARN/FAIL | <detail> |
| Authentication | PASS/WARN/FAIL | <detail> |
| Encryption | PASS/WARN/FAIL | <detail> |
| CORS | PASS/WARN/FAIL | <detail> |

### Remediation Steps
1. [Prioritized list of fixes]
```

### 5. Display Summary

Show the user:
- Overall security score (Critical/Warning/Pass counts)
- Top priority remediations
- Next steps: apply fixes, re-run audit, or escalate to security team
