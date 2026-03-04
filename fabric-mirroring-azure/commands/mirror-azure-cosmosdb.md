---
name: mirror-azure-cosmosdb
description: Onboard Azure Cosmos DB mirroring with change feed, identity, and scope checks.
argument-hint: "[account-name] [database] [container-pattern]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Mirror Azure Cosmos DB

## Prerequisites and Permissions

- Validate integration context using [`docs/integration-context.md`](../../docs/integration-context.md).
- Fabric workspace role: `Contributor` or higher.
- Azure permission: `Cosmos DB Account Reader Role` plus required data-plane read access.
- Cosmos DB source must expose supported change feed behavior for selected containers.

## Deterministic Steps

1. Validate context fields and confirm source subscription matches requested account scope.
2. Resolve Cosmos DB account, database, and container list from explicit input.
3. Validate identity mapping (managed identity/account key/service principal) and reject ambiguous auth.
4. Run read-only checks for container partition keys and change feed readiness.
5. Create mirrored database source mapping limited to approved containers.
6. Start mirroring and immediately query table/container replication status.
7. Publish a redacted onboarding summary with initial lag and next validation time.

## Fail-Fast Rules

- Stop on missing container scope or unsupported container configuration.
- Stop on identity/permission mismatch before mirroring creation.
- Stop when change feed validation fails for any selected container.

## Redaction Requirements

- Redact account IDs, subscription IDs, workspace IDs, and principal IDs.
- Exclude account keys and connection strings from all outputs.

## Example Redacted Output

```json
{
  "source": "cosmosdb",
  "accountId": "c1e7aa...0c2d",
  "containersMirrored": 4,
  "initialStatus": "SnapshotInProgress"
}
```
