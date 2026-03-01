---
name: runbook-recover-file
description: Recover a deleted file from OneDrive or SharePoint recycle bin — guided search, preview, and restore.
argument-hint: "<user-or-site> <filename> [--second-stage] [--dry-run]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Runbook: Recover Deleted File

Guided workflow for recovering files from OneDrive or SharePoint recycle bins.

## Workflow

### Pre-Checks
1. Ask: "Where was the file?" — OneDrive (personal) or SharePoint (team site)
2. Ask: "What was the file called?" — search by name
3. Ask: "When was it deleted?" — approximate date helps narrow search

### Search Recycle Bin

**OneDrive (First-stage):**
```
GET https://graph.microsoft.com/v1.0/users/{userId}/drive/items?$filter=name eq '{filename}'&$select=name,id,deleted
```

Or via PnP:
```powershell
Get-PnPRecycleBinItem | Where-Object { $_.LeafName -like "*{filename}*" }
```

**SharePoint Site:**
```powershell
Connect-PnPOnline -Url "{siteUrl}" -Interactive
Get-PnPRecycleBinItem | Where-Object { $_.LeafName -like "*{filename}*" } | Select-Object LeafName, DeletedDate, DeletedByEmail, Size, ItemType
```

### Display Results
Show the user what was found:

```markdown
| # | File Name | Deleted Date | Deleted By | Size | Location |
|---|---|---|---|---|---|
| 1 | Budget-2026.xlsx | 2026-02-28 | jane@contoso.com | 2.4 MB | First-stage |
| 2 | Budget-2026 (old).xlsx | 2026-02-15 | jane@contoso.com | 1.8 MB | Second-stage |
```

Ask: "Which file should I restore?"

### Restore

```powershell
Restore-PnPRecycleBinItem -Identity {itemId} -Force
```

Or via Graph:
```
POST https://graph.microsoft.com/v1.0/users/{userId}/drive/items/{itemId}/restore
```

### Verification
- Confirm the file is back in its original location
- Verify the file can be opened

### End-User Notification

```markdown
Hi [User Name],

Your file has been recovered:

- **File**: Budget-2026.xlsx
- **Restored to**: [original location path]
- **Status**: Successfully restored

The file is now back in its original location. Please verify it opens correctly.

**Tip:** OneDrive keeps deleted files for 93 days. After that, they move to a second-stage recycle bin for an additional 93 days. Beyond that, files cannot be recovered.
```

### Completion Report

```markdown
| Field | Value |
|---|---|
| File | Budget-2026.xlsx |
| Location | OneDrive / jane@contoso.com |
| Deleted on | 2026-02-28 |
| Restored to | /Documents/Finance/ |
| Status | Restored |
| Ticket | [reference] |
```

## Arguments

- `<user-or-site>`: User UPN (for OneDrive) or SharePoint site URL
- `<filename>`: Name or partial name of the deleted file
- `--second-stage`: Search the second-stage recycle bin
- `--dry-run`: Search and display results without restoring

## Important Notes

- First-stage recycle bin: files deleted by users (93-day retention)
- Second-stage recycle bin: files removed from first-stage by admins or age-out (additional 93 days)
- After both stages, files are permanently deleted and cannot be recovered
- Large files may take a moment to restore
- Reference: `skills/servicedesk-runbooks/SKILL.md` for recovery patterns
