---
name: mirror-external-sap
description: Onboard SAP source mirroring with object-scope and authorization checks.
argument-hint: "[sap-system] [object-allowlist]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Mirror External SAP

## Prerequisites and Permissions

- Validate integration context using [`docs/integration-context.md`](../../docs/integration-context.md).
- Fabric workspace role: `Contributor` or higher.
- SAP source authorization for selected extraction objects.
- Approved business-domain object allowlist.

## Deterministic Steps

1. Validate context and explicit SAP system/object inputs.
2. Run read-only source discovery and object availability checks.
3. Validate source authorizations for all selected objects.
4. Restrict object set to approved business-domain allowlist.
5. Create mirroring mapping for approved objects.
6. Start mirroring and capture first replication status.
7. Return redacted results with object-level success/failure details.

## Fail-Fast Rules

- Stop when object scope is undefined or too broad.
- Stop when SAP authorizations are missing for selected objects.
- Stop when source connectivity or compatibility checks fail.

## Redaction Requirements

- Redact tenant/workspace IDs and SAP system identifiers when sensitive.
- Never output credentials, tokens, or secrets.

## Example Redacted Output

```json
{
  "source": "sap",
  "systemHandle": "sap-erp...22f1",
  "objectsMirrored": 15,
  "status": "Replicating"
}
```
