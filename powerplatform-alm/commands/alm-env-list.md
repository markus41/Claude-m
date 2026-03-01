---
name: alm-env-list
description: List Power Platform environments with status, URL, type, and capacity information.
argument-hint: "[--filter name] [--format table|json]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# List Power Platform Environments

List all accessible Power Platform environments with their status, URLs, types, and capacity information.

## PAC CLI

```bash
# List all environments
pac env list

# Filter by name
pac env list --filter "Dev"
```

## Admin API

For richer information including capacity, use the Admin API:

```
GET https://api.bap.microsoft.com/providers/Microsoft.BusinessAppPlatform/scopes/admin/environments?api-version=2021-04-01
```

## Steps

1. Determine whether the user wants a quick CLI listing or detailed API-based inventory
2. For CLI: generate `pac env list` with optional filter
3. For API: generate a TypeScript or PowerShell script that fetches and formats environment details
4. Include: display name, URL, type (Sandbox/Production), state, capacity usage
5. Format output as a readable table or JSON as requested

## Output Columns

| Column | Source |
|--------|--------|
| Display Name | `properties.displayName` |
| Environment ID | `name` (GUID) |
| URL | `linkedEnvironmentMetadata.instanceUrl` |
| Type | `properties.environmentType` |
| State | `properties.states.management.id` |
| Version | `linkedEnvironmentMetadata.version` |
| Database Capacity | `properties.capacity` (database type) |
| File Capacity | `properties.capacity` (file type) |
