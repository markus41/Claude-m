---
name: pandas-cleaning
description: "Expert knowledge of data cleaning with pandas — reading messy data from any source, transforming it into clean DataFrames, and outputting polished .xlsx files with openpyxl formatting"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
dependencies: []
triggers:
  - pandas
  - data cleaning
  - clean excel
  - clean data
  - messy data
  - normalize data
  - dataverse export
  - dedup
  - deduplicate
  - data quality
  - csv to excel
  - json to excel
  - parquet to excel
  - openpyxl
  - excel output
  - data wrangling
  - etl
  - excel-clean
  - strip prefixes
  - option set
  - flatten lookups
---

# Pandas Data Cleaning

Clean messy tabular data from any source using Python and pandas, then output polished .xlsx files with professional formatting via openpyxl.

## When to Activate

- User asks to clean, normalize, or transform data from CSV, Excel, JSON, Parquet, or any tabular source
- User wants to convert messy files into polished .xlsx output
- User mentions pandas, data cleaning, deduplication, or data quality
- User has a Dataverse export that needs cleaning (publisher prefixes, option sets, lookups)
- User needs to validate data (emails, phones, zip codes, dates)
- User wants a data quality report or cleaning summary

## Pipeline Overview

```
Input Sources                    Processing                        Output
─────────────────               ────────────────                  ──────────
.xlsx / .xls / .xlsb    ──┐
.csv / .tsv              ──┤    pandas DataFrame                  Clean .xlsx
.json / .jsonl           ──┼──→ ├── Column normalization    ──→   ├── Data sheet
.parquet                 ──┤    ├── Type coercion                 ├── Summary stats
Dataverse export (.csv)  ──┘    ├── Null handling                 ├── Data quality report
                                ├── Deduplication                 └── Formatted headers
                                ├── Validation                        + freeze panes
                                └── Dataverse-specific clean          + autofit columns
                                                                      + number formats
```

## Reading Input Files

Use the correct pandas reader for each format:

```python
import pandas as pd

# Excel files (all formats)
df = pd.read_excel("input.xlsx", sheet_name="Sheet1")          # .xlsx
df = pd.read_excel("input.xlsx", sheet_name=None)               # All sheets → dict
df = pd.read_excel("input.xls", engine="xlrd")                  # Legacy .xls
df = pd.read_excel("input.xlsb", engine="pyxlsb")              # Binary .xlsb

# CSV / TSV
df = pd.read_csv("input.csv")                                   # Standard CSV
df = pd.read_csv("input.csv", encoding="utf-8-sig")             # UTF-8 BOM (common from Excel)
df = pd.read_csv("input.tsv", sep="\t")                         # Tab-separated
df = pd.read_csv("input.csv", dtype=str)                        # Force all columns as string (preserve leading zeros)

# JSON
df = pd.read_json("input.json")                                 # Standard JSON array
df = pd.json_normalize(json_data, record_path="records")        # Nested JSON

# Parquet
df = pd.read_parquet("input.parquet")                           # Parquet files

# Large files (chunked reading)
chunks = pd.read_csv("large.csv", chunksize=50000)
df = pd.concat(chunks, ignore_index=True)
```

## Standard Cleaning Steps

Apply these steps in order for any dataset:

### 1. Column Normalization

Rename columns to clean `snake_case`:

```python
import re

def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize column names to snake_case."""
    def clean_name(name: str) -> str:
        # Remove leading/trailing whitespace
        name = name.strip()
        # Replace spaces, hyphens, dots with underscores
        name = re.sub(r'[\s\-\.]+', '_', name)
        # Insert underscore before uppercase letters (camelCase → camel_case)
        name = re.sub(r'([a-z])([A-Z])', r'\1_\2', name)
        # Lowercase everything
        name = name.lower()
        # Remove duplicate underscores
        name = re.sub(r'_+', '_', name)
        # Remove leading/trailing underscores
        name = name.strip('_')
        return name

    df.columns = [clean_name(str(col)) for col in df.columns]
    return df
```

### 2. Type Coercion

Detect and convert columns to appropriate types:

```python
def coerce_types(df: pd.DataFrame) -> pd.DataFrame:
    """Auto-detect and coerce column types."""
    for col in df.columns:
        # Try numeric conversion
        if df[col].dtype == object:
            numeric = pd.to_numeric(df[col], errors='coerce')
            if numeric.notna().sum() > 0.8 * len(df):
                df[col] = numeric
                continue

            # Try datetime conversion
            try:
                dt = pd.to_datetime(df[col], infer_datetime_format=True, errors='coerce')
                if dt.notna().sum() > 0.8 * len(df):
                    df[col] = dt
                    continue
            except Exception:
                pass

            # Try boolean conversion
            bool_map = {'true': True, 'false': False, 'yes': True, 'no': False,
                        '1': True, '0': False, 'y': True, 'n': False}
            lower = df[col].astype(str).str.lower().str.strip()
            if lower.isin(bool_map.keys()).sum() > 0.9 * len(df):
                df[col] = lower.map(bool_map)
                continue

    return df
```

### 3. Null Handling

Choose a strategy based on column characteristics:

```python
def handle_nulls(df: pd.DataFrame, strategy: str = "smart") -> pd.DataFrame:
    """Handle null values with configurable strategy."""
    if strategy == "drop_rows":
        return df.dropna()
    elif strategy == "drop_cols":
        return df.dropna(axis=1, thresh=int(0.5 * len(df)))
    elif strategy == "smart":
        for col in df.columns:
            null_pct = df[col].isna().mean()
            if null_pct > 0.5:
                df = df.drop(columns=[col])  # Drop columns >50% null
            elif df[col].dtype in ['float64', 'int64']:
                df[col] = df[col].fillna(df[col].median())  # Numeric: fill with median
            elif pd.api.types.is_datetime64_any_dtype(df[col]):
                pass  # Leave datetime nulls as NaT
            else:
                df[col] = df[col].fillna("")  # String: fill with empty string
    return df
```

### 4. Deduplication

Remove duplicate rows with configurable subset:

```python
def deduplicate(df: pd.DataFrame, subset: list[str] | None = None,
                keep: str = "first") -> tuple[pd.DataFrame, int]:
    """Remove duplicates, return cleaned DataFrame and count of removed rows."""
    before = len(df)
    df = df.drop_duplicates(subset=subset, keep=keep)
    removed = before - len(df)
    return df, removed
```

### 5. String Cleaning

```python
def clean_strings(df: pd.DataFrame) -> pd.DataFrame:
    """Clean all string columns."""
    for col in df.select_dtypes(include='object').columns:
        df[col] = (
            df[col]
            .astype(str)
            .str.strip()
            .str.replace(r'\s+', ' ', regex=True)  # Collapse whitespace
            .replace({'nan': '', 'None': '', 'N/A': '', 'n/a': '', 'NA': '', '-': '', 'null': ''})
        )
    return df
```

## Dataverse-Aware Mode

When cleaning Dataverse exports (triggered by `--source dataverse` or detected automatically), apply additional transformations:

### Publisher Prefix Stripping

Dataverse columns have publisher prefixes like `cr_xxx_columnname`. Strip them:

```python
def strip_publisher_prefixes(df: pd.DataFrame) -> pd.DataFrame:
    """Remove Dataverse publisher prefixes from column names."""
    import re
    prefix_pattern = re.compile(r'^[a-z]+\d*_')
    new_names = {}
    for col in df.columns:
        cleaned = prefix_pattern.sub('', col)
        # Handle OData annotation columns
        if '@OData' in col:
            continue  # Skip annotation columns; they are processed separately
        new_names[col] = cleaned
    return df.rename(columns=new_names)
```

### Option Set Resolution

Convert integer option set values to their display labels:

```python
def resolve_option_sets(df: pd.DataFrame, column: str,
                        mapping: dict[int, str]) -> pd.DataFrame:
    """Replace integer option set values with labels."""
    df[column] = df[column].map(mapping).fillna(df[column])
    return df
```

### Lookup Flattening

Replace `_value` GUID columns with display names:

```python
def flatten_lookups(df: pd.DataFrame) -> pd.DataFrame:
    """Replace _value GUID columns with their formatted display values."""
    for col in list(df.columns):
        formatted_col = f"{col}@OData.Community.Display.V1.FormattedValue"
        if formatted_col in df.columns:
            # Replace GUID column with display value
            display_name = col.replace('_value', '_name')
            df[display_name] = df[formatted_col]
            df = df.drop(columns=[col, formatted_col])
    return df
```

See `references/dataverse-mode.md` for complete Dataverse-specific patterns.

## Auto-Validation

Detect and validate common data patterns:

```python
import re

EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')

def validate_emails(series: pd.Series) -> pd.Series:
    """Validate email addresses, return boolean mask."""
    return series.astype(str).str.match(EMAIL_REGEX)

def normalize_phones(series: pd.Series, country: str = "US") -> pd.Series:
    """Normalize phone numbers to E.164 format."""
    cleaned = series.astype(str).str.replace(r'[^\d+]', '', regex=True)
    if country == "US":
        cleaned = cleaned.apply(lambda x: f"+1{x[-10:]}" if len(x) >= 10 else x)
    return cleaned
```

See `references/validation-rules.md` for complete validation patterns.

## Output: Polished .xlsx with openpyxl

Generate professionally formatted Excel output:

```python
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side, numbers
from openpyxl.utils import get_column_letter

def write_polished_xlsx(df: pd.DataFrame, output_path: str,
                        sheet_name: str = "Data") -> None:
    """Write DataFrame to a polished .xlsx file."""
    with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name=sheet_name, index=False, startrow=0)
        wb = writer.book
        ws = writer.sheets[sheet_name]

        # Header styling
        header_font = Font(bold=True, color="FFFFFF", size=11)
        header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
        header_align = Alignment(horizontal="center", vertical="center", wrap_text=True)

        for col_idx in range(1, len(df.columns) + 1):
            cell = ws.cell(row=1, column=col_idx)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = header_align

        # Auto-fit column widths
        for col_idx, col_name in enumerate(df.columns, 1):
            max_length = max(
                len(str(col_name)),
                df[col_name].astype(str).str.len().max() if len(df) > 0 else 0
            )
            ws.column_dimensions[get_column_letter(col_idx)].width = min(max_length + 4, 50)

        # Freeze header row
        ws.freeze_panes = "A2"

        # Apply number formats based on dtype
        for col_idx, col_name in enumerate(df.columns, 1):
            col_letter = get_column_letter(col_idx)
            if pd.api.types.is_float_dtype(df[col_name]):
                for row in range(2, len(df) + 2):
                    ws[f"{col_letter}{row}"].number_format = '#,##0.00'
            elif pd.api.types.is_integer_dtype(df[col_name]):
                for row in range(2, len(df) + 2):
                    ws[f"{col_letter}{row}"].number_format = '#,##0'
            elif pd.api.types.is_datetime64_any_dtype(df[col_name]):
                for row in range(2, len(df) + 2):
                    ws[f"{col_letter}{row}"].number_format = 'YYYY-MM-DD'
```

## Data Quality Report

Generate a summary of the cleaning actions:

```python
def generate_quality_report(df_before: pd.DataFrame, df_after: pd.DataFrame,
                            actions: list[str]) -> dict:
    """Generate a data quality report comparing before and after."""
    return {
        "rows_before": len(df_before),
        "rows_after": len(df_after),
        "rows_removed": len(df_before) - len(df_after),
        "columns_before": len(df_before.columns),
        "columns_after": len(df_after.columns),
        "null_pct_before": df_before.isna().mean().mean() * 100,
        "null_pct_after": df_after.isna().mean().mean() * 100,
        "duplicate_rows_removed": len(df_before) - len(df_before.drop_duplicates()),
        "actions_taken": actions,
        "column_types": {col: str(dtype) for col, dtype in df_after.dtypes.items()},
    }
```

## Quick Reference: Common Operations

| Task | Code |
|------|------|
| Read Excel | `pd.read_excel("file.xlsx")` |
| Read CSV | `pd.read_csv("file.csv", encoding="utf-8-sig")` |
| Rename columns | `df.columns = [clean_name(c) for c in df.columns]` |
| Drop duplicates | `df.drop_duplicates(subset=["id"], keep="first")` |
| Fill nulls | `df["col"].fillna(default_value)` |
| Drop null rows | `df.dropna(subset=["required_col"])` |
| Convert types | `pd.to_numeric(df["col"], errors="coerce")` |
| Parse dates | `pd.to_datetime(df["col"], format="mixed")` |
| Strip strings | `df["col"].str.strip()` |
| Filter rows | `df[df["col"] > threshold]` |
| Group + aggregate | `df.groupby("key").agg({"val": "sum"})` |
| Write Excel | `df.to_excel("output.xlsx", index=False)` |

## Advanced Transformations

### Pivot / Unpivot

```python
# Pivot: rows → columns
pivot_df = df.pivot_table(
    index="department",
    columns="quarter",
    values="revenue",
    aggfunc="sum",
    fill_value=0,
    margins=True,          # Add row/column totals
    margins_name="Total"
)

# Unpivot (melt): columns → rows
melted = pd.melt(
    df,
    id_vars=["employee", "department"],
    value_vars=["jan", "feb", "mar"],
    var_name="month",
    value_name="sales"
)
```

### Multi-Sheet Processing

Process all sheets in a workbook and combine:

```python
def process_all_sheets(path: str) -> pd.DataFrame:
    """Read all sheets, normalize, and stack."""
    sheets = pd.read_excel(path, sheet_name=None)
    frames = []
    for name, df in sheets.items():
        df = normalize_columns(df)
        df["source_sheet"] = name
        frames.append(df)
    return pd.concat(frames, ignore_index=True)
```

### Cross-File Merge

Join data across multiple source files:

```python
def merge_sources(primary: str, lookup: str, key: str) -> pd.DataFrame:
    """Merge primary data with lookup table."""
    df_main = pd.read_excel(primary)
    df_lookup = pd.read_excel(lookup)
    merged = df_main.merge(df_lookup, on=key, how="left", indicator=True)
    # Flag rows that didn't match
    merged["_matched"] = merged["_merge"] == "both"
    merged = merged.drop(columns=["_merge"])
    return merged
```

### Conditional Column Creation

```python
# Bin numeric values into categories
df["revenue_tier"] = pd.cut(
    df["revenue"],
    bins=[0, 10000, 50000, 100000, float("inf")],
    labels=["Small", "Medium", "Large", "Enterprise"]
)

# Map values with fallback
df["region"] = df["state"].map({
    "CA": "West", "OR": "West", "WA": "West",
    "NY": "East", "MA": "East", "CT": "East",
}).fillna("Other")
```

### Date Intelligence

```python
def add_date_columns(df: pd.DataFrame, date_col: str) -> pd.DataFrame:
    """Add fiscal year, quarter, week number from a date column."""
    dt = pd.to_datetime(df[date_col], errors="coerce")
    df[f"{date_col}_year"] = dt.dt.year
    df[f"{date_col}_quarter"] = dt.dt.quarter
    df[f"{date_col}_month"] = dt.dt.month
    df[f"{date_col}_week"] = dt.dt.isocalendar().week.astype(int)
    df[f"{date_col}_day_of_week"] = dt.dt.day_name()
    # Fiscal year (July start)
    df[f"{date_col}_fiscal_year"] = dt.apply(
        lambda x: x.year + 1 if x.month >= 7 else x.year if pd.notna(x) else None
    )
    return df
```

## Graph API Integration (Reading Excel from OneDrive/SharePoint)

When the source file is in OneDrive or SharePoint, use the Graph API to download before cleaning:

```python
import requests
import io

def read_excel_from_graph(access_token: str, drive_item_id: str,
                          sheet_name: str = None) -> pd.DataFrame:
    """Download Excel file from OneDrive/SharePoint via Graph API and load into pandas."""
    url = f"https://graph.microsoft.com/v1.0/me/drive/items/{drive_item_id}/content"
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(url, headers=headers)
    response.raise_for_status()

    return pd.read_excel(
        io.BytesIO(response.content),
        sheet_name=sheet_name,
        engine="openpyxl"
    )


def upload_excel_to_graph(access_token: str, drive_id: str,
                          folder_path: str, file_name: str,
                          file_bytes: bytes) -> dict:
    """Upload cleaned Excel file back to OneDrive/SharePoint."""
    url = (
        f"https://graph.microsoft.com/v1.0/drives/{drive_id}"
        f"/root:/{folder_path}/{file_name}:/content"
    )
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    }
    response = requests.put(url, headers=headers, data=file_bytes)
    response.raise_for_status()
    return response.json()
```

### End-to-End Graph Pipeline

```python
def clean_and_upload(access_token: str, source_item_id: str,
                     dest_drive_id: str, dest_folder: str) -> dict:
    """Download → clean → upload pipeline."""
    # 1. Download
    df = read_excel_from_graph(access_token, source_item_id)

    # 2. Clean
    df = normalize_columns(df)
    df = coerce_types(df)
    df = handle_nulls(df, strategy="smart")
    df, removed = deduplicate(df)
    df = clean_strings(df)

    # 3. Write to buffer
    buffer = io.BytesIO()
    write_polished_xlsx(df, buffer)
    buffer.seek(0)

    # 4. Upload
    result = upload_excel_to_graph(
        access_token, dest_drive_id, dest_folder,
        "cleaned_output.xlsx", buffer.read()
    )
    return result
```

## Error Handling

### Common pandas Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `ParserError` | Malformed CSV (inconsistent columns) | Use `error_bad_lines=False` or `on_bad_lines="skip"` |
| `ValueError: Excel file format not supported` | Wrong engine for file type | Use `engine="xlrd"` for `.xls`, `engine="pyxlsb"` for `.xlsb` |
| `UnicodeDecodeError` | Wrong encoding | Try `encoding="utf-8-sig"`, `"latin-1"`, or `"cp1252"` |
| `SettingWithCopyWarning` | Chained assignment on DataFrame view | Use `.loc[]` or `.copy()` before modification |
| `MergeError` | Duplicate keys in merge | Deduplicate before merge or use `validate="many_to_one"` |
| `OutOfMemoryError` | File too large for RAM | Use `chunksize` parameter or `dtype` optimization |

### Encoding Detection

```python
def detect_encoding(file_path: str) -> str:
    """Detect file encoding using chardet."""
    import chardet
    with open(file_path, "rb") as f:
        raw = f.read(10000)
    result = chardet.detect(raw)
    return result["encoding"]

# Usage
encoding = detect_encoding("mystery_file.csv")
df = pd.read_csv("mystery_file.csv", encoding=encoding)
```

### Safe Type Conversion

```python
def safe_to_numeric(series: pd.Series) -> pd.Series:
    """Convert to numeric, preserving original values on failure."""
    # Remove currency symbols and thousands separators
    cleaned = series.astype(str).str.replace(r'[$,€£]', '', regex=True).str.strip()
    converted = pd.to_numeric(cleaned, errors='coerce')
    # Only convert if >80% succeeded
    if converted.notna().mean() > 0.8:
        return converted
    return series

def safe_to_datetime(series: pd.Series, formats: list[str] = None) -> pd.Series:
    """Try multiple date formats in order."""
    formats = formats or [
        "%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y-%m-%d %H:%M:%S",
        "%m/%d/%Y %I:%M %p", "%d-%b-%Y", "%B %d, %Y"
    ]
    for fmt in formats:
        try:
            parsed = pd.to_datetime(series, format=fmt, errors='coerce')
            if parsed.notna().mean() > 0.8:
                return parsed
        except Exception:
            continue
    # Fallback: let pandas infer
    return pd.to_datetime(series, errors='coerce')
```

### Memory Optimization

```python
def optimize_dtypes(df: pd.DataFrame) -> pd.DataFrame:
    """Downcast numeric columns and convert low-cardinality strings to category."""
    for col in df.select_dtypes(include=['int64']).columns:
        df[col] = pd.to_numeric(df[col], downcast='integer')
    for col in df.select_dtypes(include=['float64']).columns:
        df[col] = pd.to_numeric(df[col], downcast='float')
    for col in df.select_dtypes(include=['object']).columns:
        if df[col].nunique() / len(df) < 0.5:  # <50% unique → category
            df[col] = df[col].astype('category')
    return df
```

## Common Patterns

### Pattern 1: CSV-to-Excel Cleanup Pipeline

1. Read CSV with encoding detection and `dtype=str` to preserve data
2. Normalize column names to snake_case
3. Coerce types (numeric, datetime, boolean)
4. Handle nulls with smart strategy (drop columns >50% null, fill rest)
5. Deduplicate on business key columns
6. Clean strings (strip, collapse whitespace, replace sentinel values)
7. Validate emails/phones if detected
8. Write polished `.xlsx` with formatted headers, freeze panes, autofit columns
9. Generate data quality report on separate sheet

### Pattern 2: Dataverse Export Cleaning

1. Read CSV with `encoding="utf-8-sig"` and `dtype=str`
2. Drop OData annotation columns (`@OData.*`)
3. Strip publisher prefixes from column names (`cr_xxx_` → bare name)
4. Resolve option set integers to display labels using mapping dict
5. Flatten lookup GUID columns to display names using `@OData.Community.Display.V1.FormattedValue`
6. Normalize remaining columns to snake_case
7. Coerce types and handle nulls
8. Write output with separate summary sheet

### Pattern 3: Multi-Source Reconciliation

1. Read primary and secondary files (may be different formats)
2. Normalize column names in both
3. Identify common key column(s)
4. Merge with `indicator=True` to flag matched/unmatched
5. Write three-sheet output: Matched, Primary Only, Secondary Only
6. Add summary statistics on a fourth sheet

### Pattern 4: Periodic Report Refresh

1. Download current Excel from Graph API (OneDrive/SharePoint)
2. Read existing data from "Data" sheet
3. Read new data from CSV/JSON source
4. Append new rows, deduplicate on primary key
5. Recalculate summary statistics
6. Write updated workbook with Data + Summary sheets
7. Upload back to Graph API, replacing original file

## Dependencies

Required Python packages:
- `pandas` (core data processing)
- `openpyxl` (Excel read/write and formatting)
- `xlrd` (legacy .xls support)
- `pyxlsb` (.xlsb binary format)
- `pyarrow` or `fastparquet` (Parquet files)
- `chardet` (encoding detection — optional)
- `requests` (Graph API integration — optional)

Install: `pip install pandas openpyxl xlrd pyxlsb pyarrow chardet requests`

## Reference Files

| Resource | Path | Content |
|----------|------|---------|
| Cleaning Patterns | `references/cleaning-patterns.md` | Generic cleaning with complete Python code |
| Dataverse Mode | `references/dataverse-mode.md` | Dataverse-specific cleaning patterns |
| Validation Rules | `references/validation-rules.md` | Email, phone, zip, URL validation |
| Basic Examples | `examples/basic-cleaning.md` | CSV/Excel cleaning workflow scripts |
| Dataverse Examples | `examples/dataverse-cleaning.md` | Dataverse export cleaning scripts |
