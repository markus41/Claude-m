# Warehouse Provisioning

## Overview

Fabric Data Warehouse is provisioned as an item within a Fabric workspace. Provisioning is available via the Fabric portal, the Fabric REST API, and PowerShell/Terraform for infrastructure-as-code workflows. This reference covers warehouse creation via the Fabric REST API, connection string patterns, Fabric workspace RBAC, SQL authentication vs Entra ID, and cross-workspace access via shortcuts.

---

## Fabric REST API — Warehouse Provisioning

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| POST | `/v1/workspaces/{workspaceId}/items` | Workspace Contributor | `type=Warehouse`, `displayName`, `description` | Creates warehouse asynchronously |
| GET | `/v1/workspaces/{workspaceId}/items?type=Warehouse` | Workspace Viewer | — | Lists all warehouses in workspace |
| GET | `/v1/workspaces/{workspaceId}/warehouses/{warehouseId}` | Workspace Viewer | — | Gets warehouse metadata and connection info |
| PATCH | `/v1/workspaces/{workspaceId}/items/{warehouseId}` | Workspace Contributor | `displayName`, `description` | Update warehouse name or description |
| DELETE | `/v1/workspaces/{workspaceId}/items/{warehouseId}` | Workspace Admin | — | Permanently deletes warehouse and data |
| GET | `/v1/workspaces/{workspaceId}/warehouses/{warehouseId}/sqlEndpoint` | Workspace Viewer | — | Returns SQL connection info |

**Base URL**: `https://api.fabric.microsoft.com`
**Auth scope**: `https://api.fabric.microsoft.com/.default`

### Create a Warehouse

```bash
TOKEN=$(az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken -o tsv)

curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "Warehouse",
    "displayName": "SalesWarehouse",
    "description": "Enterprise sales data warehouse — production"
  }'
```

Response example:
```json
{
  "id": "a1b2c3d4-...",
  "type": "Warehouse",
  "displayName": "SalesWarehouse",
  "workspaceId": "...",
  "description": "Enterprise sales data warehouse — production"
}
```

**Important**: After creation the warehouse may take 30–60 seconds to fully provision its SQL endpoint. Poll the warehouse endpoint or wait before connecting.

### Get SQL Endpoint Connection Info

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/warehouses/<warehouse-id>"
```

Response includes `properties.sqlEndpoint.connectionString`:
```
<workspace-guid>.datawarehouse.fabric.microsoft.com
```

### List All Warehouses in a Workspace

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items?type=Warehouse" \
  | python -m json.tool
```

---

## Connection String Patterns

### SSMS / Azure Data Studio

```
Server:         <workspace-guid>.datawarehouse.fabric.microsoft.com
Database:       <warehouse-display-name>
Authentication: Azure Active Directory — Universal with MFA
                (or Azure Active Directory — Password for service principals)
Encrypt:        Yes
```

### .NET / Python / JDBC Connection Strings

```python
# Python (pyodbc)
import pyodbc

conn_str = (
    "Driver={ODBC Driver 18 for SQL Server};"
    "Server=<workspace-guid>.datawarehouse.fabric.microsoft.com;"
    "Database=SalesWarehouse;"
    "Authentication=ActiveDirectoryInteractive;"  # for user identity
    "Encrypt=yes;"
    "TrustServerCertificate=no;"
)
conn = pyodbc.connect(conn_str)

# Service principal (unattended)
conn_str_sp = (
    "Driver={ODBC Driver 18 for SQL Server};"
    "Server=<workspace-guid>.datawarehouse.fabric.microsoft.com;"
    "Database=SalesWarehouse;"
    "UID=<app-client-id>;"
    "PWD=<client-secret>;"
    "Authentication=ActiveDirectoryServicePrincipal;"
    "Encrypt=yes;"
)
```

```csharp
// C# — SqlClient with Entra ID (formerly AAD)
var connStr = new SqlConnectionStringBuilder
{
    DataSource = "<workspace-guid>.datawarehouse.fabric.microsoft.com",
    InitialCatalog = "SalesWarehouse",
    Authentication = SqlAuthenticationMethod.ActiveDirectoryInteractive,
    Encrypt = SqlConnectionEncryptOption.Mandatory
};
```

### dbt Profile

```yaml
# profiles.yml — dbt with Fabric Warehouse
sales_dw:
  target: prod
  outputs:
    prod:
      type:     fabric
      driver:   'ODBC Driver 18 for SQL Server'
      server:   <workspace-guid>.datawarehouse.fabric.microsoft.com
      database: SalesWarehouse
      schema:   dbt_sales
      authentication: CLI  # Uses az CLI token
      encrypt:  true
```

---

## Workspace RBAC

Workspace roles govern broad access to all items in the workspace, including the warehouse.

| Role | SQL Access | Item Management | Notes |
|------|-----------|----------------|-------|
| Admin | Full control (implicit `db_owner`) | Manage all workspace settings, roles | Reserve for platform team |
| Member | Read/write all tables | Create/delete any item, share items | For data engineers |
| Contributor | Read/write all tables | Create/delete own items | For ETL service principals |
| Viewer | Read-only (SELECT on all tables) | View items only | For analysts consuming reports |

### Add a Role Assignment via API

```bash
curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/roleAssignments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "principal": {
      "id":   "<user-or-group-object-id>",
      "type": "User"
    },
    "role": "Viewer"
  }'
```

Supported principal types: `User`, `Group`, `ServicePrincipal`.

### Warehouse-Level SQL Permissions (Granular)

Workspace roles grant broad access. Use T-SQL `GRANT`/`DENY` for fine-grained schema- or object-level control.

```sql
-- Grant SELECT on reporting schema to an analyst group
GRANT SELECT ON SCHEMA::rpt TO [analysts@contoso.com];

-- Grant ETL role permission to write staging tables
GRANT INSERT, UPDATE, DELETE ON SCHEMA::staging TO [etl-svc@contoso.com];

-- Deny access to a sensitive table even for Members
DENY SELECT ON dim.Employee TO [analysts@contoso.com];

-- Grant EXECUTE on stored procedures for the ETL service principal
GRANT EXECUTE ON SCHEMA::staging TO [etl-svc@contoso.com];

-- Check current permissions
SELECT * FROM sys.database_permissions WHERE grantee_principal_id = DATABASE_PRINCIPAL_ID('analysts@contoso.com');
```

---

## SQL Authentication vs Entra ID

Fabric Data Warehouse supports only **Entra ID (Azure Active Directory)** authentication. There are no SQL logins, no `sa` account, no username/password SQL auth.

| Method | Supported | Use Case |
|--------|----------|---------|
| Entra ID — Interactive (browser) | Yes | SSMS, Azure Data Studio, manual queries |
| Entra ID — Service Principal | Yes | CI/CD pipelines, automated ETL |
| Entra ID — Managed Identity | Yes | Azure-hosted services (VMs, Functions, AKS) |
| Entra ID — Workspace Identity | Yes | Cross-workspace Fabric operations |
| SQL Login / password | No | Not supported |
| Storage account key / SAS | No | Not applicable |

### Entra ID Token Acquisition

```bash
# Interactive user token (Azure CLI)
az account get-access-token \
  --resource https://database.windows.net/ \
  --query accessToken -o tsv

# Service principal token
az account get-access-token \
  --tenant   <tenant-id> \
  --resource https://database.windows.net/ \
  --query accessToken -o tsv
```

### Connect with Managed Identity (Azure-hosted)

```python
import struct
from azure.identity import ManagedIdentityCredential
import pyodbc

cred = ManagedIdentityCredential()
token = cred.get_token("https://database.windows.net/.default")
token_bytes = token.token.encode("UTF-16-LE")
token_struct = struct.pack(f"<I{len(token_bytes)}s", len(token_bytes), token_bytes)

conn = pyodbc.connect(
    "Driver={ODBC Driver 18 for SQL Server};"
    "Server=<workspace-guid>.datawarehouse.fabric.microsoft.com;"
    "Database=SalesWarehouse;",
    attrs_before={1256: token_struct}  # SQL_COPT_SS_ACCESS_TOKEN = 1256
)
```

---

## Cross-Workspace Access via Shortcuts

Shortcuts allow one warehouse to reference data from another lakehouse or warehouse in a different workspace without duplicating data.

### Create a Cross-Workspace OneLake Shortcut

1. In the source workspace: enable workspace identity.
2. In the source lakehouse item: grant the consumer workspace identity at least Viewer + ReadAll access.
3. In the consumer warehouse's associated lakehouse: create a OneLake shortcut pointing to the source.

```bash
# Create shortcut in consumer lakehouse pointing to source lakehouse table
curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/<consumer-workspace-id>/items/<consumer-lakehouse-id>/shortcuts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "shared_dim_customers",
    "path": "Tables",
    "target": {
      "oneLake": {
        "workspaceId": "<source-workspace-id>",
        "itemId":      "<source-lakehouse-id>",
        "path":        "Tables/dim_customers"
      }
    }
  }'
```

After the shortcut is created, the table is queryable via three-part naming from any warehouse in the consumer workspace:

```sql
SELECT * FROM ConsumerLakehouse.dbo.shared_dim_customers;
```

### Cross-Workspace Query via Three-Part Name

Three-part naming works within the same workspace by default. For cross-workspace access, create shortcuts first:

```sql
-- Same workspace — direct three-part naming
SELECT c.CustomerName, SUM(f.TotalAmount) AS Revenue
FROM SalesLakehouse.dbo.raw_orders o
JOIN SalesWarehouse.dim.Customer c ON o.customer_id = c.CustomerID
GROUP BY c.CustomerName;

-- Cross-workspace — requires shortcut in a local lakehouse
SELECT * FROM LocalLakehouse.dbo.shared_dim_customers;  -- shortcut to another workspace
```

---

## Naming Conventions

| Object | Convention | Example |
|--------|-----------|---------|
| Warehouse | PascalCase, environment suffix | `SalesWarehouse_Prod`, `ReportingWarehouse_Dev` |
| Schema | lowercase | `dim`, `fact`, `staging`, `rpt` |
| Table | PascalCase with schema prefix | `dim.Customer`, `fact.Sales`, `staging.RawOrders` |
| View | `vw_` prefix | `rpt.vw_MonthlySales` |
| Stored procedure | `usp_` prefix | `staging.usp_LoadCustomers` |
| Index (statistics) | `stat_<table>_<column>` | `stat_Sales_OrderDate` |

---

## Error Codes Table

| Error | Meaning | Remediation |
|-------|---------|-------------|
| `Login failed for user '<token-identified-principal>'` | Entra ID principal not added to workspace | Add user/SPN/managed identity to workspace with appropriate role |
| `The server principal is not able to access the database` | Workspace Viewer role but no SQL-level grant | Add `GRANT SELECT ON SCHEMA::rpt TO [user@tenant.com]` |
| `Could not connect to server` | SQL endpoint not yet provisioned | Wait 60 s after creation; verify correct connection string |
| `Database '<name>' does not exist` | Warehouse name in connection string is wrong | Use the exact display name (case-sensitive in some drivers) |
| HTTP 404 on warehouse API | Incorrect workspace or warehouse GUID | Verify GUIDs via `GET /workspaces/{id}/items` |
| HTTP 409 on warehouse creation | Warehouse with same name exists in workspace | Use a unique name or delete the existing one first |
| HTTP 403 on workspace role assignment | Calling identity is not workspace Admin | Elevate to Admin or ask workspace Admin to add the role |
| HTTP 429 on Fabric REST API | Rate limit exceeded | Implement exponential backoff; reduce request frequency |
| `COPY INTO error: The specified blob does not exist` | ADLS path in COPY INTO is wrong | Verify path, file name, and SAS token permissions |

---

## Throttling / Limits Table

| Resource | Limit | Notes |
|----------|-------|-------|
| Warehouses per workspace | No documented hard limit | Practical: keep related warehouses together; separate by domain |
| Concurrent queries per warehouse | ~4 (F2) to ~50+ (F128) | Exceeding limit queues queries |
| Max table name length | 128 characters | Standard SQL Server limit |
| Max columns per table | 1,024 | Standard SQL Server limit |
| Max column name length | 128 characters | Standard SQL Server limit |
| Fabric REST API requests | 1,000/minute per user | Use exponential backoff; prefer service principal for automation |
| Workspace role assignments | 100 per workspace | Use security groups to stay within limit |
| Connection timeout (idle) | 30 minutes | Re-connect on timeout; use connection pooling |
| Cross-workspace shortcuts | No documented limit | Large numbers of shortcuts increase metadata overhead |

---

## Common Patterns and Gotchas

### Gotcha: Warehouse Provisioning is Asynchronous

After the `POST /items` API call returns HTTP 201, the warehouse SQL endpoint may not be ready immediately. Attempting to connect before provisioning completes yields a connection error.

**Solution**: Poll the warehouse endpoint until `properties.sqlEndpoint.provisioningStatus = Succeeded`.

```bash
until curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/workspaces/$WS_ID/warehouses/$WH_ID" \
  | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('properties',{}).get('sqlEndpoint',{}).get('provisioningStatus'))" \
  | grep -q "Succeeded"; do
  echo "Waiting for warehouse to provision..."
  sleep 10
done
echo "Warehouse ready."
```

### Gotcha: Workspace Identity vs User Identity for Shortcuts

Cross-workspace shortcuts work only when the consumer workspace identity has been granted access to the source item. If workspace identity is not enabled on the source workspace, shortcuts fail silently with access denied errors.

### Pattern: Environment-Specific Warehouses with Deployment Pipelines

Use Fabric Deployment Pipelines to promote warehouse definitions (tables, views, stored procedures) from Dev → Test → Prod without re-creating manually.

1. Create three workspaces: `SalesAnalytics_Dev`, `SalesAnalytics_Test`, `SalesAnalytics_Prod`.
2. Add a Fabric Deployment Pipeline linking the three stages.
3. Develop and test in Dev; promote to Test and then Prod via the pipeline.
4. Each warehouse keeps the same name but lives in a different workspace with environment-appropriate data.
