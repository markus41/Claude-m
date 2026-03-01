---
name: entra-sp-create
description: Create a service principal for an existing app registration
argument-hint: "<app-id> [--role-assignments <role>,<scope>]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Create Service Principal

Create a service principal for an existing app registration and optionally assign roles.

## Instructions

1. Create service principal: `POST /servicePrincipals` with `appId`.
2. If `--role-assignments` is provided, assign each role at the specified scope.
3. Display the service principal ID, app ID, and assigned roles.
