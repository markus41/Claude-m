---
name: mirror-azure-sql-managed-instance
description: Onboard SQL Managed Instance mirroring with CDC and network-isolation validation.
argument-hint: "[managed-instance] [database] [table-filter]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Mirror Azure SQL Managed Instance

## Prerequisites and Permissions

- Validate integration context using [`docs/integration-context.md`](../../docs/integration-context.md).
- Fabric workspace role: `Contributor` or higher.
- SQL Managed Instance principal with CDC-related permissions and table read access.
- Private networking and DNS path validated for managed instance connectivity.

## Deterministic Steps

1. Validate context and resolve SQL Managed Instance endpoint and database.
2. Run read-only checks for CDC support, recovery model compatibility, and table eligibility.
3. Validate principal grants for selected schemas and tables.
4. Validate network route, DNS resolution, and firewall rules for Fabric access.
5. Create mirrored mapping for explicit table allowlist.
6. Start mirroring and poll until each table reports a valid phase.
7. Return a redacted status block with lag baseline and escalation threshold.

## Fail-Fast Rules

- Stop when CDC prerequisites are not satisfied.
- Stop when private network prerequisites are missing.
- Stop when table scope or permissions violate onboarding policy.

## Redaction Requirements

- Redact managed instance identifiers, tenant/subscription IDs, and principal IDs.
- Never output passwords, secrets, or full private endpoint addresses.

## Example Redacted Output

```json
{
  "source": "sql-managed-instance",
  "instanceId": "mi-prod...91af",
  "tablesMirrored": 18,
  "status": "Replicating"
}
```
