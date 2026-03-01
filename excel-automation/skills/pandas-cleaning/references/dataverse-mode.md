# Dataverse Mode

Cleaning patterns specific to Dataverse (Microsoft Power Platform) data exports. Dataverse exports have unique characteristics: publisher prefixes on column names, integer option set values, GUID-based lookup columns, OData annotation columns, and UTC timestamps.

## Detecting Dataverse Exports

Dataverse exports can be identified by these telltale signs:

```python
import pandas as pd
import re

def is_dataverse_export(df: pd.DataFrame) -> bool:
    """Heuristic to detect if a DataFrame came from a Dataverse export."""
    indicators = 0
    cols = [str(c) for c in df.columns]

    # Check for publisher prefix pattern (e.g., cr_xxx_, new_, contoso_)
    prefix_pattern = re.compile(r'^[a-z]+\d*_[a-z]')
    prefixed = sum(1 for c in cols if prefix_pattern.match(c))
    if prefixed > len(cols) * 0.3:
        indicators += 1

    # Check for OData annotation columns
    if any('@OData' in c for c in cols):
        indicators += 2

    # Check for _value GUID columns
    if any(c.endswith('_value') for c in cols):
        indicators += 1

    # Check for common Dataverse system columns
    system_cols = {'createdon', 'modifiedon', 'statecode', 'statuscode',
                   'versionnumber', '_ownerid_value', '_createdby_value'}
    if len(system_cols.intersection(set(cols))) >= 2:
        indicators += 1

    return indicators >= 2
```

## Publisher Prefix Stripping

Dataverse custom columns have publisher prefixes like `cr_xxx_`, `new_`, `contoso_`. Standard columns (e.g., `name`, `createdon`) do not have prefixes.

```python
import re

# Standard Dataverse columns that should NOT be stripped
STANDARD_COLUMNS = {
    'accountid', 'contactid', 'name', 'createdon', 'modifiedon',
    'statecode', 'statuscode', 'versionnumber', 'emailaddress1',
    'telephone1', 'address1_line1', 'address1_city', 'address1_stateorprovince',
    'address1_postalcode', 'address1_country', 'description', 'ownerid',
    'parentcustomerid', 'primarycontactid', 'revenue', 'numberofemployees',
    'industrycode', 'accountcategorycode', 'customertypecode',
    'firstname', 'lastname', 'fullname', 'jobtitle', 'department',
    'mobilephone', 'fax', 'websiteurl', 'birthdate', 'gendercode',
}

def strip_publisher_prefixes(df: pd.DataFrame,
                             known_prefix: str | None = None) -> pd.DataFrame:
    """Remove publisher prefixes from Dataverse column names.

    Args:
        df: DataFrame with Dataverse column names
        known_prefix: If provided, only strip this specific prefix (e.g., "cr_xxx_")
    """
    if known_prefix:
        pattern = re.compile(f'^{re.escape(known_prefix)}')
    else:
        # Auto-detect: match patterns like cr_, cr123_, new_, contoso_, etc.
        pattern = re.compile(r'^[a-z]+\d*_')

    rename_map: dict[str, str] = {}
    for col in df.columns:
        col_str = str(col)

        # Skip OData annotation columns
        if '@OData' in col_str:
            continue

        # Skip system _value columns (handle separately)
        if col_str.startswith('_') and col_str.endswith('_value'):
            continue

        # Skip standard columns
        if col_str.lower() in STANDARD_COLUMNS:
            continue

        # Strip the prefix
        cleaned = pattern.sub('', col_str)
        if cleaned and cleaned != col_str:
            rename_map[col_str] = cleaned

    return df.rename(columns=rename_map)
```

### Auto-Detect Publisher Prefix

```python
def detect_publisher_prefix(df: pd.DataFrame) -> str | None:
    """Auto-detect the most common publisher prefix in column names."""
    prefix_pattern = re.compile(r'^([a-z]+\d*_)')
    prefixes: dict[str, int] = {}

    for col in df.columns:
        match = prefix_pattern.match(str(col))
        if match:
            prefix = match.group(1)
            prefixes[prefix] = prefixes.get(prefix, 0) + 1

    if prefixes:
        # Return the most common prefix
        return max(prefixes, key=lambda k: prefixes[k])
    return None
```

## Option Set Resolution

Dataverse option sets are stored as integers. Map them to display labels.

### Pattern: Build Mapping from Formatted Values

Dataverse exports often include both the integer column and a formatted value annotation:

```python
def resolve_option_sets_from_annotations(df: pd.DataFrame) -> pd.DataFrame:
    """Resolve option set integers using OData formatted value annotations."""
    cols_to_drop: list[str] = []

    for col in list(df.columns):
        formatted_col = f"{col}@OData.Community.Display.V1.FormattedValue"
        if formatted_col in df.columns:
            # Check if the original column has integer-like values
            if pd.api.types.is_numeric_dtype(df[col]) or df[col].dtype == object:
                # Replace with formatted display value
                df[col] = df[formatted_col].fillna(df[col].astype(str))
                cols_to_drop.append(formatted_col)

    return df.drop(columns=cols_to_drop, errors='ignore')
```

### Pattern: Manual Option Set Mapping

When annotations are not present, provide explicit mappings:

```python
# Common Dataverse option set mappings
STATECODE_MAP = {0: "Active", 1: "Inactive"}
STATUSCODE_ACCOUNT_MAP = {1: "Active", 2: "Inactive"}
STATUSCODE_CONTACT_MAP = {1: "Active", 2: "Inactive"}

INDUSTRY_CODE_MAP = {
    1: "Accounting", 2: "Agriculture", 3: "Broadcasting",
    4: "Brokers", 5: "Building Supply", 6: "Chemical",
    7: "Consulting", 8: "Consumer Services", 9: "Design",
    10: "Distributors", 11: "Education", 12: "Engineering",
    # ... add more as needed
}

CUSTOMER_TYPE_MAP = {
    1: "Competitor", 2: "Consultant", 3: "Customer",
    4: "Investor", 5: "Partner", 6: "Influencer",
    7: "Press", 8: "Prospect", 9: "Reseller",
    10: "Supplier", 11: "Vendor", 12: "Other"
}

def resolve_option_sets(df: pd.DataFrame,
                        mappings: dict[str, dict[int, str]]) -> pd.DataFrame:
    """Apply option set mappings to specified columns.

    mappings: {"statecode": {0: "Active", 1: "Inactive"}, ...}
    """
    for col, mapping in mappings.items():
        if col in df.columns:
            # Convert to numeric first (may be stored as string)
            numeric_col = pd.to_numeric(df[col], errors='coerce')
            df[col] = numeric_col.map(mapping).fillna(df[col])
    return df
```

## Lookup Column Flattening

Dataverse lookup columns produce `_value` GUID columns alongside formatted display value annotations.

```python
def flatten_lookups(df: pd.DataFrame) -> pd.DataFrame:
    """Replace lookup GUID columns with their display values.

    Dataverse exports include:
    - _parentcustomerid_value (GUID)
    - _parentcustomerid_value@OData.Community.Display.V1.FormattedValue (display name)
    - _parentcustomerid_value@Microsoft.Dynamics.CRM.lookuplogicalname (entity type)
    """
    cols_to_drop: list[str] = []
    cols_to_add: dict[str, pd.Series] = {}

    for col in list(df.columns):
        if not col.endswith('_value'):
            continue
        if col.startswith('_'):
            base_name = col[1:].replace('_value', '')  # Remove leading _ and trailing _value
        else:
            base_name = col.replace('_value', '')

        # Look for formatted value annotation
        formatted = f"{col}@OData.Community.Display.V1.FormattedValue"
        logical_name = f"{col}@Microsoft.Dynamics.CRM.lookuplogicalname"
        associated_nav = f"{col}@Microsoft.Dynamics.CRM.associatednavigationproperty"

        if formatted in df.columns:
            # Use display value as the replacement
            cols_to_add[f"{base_name}_name"] = df[formatted]
            cols_to_drop.extend([col, formatted])

            # Also drop the logical name and nav property columns
            if logical_name in df.columns:
                cols_to_drop.append(logical_name)
            if associated_nav in df.columns:
                cols_to_drop.append(associated_nav)
        else:
            # No formatted value available; keep the GUID but rename it
            cols_to_add[f"{base_name}_id"] = df[col]
            cols_to_drop.append(col)

    # Apply changes
    for name, series in cols_to_add.items():
        df[name] = series
    df = df.drop(columns=list(set(cols_to_drop)), errors='ignore')
    return df
```

## Formatted Value Handling

Dataverse OData exports include `@OData.Community.Display.V1.FormattedValue` annotations for many column types: option sets, lookups, money, dates, and more.

```python
def process_odata_annotations(df: pd.DataFrame) -> pd.DataFrame:
    """Process all OData annotation columns:
    - Replace source columns with formatted values where appropriate
    - Drop all annotation columns afterward
    """
    annotation_suffix = '@OData.Community.Display.V1.FormattedValue'
    annotations_to_drop: list[str] = []
    other_annotations: list[str] = []

    for col in df.columns:
        if annotation_suffix in str(col):
            base_col = str(col).replace(annotation_suffix, '')
            if base_col in df.columns:
                # Replace the base column with formatted values
                df[base_col] = df[col].fillna(df[base_col].astype(str))
            annotations_to_drop.append(col)
        elif '@OData' in str(col) or '@Microsoft.Dynamics' in str(col):
            other_annotations.append(col)

    # Drop all annotation columns
    all_to_drop = annotations_to_drop + other_annotations
    return df.drop(columns=all_to_drop, errors='ignore')
```

## UTC Timestamp Conversion

Dataverse stores all dates in UTC. Convert to local timezone for reporting.

```python
def convert_dataverse_timestamps(df: pd.DataFrame,
                                 local_tz: str = "US/Eastern") -> pd.DataFrame:
    """Convert all datetime columns from UTC to local timezone.

    Common Dataverse date columns: createdon, modifiedon, overriddencreatedon,
    scheduledstart, scheduledend, actualstart, actualend
    """
    for col in df.columns:
        if not pd.api.types.is_datetime64_any_dtype(df[col]):
            # Try to parse string dates
            if df[col].dtype == object:
                sample = df[col].dropna().head(5).astype(str)
                if any('T' in str(s) and 'Z' in str(s) for s in sample):
                    df[col] = pd.to_datetime(df[col], utc=True, errors='coerce')

        if pd.api.types.is_datetime64_any_dtype(df[col]):
            if df[col].dt.tz is None:
                df[col] = df[col].dt.tz_localize('UTC')
            df[col] = df[col].dt.tz_convert(local_tz)
            # Remove timezone info for Excel compatibility
            df[col] = df[col].dt.tz_localize(None)

    return df
```

## Entity Reference Columns

Dataverse entity references encode both a GUID and an entity type. Simplify them.

```python
def simplify_entity_references(df: pd.DataFrame) -> pd.DataFrame:
    """Simplify entity reference columns by extracting just the display name."""
    ref_pattern = re.compile(r'^_(.+)_value$')

    for col in list(df.columns):
        match = ref_pattern.match(col)
        if not match:
            continue

        field_name = match.group(1)

        # Check for corresponding formatted value
        formatted = f"{col}@OData.Community.Display.V1.FormattedValue"
        if formatted in df.columns:
            df[field_name] = df[formatted]
            df = df.drop(columns=[col, formatted], errors='ignore')

            # Also drop related annotations
            for suffix in ['@Microsoft.Dynamics.CRM.lookuplogicalname',
                          '@Microsoft.Dynamics.CRM.associatednavigationproperty']:
                ann_col = f"{col}{suffix}"
                if ann_col in df.columns:
                    df = df.drop(columns=[ann_col])

    return df
```

## Metadata Columns to Drop

Dataverse exports include many system/metadata columns that are usually not needed for reporting.

```python
METADATA_COLUMNS_TO_DROP = [
    'versionnumber', 'timezoneruleversionnumber', 'utcconversiontimezonecode',
    'overriddencreatedon', 'importsequencenumber', 'exchangerate',
    'transactioncurrencyid', '_transactioncurrencyid_value',
    '_owningbusinessunit_value', '_owningteam_value', '_owninguser_value',
    'processid', 'stageid', 'traversedpath',
    '_slaid_value', '_slainvokedid_value',
    'onholdtime', 'lastonholdtime', 'timespentbymeonemailandmeetings',
    'entityimage_timestamp', 'entityimage_url', 'entityimageid',
]

def drop_metadata_columns(df: pd.DataFrame,
                          keep_audit: bool = False) -> pd.DataFrame:
    """Drop common Dataverse metadata/system columns.

    Args:
        keep_audit: If True, keep createdon/modifiedon/createdby/modifiedby
    """
    to_drop = list(METADATA_COLUMNS_TO_DROP)

    if not keep_audit:
        # Also drop audit columns if their display values exist
        audit_cols = ['_createdby_value', '_modifiedby_value',
                      '_ownerid_value']
        for col in audit_cols:
            formatted = f"{col}@OData.Community.Display.V1.FormattedValue"
            if formatted in df.columns and col in df.columns:
                # Keep the formatted version, drop the GUID
                to_drop.append(col)

    # Also drop any remaining OData annotation columns
    for col in df.columns:
        if '@OData' in str(col) or '@Microsoft.Dynamics' in str(col):
            to_drop.append(col)

    return df.drop(columns=[c for c in to_drop if c in df.columns], errors='ignore')
```

## Complete Dataverse Cleaning Pipeline

```python
def clean_dataverse_export(df: pd.DataFrame,
                           local_tz: str = "US/Eastern",
                           option_set_mappings: dict[str, dict[int, str]] | None = None,
                           known_prefix: str | None = None) -> pd.DataFrame:
    """Full Dataverse cleaning pipeline."""
    # 1. Process OData annotations (must be first -- uses annotation columns)
    df = process_odata_annotations(df)

    # 2. Flatten lookup columns
    df = flatten_lookups(df)

    # 3. Simplify entity references
    df = simplify_entity_references(df)

    # 4. Strip publisher prefixes
    prefix = known_prefix or detect_publisher_prefix(df)
    if prefix:
        df = strip_publisher_prefixes(df, known_prefix=prefix)

    # 5. Resolve option sets (if manual mappings provided)
    if option_set_mappings:
        df = resolve_option_sets(df, option_set_mappings)

    # 6. Convert UTC timestamps
    df = convert_dataverse_timestamps(df, local_tz=local_tz)

    # 7. Drop metadata columns
    df = drop_metadata_columns(df, keep_audit=True)

    # 8. Normalize remaining column names
    df = normalize_columns(df)

    return df
```
