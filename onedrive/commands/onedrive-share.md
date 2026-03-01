---
name: onedrive-share
description: Create a sharing link for a OneDrive file or folder
argument-hint: "<onedrive-path-or-item-id> [--type view|edit] [--scope anonymous|organization]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Create Sharing Link

Generate a sharing link for a OneDrive file or folder.

## Instructions

1. Resolve the item by path or ID.
2. Call `POST /me/drive/items/{itemId}/createLink` with the specified type and scope.
3. Default: `--type view --scope organization`.
4. Return the sharing URL and link ID.
5. Warn if `--scope anonymous` is used (anyone on the internet can access).
