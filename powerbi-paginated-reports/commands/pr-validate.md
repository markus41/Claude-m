---
name: pr-validate
description: Analyze an RDL file for common issues, deprecated features, Fabric compatibility problems, and best practice violations.
argument-hint: "<path-to-rdl-file> [--fix] [--fabric-compat]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Validate Paginated Report

Analyze an RDL file and report issues with severity levels.

## Instructions

1. Read the specified .rdl file.

2. Parse the XML and check for issues in these categories:

### Schema Validation
- Correct XML namespace (should be 2016/01 for Fabric)
- Well-formed XML structure
- Required elements present (DataSources, DataSets, Body, Page)

### Fabric Compatibility (if `--fabric-compat` flag or by default)
- No Custom Report Items (CRI) — `<CustomReportItem>` elements
- No Map data regions — `<MapDataRegion>` elements
- No restricted custom assemblies — `<CodeModules>` with file system/network access
- No linked report references
- Connection strings compatible with Fabric data sources

### Data Source Issues
- Hardcoded server names in connection strings (should be parameterized or environment-specific)
- Embedded credentials (security risk)
- Missing IntegratedSecurity or credential configuration
- Unused data sources (defined but not referenced by any dataset)

### Query Issues
- `SELECT *` usage (should list specific columns)
- Missing parameterization (hardcoded filter values)
- No timeout configured on datasets
- Unused datasets (defined but not referenced by any data region)

### Expression Issues
- Potential divide-by-zero without IIF guard
- `Nothing` comparison without IsNothing()
- Complex nested IIF (recommend Switch instead)
- RunningValue without proper scope
- Fields! references to non-existent field names

### Layout Issues
- Body width + margins exceeds page width (causes blank pages)
- Missing RepeatOnNewPage on header rows
- Missing page numbers in header/footer
- Overlapping report items (same Top/Left coordinates)
- Very tall body height that may cause rendering issues

### Best Practice Violations
- Missing report description
- Unnamed textboxes (default Textbox1, Textbox2 names)
- No alternating row colors on detail rows
- Missing NoRowsMessage on data regions
- Embedded images larger than 500KB
- More than 3 nested subreports (performance concern)

3. Output a validation report.

## Output Format

```
RDL Validation Report: [filename]
══════════════════════════════════

Summary: X critical, Y warnings, Z suggestions

CRITICAL
────────
[C1] Fabric Incompatible: Custom Report Item found at line XX
     → Remove CRI and replace with native RDL elements

[C2] Body width (7in) + margins (2in) = 9in > page width (8.5in)
     → Reduce body width to 6.5in or adjust margins

WARNINGS
────────
[W1] SELECT * in dataset "SalesData" (line XX)
     → List specific column names for better performance

[W2] No divide-by-zero guard: =Fields!A.Value / Fields!B.Value (line XX)
     → Use =IIF(Fields!B.Value = 0, 0, Fields!A.Value / Fields!B.Value)

SUGGESTIONS
───────────
[S1] Missing alternating row colors on Tablix "MainTable"
     → Add BackgroundColor expression: =IIF(RowNumber(Nothing) Mod 2 = 0, "WhiteSmoke", "White")

[S2] Default textbox names found (Textbox1, Textbox3)
     → Rename to descriptive names (H_Region, D_Amount)

Report is [READY / NOT READY] for Fabric deployment.
```

4. If `--fix` flag is provided:
   - Automatically fix issues that have safe, deterministic solutions
   - Show diff of changes made
   - Re-validate after fixes

## Guidelines

- Read the full RDL file before analyzing — don't parse partially
- Reference `${CLAUDE_PLUGIN_ROOT}/skills/paginated-reports/references/rdl-structure.md` for schema validation
- Reference `${CLAUDE_PLUGIN_ROOT}/skills/paginated-reports/references/troubleshooting.md` for known issues
- Reference `${CLAUDE_PLUGIN_ROOT}/skills/paginated-reports/references/ssrs-migration.md` for compatibility matrix
- Never modify the file unless `--fix` is explicitly passed
- Critical = will fail in Fabric, Warning = works but problematic, Suggestion = best practice
