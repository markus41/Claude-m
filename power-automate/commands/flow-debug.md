---
name: flow-debug
description: Diagnose failed Power Automate runs with evidence-driven root-cause hypotheses, validation steps, and safe remediations.
argument-hint: "<flow-name-or-id> [--run-id <id>] [--time-window <hours>] [--include-history <count>] [--dry-run]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Flow Debug

## Purpose
Triage flow failures quickly and generate actionable remediation guidance.

## When to use
- A cloud flow run failed or timed out.
- Intermittent connector errors need structured diagnosis.
- You need a post-incident summary with next actions.

## Required inputs/prereqs
- Flow identifier and failing run ID (or time window to locate failures).
- Access to run history and action-level error payloads.
- Relevant connector ownership/auth context.
- Optional recent run sample count for trend analysis.

## Step-by-step execution procedure
1. Locate failed run(s) and capture failing action metadata.
2. Classify error type (auth, throttling, payload, dependency, logic).
3. Build ranked root-cause hypotheses with direct evidence.
4. Propose validation checks for each hypothesis.
5. Provide low-risk remediations and rollback/guardrail notes.
6. Summarize prevention improvements (retries, dead-lettering, alerting).

**Concrete example invocation**
```text
/flow-debug 4f6f0a2b-aaaa-bbbb-cccc-1234567890ab --run-id 08586420100234567890123456789CU12 --include-history 10
```

**Failure-mode example**
```text
/flow-debug
```
Expected assistant behavior: reject empty invocation and request at minimum a flow name or ID.

## Output schema/format expected from the assistant
Return in this order:
1. `IncidentSummary` (`Flow`, `RunId`, `FailureStage`, `Impact`).
2. `Hypotheses` table: `Rank`, `Hypothesis`, `Evidence`, `ValidationStep`, `Confidence`.
3. `RemediationPlan` table: `Action`, `Risk`, `Rollback`, `Owner`.
4. `PreventionBacklog` bullets.

## Validation checklist
- Command name is `flow-debug` and matches file name.
- At least one failing run is identified.
- Hypotheses are evidence-backed and ranked.
- Each remediation includes risk and rollback note.
- Output includes incident summary, hypotheses, remediation plan, and prevention backlog.
