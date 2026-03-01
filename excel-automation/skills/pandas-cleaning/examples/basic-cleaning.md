# Basic Cleaning Examples

Complete Python scripts for common data cleaning workflows.

## 1. Clean a Messy CSV to Polished .xlsx

```python
"""Clean a messy CSV file with mixed types, nulls, and duplicates."""
import pandas as pd
import re
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

def clean_messy_csv(input_path: str, output_path: str) -> dict:
    """Read a messy CSV, clean it, output polished .xlsx."""
    # Read with all-string to prevent type mangling
    df = pd.read_csv(input_path, dtype=str, encoding='utf-8-sig')
    actions: list[str] = []
    rows_before = len(df)

    # 1. Normalize column names
    def clean_col(name: str) -> str:
        name = str(name).strip()
        name = re.sub(r'[\s\-\.]+', '_', name)
        name = re.sub(r'([a-z])([A-Z])', r'\1_\2', name)
        name = name.lower()
        name = re.sub(r'[^a-z0-9_]', '', name)
        name = re.sub(r'_+', '_', name).strip('_')
        return name

    df.columns = [clean_col(c) for c in df.columns]
    actions.append(f"Normalized {len(df.columns)} column names to snake_case")

    # 2. Strip whitespace from all string cells
    for col in df.columns:
        df[col] = df[col].str.strip()

    # 3. Replace empty-ish values with NaN
    empty_values = ['', 'N/A', 'n/a', 'NA', 'NULL', 'null', 'None', 'none', '-', '#N/A']
    df = df.replace(empty_values, pd.NA)
    actions.append("Replaced empty-ish values (N/A, NULL, etc.) with NaN")

    # 4. Auto-detect and coerce types
    for col in df.columns:
        series = df[col].dropna()
        if len(series) == 0:
            continue
        # Try numeric
        numeric = pd.to_numeric(series, errors='coerce')
        if numeric.notna().mean() > 0.85:
            df[col] = pd.to_numeric(df[col], errors='coerce')
            actions.append(f"Converted '{col}' to numeric")
            continue
        # Try datetime
        try:
            dt = pd.to_datetime(series, format='mixed', errors='coerce')
            if dt.notna().mean() > 0.85:
                df[col] = pd.to_datetime(df[col], format='mixed', errors='coerce')
                actions.append(f"Converted '{col}' to datetime")
                continue
        except Exception:
            pass

    # 5. Remove duplicate rows
    dupes = df.duplicated().sum()
    if dupes > 0:
        df = df.drop_duplicates()
        actions.append(f"Removed {dupes} duplicate rows")

    # 6. Handle nulls
    for col in df.columns:
        null_pct = df[col].isna().mean()
        if null_pct > 0.7:
            df = df.drop(columns=[col])
            actions.append(f"Dropped column '{col}' ({null_pct:.0%} null)")
        elif pd.api.types.is_numeric_dtype(df[col]):
            median_val = df[col].median()
            filled = df[col].isna().sum()
            if filled > 0:
                df[col] = df[col].fillna(median_val)
                actions.append(f"Filled {filled} nulls in '{col}' with median ({median_val:.2f})")
        else:
            filled = df[col].isna().sum()
            if filled > 0:
                df[col] = df[col].fillna("")
                actions.append(f"Filled {filled} nulls in '{col}' with empty string")

    # 7. Write polished output
    with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Data', index=False)
        ws = writer.sheets['Data']

        # Format headers
        for col_idx in range(1, len(df.columns) + 1):
            cell = ws.cell(row=1, column=col_idx)
            cell.font = Font(bold=True, color="FFFFFF", size=11)
            cell.fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
            cell.alignment = Alignment(horizontal="center")

        # Auto-fit columns
        for col_idx, col_name in enumerate(df.columns, 1):
            max_len = max(len(str(col_name)), df[col_name].astype(str).str.len().max() or 0)
            ws.column_dimensions[get_column_letter(col_idx)].width = min(max_len + 4, 40)

        ws.freeze_panes = "A2"
        ws.auto_filter.ref = ws.dimensions

    return {
        "rows_before": rows_before, "rows_after": len(df),
        "columns": len(df.columns), "actions": actions,
    }

# Usage
if __name__ == "__main__":
    report = clean_messy_csv("messy_data.csv", "clean_data.xlsx")
    print(f"Cleaned: {report['rows_before']} -> {report['rows_after']} rows")
    for action in report['actions']:
        print(f"  - {action}")
```

## 2. Multi-Sheet Excel Processing

```python
"""Read all sheets from an Excel file, clean each, merge into one."""
import pandas as pd
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

def process_multi_sheet_excel(input_path: str, output_path: str) -> dict:
    """Clean and merge all sheets from a multi-sheet Excel file."""
    # Read all sheets
    all_sheets = pd.read_excel(input_path, sheet_name=None, dtype=str)
    print(f"Found {len(all_sheets)} sheets: {list(all_sheets.keys())}")

    merged_frames: list[pd.DataFrame] = []
    sheet_report: list[dict] = []

    for sheet_name, df in all_sheets.items():
        original_rows = len(df)

        # Skip empty sheets
        if df.empty or len(df.columns) == 0:
            sheet_report.append({"sheet": sheet_name, "rows": 0, "status": "skipped (empty)"})
            continue

        # Normalize columns
        df.columns = [str(c).strip().lower().replace(' ', '_') for c in df.columns]

        # Strip whitespace and replace empties
        for col in df.select_dtypes(include='object').columns:
            df[col] = df[col].str.strip().replace(['', 'N/A', 'NA', 'null'], pd.NA)

        # Auto-coerce types
        for col in df.columns:
            numeric = pd.to_numeric(df[col], errors='coerce')
            if numeric.notna().mean() > 0.8:
                df[col] = numeric

        # Drop empty rows
        df = df.dropna(how='all')

        # Remove duplicates
        dupes = df.duplicated().sum()
        df = df.drop_duplicates()

        # Add source sheet column
        df['_source_sheet'] = sheet_name

        merged_frames.append(df)
        sheet_report.append({
            "sheet": sheet_name,
            "rows": len(df),
            "original_rows": original_rows,
            "duplicates_removed": dupes,
            "columns": len(df.columns) - 1,  # Exclude _source_sheet
        })

    if not merged_frames:
        raise ValueError("No data found in any sheet")

    # Merge all frames
    merged = pd.concat(merged_frames, ignore_index=True, sort=False)

    # Write output
    with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
        merged.to_excel(writer, sheet_name='Merged', index=False)
        ws = writer.sheets['Merged']
        for col_idx in range(1, len(merged.columns) + 1):
            cell = ws.cell(row=1, column=col_idx)
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
        ws.freeze_panes = "A2"

        # Summary sheet
        summary = pd.DataFrame(sheet_report)
        summary.to_excel(writer, sheet_name='Sheet Summary', index=False)

    return {"total_rows": len(merged), "sheets_processed": len(merged_frames), "details": sheet_report}

if __name__ == "__main__":
    report = process_multi_sheet_excel("multi_sheet.xlsx", "merged_clean.xlsx")
    print(f"Merged {report['sheets_processed']} sheets into {report['total_rows']} rows")
```

## 3. JSON API Response to .xlsx

```python
"""Convert a nested JSON API response into a normalized, clean .xlsx."""
import pandas as pd
import json
from openpyxl.styles import Font, PatternFill
from openpyxl.utils import get_column_letter

def json_to_clean_xlsx(input_path: str, output_path: str,
                       record_path: str | None = None) -> dict:
    """Read JSON, normalize, clean, write .xlsx."""
    # Load JSON
    with open(input_path, 'r', encoding='utf-8') as f:
        raw = json.load(f)

    # Normalize nested structure
    if isinstance(raw, list):
        df = pd.json_normalize(raw, sep='_')
    elif isinstance(raw, dict):
        if record_path:
            df = pd.json_normalize(raw, record_path=record_path.split('.'), sep='_')
        elif 'data' in raw:
            df = pd.json_normalize(raw['data'], sep='_')
        elif 'results' in raw:
            df = pd.json_normalize(raw['results'], sep='_')
        elif 'records' in raw:
            df = pd.json_normalize(raw['records'], sep='_')
        else:
            df = pd.json_normalize(raw, sep='_')
    else:
        raise ValueError(f"Unexpected JSON root type: {type(raw)}")

    actions: list[str] = [f"Parsed {len(df)} records from JSON"]

    # Clean column names
    df.columns = [str(c).strip().lower().replace('.', '_').replace(' ', '_') for c in df.columns]

    # Drop columns that are all null or are nested objects
    for col in list(df.columns):
        if df[col].isna().all():
            df = df.drop(columns=[col])
            actions.append(f"Dropped empty column '{col}'")
        elif df[col].apply(lambda x: isinstance(x, (dict, list))).any():
            # Stringify nested objects
            df[col] = df[col].apply(lambda x: json.dumps(x) if isinstance(x, (dict, list)) else x)
            actions.append(f"Stringified nested objects in '{col}'")

    # Coerce types
    for col in df.columns:
        if df[col].dtype == object:
            numeric = pd.to_numeric(df[col], errors='coerce')
            if numeric.notna().mean() > 0.8:
                df[col] = numeric
                continue
            try:
                dt = pd.to_datetime(df[col], format='mixed', errors='coerce')
                if dt.notna().mean() > 0.8:
                    df[col] = dt
            except Exception:
                pass

    # Write output
    with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Data', index=False)
        ws = writer.sheets['Data']
        for col_idx in range(1, len(df.columns) + 1):
            cell = ws.cell(row=1, column=col_idx)
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
            max_len = max(len(str(df.columns[col_idx-1])),
                          df.iloc[:, col_idx-1].astype(str).str.len().max() or 0)
            ws.column_dimensions[get_column_letter(col_idx)].width = min(max_len + 4, 50)
        ws.freeze_panes = "A2"

    return {"rows": len(df), "columns": len(df.columns), "actions": actions}

if __name__ == "__main__":
    report = json_to_clean_xlsx("api_response.json", "api_data.xlsx", record_path="data.items")
    print(f"Wrote {report['rows']} rows, {report['columns']} columns")
```

## 4. Large File Processing with Chunked Reading

```python
"""Process a large CSV file in chunks to avoid memory issues."""
import pandas as pd
from openpyxl.styles import Font, PatternFill
from openpyxl.utils import get_column_letter

def process_large_csv(input_path: str, output_path: str,
                      chunk_size: int = 50000) -> dict:
    """Process a large CSV in chunks, clean, and write to .xlsx."""
    # First pass: read header and detect types
    header_df = pd.read_csv(input_path, nrows=100)
    all_columns = list(header_df.columns)
    print(f"Columns: {len(all_columns)}")

    # Process in chunks
    clean_chunks: list[pd.DataFrame] = []
    total_rows = 0
    total_dupes = 0
    chunk_num = 0

    for chunk in pd.read_csv(input_path, chunksize=chunk_size, encoding='utf-8-sig'):
        chunk_num += 1
        total_rows += len(chunk)

        # Clean column names (only first chunk needs this)
        chunk.columns = [str(c).strip().lower().replace(' ', '_') for c in chunk.columns]

        # Strip strings
        for col in chunk.select_dtypes(include='object').columns:
            chunk[col] = chunk[col].str.strip()
            chunk[col] = chunk[col].replace(['', 'N/A', 'NA', 'null', 'NULL'], pd.NA)

        # Coerce types
        for col in chunk.columns:
            if chunk[col].dtype == object:
                numeric = pd.to_numeric(chunk[col], errors='coerce')
                if numeric.notna().mean() > 0.85:
                    chunk[col] = numeric

        # Drop all-null rows
        chunk = chunk.dropna(how='all')

        # Remove within-chunk duplicates
        before = len(chunk)
        chunk = chunk.drop_duplicates()
        total_dupes += before - len(chunk)

        clean_chunks.append(chunk)
        print(f"  Chunk {chunk_num}: {len(chunk)} rows")

    # Combine and do final global dedup
    df = pd.concat(clean_chunks, ignore_index=True)
    before_global = len(df)
    df = df.drop_duplicates()
    global_dupes = before_global - len(df)

    # Write output
    with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Data', index=False)
        ws = writer.sheets['Data']
        for col_idx in range(1, len(df.columns) + 1):
            cell = ws.cell(row=1, column=col_idx)
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
        ws.freeze_panes = "A2"

    return {
        "input_rows": total_rows,
        "output_rows": len(df),
        "chunks_processed": chunk_num,
        "duplicates_removed": total_dupes + global_dupes,
    }

if __name__ == "__main__":
    report = process_large_csv("large_dataset.csv", "large_clean.xlsx")
    print(f"Processed {report['input_rows']:,} rows in {report['chunks_processed']} chunks")
    print(f"Output: {report['output_rows']:,} rows ({report['duplicates_removed']:,} duplicates removed)")
```

## 5. Data Quality Report Generation

```python
"""Generate a comprehensive data quality report as a standalone .xlsx."""
import pandas as pd
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

def generate_quality_report(input_path: str, report_path: str) -> None:
    """Analyze a file and generate a data quality report."""
    # Read input
    if input_path.endswith('.csv'):
        df = pd.read_csv(input_path, encoding='utf-8-sig')
    else:
        df = pd.read_excel(input_path)

    # Column summary
    col_summary = pd.DataFrame({
        'column': df.columns,
        'dtype': [str(dt) for dt in df.dtypes],
        'non_null': [df[c].notna().sum() for c in df.columns],
        'null_count': [df[c].isna().sum() for c in df.columns],
        'null_pct': [f"{df[c].isna().mean()*100:.1f}%" for c in df.columns],
        'unique_values': [df[c].nunique() for c in df.columns],
        'min': [df[c].min() if pd.api.types.is_numeric_dtype(df[c]) else '' for c in df.columns],
        'max': [df[c].max() if pd.api.types.is_numeric_dtype(df[c]) else '' for c in df.columns],
        'mean': [f"{df[c].mean():.2f}" if pd.api.types.is_numeric_dtype(df[c]) else '' for c in df.columns],
        'sample_value': [str(df[c].dropna().iloc[0]) if df[c].notna().any() else '' for c in df.columns],
    })

    # Duplicate analysis
    dupe_analysis = pd.DataFrame({
        'metric': ['Total Rows', 'Unique Rows', 'Duplicate Rows', 'Duplicate %'],
        'value': [
            len(df), len(df.drop_duplicates()),
            df.duplicated().sum(),
            f"{df.duplicated().mean()*100:.1f}%"
        ]
    })

    # Issues detected
    issues: list[dict] = []
    for col in df.columns:
        null_pct = df[col].isna().mean()
        if null_pct > 0.5:
            issues.append({'column': col, 'issue': 'High null %', 'detail': f"{null_pct:.0%} null", 'severity': 'Warning'})
        if null_pct == 1.0:
            issues.append({'column': col, 'issue': 'Empty column', 'detail': '100% null', 'severity': 'Error'})
        if df[col].nunique() == 1:
            issues.append({'column': col, 'issue': 'Constant column', 'detail': f"All values = {df[col].dropna().iloc[0] if df[col].notna().any() else 'null'}", 'severity': 'Warning'})
        if df[col].dtype == object:
            leading_spaces = df[col].dropna().astype(str).str.startswith(' ').sum()
            trailing_spaces = df[col].dropna().astype(str).str.endswith(' ').sum()
            if leading_spaces + trailing_spaces > 0:
                issues.append({'column': col, 'issue': 'Whitespace issues', 'detail': f"{leading_spaces + trailing_spaces} values with leading/trailing spaces", 'severity': 'Info'})

    issues_df = pd.DataFrame(issues) if issues else pd.DataFrame(columns=['column', 'issue', 'detail', 'severity'])

    # Write report
    with pd.ExcelWriter(report_path, engine='openpyxl') as writer:
        # Overview
        overview = pd.DataFrame({
            'metric': ['File', 'Rows', 'Columns', 'Null Cells', 'Duplicate Rows'],
            'value': [input_path, len(df), len(df.columns),
                      f"{df.isna().sum().sum():,}", f"{df.duplicated().sum():,}"]
        })
        overview.to_excel(writer, sheet_name='Overview', index=False)

        col_summary.to_excel(writer, sheet_name='Column Details', index=False)
        dupe_analysis.to_excel(writer, sheet_name='Duplicates', index=False)
        issues_df.to_excel(writer, sheet_name='Issues', index=False)

        # Format all sheets
        for sheet_name in writer.sheets:
            ws = writer.sheets[sheet_name]
            for col_idx in range(1, ws.max_column + 1):
                cell = ws.cell(row=1, column=col_idx)
                cell.font = Font(bold=True, color="FFFFFF")
                cell.fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
            ws.freeze_panes = "A2"

    print(f"Quality report written to {report_path}")
    print(f"  Rows: {len(df):,}, Columns: {len(df.columns)}, Issues: {len(issues)}")

if __name__ == "__main__":
    generate_quality_report("data.csv", "data_quality_report.xlsx")
```
