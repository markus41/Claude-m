# Cleaning Patterns

Generic tabular data cleaning patterns with complete Python code. These patterns apply to any data source -- CSV, Excel, JSON, Parquet, or database exports.

## Column Normalization

### Rename to snake_case

```python
import re
import pandas as pd

def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize all column names to clean snake_case."""
    def clean_name(name: str) -> str:
        name = str(name).strip()
        # Handle common patterns
        name = re.sub(r'[\s\-\.\/]+', '_', name)           # Spaces, hyphens, dots → underscore
        name = re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', name)  # camelCase → camel_case
        name = re.sub(r'([A-Z]+)([A-Z][a-z])', r'\1_\2', name)  # HTMLParser → html_parser
        name = name.lower()
        name = re.sub(r'[^a-z0-9_]', '', name)             # Remove special chars
        name = re.sub(r'_+', '_', name)                     # Collapse multiple underscores
        name = name.strip('_')
        return name

    df.columns = [clean_name(col) for col in df.columns]

    # Handle duplicate column names
    seen: dict[str, int] = {}
    new_cols: list[str] = []
    for col in df.columns:
        if col in seen:
            seen[col] += 1
            new_cols.append(f"{col}_{seen[col]}")
        else:
            seen[col] = 0
            new_cols.append(col)
    df.columns = new_cols
    return df
```

### Reorder Columns

```python
def reorder_columns(df: pd.DataFrame, priority: list[str]) -> pd.DataFrame:
    """Move priority columns to the front, keep rest in original order."""
    existing = [c for c in priority if c in df.columns]
    remaining = [c for c in df.columns if c not in existing]
    return df[existing + remaining]
```

### Drop Unwanted Columns

```python
def drop_columns(df: pd.DataFrame, patterns: list[str] | None = None,
                 threshold: float = 0.95) -> pd.DataFrame:
    """Drop columns matching patterns or with high null percentage."""
    to_drop: list[str] = []

    # Drop by pattern
    if patterns:
        for pat in patterns:
            to_drop.extend([c for c in df.columns if re.search(pat, c, re.IGNORECASE)])

    # Drop columns that are >threshold% null
    for col in df.columns:
        if df[col].isna().mean() > threshold:
            to_drop.append(col)

    # Drop constant columns (single unique value)
    for col in df.columns:
        if df[col].nunique(dropna=False) <= 1:
            to_drop.append(col)

    to_drop = list(set(to_drop))
    return df.drop(columns=to_drop, errors='ignore')
```

## Type Detection and Coercion

### Auto-Detect Column Types

```python
def detect_and_coerce_types(df: pd.DataFrame) -> pd.DataFrame:
    """Detect the best type for each column and coerce."""
    for col in df.columns:
        if df[col].dtype != object:
            continue  # Already typed

        series = df[col].dropna()
        if len(series) == 0:
            continue

        sample = series.astype(str).str.strip()

        # Try integer
        try:
            parsed = pd.to_numeric(sample, errors='coerce')
            if parsed.notna().mean() > 0.85:
                if (parsed == parsed.astype('Int64', errors='ignore')).all():
                    df[col] = pd.to_numeric(df[col], errors='coerce').astype('Int64')
                else:
                    df[col] = pd.to_numeric(df[col], errors='coerce')
                continue
        except Exception:
            pass

        # Try datetime
        try:
            parsed = pd.to_datetime(sample, format='mixed', dayfirst=False, errors='coerce')
            if parsed.notna().mean() > 0.85:
                df[col] = pd.to_datetime(df[col], format='mixed', errors='coerce')
                continue
        except Exception:
            pass

        # Try boolean
        bool_map = {
            'true': True, 'false': False, 'yes': True, 'no': False,
            '1': True, '0': False, 'y': True, 'n': False,
            't': True, 'f': False
        }
        lower = sample.str.lower()
        if lower.isin(bool_map.keys()).mean() > 0.9:
            df[col] = df[col].astype(str).str.lower().str.strip().map(bool_map)
            continue

        # Try category (low cardinality string)
        if series.nunique() / len(series) < 0.05 and series.nunique() < 50:
            df[col] = df[col].astype('category')

    return df
```

### Force Specific Types

```python
def force_types(df: pd.DataFrame, type_map: dict[str, str]) -> pd.DataFrame:
    """Force columns to specific types.

    type_map: {"column_name": "int", "other_col": "datetime", ...}
    Supported: int, float, str, bool, datetime, category
    """
    for col, dtype in type_map.items():
        if col not in df.columns:
            continue
        if dtype == "int":
            df[col] = pd.to_numeric(df[col], errors='coerce').astype('Int64')
        elif dtype == "float":
            df[col] = pd.to_numeric(df[col], errors='coerce')
        elif dtype == "str":
            df[col] = df[col].astype(str).replace('nan', '')
        elif dtype == "bool":
            df[col] = df[col].astype(bool)
        elif dtype == "datetime":
            df[col] = pd.to_datetime(df[col], format='mixed', errors='coerce')
        elif dtype == "category":
            df[col] = df[col].astype('category')
    return df
```

## Null Handling Strategies

### Smart Null Handling

```python
def handle_nulls_smart(df: pd.DataFrame,
                       required_columns: list[str] | None = None) -> pd.DataFrame:
    """Handle nulls with column-appropriate strategies."""
    # Drop rows where required columns are null
    if required_columns:
        existing_required = [c for c in required_columns if c in df.columns]
        df = df.dropna(subset=existing_required)

    for col in df.columns:
        null_pct = df[col].isna().mean()

        if null_pct == 0:
            continue

        if null_pct > 0.7:
            # Drop columns that are mostly null
            df = df.drop(columns=[col])
            continue

        if pd.api.types.is_numeric_dtype(df[col]):
            # Numeric: fill with median (robust to outliers)
            df[col] = df[col].fillna(df[col].median())
        elif pd.api.types.is_datetime64_any_dtype(df[col]):
            # Datetime: leave as NaT (don't fabricate dates)
            pass
        elif pd.api.types.is_bool_dtype(df[col]):
            df[col] = df[col].fillna(False)
        else:
            # String: fill with empty string
            df[col] = df[col].fillna("")

    return df
```

### Fill Forward / Backward

```python
def fill_grouped(df: pd.DataFrame, group_col: str, fill_cols: list[str],
                 method: str = "ffill") -> pd.DataFrame:
    """Fill nulls within groups (e.g., fill missing dates within customer records)."""
    for col in fill_cols:
        if col in df.columns:
            df[col] = df.groupby(group_col)[col].transform(lambda x: x.fillna(method=method))
    return df
```

## Deduplication

### Exact Deduplication

```python
def deduplicate_exact(df: pd.DataFrame, subset: list[str] | None = None,
                      keep: str = "first") -> tuple[pd.DataFrame, pd.DataFrame]:
    """Remove exact duplicates, return cleaned df and removed rows."""
    duplicates = df[df.duplicated(subset=subset, keep=keep)]
    cleaned = df.drop_duplicates(subset=subset, keep=keep)
    return cleaned, duplicates
```

### Fuzzy Deduplication

```python
def deduplicate_fuzzy(df: pd.DataFrame, column: str,
                      threshold: float = 0.85) -> pd.DataFrame:
    """Remove near-duplicate rows based on string similarity in a column.

    Uses simple normalized Levenshtein-like approach without external deps.
    """
    from difflib import SequenceMatcher

    values = df[column].astype(str).tolist()
    to_drop: set[int] = set()

    for i in range(len(values)):
        if i in to_drop:
            continue
        for j in range(i + 1, len(values)):
            if j in to_drop:
                continue
            ratio = SequenceMatcher(None, values[i].lower(), values[j].lower()).ratio()
            if ratio >= threshold:
                to_drop.add(j)  # Keep first occurrence

    return df.drop(index=list(to_drop)).reset_index(drop=True)
```

## String Cleaning

### Comprehensive String Cleanup

```python
def clean_strings(df: pd.DataFrame) -> pd.DataFrame:
    """Apply comprehensive string cleaning to all object columns."""
    for col in df.select_dtypes(include='object').columns:
        df[col] = (
            df[col]
            .astype(str)
            .str.strip()                                     # Trim whitespace
            .str.replace(r'\s+', ' ', regex=True)            # Collapse internal whitespace
            .str.replace(r'[\x00-\x1f\x7f-\x9f]', '', regex=True)  # Remove control chars
            .replace({'nan': '', 'None': '', 'N/A': '', 'n/a': '',
                       'NA': '', 'NULL': '', 'null': '', '-': '', '#N/A': ''})
        )
    return df
```

### Title Case for Names

```python
def title_case_names(df: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    """Apply proper title case to name columns, handling edge cases."""
    exceptions = {'and', 'or', 'the', 'in', 'of', 'for', 'to', 'at', 'by'}
    prefixes = {"mc", "mac", "o'"}

    def smart_title(name: str) -> str:
        if not name or name == '':
            return name
        words = name.lower().split()
        result: list[str] = []
        for i, word in enumerate(words):
            if i > 0 and word in exceptions:
                result.append(word)
            elif any(word.startswith(p) for p in prefixes):
                result.append(word[0:2].title() + word[2:].title() if len(word) > 2 else word.title())
            else:
                result.append(word.capitalize())
        return ' '.join(result)

    for col in columns:
        if col in df.columns:
            df[col] = df[col].astype(str).apply(smart_title).replace('', pd.NA)
    return df
```

## Date Parsing

### Mixed Format Date Parsing

```python
def parse_dates(df: pd.DataFrame, columns: list[str],
                dayfirst: bool = False) -> pd.DataFrame:
    """Parse date columns with mixed formats."""
    for col in columns:
        if col not in df.columns:
            continue
        df[col] = pd.to_datetime(df[col], format='mixed', dayfirst=dayfirst, errors='coerce')
    return df
```

### Timezone Handling

```python
def convert_timezone(df: pd.DataFrame, column: str,
                     from_tz: str = "UTC", to_tz: str = "US/Eastern") -> pd.DataFrame:
    """Convert datetime column between timezones."""
    if column in df.columns and pd.api.types.is_datetime64_any_dtype(df[column]):
        if df[column].dt.tz is None:
            df[column] = df[column].dt.tz_localize(from_tz)
        df[column] = df[column].dt.tz_convert(to_tz)
    return df
```

## Outlier Detection

### IQR Method

```python
def detect_outliers_iqr(df: pd.DataFrame, column: str,
                        multiplier: float = 1.5) -> pd.Series:
    """Detect outliers using IQR method, return boolean mask."""
    q1 = df[column].quantile(0.25)
    q3 = df[column].quantile(0.75)
    iqr = q3 - q1
    lower = q1 - multiplier * iqr
    upper = q3 + multiplier * iqr
    return (df[column] < lower) | (df[column] > upper)
```

### Z-Score Method

```python
def detect_outliers_zscore(df: pd.DataFrame, column: str,
                           threshold: float = 3.0) -> pd.Series:
    """Detect outliers using z-score, return boolean mask."""
    mean = df[column].mean()
    std = df[column].std()
    if std == 0:
        return pd.Series([False] * len(df), index=df.index)
    z_scores = (df[column] - mean) / std
    return z_scores.abs() > threshold
```

## Cross-Column Validation

```python
def validate_cross_columns(df: pd.DataFrame,
                           rules: list[dict]) -> pd.DataFrame:
    """Apply cross-column validation rules.

    rules: [
        {"check": "start_date < end_date", "columns": ["start_date", "end_date"]},
        {"check": "quantity >= 0", "columns": ["quantity"]},
        {"check": "total == quantity * price", "columns": ["total", "quantity", "price"]}
    ]
    """
    issues: list[str] = []
    for rule in rules:
        try:
            mask = ~df.eval(rule["check"])
            bad_count = mask.sum()
            if bad_count > 0:
                issues.append(f"Rule '{rule['check']}' failed for {bad_count} rows")
                # Optionally flag rows
                flag_col = f"_invalid_{rule['columns'][0]}"
                df[flag_col] = mask
        except Exception as e:
            issues.append(f"Rule '{rule['check']}' error: {e}")

    if issues:
        print("Validation issues:")
        for issue in issues:
            print(f"  - {issue}")

    return df
```

## openpyxl Output Formatting

### Professional Header Styling

```python
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

def format_header(ws, num_cols: int) -> None:
    """Apply professional header formatting."""
    header_font = Font(bold=True, color="FFFFFF", name="Calibri", size=11)
    header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
    header_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
    thin_border = Border(
        bottom=Side(style="thin", color="000000"),
        right=Side(style="thin", color="D9D9D9")
    )

    for col in range(1, num_cols + 1):
        cell = ws.cell(row=1, column=col)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_align
        cell.border = thin_border
```

### Auto-Fit Column Widths

```python
def autofit_columns(ws, df: pd.DataFrame, max_width: int = 50) -> None:
    """Auto-fit column widths based on content."""
    for col_idx, col_name in enumerate(df.columns, 1):
        header_len = len(str(col_name))
        if len(df) > 0:
            max_data_len = df[col_name].astype(str).str.len().max()
        else:
            max_data_len = 0
        width = min(max(header_len, max_data_len) + 4, max_width)
        ws.column_dimensions[get_column_letter(col_idx)].width = width
```

### Number Format Application

```python
def apply_number_formats(ws, df: pd.DataFrame) -> None:
    """Apply appropriate number formats based on column dtype and name."""
    for col_idx, col_name in enumerate(df.columns, 1):
        col_letter = get_column_letter(col_idx)
        name_lower = col_name.lower()

        # Determine format
        fmt = None
        if any(kw in name_lower for kw in ['price', 'amount', 'revenue', 'cost', 'total', 'salary']):
            fmt = '$#,##0.00'
        elif any(kw in name_lower for kw in ['percent', 'pct', 'rate', 'margin']):
            fmt = '0.0%'
        elif pd.api.types.is_float_dtype(df[col_name]):
            fmt = '#,##0.00'
        elif pd.api.types.is_integer_dtype(df[col_name]):
            fmt = '#,##0'
        elif pd.api.types.is_datetime64_any_dtype(df[col_name]):
            fmt = 'YYYY-MM-DD'

        if fmt:
            for row in range(2, len(df) + 2):
                ws[f"{col_letter}{row}"].number_format = fmt
```

### Complete Polished Output

```python
def write_polished_output(df: pd.DataFrame, output_path: str,
                          sheet_name: str = "Data",
                          include_summary: bool = True) -> None:
    """Write a fully formatted .xlsx file."""
    with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
        # Write main data
        df.to_excel(writer, sheet_name=sheet_name, index=False)
        ws = writer.sheets[sheet_name]

        format_header(ws, len(df.columns))
        autofit_columns(ws, df)
        apply_number_formats(ws, df)
        ws.freeze_panes = "A2"
        ws.auto_filter.ref = ws.dimensions

        # Write summary sheet
        if include_summary:
            summary = pd.DataFrame({
                "Column": df.columns,
                "Type": [str(dt) for dt in df.dtypes],
                "Non-Null Count": [df[c].notna().sum() for c in df.columns],
                "Null Count": [df[c].isna().sum() for c in df.columns],
                "Null %": [f"{df[c].isna().mean()*100:.1f}%" for c in df.columns],
                "Unique Values": [df[c].nunique() for c in df.columns],
                "Sample Value": [str(df[c].dropna().iloc[0]) if df[c].notna().any() else "" for c in df.columns],
            })
            summary.to_excel(writer, sheet_name="Summary", index=False)
            ws_summary = writer.sheets["Summary"]
            format_header(ws_summary, len(summary.columns))
            autofit_columns(ws_summary, summary)
            ws_summary.freeze_panes = "A2"
```
