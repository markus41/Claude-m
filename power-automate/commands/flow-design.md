---
name: flow-design
description: Design a maintainable Power Automate cloud flow with trigger, actions, control paths, retries, and idempotency guidance.
argument-hint: "<business-goal> [--trigger <type>] [--systems <graph,sharepoint,dataverse,...>] [--sla <minutes>] [--volume <low|medium|high>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Flow Design

## Purpose
Produce a deterministic blueprint for a Power Automate flow before implementation.

## When to use
- You are creating a new flow and want production-safe structure.
- Existing automation needs redesign for reliability or readability.
- You need review-ready design artifacts for approval.

## Required inputs/prereqs
- Clear business goal and success criteria.
- Trigger type and source systems/connectors.
- Throughput expectation and SLA/latency target.
- Identity/connection constraints (service account, connection references).

## Step-by-step execution procedure
1. Capture objective, trigger, and data contracts.
2. Define flow stages (`ingest`, `validate`, `process`, `notify`, `log`).
3. Add branching and exception paths with explicit conditions.
4. Define retries, timeout behavior, and idempotency key strategy.
5. Specify observability (run history fields, correlation ID, alerting).
6. Return implementation checklist and testing scenarios.

**Concrete example invocation**
```text
/flow-design "Create an approval flow for high-value purchase requests" --trigger manual --systems sharepoint,teams,outlook --sla 15 --volume medium
```

**Failure-mode example**
```text
/flow-design "Sync opportunities" --systems dataverse,sap
```
Expected assistant behavior: request missing trigger details and expected sync cadence before producing design.

## Output schema/format expected from the assistant
Return in this order:
1. `FlowBlueprint` with sections: `Trigger`, `MainPath`, `Branches`, `FailurePath`, `RetryPolicy`, `Idempotency`.
2. `ConnectorMatrix` table: `Connector`, `Purpose`, `AuthModel`, `KnownLimits`.
3. `TestPlan` list: happy path, transient failure, permanent failure, duplicate event.

## Validation checklist
- Command name is `flow-design` and matches file name.
- Trigger and cadence are explicit.
- Retry and idempotency strategy are documented.
- Failure path includes alerting and operator action.
- Output includes blueprint, connector matrix, and test plan.
