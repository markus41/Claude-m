---
description: "Clean messy data with pandas and output a polished .xlsx file"
argument-hint: "<input-file> [--source dataverse] [--output <path>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Skill
---

# /excel-clean — Clean Data with Pandas

## Purpose

Reads a messy input file (CSV, Excel, JSON, Parquet, or Dataverse export), generates a complete Python cleaning script using pandas, and outputs a polished `.xlsx` file with professional formatting. Optionally activates Dataverse-specific cleaning when `--source dataverse` is specified or when Dataverse export patterns are auto-detected.

## Instructions

When this command is invoked:

1. **Load the pandas-cleaning skill** for reference on cleaning patterns, validation rules, Dataverse mode, and output formatting.

2. **Read and analyze the input file** to determine:
   - File format (CSV, XLSX, XLS, XLSB, JSON, JSONL, Parquet, TSV)
   - Encoding (detect UTF-8 BOM, Latin-1, etc.)
   - Column names, data types, and sample values
   - Null/missing value patterns and percentage
   - Duplicate row count
   - Whether this is a Dataverse export (check for publisher prefixes, OData annotations, `_value` GUID columns, system columns like `createdon`, `statecode`)

3. **Determine the cleaning pipeline** based on analysis:
   - Column normalization (to `snake_case`)
   - Type coercion (numeric, datetime, boolean detection)
   - Null handling strategy (smart fill, drop, or custom)
   - Deduplication (exact or fuzzy, with configurable subset columns)
   - String cleaning (strip whitespace, collapse spaces, normalize empty values)
   - Validation (auto-detect email, phone, zip, URL, date columns)
   - If `--source dataverse` or auto-detected as Dataverse: activate Dataverse mode

4. **If Dataverse mode is active**, additionally apply:
   - OData annotation processing (replace columns with formatted display values)
   - Lookup column flattening (replace GUID `_value` columns with display names)
   - Entity reference simplification
   - Publisher prefix stripping (auto-detect or use known prefix)
   - Option set resolution (from annotations or manual mappings if provided)
   - UTC timestamp conversion to local timezone
   - Metadata column dropping (versionnumber, processid, etc.)
   - See `skills/pandas-cleaning/references/dataverse-mode.md` for all patterns

5. **Generate a complete Python script** that:
   - Imports pandas, openpyxl, re, and any other needed modules
   - Reads the input file with the correct reader and encoding
   - Applies all cleaning steps in the correct order
   - Generates a data quality report (before/after comparison)
   - Writes the clean data to a polished `.xlsx` with:
     - Professional header styling (bold white text on blue fill)
     - Auto-fit column widths (capped at 50 characters)
     - Frozen header row
     - Number formats based on column dtype (currency, integer, float, date)
     - Optional: summary statistics sheet
     - Optional: data quality report sheet
   - Prints a cleaning summary to stdout

6. **Write the Python script** to the current directory (or user-specified location) with a descriptive filename like `clean_<input-name>.py`.

7. **Generate a markdown summary** explaining:
   - What was detected in the input file
   - What cleaning steps will be applied
   - Expected output structure
   - Any assumptions made
   - How to run the script (`python clean_<name>.py`)

## Dataverse Mode Activation

Dataverse mode is activated in one of two ways:

1. **Explicit**: User passes `--source dataverse`
2. **Auto-detected**: The input file matches 2+ of these indicators:
   - More than 30% of columns have publisher prefix patterns (e.g., `cr_xxx_`, `new_`, `contoso_`)
   - Any column contains `@OData` in its name
   - Columns ending with `_value` are present (GUID lookup references)
   - Common Dataverse system columns found (`createdon`, `modifiedon`, `statecode`, `statuscode`, `versionnumber`)

When Dataverse mode is active, the generated script imports and applies all Dataverse-specific cleaning functions from the reference patterns.

## Output File Naming

- If `--output <path>` is specified, use that path
- Otherwise, derive from input: `input.csv` becomes `input_cleaned.xlsx`
- The Python script is named: `clean_<input-basename>.py`

## Checklist Before Output

- [ ] Input file format correctly identified and appropriate reader used
- [ ] Encoding detected (especially UTF-8 BOM for Excel-exported CSVs)
- [ ] All applicable cleaning steps included in the pipeline
- [ ] If Dataverse: OData annotations processed BEFORE dropping columns
- [ ] If Dataverse: lookups flattened BEFORE prefix stripping
- [ ] Output uses openpyxl formatting (headers, freeze panes, autofit, number formats)
- [ ] Data quality report generated (rows before/after, nulls before/after, columns changed)
- [ ] Script is self-contained and runnable with `python <script>.py`
- [ ] All required packages listed in a comment at the top of the script

## Example Usage

```bash
# Clean a messy CSV
/excel-clean sales_data_raw.csv

# Clean with explicit output path
/excel-clean messy_report.xlsx --output clean_report.xlsx

# Clean a Dataverse export
/excel-clean accounts_export.csv --source dataverse

# Auto-detect Dataverse and specify timezone
/excel-clean contacts_2024.csv --source dataverse --output contacts_cleaned.xlsx

# Clean a JSON API response
/excel-clean api_response.json --output formatted_data.xlsx
```
