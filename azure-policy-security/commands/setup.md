---
name: setup
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

Prepare posture analysis:
1. Confirm scope (tenant, management group, subscriptions).
2. Confirm baseline policy initiatives.
3. Confirm severity model and remediation ownership.
