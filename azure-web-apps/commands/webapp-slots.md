---
name: webapp-slots
description: Create and manage deployment slots for blue-green deployment
argument-hint: "<app-name> [create|swap|list]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - AskUserQuestion
---

# Deployment Slots

Manage deployment slots for zero-downtime deployments.

## List Slots

```bash
az webapp deployment slot list --name <app-name> --resource-group <rg> --output table
```

## Create Staging Slot

```bash
az webapp deployment slot create --name <app-name> --resource-group <rg> --slot staging
```

## Deploy to Staging

```bash
az webapp deploy --resource-group <rg> --name <app-name> --slot staging --src-path <archive.zip> --type zip
```

## Swap Staging → Production

```bash
az webapp deployment slot swap --name <app-name> --resource-group <rg> --slot staging --target-slot production
```

## Output Summary

Display slot URLs, swap status, and rollback instructions.
