---
name: onelake-access-audit
description: "Audit OneLake access roles, item permissions, sharing links, and workspace identity configuration"
argument-hint: "[--workspace <name>] [--item <name>] [--export <csv|json>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Audit OneLake Access

Review access control configuration for OneLake workspaces, items, and folder-level security.

## Instructions

### 1. Parse Arguments

- `--workspace` — Workspace name or GUID to audit. If omitted, audit all accessible workspaces.
- `--item` — Specific item (lakehouse/warehouse) to audit. If omitted, audit all items in the workspace.
- `--export` — Export format: `csv` or `json`. If omitted, display inline.

### 2. Acquire Access Token

```bash
TOKEN=$(az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken -o tsv)
```

### 3. Audit Workspace Roles

List all role assignments for the workspace:

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/roleAssignments" \
  | python -m json.tool
```

Produce a table:
| Principal | Type (User/Group/SPN) | Role (Admin/Member/Contributor/Viewer) |
|-----------|----------------------|---------------------------------------|

Flag:
- More than 2 Admin role assignments
- Service principals with Admin role (should be Member or Contributor)
- Large security groups with Member or higher (overly broad access)

### 4. Audit Item Permissions

For each item in the workspace, check item-level permissions:

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<item-id>/permissions" \
  | python -m json.tool
```

Flag:
- Items shared with `ReadAll` permission to broad audiences (grants access to all data)
- Items shared externally (B2B guests) without business justification
- Inconsistent permissions between related items (e.g., gold lakehouse more open than silver)

### 5. Audit OneLake Data Access Roles

Check folder-level security (OneLake data access roles):

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<item-id>/dataAccessRoles" \
  | python -m json.tool
```

Flag:
- Sensitive folders (`Tables/pii_*`, `Files/confidential/`) without restricted roles
- Default role granting access to all folders
- No data access roles configured on items with sensitive data

### 6. Audit Workspace Identity

Check if workspace identity is configured (required for cross-workspace shortcuts):

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/identity" \
  | python -m json.tool
```

Flag:
- Cross-workspace shortcuts exist but workspace identity is not configured
- Workspace identity configured but not used by any shortcut

### 7. Audit Shortcuts for Access Leakage

List all shortcuts and check if they create unintended data access paths:

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<item-id>/shortcuts" \
  | python -m json.tool
```

Flag:
- Shortcuts from lower-security workspaces to higher-security data
- External shortcuts (S3, ADLS) with connection credentials shared broadly
- Shortcuts that bypass row-level security or folder-level restrictions

### 8. Generate Report

Produce a structured audit report:

```
## OneLake Access Audit Report

**Workspace**: <name> (<id>)
**Date**: <current-date>
**Items Audited**: <count>

### Findings Summary
| Severity | Count |
|----------|-------|
| Critical | X     |
| Warning  | X     |
| Info     | X     |

### Critical Findings
- [ ] <finding with recommendation>

### Warnings
- [ ] <finding with suggestion>

### Recommendations
- <prioritized list of actions>
```

If `--export` is set, write the report to a file in the requested format.
