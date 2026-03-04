---
name: pr-migrate
description: Analyze SSRS reports for Fabric compatibility and generate a migration plan with automated fixes.
argument-hint: "<path-to-rdl-or-folder> [--scan-only] [--fix] [--output-dir <path>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

# Migrate SSRS Reports to Fabric

Analyze one or more .rdl files from an SSRS environment and produce a migration assessment with optional automated fixes.

## Instructions

1. Parse arguments:
   - `<path>` — Single .rdl file or directory containing .rdl files
   - `--scan-only` — Only report compatibility issues, don't modify files
   - `--fix` — Apply automated fixes for compatible issues
   - `--output-dir` — Write migrated files to a new directory (preserving originals)

2. If a directory is provided, scan recursively for all .rdl files.

3. Read migration reference:
   - `${CLAUDE_PLUGIN_ROOT}/skills/paginated-reports/references/ssrs-migration.md`
   - `${CLAUDE_PLUGIN_ROOT}/skills/paginated-reports/references/troubleshooting.md`

4. For each .rdl file, analyze:

### Compatibility Check
- Custom Report Items (CRI) → Critical, cannot auto-fix
- Map data regions → Critical, cannot auto-fix
- Custom assemblies → Warning, may need manual code migration
- Windows integrated auth → Warning, needs gateway or credential change
- Linked report references → Moderate, convert to parameterized URLs
- File share subscription references → Info, rebuild with Power Automate

### Auto-Fixable Issues (when `--fix` is set)
- Update RDL namespace to 2016/01 (from older versions)
- Remove deprecated elements (rd:DesignerState, rd:ReportID)
- Convert old-style data source references
- Fix body width exceeding page width
- Add missing RepeatOnNewPage on header rows
- Update textbox naming from defaults to descriptive names

5. Generate migration report.

## Output Format

```
SSRS-to-Fabric Migration Assessment
════════════════════════════════════

Scanned: 25 .rdl files in /Reports/

Migration Ready (Green): 18 reports
  - MonthlyPnL.rdl
  - SalesDetail.rdl
  - ...

Needs Manual Work (Yellow): 5 reports
  - InventoryMap.rdl — Map data region (unsupported)
  - CustomFormat.rdl — Custom assembly: Contoso.ReportHelpers
  - ...

Cannot Migrate (Red): 2 reports
  - LegacyCRI.rdl — Custom Report Item: Dundas Chart
  - ActiveXReport.rdl — ActiveX control reference
  - ...

Auto-Fixed Issues: 12 (across 8 files)
  - Namespace updated: 6 files
  - Body width corrected: 3 files
  - Header RepeatOnNewPage added: 3 files

Recommended Migration Order:
1. Green reports (deploy immediately)
2. Yellow reports (fix then deploy)
3. Red reports (rebuild or retire)

Estimated Effort:
  Green: 0.5 day (upload + validate)
  Yellow: 2 days (manual fixes + testing)
  Red: 5 days (rebuild from scratch)
```

6. If `--fix` and `--output-dir` are set:
   - Copy all .rdl files to output directory
   - Apply auto-fixes to copies
   - Log all changes made

## Guidelines

- Always preserve original files — write fixes to copies or use `--output-dir`
- Reference the compatibility matrix in ssrs-migration.md
- Reference migration-checklist.md for the full migration workflow
- Group reports by migration complexity (Green/Yellow/Red)
- Provide specific, actionable recommendations for each Yellow/Red report
- Never auto-fix Critical issues — only flag them for manual review
- Include effort estimates based on complexity
