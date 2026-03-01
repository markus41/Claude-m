---
name: entra-signin-logs
description: Query and analyze Microsoft Entra ID sign-in logs
argument-hint: "[--days <count>] [--failed-only] [--user <upn>] [--app <app-name>]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Query Sign-In Logs

Retrieve and analyze sign-in logs from Microsoft Entra ID.

## Instructions

1. Build OData filter based on flags:
   - `--days`: Filter `createdDateTime ge <N days ago>`.
   - `--failed-only`: Filter `status/errorCode ne 0`.
   - `--user`: Filter `userPrincipalName eq '<upn>'`.
   - `--app`: Filter `appDisplayName eq '<name>'`.
2. Call `GET /auditLogs/signIns?$filter=<filter>&$top=50&$orderby=createdDateTime desc`.
3. Display results as a table: Date, User, App, IP, Location, Status, Risk Level.
4. Summarize: total sign-ins, failed count, unique users, top failure reasons.
