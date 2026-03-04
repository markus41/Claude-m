---
name: M365 Meeting Intelligence
description: >
  Deep expertise in M365 Meeting Intelligence operations with deterministic runbooks,
  fail-fast context validation, and redacted output requirements.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - meeting transcript
  - teams transcript
  - meeting commitments
  - meeting tasks
  - owner reminder
---

# M365 Meeting Intelligence

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../../../docs/integration-context.md)

| Workflow | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| M365 Meeting Intelligence operations | required | optional | `AzureCloud`* | delegated-user | `OnlineMeetings.Read.All`, `Calendars.Read`, `Tasks.ReadWrite` |

* Use sovereign cloud values from the canonical contract when applicable.

Fail fast before API calls when required context is missing or malformed. Redact tenant, subscription, and object identifiers.

## Command Surface

| Command | Purpose |
|---|---|
| `meeting-intelligence-setup` | Deterministic workflow for meeting intelligence setup. |
| `meeting-transcript-fetch` | Deterministic workflow for meeting transcript fetch. |
| `meeting-commitments-extract` | Deterministic workflow for meeting commitments extract. |
| `meeting-tasks-sync` | Deterministic workflow for meeting tasks sync. |
| `meeting-owner-reminders` | Deterministic workflow for meeting owner reminders. |

## Guardrails

1. Validate context schema and minimum grants before any API call.
2. Run read-only discovery first whenever possible.
3. Require explicit confirmation for destructive actions.
4. Re-query and verify post-action state.
5. Return structured, redacted output.

## Progressive Disclosure - Reference Files

| Topic | File |
|---|---|
| Endpoint and permission reference | [`references/api-reference.md`](./references/api-reference.md) |
