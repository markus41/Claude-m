# Azure SQL Database Security and Compliance — Deep Reference

## Overview

Azure SQL Database provides multiple security layers: network isolation (firewall, private endpoint, VNet rules), authentication (SQL auth, Entra ID, managed identity), authorization (roles and row-level security), data protection (TDE, Always Encrypted, Dynamic Data Masking), and threat detection (Microsoft Defender for SQL, auditing). This reference covers configuration patterns for all security layers.

## REST API Endpoints

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|---|---|---|---|---|
| PUT | `/servers/{server}/auditingSettings/default` | SQL Security Manager | `state: Enabled`, storage/LAWS target | Enable server auditing |
| PUT | `/servers/{server}/databases/{db}/auditingSettings/default` | SQL Security Manager | `state: Enabled` | Enable database-level auditing |
| PUT | `/servers/{server}/securityAlertPolicies/default` | SQL Security Manager | `state: Enabled`, alerts list | Enable Defender for SQL |
| PUT | `/servers/{server}/databases/{db}/transparentDataEncryption/current` | SQL DB Contributor | `state: Enabled\|Disabled` | Toggle TDE |
| PUT | `/servers/{server}/encryptionProtector/current` | SQL Server Contributor | `serverKeyType: AzureKeyVault`, `uri` | Use CMK for TDE |
| PUT | `/servers/{server}/databases/{db}/dataMaskingPolicies/Default` | SQL Security Manager | `dataMaskingState: Enabled` | Enable Dynamic Data Masking |
| PUT | `/servers/{server}/databases/{db}/dataMaskingPolicies/Default/rules/{rule}` | SQL Security Manager | Column, masking function | Add masking rule |
| PUT | `/servers/{server}/databases/{db}/vulnerabilityAssessments/default` | SQL Security Manager | Storage container URI | Enable Vulnerability Assessment |
| POST | `/servers/{server}/databases/{db}/vulnerabilityAssessments/default/scans/{scan}/triggerScan` | SQL Security Manager | — | Run VA scan |
| PUT | `/servers/{server}/administrators/{admin}` | SQL Server Contributor | `administratorType: ActiveDirectory`, login, SID | Set Entra ID admin |

Base: `https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}`

## Azure CLI Patterns — Security Configuration

```bash
# Enable Entra ID authentication (recommended — disable SQL auth for prod)
az sql server ad-admin create \
  --server-name sql-prod-eastus \
  --resource-group rg-databases \
  --display-name "SQL Admins" \
  --object-id "<aad-group-object-id>"

# Disable SQL password authentication (Entra-only mode)
az sql server update \
  --name sql-prod-eastus \
  --resource-group rg-databases \
  --enable-public-network false \
  --restrict-outbound-network-access true

# Enable auditing to Log Analytics
LAWS_ID=$(az monitor log-analytics workspace show \
  --name laws-security \
  --resource-group rg-monitoring \
  --query id -o tsv)

az sql server audit-policy update \
  --name sql-prod-eastus \
  --resource-group rg-databases \
  --state Enabled \
  --lats Enabled \
  --lawri "$LAWS_ID"

# Enable Microsoft Defender for SQL
az sql server microsoft-support-auditing-policy update \
  --name sql-prod-eastus \
  --resource-group rg-databases \
  --state Enabled

az sql server threat-policy update \
  --name sql-prod-eastus \
  --resource-group rg-databases \
  --state Enabled \
  --email-account-admins true \
  --email-addresses security@contoso.com \
  --storage-account mystorageaccount

# Enable Vulnerability Assessment
az sql db vulnerability-assessment setting update \
  --server-name sql-prod-eastus \
  --resource-group rg-databases \
  --database-name db-app-prod \
  --storage-account mystorageaccount \
  --storage-key "$STORAGE_KEY" \
  --storage-endpoint "https://mystorageaccount.blob.core.windows.net/vulnerability-assessment/" \
  --auto-scan-enabled true \
  --emails security@contoso.com

# Enable Customer-Managed Key (CMK) for TDE
KEY_URI=$(az keyvault key show \
  --vault-name mykeyvault \
  --name sql-tde-key \
  --query key.kid -o tsv)

az sql server key create \
  --server sql-prod-eastus \
  --resource-group rg-databases \
  --kid "$KEY_URI"

az sql server tde-key set \
  --server sql-prod-eastus \
  --resource-group rg-databases \
  --server-key-type AzureKeyVault \
  --kid "$KEY_URI"
```

## T-SQL Security Patterns

### Row-Level Security (RLS)

```sql
-- Create a schema for security objects
CREATE SCHEMA security;

-- Create predicate function for tenant isolation
CREATE FUNCTION security.fn_tenantAccessPredicate(@tenantId NVARCHAR(128))
RETURNS TABLE
WITH SCHEMABINDING
AS
RETURN
(
  SELECT 1 AS accessResult
  WHERE
    -- Service accounts with elevated access pass through
    IS_MEMBER('db_owner') = 1
    OR
    -- Regular users must match their tenant context
    CAST(SESSION_CONTEXT(N'TenantId') AS NVARCHAR(128)) = @tenantId
);

-- Apply RLS filter to Orders table
CREATE SECURITY POLICY security.TenantFilterPolicy
ADD FILTER PREDICATE security.fn_tenantAccessPredicate(TenantId) ON dbo.Orders,
ADD BLOCK PREDICATE security.fn_tenantAccessPredicate(TenantId) ON dbo.Orders AFTER INSERT
WITH (STATE = ON);

-- Application must set session context on every connection
-- (Do this in connection pooling middleware or as first statement)
EXEC sp_set_session_context N'TenantId', N'tenant-abc', @read_only = 1;

-- Verify RLS is active
SELECT * FROM sys.security_policies;
SELECT * FROM sys.security_predicates;
```

### Dynamic Data Masking

```sql
-- Mask email address (show only first character + domain)
ALTER TABLE dbo.Users
ALTER COLUMN Email ADD MASKED WITH (FUNCTION = 'email()');

-- Mask credit card number (show last 4 digits)
ALTER TABLE dbo.Payments
ALTER COLUMN CardNumber ADD MASKED WITH (FUNCTION = 'partial(0,"XXXX-XXXX-XXXX-",4)');

-- Mask date of birth (show only year)
ALTER TABLE dbo.Customers
ALTER COLUMN DateOfBirth ADD MASKED WITH (FUNCTION = 'default()');

-- Custom masking for phone numbers
ALTER TABLE dbo.Customers
ALTER COLUMN PhoneNumber ADD MASKED WITH (FUNCTION = 'partial(3,"XXX-XXXX-",0)');

-- Grant unmasked access to privileged user
GRANT UNMASK TO [privileged-user@contoso.com];
GRANT UNMASK ON dbo.Users(Email) TO [support-team@contoso.com]; -- column-level
```

### Always Encrypted

```sql
-- Always Encrypted encrypts data client-side; server never sees plaintext
-- Step 1: Create Column Master Key (CMK) in Azure Key Vault
-- (Done via SSMS wizard or PowerShell — references the AKV key)
CREATE COLUMN MASTER KEY CMK_Production
WITH (
  KEY_STORE_PROVIDER_NAME = N'AZURE_KEY_VAULT',
  KEY_PATH = N'https://mykeyvault.vault.azure.net/keys/sql-column-key/version'
);

-- Step 2: Create Column Encryption Key (CEK) encrypted with CMK
CREATE COLUMN ENCRYPTION KEY CEK_PII
WITH VALUES
(
  COLUMN_MASTER_KEY = CMK_Production,
  ALGORITHM = 'RSA_OAEP',
  ENCRYPTED_VALUE = 0x... -- generated by SSMS/PowerShell
);

-- Step 3: Create table with encrypted columns
CREATE TABLE dbo.Customers
(
  Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
  Name NVARCHAR(100) NOT NULL,
  -- Deterministic encryption: allows equality comparisons
  Email NVARCHAR(256) ENCRYPTED WITH (
    COLUMN_ENCRYPTION_KEY = CEK_PII,
    ENCRYPTION_TYPE = DETERMINISTIC,
    ALGORITHM = 'AEAD_AES_256_CBC_HMAC_SHA_256'
  ),
  -- Randomized encryption: strongest; no equality comparisons
  SSN NVARCHAR(11) ENCRYPTED WITH (
    COLUMN_ENCRYPTION_KEY = CEK_PII,
    ENCRYPTION_TYPE = RANDOMIZED,
    ALGORITHM = 'AEAD_AES_256_CBC_HMAC_SHA_256'
  )
);
```

### Database Roles and Permissions

```sql
-- Principle of least privilege: create app-specific role
CREATE ROLE app_readwrite;
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo TO app_readwrite;
DENY DELETE ON dbo.Orders TO app_readwrite; -- prevent accidental deletes
DENY TRUNCATE TABLE ON dbo.Orders TO app_readwrite;

-- Read-only role for reporting
CREATE ROLE app_readonly;
GRANT SELECT ON SCHEMA::dbo TO app_readonly;
DENY SELECT ON dbo.SensitiveData TO app_readonly; -- exclude sensitive tables

-- Create user from Entra ID managed identity
CREATE USER [api-service-managed-identity] FROM EXTERNAL PROVIDER;
ALTER ROLE app_readwrite ADD MEMBER [api-service-managed-identity];

-- Create user from Entra ID group
CREATE USER [sql-developers-group] FROM EXTERNAL PROVIDER;
ALTER ROLE db_datareader ADD MEMBER [sql-developers-group];

-- Check current permissions
SELECT * FROM sys.database_permissions WHERE grantee_principal_id = USER_ID('app_readwrite');
```

## TypeScript — Managed Identity Authentication

```typescript
import sql from "mssql";
import { DefaultAzureCredential } from "@azure/identity";

// Middleware: set tenant context on connection for RLS
async function createPoolWithTenantContext(tenantId: string): Promise<sql.ConnectionPool> {
  const credential = new DefaultAzureCredential();
  const tokenResponse = await credential.getToken("https://database.windows.net/.default");

  const pool = await new sql.ConnectionPool({
    server: "sql-prod-eastus.database.windows.net",
    database: "db-app-prod",
    authentication: {
      type: "azure-active-directory-access-token",
      options: { token: tokenResponse!.token },
    },
    options: { encrypt: true, trustServerCertificate: false },
  }).connect();

  // Set tenant context for Row-Level Security
  await pool.request()
    .input("tenantId", sql.NVarChar(128), tenantId)
    .query("EXEC sp_set_session_context N'TenantId', @tenantId, @read_only = 1");

  return pool;
}

// Usage
const pool = await createPoolWithTenantContext("tenant-abc");
const orders = await pool.request().query("SELECT * FROM dbo.Orders");
// RLS filter automatically restricts results to tenant-abc
```

## Error Codes

| Code | Meaning | Remediation |
|---|---|---|
| 15063 (Login lacks AAD) | Entra ID auth not configured | Set Entra ID admin first before creating AAD-based users |
| 33009 (Database principal) | External user already exists | `DROP USER IF EXISTS` then recreate |
| 8115 (Arithmetic overflow) | Column encryption type mismatch | Ensure client and server encryption configs match |
| 206 (Operand type clash) | Encrypted column comparison error | Cannot compare RANDOMIZED columns; use DETERMINISTIC |
| 3930 (Transaction active) | DDL inside active user transaction | Commit/rollback before schema changes |
| 15151 (GRANT on column) | Column-level permission requires table access | Grant table-level permission first, then restrict |

## Throttling Limits

| Resource | Limit | Notes |
|---|---|---|
| Auditing log retention | 90 days (storage) | Use Log Analytics retention for longer periods |
| Dynamic Data Masking rules | No limit (per column) | One masking function per column |
| Row-Level Security predicates | 1 filter + 1 block per operation per table | Use inline TVFs for complex predicates |
| Vulnerability Assessment scan | 1 concurrent scan | Queue scans; do not trigger while previous is running |

## Production Gotchas

- **Disable SQL authentication for production**: Use Entra ID-only authentication to eliminate password-based attack surface. Set `--enable-public-network false` and use managed identity for all application connections.
- **RLS and query plan caching**: When using Row-Level Security with `SESSION_CONTEXT`, ensure the same parameter value does not cause query plan reuse across tenants. Use parameterized queries and verify tenant isolation with `DBCC FREEPROCCACHE` tests.
- **CMK key rotation requires re-encryption**: When rotating the Column Master Key (CMK) for Always Encrypted, you must re-encrypt the Column Encryption Key (CEK) with the new CMK. This is done offline and requires all encrypted data to remain accessible during the rotation window.
- **Auditing increases DTU usage**: SQL Auditing adds overhead to every DML and DDL operation. For high-volume databases, measure the DTU impact of auditing and provision additional capacity. Sending to Log Analytics has lower latency than storage-based auditing.
- **Dynamic Data Masking is not true security**: DDM masks data in query results but does not encrypt data at rest. Privileged users (db_owner, sysadmin) and any user with UNMASK permission see plaintext. Use Always Encrypted for true column-level encryption where DBA cannot see data.
- **Defender for SQL alerts are near-real-time**: Microsoft Defender alerts (suspicious login patterns, SQL injection attempts, unusual access) appear in the Azure portal and Defender for Cloud within minutes. Configure action groups to route these alerts to your SIEM (Sentinel).
