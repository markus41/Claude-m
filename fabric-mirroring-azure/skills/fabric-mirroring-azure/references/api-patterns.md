# API Patterns for fabric-mirroring-azure

## Core Fabric Mirroring Endpoints

Base endpoint: `https://api.fabric.microsoft.com/v1`

| Purpose | Method | Endpoint pattern |
|---|---|---|
| List mirrored databases | GET | `/workspaces/{workspaceId}/mirroredDatabases` |
| Get mirrored database | GET | `/workspaces/{workspaceId}/mirroredDatabases/{mirroredDatabaseId}` |
| Create mirrored database | POST | `/workspaces/{workspaceId}/mirroredDatabases` |
| Start mirroring | POST | `/workspaces/{workspaceId}/mirroredDatabases/{mirroredDatabaseId}/startMirroring` |
| Stop mirroring | POST | `/workspaces/{workspaceId}/mirroredDatabases/{mirroredDatabaseId}/stopMirroring` |
| Table status | GET | `/workspaces/{workspaceId}/mirroredDatabases/{mirroredDatabaseId}/tableStatuses` |

## Source Readiness Patterns

### Azure Cosmos DB
- Verify account reachability and role assignment before creation.
- Confirm change feed support and partition key strategy.

### Azure Database for PostgreSQL
- Verify logical replication requirements (`wal_level=logical`, replication slot capacity).
- Validate network path and SSL requirements before mirroring start.

### Azure Databricks Catalog
- Restrict mirrored scope to approved catalogs and schemas.
- Validate Unity Catalog grants and object visibility before onboarding.

### Azure SQL Database and SQL Managed Instance
- Verify CDC prerequisites and required SQL permissions.
- Pre-check firewall/private endpoint access and long-running snapshot expectations.

## Fail-Fast Error Mapping

| Error code | Meaning | Typical next action |
|---|---|---|
| `MissingIntegrationContext` | Required context field absent | Run setup and provide required fields. |
| `InvalidIntegrationContext` | Field malformed or unsupported | Correct GUID/enum and rerun validation. |
| `InsufficientScopesOrRoles` | Identity lacks required grants | Add required role/scope, then retry. |
| `ContextCloudMismatch` | Cloud context does not match endpoint | Align cloud setting and endpoints. |

## Redaction Pattern

Use redacted IDs in outputs:

```json
{
  "workspaceId": "3f9a4c...2b10",
  "mirroredDatabaseId": "8dc194...f203",
  "status": "Replicating"
}
```
