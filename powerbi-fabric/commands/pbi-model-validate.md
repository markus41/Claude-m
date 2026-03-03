---
name: pbi-model-validate
description: Validate a PBIP project directory — check TMDL syntax, lineage tags, measure references, and git readiness
argument-hint: "<pbip-dir> [--fix]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
---

# PBIP Model Validator

Validate a Power BI Project (PBIP) directory for TMDL syntax correctness, lineageTag uniqueness, measure reference integrity, git readiness, and Fabric platform metadata consistency. Optionally apply auto-fixes with the `--fix` flag.

## Part 1: PBIP Project Structure Validation

### Expected Directory Layout

A well-formed PBIP project should match this structure:

```
<project-name>.pbip                     ← project entry-point file (JSON)
<project-name>.Dataset/
  definition/
    database.tmdl                       ← database-level settings and metadata
    model.tmdl                          ← model settings (optional, may be inline in database.tmdl)
    tables/
      <TableName>.tmdl                  ← one file per table (columns, measures, partitions)
    relationships.tmdl                  ← all relationship definitions
    roles.tmdl                          ← RLS role definitions (present only if RLS is configured)
    expressions.tmdl                    ← M expressions / shared parameters
  .platform                             ← Fabric platform metadata (JSON)
<project-name>.Report/
  definition/
    report.json                         ← report-level settings and theme
    pages/
      <page-name>/
        page.json                       ← page layout settings
        visuals/
          <visual-id>/
            visual.json                 ← individual visual definitions
  .platform                             ← Fabric platform metadata (JSON)
.gitignore                              ← should exclude binary/cache artifacts
```

Key structural notes:
- The `.pbip` file is JSON and contains a relative reference to the Dataset and Report items
- Each table gets its own `.tmdl` file under `tables/` — this enables clean git diffs per table
- The `.platform` file in each item folder is JSON metadata required by Fabric for item type recognition
- `roles.tmdl` is only present when RLS is configured; its absence is valid
- `expressions.tmdl` holds shared M parameters and named expressions used by partitions

---

## Validation Checks

Run all of the following checks against the provided `<pbip-dir>` argument.

### Check 1: Required Files Exist

Use `Glob` to discover the project structure and `Read` to verify key files.

Steps:
1. Find the `.pbip` file at the root of `<pbip-dir>`
2. Find the `*.Dataset/` directory
3. Verify `*.Dataset/definition/` exists
4. Verify `*.Dataset/definition/tables/` directory exists and contains at least one `.tmdl` file
5. Verify `*.Dataset/.platform` exists
6. Check for `.gitignore` at the project root — warn if missing

Report findings:
- PASS: file/directory exists and is non-empty
- WARN: `.gitignore` is missing
- FAIL: required files/directories are absent (the model cannot be deployed)

### Check 2: TMDL Syntax Checks

Use `Glob` to find all `*.tmdl` files under `<pbip-dir>`. Use `Read` to examine each file.

For each `.tmdl` file, check:

**Table files** (`tables/*.tmdl`):
- File begins with `table '<TableName>'` (optionally with lineageTag)
- Every `column '<name>'` block has a `dataType:` property
  - Valid dataType values: `string`, `int64`, `double`, `boolean`, `dateTime`, `date`, `binary`, `decimal`
- Every `measure '<name>'` block has an `expression:` property (may span multiple lines using `\`\`\`` fencing in TMDL)
- Every `partition '<name>'` block has a `source` sub-block with either `type: m` and an `expression` or `type: calculated`
- No `@@missing` placeholder strings (these appear when Fabric cannot resolve a reference during export)
- No empty `expression:` values on measures or partitions

**Relationships file** (`relationships.tmdl`):
- Each relationship has `fromTable`, `fromColumn`, `toTable`, `toColumn`
- `cardinality:` is present (`manyToOne`, `oneToMany`, `oneToOne`, `manyToMany`)
- `crossFilteringBehavior:` is present if bidirectional (`bothDirections`; flag these for review)

**Roles file** (`roles.tmdl`, if present):
- Each role has `modelPermission:` defined
- Each `tablePermission` has a non-empty `filterExpression:`
- No role has `modelPermission: admin` (this bypasses RLS)

### Check 3: lineageTag Uniqueness

Use `Grep` to find all `lineageTag:` lines across all `.tmdl` files.

Steps:
1. Grep pattern: `lineageTag: [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}` (case-insensitive)
2. Extract the UUID from each match
3. Build a map of UUID → [list of files where it appears]
4. Flag any UUID that appears in more than one file as a **Critical** duplicate
5. Validate UUID format using the regex above — flag malformed tags
6. Check that every `table '<name>'` definition has a `lineageTag:` within its block — flag tables missing lineageTags as **Critical**
7. Check that every `measure '<name>'` definition has a `lineageTag:` — flag missing measure lineageTags as **Warning** (measures without lineageTags lose cross-report measure dependency tracking)

Valid lineageTag format example: `lineageTag: a1b2c3d4-e5f6-7890-abcd-ef1234567890`

### Check 4: Measure Reference Integrity

Use `Grep` to collect measure definitions and references.

Steps:
1. Grep all `*.tmdl` files for `measure '` to build a complete list of defined measure names
2. Grep all `*.tmdl` files for DAX measure references — patterns to look for:
   - Unqualified: `\[MeasureName\]` within `expression:` blocks
   - Table-qualified: `'TableName'\[MeasureName\]` within `expression:` blocks
3. For each referenced measure name, check whether it exists in the defined measures list
4. Flag references that do not match any defined measure as **Warning** (possible typo, deleted measure, or external model reference)
5. For table-qualified references `'TableName'[MeasureName]`:
   - Verify the table name appears in the project's table files
   - Verify the measure is defined within that table's `.tmdl` file

Note: Some references may be intentional external references to measures in another model — these cannot be validated locally and should be flagged as informational, not errors.

Also check for:
- **Circular references**: measure A references measure B, which references measure A — use `Grep` to trace chains
- **Self-referencing measures**: a measure whose `expression:` contains its own name
- **Measures referencing calculated columns that no longer exist**: grep for column names used in measure expressions that do not appear in `column '` definitions

### Check 5: .gitignore Checks

Use `Read` to examine `.gitignore` at `<pbip-dir>/.gitignore`.

Verify the file excludes the following (each is a separate check):

| Pattern | Reason |
|---|---|
| `.pbi/` | Power BI Desktop local cache — not for version control |
| `*.pbix` | Binary file — should not be committed alongside PBIP source |
| `LocalSettings.json` | Per-machine settings that differ between developers |
| `.cache/` | Dataflow Gen2 / local evaluation cache |
| `*.abf` | Analysis Services backup files — large binary |

For each missing pattern, emit a **Suggestion** to add it.

If `.gitignore` does not exist at all, emit a **Warning** and offer to create one with all recommended patterns (when `--fix` is active).

### Check 6: .platform Metadata

Use `Glob` to find all `.platform` files. Use `Read` to examine each.

For each `.platform` file:
1. Parse as JSON — flag malformed JSON as **Critical**
2. Verify the `metadata` object exists and has a `type` field
3. Check `type` matches the expected value for the item:
   - For `*.Dataset/.platform`: `type` should be `"SemanticModel"`
   - For `*.Report/.platform`: `type` should be `"Report"`
4. Verify `config` object exists and has a `version` field
5. Verify `config` has a `logicalId` field (a GUID) — this identifies the item in Fabric
6. Flag missing or null `logicalId` as **Critical** (Fabric cannot identify the item)

Expected `.platform` structure:
```json
{
  "version": "1.0",
  "config": {
    "version": "2.0",
    "logicalId": "<guid>"
  },
  "metadata": {
    "type": "SemanticModel",
    "displayName": "<dataset-name>"
  }
}
```

---

## Part 2: Output Format

Produce the validation report in this format:

```
## PBIP Validation Report: <pbip-dir>

**Validated**: <timestamp>
**Overall**: PASS / FAIL / WARNINGS

---

### Critical Issues (must fix before publish)
- [ ] Missing lineageTag on table 'Sales' — add a unique GUID
- [ ] Duplicate lineageTag detected: a1b2c3d4-... appears in Sales.tmdl and Customers.tmdl
- [ ] .platform file in Dataset/ has invalid JSON — parse error at line 12
- [ ] Measure 'Revenue YTD' in Sales.tmdl has empty expression

### Warnings
- [ ] .gitignore missing *.pbix exclusion
- [ ] Measure [Revenue] referenced in [Revenue YTD] is not defined in this model
- [ ] Bidirectional relationship: Sales → Products (review for ambiguity)
- [ ] Measure 'Draft KPI' has no lineageTag

### Suggestions
- [ ] Add LocalSettings.json to .gitignore
- [ ] Add *.abf to .gitignore
- [ ] Table 'Calendar' has no dataCategory: Time marking — set it for time intelligence
- [ ] Measure 'Total Cost' could use VAR/RETURN for readability

### What Looks Good
- All 47 measures have unique lineageTags
- All relationships have cardinality defined
- .gitignore excludes .pbi/ and .cache/ directories
- .platform files are valid JSON with correct type metadata
- No @@missing placeholders found in any TMDL file

---

### File Summary
| File | Status | Issues |
|---|---|---|
| Sales.tmdl | FAIL | 1 critical, 1 warning |
| Customers.tmdl | WARN | 1 critical (duplicate lineageTag) |
| Calendar.tmdl | PASS | 1 suggestion |
| relationships.tmdl | WARN | 1 warning (bidirectional) |
| .gitignore | WARN | 2 suggestions |
```

---

## Part 3: Auto-Fix Capability (--fix flag)

When `--fix` is provided in the argument, offer the following automated repairs:

**Auto-generate missing lineageTags**
- For each table or measure missing a `lineageTag:`, generate a new UUID
- In Bash: `python3 -c "import uuid; print(uuid.uuid4())"` or use PowerShell `[Guid]::NewGuid()`
- Use `Edit` to insert the `lineageTag:` line immediately after the `table '<name>'` or `measure '<name>'` declaration
- Confirm with the user before writing: list all planned additions and ask "Apply these lineageTag additions? (yes/no)"

**Create or update .gitignore**
- If `.gitignore` is missing, use `Write` to create it with all recommended patterns
- If it exists but is missing patterns, use `Edit` to append the missing lines
- Show the user the exact content that will be added before writing

**Resolve duplicate lineageTags**
- For each duplicate, keep the lineageTag in the file where it logically belongs (user must confirm which file)
- Generate a new UUID for the other file(s)
- Use `Edit` to replace the duplicate value

**Measure reference issues**: Do NOT auto-fix these. Measure renames or deletions may be intentional. Instead, show the suggested correction and ask the user to confirm manually. Example:
```
Possible fix for [Revnue] → [Revenue]?
This looks like a typo. Confirm before Edit is applied.
```

**Important**: Always show a summary of planned fixes and require user confirmation before applying any `Edit` or `Write` operations. Never silently modify TMDL files.
