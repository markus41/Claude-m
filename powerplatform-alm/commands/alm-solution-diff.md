---
name: alm-solution-diff
description: Compare two Power Platform solutions to identify added, removed, and modified components across environments or versions.
argument-hint: "<solution-v1.zip> <solution-v2.zip> [--output report.md]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Diff Power Platform Solutions

Compare two solution zip files or two environments to identify component-level differences.

## Approach 1: Unpack and Diff

```bash
# Unpack both versions
pac solution unpack --zipfile ./v1/MySolution.zip --folder ./diff/v1
pac solution unpack --zipfile ./v2/MySolution.zip --folder ./diff/v2

# File-level diff
diff -rq ./diff/v1 ./diff/v2
```

## Approach 2: Cross-Environment Metadata Comparison

Use the Dataverse Web API to compare entity definitions between two environments:

```
GET {orgUrl}/api/data/v9.2/EntityDefinitions?$filter=startswith(LogicalName,'cr_')
```

## Steps

1. Determine comparison mode:
   - **Two zip files** — unpack both, compare file by file
   - **Two environments** — query metadata API from each, compare programmatically
2. Generate the appropriate script (bash for zip diff, TypeScript for API diff)
3. Produce a markdown report with:
   - Summary: added/removed/modified counts
   - Added components list
   - Removed components list
   - Modified components with change details
4. Group changes by component type (Entity, Flow, Form, View, etc.)

## Output Report Format

```markdown
# Solution Diff Report
## Summary
| Change Type | Count |
|-------------|-------|
| Added       | N     |
| Removed     | N     |
| Modified    | N     |

## Details
### Added Components
...
### Removed Components
...
### Modified Components
...
```
