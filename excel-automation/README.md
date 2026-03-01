# Excel Automation & Data Cleaning

A Claude Code knowledge plugin for cleaning messy data with pandas, generating polished `.xlsx` files, creating Office Scripts for Excel automation, and building Power Automate flows.

## Pipeline

```
Dirty Data                    Pandas Cleaning              Office Scripts / Power Automate
───────────                   ───────────────              ───────────────────────────────
.csv / .tsv          ──┐
.xlsx / .xls / .xlsb ──┤     ┌──────────────────┐         ┌──────────────────┐
.json / .jsonl       ──┼──→  │ Clean DataFrame   │  ──→    │ Format & automate │
.parquet             ──┤     │ ├─ Normalize cols  │         │ ├─ Office Scripts │
Dataverse export     ──┘     │ ├─ Coerce types   │         │ ├─ Charts/tables  │
                             │ ├─ Handle nulls   │         │ ├─ Power Automate │
                             │ ├─ Deduplicate    │         │ └─ VBA (legacy)   │
                             │ ├─ Validate       │         └──────────────────┘
                             │ └─ Dataverse mode │
                             └──────────────────┘
                                      │
                                      ▼
                             Polished .xlsx output
                             ├─ Formatted headers
                             ├─ Freeze panes
                             ├─ Auto-fit columns
                             ├─ Number formats
                             └─ Data quality report
```

## Commands

### `/excel-clean` — Clean messy data
```bash
/excel-clean sales_data_raw.csv
/excel-clean accounts_export.csv --source dataverse
/excel-clean messy_report.xlsx --output clean_report.xlsx
```
Reads any tabular input file, generates a complete Python cleaning script, and outputs a polished `.xlsx` file. Auto-detects Dataverse exports and activates specialized cleaning (prefix stripping, option set resolution, lookup flattening, OData annotation handling).

### `/excel-script` — Generate Office Scripts
```bash
/excel-script Format Sheet1 as a professional table with alternating row colors
/excel-script Accept employee records from Power Automate and write to Excel
/excel-script --format osts Create a summary chart from quarterly data
```
Creates TypeScript Office Scripts that follow all TS 4.0.3 restrictions. Supports `.osts`, `.ts`, or both output formats. Includes verify-before-use null checks by default.

### `/excel-template` — Generate Excel templates
```bash
/excel-template project-tracker
/excel-template inventory --columns "SKU, Product, Category, Qty, Price"
/excel-template contact-list --validation off
```
Generates openpyxl Python scripts that create reusable `.xlsx` templates with headers, data validation dropdowns, conditional formatting, named ranges, and optional sheet protection.

### `/excel-vba` — Generate VBA macros (deprecated)
```bash
/excel-vba Format the report --legacy-vba
```
Generates VBA code only when `--legacy-vba` is explicitly passed. Without the flag, redirects to `/excel-script`. Always includes a deprecation notice and the Office Script equivalent for migration.

### `/create-script` — Generate Office Script (original)
```bash
/create-script Create a table from data in Sheet1 with auto-formatting
```
Original command for Office Script generation. Use `/excel-script` for new work.

### `/validate-script` — Validate Office Script
```bash
/validate-script ./my-script.ts
```
Checks an Office Script against all TypeScript 4.0.3 restrictions and best practices.

### `/create-flow` — Generate Power Automate flow
```bash
/create-flow Run SalesReport script every weekday at 8 AM and email the team
```
Generates complete Power Automate flow definition JSON for the Dataverse Web API.

## Skills

| Skill | Description |
|-------|-------------|
| **pandas-cleaning** | Data cleaning with pandas -- reading, transforming, validating, and writing polished Excel files |
| **office-scripts** | Excel Office Scripts in TypeScript 4.0.3 -- API patterns, constraints, formatting, and Power Automate integration |
| **power-automate-flows** | Power Automate flow definitions -- triggers, actions, connectors, and CI/CD deployment |

## Agents

| Agent | Description |
|-------|-------------|
| **excel-reviewer** | Reviews pandas scripts, Office Scripts, VBA macros, and data quality for correctness and performance |
| **flow-definition-reviewer** | Reviews Power Automate flow definition JSON for schema correctness and best practices |

## Quick Start

1. **Clean some data:**
   ```
   /excel-clean my_messy_data.csv
   ```
   This generates a Python script that cleans the data and writes a formatted `.xlsx` file.

2. **Add Excel formatting:**
   ```
   /excel-script Add alternating row colors and a summary chart to the cleaned data
   ```
   This generates an Office Script you can run in Excel to apply formatting.

3. **Automate it:**
   ```
   /create-flow Run the cleaning script weekly and email the results
   ```
   This generates a Power Automate flow definition.

4. **Review before running:**
   Ask the `excel-reviewer` agent to check any generated script for correctness.

## Dependencies

For pandas cleaning scripts, the following Python packages are used:
```
pip install pandas openpyxl xlrd pyxlsb pyarrow
```

Office Scripts require Excel on the web or Excel desktop with Microsoft 365. No local installation needed -- scripts are written as `.ts` files.
