---
name: rls-ols-policy
description: Define row-level and object-level security patterns for semantic models and shared datasets.
argument-hint: "<model> [--policy-mode <rls|ols|both>] [--test-users <list>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# RLS OLS Policy

Implement predictable data-level security with testable policies and ownership.

## Prerequisites

- Fabric admin or security governance permissions for target workspaces.
- Documented data classification policy and sensitivity label taxonomy.
- Identity groups mapped to business roles for access control.
- Audit and compliance stakeholders for policy review and sign-off.

## Steps

1. Define policy scope, identity mapping, and fallback behavior.
2. Implement and test RLS filters for tenant or business-unit boundaries.
3. Implement OLS restrictions for sensitive tables and measures.
4. Validate behavior with representative test accounts and edge cases.

## Output

- RLS/OLS policy specification with test cases.
- Validation matrix of expected versus observed access behavior.
