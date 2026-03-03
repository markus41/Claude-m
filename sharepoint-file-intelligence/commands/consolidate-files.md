---
name: sharepoint-file-intelligence:consolidate-files
description: Move SharePoint files to target folders based on a YAML move-mapping file. Defaults to dry-run preview, requires user confirmation, executes Graph API moves in batches, and generates a rollback script.
argument-hint: "[--mapping-file path] [--dry-run]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Consolidate Files

Move or reorganize SharePoint files according to a YAML move-mapping file. Always previews
planned operations before executing. Generates a rollback script so moves can be reversed.

## Consolidation Flow

### Step 1: Load Mapping File

Check for `--mapping-file` argument. If not provided, look for:
1. `./sp-move-mapping.yaml`
2. `.claude/sharepoint-file-intelligence-mapping.yaml`

If no mapping file exists, offer to create one:
```
No move-mapping file found. Would you like to:
1. Generate a mapping from the duplicates report (move duplicates to an archive folder)
2. Generate a mapping from the inventory (organize by year/extension)
3. Create a mapping file manually
```

### Step 2: Validate Mapping File

Parse the YAML and validate each entry:
- Source path must exist in the inventory (or be resolvable via Graph)
- Destination path must be reachable (the target parent folder must exist, or will be created)
- No circular moves (source is not a parent of destination)
- No moves that would exceed the 400-character SharePoint URL limit

Report validation errors before proceeding:
```
Validation Results: 23 moves defined

✓ 21 moves valid
✗ 2 moves invalid:
  - Move #4: Source path not found in inventory
  - Move #17: Destination path would exceed 400-char URL limit
```

### Step 3: Dry-Run Preview (always default)

Print a full preview of planned moves:

```
## File Consolidation Preview (DRY RUN)
Mapping file: ./sp-move-mapping.yaml

| # | Type | Source | Destination | Size |
|---|---|---|---|---|
| 1 | Move | /sites/hr/Shared Documents/Old HR Policies | /sites/hr/Shared Documents/reference/policies | 245 MB |
| 2 | Move | /sites/finance/Budget 2023 (folder) | /sites/finance/archive/2023 | 1.2 GB |
| ... | | | | |

Summary:
- 21 file/folder moves
- Total data to be moved: 3.4 GB
- New folders to create: 4
- Estimated Graph API calls: 47

⚠ Permission note: Moving files changes their URL. Bookmarks and links to moved files will break.
⚠ Sharing note: Moved files inherit the destination folder's permissions unless they have unique permissions.

Generate rollback script: Yes (./sp-reports/rollback-mapping.yaml)
```

Always show dry-run output and ask for confirmation:
```
Proceed with these moves? [Y/n]
```

### Step 4: Create Target Folders

For each destination parent folder that does not yet exist, create it:

```http
POST /drives/{driveId}/items/{parentFolderId}/children
Content-Type: application/json

{
  "name": "archive",
  "folder": {},
  "@microsoft.graph.conflictBehavior": "rename"
}
```

Create folders in top-down order (parents before children).

### Step 5: Execute Moves

Move each item using a PATCH to update `parentReference`:

```http
PATCH /drives/{driveId}/items/{itemId}
Content-Type: application/json

{
  "parentReference": { "id": "{targetFolderDriveItemId}" },
  "name": "new-filename-if-renamed.docx"
}
```

**Important:**
- If source and destination are on different drives/sites, use copy + delete (cross-drive move):
  ```http
  POST /drives/{sourceDriveId}/items/{itemId}/copy
  { "parentReference": { "driveId": "{destDriveId}", "id": "{destFolderId}" } }
  ```
  Then delete the source after confirming the copy succeeded.

- Apply conflict behavior `rename` for moves where a file with the same name might exist at the destination.

Execute in batches of 20 using `$batch` where possible. For large moves (>100 items), show
progress counter: `Moved 45/237 files…`

### Step 6: Log Results and Generate Rollback Script

Log each move outcome to `./sp-reports/consolidation-log.csv`:
```csv
status,source_path,destination_path,item_id,new_item_id,error
success,/sites/finance/Budget 2023,/sites/finance/archive/2023,...,,
failed,/sites/hr/Old Policies,...,,,403 Forbidden
```

Generate rollback mapping file (swap source/destination):
```yaml
# ./sp-reports/rollback-mapping.yaml
# Generated: 2025-03-02 11:30:00
# Use with: /sharepoint-file-intelligence:consolidate-files --mapping-file ./sp-reports/rollback-mapping.yaml
moves:
  - source: /sites/hr/Shared Documents/reference/policies
    destination: /sites/hr/Shared Documents/Old HR Policies
    description: "Rollback: Archive old policy folder to reference"
```

Print final summary:
```
## Consolidation Results — 2025-03-02 11:32:00

| Outcome | Items |
|---|---|
| Moved successfully | 19 |
| Failed (permission) | 2 |
| Skipped (not found) | 0 |

Move log: ./sp-reports/consolidation-log.csv
Rollback script: ./sp-reports/rollback-mapping.yaml

To undo all moves, run:
  /sharepoint-file-intelligence:consolidate-files --mapping-file ./sp-reports/rollback-mapping.yaml
```

## Arguments

- `--mapping-file <path>`: YAML move-mapping file (default: ./sp-move-mapping.yaml)
- `--dry-run`: Preview moves without executing (default: true — always preview first)
- `--no-dry-run`: Skip preview mode (still shows summary and requires confirmation)
- `--output-dir <path>`: Directory for log/rollback files (default: ./sp-reports)
- `--no-rollback`: Do not generate rollback script

## Move Mapping File Format

```yaml
# sp-move-mapping.yaml
moves:
  - source: "/sites/hr/Shared Documents/Old HR Policies"
    destination: "/sites/hr/Shared Documents/reference/policies"
    description: "Archive old policy folder to reference section"

  - source: "/sites/finance/Shared Documents/Budget 2023"
    destination: "/sites/finance/Shared Documents/archive/2023"
    description: "Move 2023 budgets to archive"

  # Move individual file
  - source: "/sites/finance/Shared Documents/Annual Report 2022.pdf"
    destination: "/sites/finance/Shared Documents/archive/2022/Annual Report 2022.pdf"
    description: "Archive 2022 annual report"
```

## Notes

- Moving a **folder** moves all its contents recursively in a single Graph API call.
- Moving files **breaks existing sharing links** — inform file owners before consolidating.
- Cross-site moves (different site collections) require a **copy + delete** operation; the original
  version history is not preserved at the destination.
- Files in the SharePoint recycle bin are recoverable for 93 days after deletion.
- Always review the rollback script before discarding it.
