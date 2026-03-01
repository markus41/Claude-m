---
name: entra-ca-policy-create
description: Create a conditional access policy in report-only mode
argument-hint: "<policy-name> --preset require-mfa-all|block-legacy-auth|require-compliant-device|require-mfa-admins"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Create Conditional Access Policy

Create a conditional access policy using a preset template. Always deploys in report-only mode.

## Instructions

1. Map `--preset` to a policy configuration:
   - `require-mfa-all`: Require MFA for all users, all cloud apps.
   - `block-legacy-auth`: Block legacy authentication protocols.
   - `require-compliant-device`: Require compliant or Entra-joined device.
   - `require-mfa-admins`: Require MFA for all admin roles.
2. Always set `state: "enabledForReportingButNotEnforced"`.
3. Ask the user if they want to exclude any break-glass admin accounts.
4. Create via `POST /identity/conditionalAccess/policies`.
5. Display the policy ID, name, and state.
6. Remind: "Monitor in report-only mode for at least 7 days before enabling."
