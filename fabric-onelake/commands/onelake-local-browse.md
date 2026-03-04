---
name: onelake-local-browse
description: "Browse locally synced OneLake files — workspaces, lakehouses, tables, and files (no API auth needed)"
argument-hint: "[--workspace <name>] [--item <name>] [--path <folder-path>] [--recursive]"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
---

# Browse OneLake Local Sync

Browse the locally synced OneLake file hierarchy. Requires OneLake desktop sync to be installed and signed in. No API authentication needed — uses direct filesystem access.

## Instructions

### 1. Detect OneLake Base Path

Search for the OneLake sync folder:

```bash
ls -d "/c/Users/$USER/OneLake -"* 2>/dev/null || ls -d "C:\\Users\\$USERNAME\\OneLake -"* 2>/dev/null
```

If not found, inform the user:
> OneLake desktop sync folder not found. Install from Microsoft Store (search "OneLake"), sign in with your Entra ID, and re-run this command.

Store the detected base path (e.g., `C:\Users\MarkusAhling\OneLake - Microsoft\`).

### 2. Parse Arguments

- `--workspace` — Workspace name. If omitted, list all synced workspaces.
- `--item` — Lakehouse or warehouse name within the workspace. If omitted, list all items.
- `--path` — Subfolder path (e.g., `Files/raw` or `Tables/sales`). If omitted, show item root.
- `--recursive` — Show all files recursively.

### 3. List Workspaces (No --workspace)

Use Glob to find all workspace folders:

```
Pattern: <base-path>/*/
```

Display as table:
| Workspace | Items |
|-----------|-------|

Count the number of `.Lakehouse`, `.Warehouse`, and other item types in each workspace.

### 4. List Items in Workspace (--workspace, no --item)

Use Glob to find items:

```
Pattern: <base-path>/<workspace>/*.Lakehouse
Pattern: <base-path>/<workspace>/*.Warehouse
Pattern: <base-path>/<workspace>/*.KQLDatabase
```

Display as table:
| Item Name | Type | Tables | Files |
|-----------|------|--------|-------|

Count entries in `Tables/` and `Files/` subfolders.

### 5. List Contents (--workspace + --item)

Use Glob to list files and folders within the item:

```
Pattern: <base-path>/<workspace>/<item>.Lakehouse/<path>/*
```

For `Tables/` path: show each table subfolder with file count and approximate size.
For `Files/` path: show files with size and modification date.

### 6. Delta Table Details

When browsing a specific table under `Tables/`, read the Delta log to show metadata:

- Read the latest JSON file in `_delta_log/` to extract schema
- Count Parquet files and sum sizes
- Show partition columns if any

### 7. Display Summary

Show:
- Base path used
- Total workspaces / items / tables / files found
- Hint: use `/onelake-browse` for remote DFS API access, `/onelake-upload` to add files
- Warning: never write to `Tables/` directly — use Spark or pipeline activities
