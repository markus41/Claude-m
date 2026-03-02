---
name: onelake-browse
description: "Browse OneLake hierarchy — list workspaces, items, folders, and files via DFS API"
argument-hint: "[--workspace <name>] [--item <name>] [--path <folder-path>] [--recursive]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
---

# Browse OneLake Hierarchy

List and explore the OneLake file hierarchy using the DFS API endpoint.

## Instructions

### 1. Parse Arguments

- `--workspace` — Workspace name or GUID. If omitted, list all workspaces (filesystems).
- `--item` — Lakehouse, warehouse, or other item name within the workspace. If omitted, list all items in the workspace.
- `--path` — Subfolder path within the item (e.g., `Files/raw/2024` or `Tables/sales`). If omitted, list the root of the item.
- `--recursive` — List all files/folders recursively under the path.

### 2. Acquire Access Token

```bash
TOKEN=$(az account get-access-token --resource https://storage.azure.com/ --query accessToken -o tsv)
```

If `az` is not authenticated, prompt the user to run `az login` first.

### 3. List Workspaces (No --workspace)

Call the DFS API to list filesystems (each workspace appears as a filesystem):

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://onelake.dfs.fabric.microsoft.com/?resource=account" \
  | python -m json.tool
```

Display results as a table:
| Workspace Name | Last Modified |
|----------------|---------------|

### 4. List Items in a Workspace (--workspace, no --item)

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://onelake.dfs.fabric.microsoft.com/<workspace>?resource=filesystem&recursive=false" \
  | python -m json.tool
```

Display results as a table:
| Item Name | Type | Last Modified |
|-----------|------|---------------|

### 5. List Files and Folders (--workspace + --item)

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://onelake.dfs.fabric.microsoft.com/<workspace>/<item>.<item-type>/<path>?resource=filesystem&recursive=<true|false>" \
  | python -m json.tool
```

Display results as a tree or table:
| Name | Type (file/directory) | Size | Last Modified |
|------|----------------------|------|---------------|

### 6. Display Summary

Show:
- Total files and directories found
- Total size (sum of file sizes)
- Path browsed
- Hint: use `/onelake-upload` to add files, `/shortcut-create` to link external data
