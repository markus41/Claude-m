---
name: sharepoint-file-intelligence:scan-inventory
description: Enumerate all files in a SharePoint site or OneDrive drive and produce a CSV or JSON inventory report with file metadata, sizes, owners, and types.
argument-hint: "<site-url-or-drive-id> [--all-drives] [--output-format csv|json] [--max-depth 5]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Scan Inventory

Perform a full file inventory of a SharePoint site or OneDrive drive using the Microsoft Graph
delta endpoint. Produces a structured report you can use with `find-duplicates`, `apply-categories`,
and `file-analyst`.

## Scan Flow

### Step 1: Collect Parameters

If not provided as arguments, ask the user to choose a scan target:

1. **SharePoint site** — e.g. `https://contoso.sharepoint.com/sites/finance`
2. **My OneDrive** — the current user's OneDrive for Business (`/me/drive`)
3. **Another user's OneDrive** — requires `User.Read.All`; prompt for email or user ID
4. **All OneDrive accounts in the tenant** — requires `Files.Read.All` app permission; warn about scan volume
5. **Specific drive ID** — paste a Graph drive ID directly

Then ask:
- **Output format** — CSV (default) or JSON
- **Max folder depth** — default 10 (use 0 for unlimited)

Resolve site URL to site ID and drives:
```
GET https://graph.microsoft.com/v1.0/sites/{hostname}:/{sitePath}?$select=id,displayName
GET https://graph.microsoft.com/v1.0/sites/{siteId}/drives?$select=id,name,driveType,quota
```

**With `--all-drives`:** enumerate **all** drives returned by the `/drives` endpoint for the site
(document libraries, Teams channels file tabs, etc.) and scan each one. Drives to include:

| `driveType` | Included by default | Example |
|---|---|---|
| `documentLibrary` | Yes | Shared Documents, Site Assets |
| `personal` (OneDrive) | Yes | Personal OneDrive for Business |
| `business` | Yes | OneDrive for Business shared drive |

Ask the user before scanning drives with `driveType` other than `documentLibrary` — large
personal OneDrives can add significant scan time.

For single-drive scans (no `--all-drives`), ask the user to pick from the list of drives if
the site has more than one, rather than defaulting silently to the first.

**OneDrive resolution:**

| Target | Graph endpoint |
|--------|---------------|
| Current user's OneDrive | `GET /me/drive` |
| All drives for current user | `GET /me/drives` |
| Specific user's OneDrive | `GET /users/{userId}/drive` |
| All users' OneDrives (tenant) | `GET /users?$select=id,displayName,mail` → loop `GET /users/{id}/drive` |

For tenant-wide OneDrive scans, warn the user upfront:
- "Scanning all OneDrive accounts will make one API call per user. For tenants with 500+ users this may take several minutes and consume significant API quota. Continue? [Y/n]"

### Step 2: Authenticate

Check for `MICROSOFT_ACCESS_TOKEN` environment variable. If not set, prompt the user:
- "Please set MICROSOFT_ACCESS_TOKEN to a valid Graph API bearer token with `Sites.Read.All` and `Files.Read.All` scopes, then re-run."

Required scopes:
- `Sites.Read.All` (SharePoint)
- `Files.Read.All` (OneDrive)

### Step 3: Enumerate Files via Delta Query

Use the delta endpoint for reliable, paginated enumeration of all files:

```
GET /drives/{driveId}/root/delta?$select=id,name,size,file,folder,parentReference,createdDateTime,lastModifiedDateTime,createdBy,lastModifiedBy,webUrl,deleted
```

Follow `@odata.nextLink` until `@odata.deltaLink` is received. Save the delta link per drive to
`{output_dir}/.delta-state.json` (keyed by `driveId`) for future incremental scans.

**With `--all-drives`:** run the delta query for each drive sequentially. Print progress per drive:
```
Scanning drive 1/3: Shared Documents (documentLibrary) …
Scanning drive 2/3: Site Assets (documentLibrary) …
Scanning drive 3/3: Form Templates (documentLibrary) …
```

Add a `drive_name` column to inventory records so files from different drives are distinguishable
in the merged output.

Filter out:
- Deleted items (`deleted` property present)
- Folders (items without `file` facet) — count separately
- Items beyond `--max-depth` (count nesting levels in `parentReference.path`)

### Step 4: Build Inventory Records

For each file item, collect:
```
id, name, extension, size_bytes, parent_path, full_path, web_url,
created_date, created_by, last_modified_date, last_modified_by,
sha1_hash, quick_xor_hash, mime_type, drive_id, drive_name, drive_type, site_id
```

`drive_name` and `drive_type` are added when `--all-drives` is used so downstream commands
(`find-duplicates`, `file-analyst`) can identify which drive each file came from — enabling
cross-drive duplicate detection.

Computed fields:
- `extension` — extracted from `name` (last `.` segment, lowercased)
- `full_path` — decoded from `parentReference.path` + `name`
- `size_mb` — `size / 1_048_576`, 2 decimal places
- `depth` — count of `/` separators in `parentReference.path` after root prefix

### Step 5: Write Output File

**CSV format** (`sharepoint-inventory.csv`):

```csv
id,name,extension,size_bytes,size_mb,parent_path,full_path,web_url,created_date,created_by,last_modified_date,last_modified_by,sha1_hash,mime_type,drive_id,depth
```

**JSON format** (`sharepoint-inventory.json`):

```json
{
  "generated": "2025-03-02T10:00:00Z",
  "siteId": "...",
  "drives": [
    { "driveId": "...", "driveName": "Shared Documents", "driveType": "documentLibrary", "fileCount": 4821 }
  ],
  "totalFiles": 4821,
  "totalFolders": 312,
  "totalSizeBytes": 10737418240,
  "files": [ { ... }, ... ]
}
```

Default output directory: `./sp-reports/` (configurable via settings file).

### Step 6: Print Summary

```
## Inventory Summary — finance.sharepoint.com/sites/finance
Generated: 2025-03-02 10:23:41

| Metric | Value |
|---|---|
| Drives scanned | 3 (Shared Documents, Site Assets, Form Templates) |
| Total files | 4,821 |
| Total folders | 312 |
| Total size | 9.87 GB |
| Scan duration | 47 s |

### By Extension (top 10)
| Extension | Files | Total Size |
|---|---|---|
| .xlsx | 1,203 | 2.1 GB |
| .docx | 987 | 890 MB |
| .pdf | 743 | 1.4 GB |

### By Owner (top 10)
| Owner | Files | Total Size |
|---|---|---|
| jane@contoso.com | 423 | 980 MB |

### Largest Files (top 10)
| File | Size | Owner | Path |
|---|---|---|---|
| Annual-Report-2024.pdf | 245 MB | cfo@contoso.com | /sites/finance/... |

### Oldest Files (no changes in 365+ days)
| File | Last Modified | Owner | Path |
|---|---|---|---|
| Budget-2021.xlsx | 2021-06-15 | john@contoso.com | /sites/finance/... |

Output saved to: ./sp-reports/sharepoint-inventory.csv
Next steps:
  - Run /sharepoint-file-intelligence:find-duplicates to detect duplicates
  - Run /sharepoint-file-intelligence:apply-categories to tag files
  - Ask the file-analyst agent: "analyze my sharepoint inventory"
```

## Arguments

- `<site-url-or-drive-id>`: SharePoint site URL, Graph drive ID, or `onedrive` to scan the current user's OneDrive
- `--all-drives`: Enumerate and scan **all drives** under the given site, then merge into a single inventory file
- `--output-format csv|json`: Output format (default: csv)
- `--max-depth <n>`: Maximum folder depth to scan (default: 10, 0 = unlimited)
- `--output-dir <path>`: Directory for report files (default: ./sp-reports)
- `--incremental`: Use saved delta link for incremental scan (skip files not changed since last run)

## Settings File

Reads defaults from `.claude/sharepoint-file-intelligence.local.md` (YAML frontmatter):
- `site_url`, `scan_scope`, `max_depth`, `output_dir`, `stale_days`

## Notes

- Large sites (100k+ files) may take several minutes; the delta endpoint handles paging automatically.
- Re-run with `--incremental` to scan only files changed since the last run.
- The inventory file is the input for all other commands and the `file-analyst` agent.
