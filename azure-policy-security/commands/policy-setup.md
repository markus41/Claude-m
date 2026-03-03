---
name: policy-setup
description: Prepare Azure policy and security posture analysis by confirming scope, baseline initiatives, severity model, and ownership.
argument-hint: "[--scope <tenant|management-group|subscription>] [--baseline <cis|nist|custom>] [--severity-model <model>] [--owners <team-or-group,...>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Setup

Prepare posture analysis before running policy and security assessments.

## Integration Context Fail-Fast Check

Before any external API call, validate integration context from [`docs/integration-context.md`](../../docs/integration-context.md):
- `tenantId` (always required)
- `subscriptionId` (required for Azure-scope workflows)
- `environmentCloud`
- `principalType`
- `scopesOrRoles`

If validation fails, stop immediately and return a structured error using contract codes (`MissingIntegrationContext`, `InvalidIntegrationContext`, `ContextCloudMismatch`, `InsufficientScopesOrRoles`).
Redact tenant/subscription/object identifiers in setup output using contract redaction rules.

## Step 1: Confirm Scope

Confirm the governance scope: tenant, management group, or specific subscriptions. Provide explicit scope paths (e.g., `/providers/Microsoft.Management/managementGroups/<name>` or `/subscriptions/<id>`).

## Step 2: Confirm Baseline Policy Initiatives

Confirm which baseline policy initiatives to evaluate against — CIS Microsoft Azure Foundations Benchmark, NIST SP 800-53, Azure Security Benchmark, or a custom initiative.

## Step 3: Confirm Severity Model and Ownership

Confirm the severity classification model (Critical/High/Medium/Low) and the remediation ownership mapping — which team or individual is responsible for each category of findings.
