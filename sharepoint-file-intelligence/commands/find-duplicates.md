---
name: sharepoint-file-intelligence:find-duplicates
description: Find exact and near-duplicate files in a SharePoint inventory. Groups duplicates by hash, name+size, and version patterns, then reports potential space savings.
argument-hint: "[--inventory-file path] [--strategy exact|near|both]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Find Duplicates

Analyze a file inventory (produced by `scan-inventory`) to find exact and near-duplicate files.
Produces a duplicate report with recommended "keep" candidates and estimated space savings.

## Duplicate Detection Flow

### Step 1: Load Inventory

Check for `--inventory-file` argument. If not provided, look for:
1. `./sp-reports/sharepoint-inventory.csv` (default location)
2. `./sp-reports/sharepoint-inventory.json`

If neither exists, prompt:
- "No inventory file found. Run `/sharepoint-file-intelligence:scan-inventory` first, or provide `--inventory-file <path>`."

Parse the inventory and confirm record count before proceeding.

### Step 2: Select Strategy

Strategies (controlled by `--strategy`):
- `exact` — group files by `sha1Hash` (binary identical)
- `near` — group files by normalized name + size bucket (within ±1 KB)
- `both` (default) — run both strategies, merge results

For files with no `sha1Hash` in the inventory, fall back to `quickXorHash`.

### Step 3: Exact Duplicate Detection

Build a hash map: `sha1Hash → [file records]`

For each group with 2+ files:
- **Keep candidate**: the file with the oldest `created_date` on the primary/canonical site
  (or the one on the site matching `site_url` in settings, if configured)
- **Duplicates**: all other files in the group
- **Wasted space**: sum of sizes of all duplicates (files to remove)

### Step 4: Near-Duplicate Detection

Group files by: `normalizeName(name) + "|" + Math.round(size_bytes / 1024)`

Near-duplicate patterns detected:
- `Report.docx` and `Report (1).docx` — Windows copy suffix
- `Budget.xlsx` and `Budget - Copy.xlsx` — Office copy
- `Contract_v2.pdf` and `Contract_v3.pdf` — version suffixes
- Same file uploaded to multiple sites or drives

For each group, flag as near-duplicate and list all copies with paths and owners.

### Step 5: Generate Duplicate Report

Write `./sp-reports/duplicates-report.csv` (and `.json` if `--output-format json`):

```csv
strategy,group_id,hash_prefix,keep_id,keep_name,keep_path,keep_owner,dup_id,dup_name,dup_path,dup_owner,dup_size_bytes,dup_last_modified
```

Print summary:

```
## Duplicate Files Report — 2025-03-02

### Summary
| Strategy | Duplicate Groups | Duplicate Files | Wasted Space |
|---|---|---|---|
| Exact (SHA-1 match) | 47 | 134 | 2.14 GB |
| Near-dup (name+size) | 23 | 61 | 850 MB |
| Version copies | 18 | 54 | 310 MB |
| Total | 88 | 249 | 3.30 GB |

### Top 10 Duplicate Groups (by wasted space)
| Group | Files | Wasted | Keep Candidate | Duplicate Paths |
|---|---|---|---|---|
| 1 | 5 | 512 MB | /sites/finance/Q4-Budget.xlsx | /sites/hr/Q4-Budget.xlsx, ... |

### Recommended Actions
- P1 (Safe): 47 exact-match groups — safe to delete duplicates (2.14 GB savings)
- P2 (Review): 23 near-dup groups — review with file owners before deletion
- P3 (Archive): 18 version copy groups — archive to version-archive folder

Duplicate report saved to: ./sp-reports/duplicates-report.csv
Next steps:
  - Run /sharepoint-file-intelligence:consolidate-files to move duplicates
  - Ask the file-analyst: "show me the top 20 duplicates I should clean up"
```

### Step 6: Interactive Review (Optional)

If the duplicate count is small (<50 groups), offer interactive review:
- Show each group with keep candidate and duplicates
- Let the user confirm which to delete, keep, or skip

## Arguments

- `--inventory-file <path>`: Path to inventory CSV/JSON (default: ./sp-reports/sharepoint-inventory.csv)
- `--strategy exact|near|both`: Detection strategy (default: both)
- `--output-format csv|json`: Output format (default: csv)
- `--output-dir <path>`: Directory for report files (default: ./sp-reports)
- `--min-size-mb <n>`: Only report duplicates larger than N MB (default: 0)

## Notes

- Exact duplicates are always safe to remove — the content is identical.
- Near-duplicates require owner review — the files may look similar but contain different content.
- Use `consolidate-files` to execute the moves/deletions after reviewing this report.
- Files moved to the SharePoint recycle bin are recoverable for 93 days.
