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

## Dependencies

Required Python packages:
- `pandas` (core data processing)
- `openpyxl` (Excel read/write and formatting)
- `xlrd` (legacy .xls support)
- `pyxlsb` (.xlsb binary format)
- `pyarrow` or `fastparquet` (Parquet files)

Install: `pip install pandas openpyxl xlrd pyxlsb pyarrow`

## Reference Files

| Resource | Path | Content |
|----------|------|---------|
| Cleaning Patterns | `references/cleaning-patterns.md` | Generic cleaning with complete Python code |
| Dataverse Mode | `references/dataverse-mode.md` | Dataverse-specific cleaning patterns |
| Validation Rules | `references/validation-rules.md` | Email, phone, zip, URL validation |
| Basic Examples | `examples/basic-cleaning.md` | CSV/Excel cleaning workflow scripts |
| Dataverse Examples | `examples/dataverse-cleaning.md` | Dataverse export cleaning scripts |
