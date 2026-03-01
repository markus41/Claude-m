---
name: entra-risky-users
description: List and manage risky users detected by Entra ID Protection
argument-hint: "[--risk-level low|medium|high] [--dismiss <user-id>] [--confirm-compromised <user-id>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Risky Users Management

List and manage risky users from Entra ID Identity Protection.

## Instructions

1. If `--dismiss` is provided, call `POST /identityProtection/riskyUsers/dismiss` for the user.
2. If `--confirm-compromised` is provided, call `POST /identityProtection/riskyUsers/confirmCompromised`.
3. Otherwise, list risky users: `GET /identityProtection/riskyUsers`.
4. Filter by `--risk-level` if provided.
5. Display: User, Risk Level, Risk State, Risk Detail, Last Updated.
6. For high-risk users, recommend: password reset, MFA re-registration, session revocation.
