# API Patterns for fabric-mirroring-external

## Core Fabric Mirroring Endpoints

Base endpoint: `https://api.fabric.microsoft.com/v1`

| Purpose | Method | Endpoint pattern |
|---|---|---|
| List mirrored databases | GET | `/workspaces/{workspaceId}/mirroredDatabases` |
| Create mirrored database | POST | `/workspaces/{workspaceId}/mirroredDatabases` |
| Start mirroring | POST | `/workspaces/{workspaceId}/mirroredDatabases/{mirroredDatabaseId}/startMirroring` |
| Stop mirroring | POST | `/workspaces/{workspaceId}/mirroredDatabases/{mirroredDatabaseId}/stopMirroring` |
| Table status | GET | `/workspaces/{workspaceId}/mirroredDatabases/{mirroredDatabaseId}/tableStatuses` |

## Source Onboarding Patterns

### Generic Databases
- Require explicit allowlist for schemas/tables.
- Verify authentication and TLS mode before mirroring start.

### BigQuery (Preview Caveat)
- Treat connector behavior as preview-sensitive.
- Validate project, dataset access, and fallback path before enabling mirroring.

### Oracle (Preview Caveat)
- Treat connector behavior as preview-sensitive.
- Validate archive/redo visibility assumptions and fallback path.

### SAP
- Validate source extraction scope and object-level authorization.
- Restrict mirrored scope to approved business domains.

### Snowflake
- Validate role grants for database/schema/table access.
- Confirm stream/change tracking prerequisites where required.

### SQL Server
- Validate CDC and required SQL permissions before mirroring start.
- Confirm network path and certificate trust chain.

## Fail-Fast Error Mapping

| Error code | Meaning | Typical next action |
|---|---|---|
| `MissingIntegrationContext` | Required context field absent | Run setup and provide required fields. |
| `InvalidIntegrationContext` | Field malformed or unsupported | Correct format/value and rerun. |
| `InsufficientScopesOrRoles` | Identity lacks required grants | Add grants then retry. |
| `SourcePrerequisiteFailed` | Source readiness check failed | Fix source settings and rerun onboarding. |

## Redaction Pattern

```json
{
  "workspaceId": "3f9a4c...2b10",
  "sourceHandle": "oracle-prod...17d2",
  "status": "Replicating"
}
```
