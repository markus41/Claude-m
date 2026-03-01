---
name: onedrive-sync-status
description: Check OneDrive sync status and recent changes using delta queries
argument-hint: "[--since <iso-datetime>] [--folder <path>]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# OneDrive Sync Status

Show recent changes to files in OneDrive using delta queries.

## Instructions

1. Call `GET /me/drive/root/delta` (or scoped to `--folder` path).
2. Display changed items: Name, Change Type (created/modified/deleted), Modified By, Date.
3. Store the `@odata.deltaLink` for subsequent calls.
4. If `--since` is provided, filter results to only show changes after that datetime.
