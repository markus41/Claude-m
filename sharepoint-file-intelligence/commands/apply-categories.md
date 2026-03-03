---
name: sharepoint-file-intelligence:apply-categories
description: Apply metadata columns and content-type tags to SharePoint files based on pattern-matching rules. Supports dry-run preview before committing batch PATCH operations.
argument-hint: "[--rules-file path] [--dry-run]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Apply Categories

Apply metadata columns and content-type tags to SharePoint files by matching rules defined in a
YAML rules file. Uses batched Graph API PATCH requests for efficiency. Always defaults to dry-run
mode — confirm with the user before applying changes.

## Categorization Flow

### Step 1: Load or Create Rules File

Check for `--rules-file` argument. If not provided, look for:
1. `./sp-categories.yaml`
2. `.claude/sharepoint-file-intelligence-categories.yaml`

If no rules file exists, offer to create one interactively:

```
No rules file found. Would you like to:
1. Create a starter rules file based on the inventory
2. Provide a path to an existing rules file
3. Create rules manually now
```

### Step 2: Load Inventory

Load `./sp-reports/sharepoint-inventory.csv` (or `--inventory-file`). If not found, prompt to
run `scan-inventory` first.

### Step 3: Match Files to Rules

For each file in the inventory, evaluate rules in order. Apply the **first matching rule** (rules
are evaluated top-to-bottom; add a `continue: true` flag to apply multiple rules to one file).

**Match criteria:**

```yaml
match:
  extensions: [.xlsx, .xls]           # file extension matches any in list
  path_contains: [finance, budget]     # parent_path contains any string (case-insensitive)
  name_contains: [invoice, receipt]    # file name contains any string (case-insensitive)
  name_regex: "contract-\\d{4}"        # file name matches regex
  owner_email: ["jane@contoso.com"]    # file created_by matches
  size_mb_gt: 10                       # file larger than N MB
  modified_before: "2024-01-01"        # last_modified_date before date
```

**Apply action:**

```yaml
apply:
  Department: Finance           # SharePoint column name: value
  RetentionLabel: 7-Year        # Must match configured retention labels
  ContentType: Financial Doc    # Must match content type name in the site
  SensitivityLabel: Confidential
```

### Step 4: Dry-Run Preview

Always run in dry-run mode first unless `--no-dry-run` is explicitly passed:

```
## Category Application Preview (DRY RUN)

Rules file: ./sp-categories.yaml
Inventory:  ./sp-reports/sharepoint-inventory.csv

| Rule | Matched Files | Sample Match |
|---|---|---|
| Finance documents | 1,203 | /sites/finance/2025/Q4-Budget.xlsx |
| HR documents | 387 | /sites/hr/Handbook-2025.pdf |
| Legal contracts | 142 | /sites/legal/MSA-Contoso-2024.docx |
| No match | 3,089 | — |

Metadata changes to be applied:
- Department (1,732 files)
- RetentionLabel (1,732 files)
- ContentType (1,732 files)

Estimated Graph API calls: 87 batch requests (20 updates/batch)

Proceed with applying these changes? [Y/n]
```

Ask the user to confirm before proceeding.

### Step 5: Batch Apply Metadata

Resolve column internal names and content type IDs from the site:
```
GET /sites/{siteId}/lists/{listId}/columns?$select=id,name,displayName
GET /sites/{siteId}/contentTypes?$select=id,name
```

For each rule match, collect the Graph list item ID from the inventory (use `id` field + site/list
context). Build batch PATCH requests in groups of 20:

```http
POST https://graph.microsoft.com/v1.0/$batch
Content-Type: application/json

{
  "requests": [
    {
      "id": "1",
      "method": "PATCH",
      "url": "/sites/{siteId}/lists/{listId}/items/{itemId}/fields",
      "headers": { "Content-Type": "application/json" },
      "body": { "Department": "Finance", "RetentionLabel": "7-Year" }
    },
    ...
  ]
}
```

Handle throttling with retry-after backoff. Log each successful and failed update.

### Step 6: Report Results

```
## Category Application Results — 2025-03-02 10:45:00

| Outcome | Files |
|---|---|
| Updated successfully | 1,709 |
| Failed (permission) | 12 |
| Failed (column not found) | 11 |
| Skipped (no match) | 3,089 |

Failed files saved to: ./sp-reports/apply-categories-errors.csv
Full change log saved to: ./sp-reports/apply-categories-log.csv
```

## Arguments

- `--rules-file <path>`: YAML rules file path (default: ./sp-categories.yaml)
- `--inventory-file <path>`: Inventory CSV/JSON (default: ./sp-reports/sharepoint-inventory.csv)
- `--dry-run`: Preview changes without applying (default: true — always show preview first)
- `--no-dry-run`: Skip dry-run and apply immediately after showing preview + user confirmation
- `--output-dir <path>`: Directory for log files (default: ./sp-reports)

## Rules File Format

```yaml
# sp-categories.yaml
rules:
  - name: Finance documents
    match:
      extensions: [.xlsx, .xls, .csv]
      path_contains: [finance, budget, accounts]
    apply:
      Department: Finance
      RetentionLabel: 7-Year Financial Records

  - name: HR policies
    match:
      extensions: [.docx, .pdf]
      name_contains: [policy, handbook, procedures]
      path_contains: [hr, human-resources]
    apply:
      Department: HR
      ContentType: HR Document

  - name: Legal contracts
    match:
      name_contains: [contract, agreement, nda, msa, sla]
    apply:
      Department: Legal
      RetentionLabel: 10-Year Legal Records
      ContentType: Contract
```

## Notes

- Column names in the `apply` section must match the **internal name** of the SharePoint column,
  not the display name. Run `scan-inventory` with `--include-columns` to list column names.
- Content types must already exist in the target site/library.
- Managed metadata (taxonomy) columns require term GUIDs — see `references/metadata-content-types.md`.
- This command modifies file metadata only; it does not move or rename files.
