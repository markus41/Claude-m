---
name: pbi-scaffold
description: Generate a complete PBIP (Power BI Project) structure with tables, measures, relationships, and report layout. Outputs files ready for Git.
argument-hint: "<project-name> [--tables <table1,table2,...>] [--format tmdl|bim] [--source sql|dataverse|lakehouse]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

# Scaffold a PBIP Project

Generate a complete Power BI Project (PBIP) file structure.

## Instructions

1. Parse the project name from the user's input.
2. If `--tables` is provided, create table definitions for each specified table.
3. If `--format` is `tmdl` (default), generate individual TMDL files. If `bim`, generate a single `model.bim` JSON file.
4. If `--source` is provided, use the appropriate Power Query M connector for the partition source.
5. Read the PBIP reference at `skills/powerbi-analytics/references/pbip-format.md` for structure details.
6. Read examples at `skills/powerbi-analytics/examples/pbip-scaffolding.md` for templates.

## Output Structure (TMDL format)

```
<project-name>.pbip
<project-name>.Dataset/
    definition/
        tables/
            <table1>.tmdl
            <table2>.tmdl
            Date.tmdl                   # Always include date dimension
        measures/
            _<fact-table> Measures.tmdl
        relationships.tmdl
        expressions.tmdl                # Parameters for source connection
    definition.pbidataset
<project-name>.Report/
    definition/
        report.json
    definition.pbireport
.gitignore
```

## Output Structure (model.bim format)

```
<project-name>.pbip
<project-name>.Dataset/
    definition/
        model.bim
    definition.pbidataset
<project-name>.Report/
    definition/
        report.json
    definition.pbireport
.gitignore
```

## Guidelines

- Always include a Date dimension table with calendar and fiscal year columns.
- Generate proper `lineageTag` GUIDs for all objects (use a deterministic pattern based on table/column names).
- Include common measures for the primary fact table: count, sum, average, YTD, YoY growth.
- Set up star schema relationships from fact table to dimension tables.
- Include `expressions.tmdl` with connection parameters (Server, Database).
- Include a `.gitignore` that excludes `.pbi/`, `*.pbicache`, `localSettings.json`, and `cache.abf`.
- The report.json should have at least one blank page ("Overview").
- Set `dataCategory: Time` on the Date table.
- Mark ID columns as hidden and `summarizeBy: none`.
- Use appropriate format strings: currency for amounts, percentage for ratios, integer for counts.
- If `--source lakehouse` is specified, use Direct Lake partition mode instead of import.

## File Generation

Write each file to the specified output directory using the Write tool. Create the directory structure first using Bash `mkdir -p`.
