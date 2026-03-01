# Dataverse Cleaning Examples

Complete Python scripts for cleaning Dataverse (Power Platform) data exports.

## 1. Dataverse Account Export to Clean Customer List

```python
"""Clean a Dataverse account export: strip prefixes, resolve option sets,
flatten lookups, convert timestamps."""
import pandas as pd
import re
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

def clean_account_export(input_path: str, output_path: str,
                         local_tz: str = "US/Eastern") -> dict:
    """Clean a Dataverse account entity export."""
    df = pd.read_csv(input_path, dtype=str, encoding='utf-8-sig')
    actions: list[str] = []
    rows_before = len(df)

    # 1. Process OData formatted values (must be first)
    annotation_suffix = '@OData.Community.Display.V1.FormattedValue'
    for col in list(df.columns):
        if annotation_suffix in col:
            base_col = col.replace(annotation_suffix, '')
            if base_col in df.columns:
                df[base_col] = df[col].fillna(df[base_col])
            df = df.drop(columns=[col])
    actions.append("Resolved OData formatted value annotations")

    # Drop all other OData/CRM annotation columns
    anno_cols = [c for c in df.columns if '@OData' in c or '@Microsoft.Dynamics' in c]
    df = df.drop(columns=anno_cols, errors='ignore')
    if anno_cols:
        actions.append(f"Dropped {len(anno_cols)} annotation columns")

    # 2. Flatten lookup columns (_value GUIDs -> names)
    value_cols = [c for c in df.columns if c.endswith('_value') and c.startswith('_')]
    for col in value_cols:
        base = col[1:].replace('_value', '')  # Remove leading _ and _value
        formatted = f"{col}{annotation_suffix}"
        if formatted in df.columns:
            df[f"{base}_name"] = df[formatted]
            df = df.drop(columns=[col, formatted])
        else:
            df = df.rename(columns={col: f"{base}_id"})
    if value_cols:
        actions.append(f"Flattened {len(value_cols)} lookup columns")

    # 3. Strip publisher prefixes
    prefix_pattern = re.compile(r'^[a-z]+\d*_')
    standard_cols = {'accountid', 'name', 'createdon', 'modifiedon', 'statecode',
                     'statuscode', 'emailaddress1', 'telephone1', 'revenue',
                     'numberofemployees', 'websiteurl', 'description',
                     'address1_line1', 'address1_city', 'address1_stateorprovince',
                     'address1_postalcode', 'address1_country'}
    rename_map = {}
    for col in df.columns:
        if col.lower() not in standard_cols and prefix_pattern.match(col):
            cleaned = prefix_pattern.sub('', col)
            if cleaned:
                rename_map[col] = cleaned
    df = df.rename(columns=rename_map)
    if rename_map:
        actions.append(f"Stripped publisher prefixes from {len(rename_map)} columns")

    # 4. Resolve common option sets
    option_mappings = {
        'statecode': {0: 'Active', 1: 'Inactive'},
        'statuscode': {1: 'Active', 2: 'Inactive'},
        'industrycode': {
            1: 'Accounting', 2: 'Agriculture', 3: 'Broadcasting', 4: 'Brokers',
            5: 'Building Supply', 6: 'Chemical', 7: 'Consulting',
            8: 'Consumer Services', 9: 'Design', 10: 'Distributors',
            11: 'Education', 12: 'Engineering',
        },
        'accountcategorycode': {1: 'Preferred Customer', 2: 'Standard'},
        'customertypecode': {
            1: 'Competitor', 2: 'Consultant', 3: 'Customer', 4: 'Investor',
            5: 'Partner', 6: 'Influencer', 7: 'Press', 8: 'Prospect',
            9: 'Reseller', 10: 'Supplier', 11: 'Vendor', 12: 'Other',
        },
    }
    for col, mapping in option_mappings.items():
        if col in df.columns:
            numeric = pd.to_numeric(df[col], errors='coerce')
            resolved = numeric.map(mapping)
            changed = resolved.notna().sum()
            if changed > 0:
                df[col] = resolved.fillna(df[col])
                actions.append(f"Resolved {changed} option set values in '{col}'")

    # 5. Drop system/metadata columns
    metadata = ['versionnumber', 'timezoneruleversionnumber', 'utcconversiontimezonecode',
                'overriddencreatedon', 'importsequencenumber', 'exchangerate',
                'processid', 'stageid', 'traversedpath', 'entityimageid']
    dropped = [c for c in metadata if c in df.columns]
    df = df.drop(columns=dropped, errors='ignore')
    if dropped:
        actions.append(f"Dropped {len(dropped)} metadata columns")

    # 6. Convert timestamps
    date_cols = ['createdon', 'modifiedon']
    for col in date_cols:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], utc=True, errors='coerce')
            df[col] = df[col].dt.tz_convert(local_tz).dt.tz_localize(None)
    actions.append(f"Converted timestamps to {local_tz}")

    # 7. Coerce numeric columns
    numeric_cols = ['revenue', 'numberofemployees']
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')

    # 8. Clean strings and remove empty rows
    for col in df.select_dtypes(include='object').columns:
        df[col] = df[col].replace(['', 'null', 'None'], pd.NA)
    df = df.dropna(how='all')
    df = df.drop_duplicates()

    # 9. Rename for readability
    friendly_names = {
        'emailaddress1': 'email', 'telephone1': 'phone',
        'address1_line1': 'address', 'address1_city': 'city',
        'address1_stateorprovince': 'state', 'address1_postalcode': 'zip',
        'address1_country': 'country', 'numberofemployees': 'employees',
        'websiteurl': 'website',
    }
    df = df.rename(columns={k: v for k, v in friendly_names.items() if k in df.columns})

    # 10. Write polished output
    with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Accounts', index=False)
        ws = writer.sheets['Accounts']
        for col_idx in range(1, len(df.columns) + 1):
            cell = ws.cell(row=1, column=col_idx)
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
            max_len = max(len(str(df.columns[col_idx-1])),
                          df.iloc[:, col_idx-1].astype(str).str.len().max() or 0)
            ws.column_dimensions[get_column_letter(col_idx)].width = min(max_len + 4, 40)
        ws.freeze_panes = "A2"
        ws.auto_filter.ref = ws.dimensions

    return {
        "rows_before": rows_before, "rows_after": len(df),
        "columns": len(df.columns), "actions": actions,
    }

if __name__ == "__main__":
    report = clean_account_export("accounts_export.csv", "clean_accounts.xlsx")
    for action in report['actions']:
        print(f"  - {action}")
```

## 2. Dataverse Contact Export with Lookup Resolution

```python
"""Clean a Dataverse contact export with full lookup resolution."""
import pandas as pd
import re
from openpyxl.styles import Font, PatternFill
from openpyxl.utils import get_column_letter

def clean_contact_export(input_path: str, output_path: str) -> dict:
    """Clean contacts: resolve lookups, strip prefixes, format output."""
    df = pd.read_csv(input_path, dtype=str, encoding='utf-8-sig')
    actions: list[str] = []

    # Resolve all OData annotations at once
    formatted_suffix = '@OData.Community.Display.V1.FormattedValue'
    to_drop: list[str] = []

    for col in list(df.columns):
        if formatted_suffix in col:
            base = col.replace(formatted_suffix, '')
            if base in df.columns:
                df[base] = df[col].fillna(df[base])
            to_drop.append(col)
        elif '@OData' in col or '@Microsoft.Dynamics' in col:
            to_drop.append(col)

    df = df.drop(columns=to_drop, errors='ignore')
    actions.append(f"Processed {len(to_drop)} annotation columns")

    # Flatten _value lookup columns
    for col in [c for c in df.columns if c.endswith('_value')]:
        base = col.replace('_value', '').lstrip('_')
        df = df.rename(columns={col: f"{base}_id"})

    # Strip publisher prefix (auto-detect)
    prefix_counts: dict[str, int] = {}
    for col in df.columns:
        match = re.match(r'^([a-z]+\d*_)', col)
        if match:
            prefix_counts[match.group(1)] = prefix_counts.get(match.group(1), 0) + 1
    if prefix_counts:
        main_prefix = max(prefix_counts, key=lambda k: prefix_counts[k])
        rename = {c: c.replace(main_prefix, '', 1) for c in df.columns if c.startswith(main_prefix)}
        df = df.rename(columns=rename)
        actions.append(f"Stripped prefix '{main_prefix}' from {len(rename)} columns")

    # Resolve option sets using previously formatted values (already done above)
    # Additional manual mappings for columns without formatted values
    gendercode_map = {1: 'Male', 2: 'Female', 3: 'Non-binary'}
    if 'gendercode' in df.columns:
        numeric = pd.to_numeric(df['gendercode'], errors='coerce')
        df['gendercode'] = numeric.map(gendercode_map).fillna(df['gendercode'])

    # Convert dates
    for col in ['createdon', 'modifiedon', 'birthdate']:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors='coerce')

    # Drop metadata
    meta = ['versionnumber', 'timezoneruleversionnumber', 'utcconversiontimezonecode',
            'importsequencenumber', 'processid', 'stageid', 'traversedpath']
    df = df.drop(columns=[c for c in meta if c in df.columns])

    # Clean strings
    for col in df.select_dtypes(include='object').columns:
        df[col] = df[col].replace(['', 'null', 'None', 'N/A'], pd.NA)
        df[col] = df[col].str.strip() if df[col].dtype == object else df[col]

    # Friendly column names
    renames = {
        'emailaddress1': 'email', 'emailaddress2': 'email_alt',
        'telephone1': 'phone', 'mobilephone': 'mobile',
        'firstname': 'first_name', 'lastname': 'last_name', 'fullname': 'full_name',
        'jobtitle': 'job_title', 'gendercode': 'gender',
    }
    df = df.rename(columns={k: v for k, v in renames.items() if k in df.columns})

    # Reorder: key fields first
    priority = ['contactid', 'full_name', 'first_name', 'last_name', 'email',
                'phone', 'mobile', 'job_title', 'department']
    existing = [c for c in priority if c in df.columns]
    remaining = [c for c in df.columns if c not in existing]
    df = df[existing + remaining]

    # Remove empty rows and duplicates
    df = df.dropna(how='all').drop_duplicates()

    # Write
    with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Contacts', index=False)
        ws = writer.sheets['Contacts']
        for col_idx in range(1, len(df.columns) + 1):
            cell = ws.cell(row=1, column=col_idx)
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
        ws.freeze_panes = "A2"
        ws.auto_filter.ref = ws.dimensions

    return {"rows": len(df), "columns": len(df.columns), "actions": actions}

if __name__ == "__main__":
    report = clean_contact_export("contacts_export.csv", "clean_contacts.xlsx")
    print(f"Output: {report['rows']} contacts, {report['columns']} columns")
```

## 3. Multi-Table Dataverse Export with Relationship Joining

```python
"""Join multiple Dataverse entity exports and produce a unified report."""
import pandas as pd
from openpyxl.styles import Font, PatternFill
from openpyxl.utils import get_column_letter

def join_dataverse_exports(accounts_path: str, contacts_path: str,
                           output_path: str) -> dict:
    """Join accounts and contacts exports on parentcustomerid."""
    # Read both exports
    accounts = pd.read_csv(accounts_path, dtype=str, encoding='utf-8-sig')
    contacts = pd.read_csv(contacts_path, dtype=str, encoding='utf-8-sig')

    # Quick clean on both
    def quick_clean(df: pd.DataFrame) -> pd.DataFrame:
        # Drop annotation columns
        df = df[[c for c in df.columns if '@OData' not in c and '@Microsoft' not in c]]
        # Replace empties
        for col in df.select_dtypes(include='object').columns:
            df[col] = df[col].replace(['', 'null', 'None'], pd.NA)
        return df

    accounts = quick_clean(accounts)
    contacts = quick_clean(contacts)

    # Rename account columns for clarity after join
    account_cols = {
        'accountid': 'account_id',
        'name': 'company_name',
        'emailaddress1': 'company_email',
        'telephone1': 'company_phone',
        'address1_city': 'company_city',
        'address1_stateorprovince': 'company_state',
        'revenue': 'company_revenue',
    }
    accounts = accounts.rename(columns={k: v for k, v in account_cols.items() if k in accounts.columns})

    # Rename contact columns
    contact_cols = {
        'contactid': 'contact_id',
        'fullname': 'contact_name',
        'firstname': 'first_name',
        'lastname': 'last_name',
        'emailaddress1': 'contact_email',
        'telephone1': 'contact_phone',
        'jobtitle': 'job_title',
        '_parentcustomerid_value': 'account_id',  # Foreign key
    }
    contacts = contacts.rename(columns={k: v for k, v in contact_cols.items() if k in contacts.columns})

    # Select key columns only
    acct_keep = ['account_id', 'company_name', 'company_email', 'company_phone',
                 'company_city', 'company_state', 'company_revenue']
    cont_keep = ['contact_id', 'contact_name', 'first_name', 'last_name',
                 'contact_email', 'contact_phone', 'job_title', 'account_id']

    accounts = accounts[[c for c in acct_keep if c in accounts.columns]]
    contacts = contacts[[c for c in cont_keep if c in contacts.columns]]

    # Join
    merged = contacts.merge(accounts, on='account_id', how='left', suffixes=('', '_acct'))

    # Coerce revenue to numeric
    if 'company_revenue' in merged.columns:
        merged['company_revenue'] = pd.to_numeric(merged['company_revenue'], errors='coerce')

    # Sort by company then contact name
    sort_cols = [c for c in ['company_name', 'contact_name'] if c in merged.columns]
    merged = merged.sort_values(sort_cols, na_position='last')

    # Write
    with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
        merged.to_excel(writer, sheet_name='Contacts & Accounts', index=False)
        ws = writer.sheets['Contacts & Accounts']
        for col_idx in range(1, len(merged.columns) + 1):
            cell = ws.cell(row=1, column=col_idx)
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
            max_len = max(len(str(merged.columns[col_idx-1])),
                          merged.iloc[:, col_idx-1].astype(str).str.len().max() or 0)
            ws.column_dimensions[get_column_letter(col_idx)].width = min(max_len + 4, 40)
        ws.freeze_panes = "A2"

        # Summary
        summary_data = {
            'Metric': ['Total Contacts', 'Matched to Account', 'Unmatched (Orphans)',
                        'Unique Accounts', 'Avg Contacts per Account'],
            'Value': [
                len(merged),
                merged['company_name'].notna().sum(),
                merged['company_name'].isna().sum(),
                merged['account_id'].nunique(),
                f"{merged.groupby('account_id').size().mean():.1f}" if 'account_id' in merged.columns else 'N/A',
            ]
        }
        pd.DataFrame(summary_data).to_excel(writer, sheet_name='Summary', index=False)

    return {
        "contacts": len(merged),
        "matched": int(merged['company_name'].notna().sum()),
        "unmatched": int(merged['company_name'].isna().sum()),
    }

if __name__ == "__main__":
    report = join_dataverse_exports("accounts.csv", "contacts.csv", "joined_report.xlsx")
    print(f"Contacts: {report['contacts']}, Matched: {report['matched']}, Orphans: {report['unmatched']}")
```

## 4. Before/After Comparison

```python
"""Show a side-by-side comparison of raw vs cleaned Dataverse data."""
import pandas as pd
from openpyxl.styles import Font, PatternFill
from openpyxl.utils import get_column_letter

def before_after_comparison(raw_path: str, output_path: str) -> None:
    """Generate a before/after comparison workbook."""
    # Read raw
    raw = pd.read_csv(raw_path, dtype=str, encoding='utf-8-sig', nrows=20)

    # Clean (simplified pipeline)
    cleaned = raw.copy()

    # Drop annotations
    cleaned = cleaned[[c for c in cleaned.columns if '@OData' not in c and '@Microsoft' not in c]]

    # Strip prefixes
    import re
    prefix = re.compile(r'^[a-z]+\d*_')
    standard = {'name', 'createdon', 'modifiedon', 'statecode', 'statuscode',
                'emailaddress1', 'telephone1'}
    rename = {}
    for col in cleaned.columns:
        if col not in standard and not col.startswith('_') and prefix.match(col):
            rename[col] = prefix.sub('', col)
    cleaned = cleaned.rename(columns=rename)

    # Resolve option sets
    if 'statecode' in cleaned.columns:
        cleaned['statecode'] = pd.to_numeric(cleaned['statecode'], errors='coerce').map(
            {0: 'Active', 1: 'Inactive'}).fillna(cleaned['statecode'])

    # Clean strings
    for col in cleaned.select_dtypes(include='object').columns:
        cleaned[col] = cleaned[col].replace(['', 'null', 'None'], pd.NA)

    # Friendly names
    cleaned = cleaned.rename(columns={
        'emailaddress1': 'email', 'telephone1': 'phone',
    })

    # Write both to one workbook
    with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
        raw.to_excel(writer, sheet_name='BEFORE (Raw)', index=False)
        cleaned.to_excel(writer, sheet_name='AFTER (Cleaned)', index=False)

        # Format raw sheet with red header
        ws_raw = writer.sheets['BEFORE (Raw)']
        for col_idx in range(1, len(raw.columns) + 1):
            cell = ws_raw.cell(row=1, column=col_idx)
            cell.font = Font(bold=True, color="FFFFFF", size=10)
            cell.fill = PatternFill(start_color="C0392B", end_color="C0392B", fill_type="solid")
        ws_raw.freeze_panes = "A2"

        # Format cleaned sheet with green header
        ws_clean = writer.sheets['AFTER (Cleaned)']
        for col_idx in range(1, len(cleaned.columns) + 1):
            cell = ws_clean.cell(row=1, column=col_idx)
            cell.font = Font(bold=True, color="FFFFFF", size=10)
            cell.fill = PatternFill(start_color="27AE60", end_color="27AE60", fill_type="solid")
        ws_clean.freeze_panes = "A2"

        # Comparison summary
        comparison = pd.DataFrame({
            'Metric': ['Columns', 'Annotation columns removed', 'Prefixes stripped',
                        'Option sets resolved', 'Column names cleaned'],
            'Before': [len(raw.columns), sum(1 for c in raw.columns if '@OData' in c or '@Microsoft' in c),
                        'N/A', 'Integer codes', 'Publisher prefixed'],
            'After': [len(cleaned.columns), 0, f"{len(rename)} columns",
                       'Display labels', 'Clean snake_case'],
        })
        comparison.to_excel(writer, sheet_name='Comparison', index=False)

    print(f"Before/After comparison written to {output_path}")
    print(f"  Raw: {len(raw.columns)} columns -> Cleaned: {len(cleaned.columns)} columns")

if __name__ == "__main__":
    before_after_comparison("raw_export.csv", "before_after.xlsx")
```
