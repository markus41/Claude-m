---
name: entra-user-bulk-import
description: Bulk create Entra ID users from a CSV file using Graph batch API with error reporting
argument-hint: "<csv-file> [--domain <tenant-domain>] [--location <country-code>] [--license <sku-id>] [--dry-run] [--output <results.csv>]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Bulk Import Users from CSV

Read a CSV file and create multiple Entra ID users using the Graph `$batch` API. Handles errors per-user without stopping the entire import. Generates a results report.

## Expected CSV Format

```csv
DisplayName,FirstName,LastName,UPN,Department,JobTitle,UsageLocation,EmployeeId,ManagerUPN,MobilePhone
Jane Smith,Jane,Smith,jane.smith@contoso.com,Engineering,Software Engineer,US,EMP001,john.doe@contoso.com,+1-206-555-0100
Bob Jones,Bob,Jones,bob.jones@contoso.com,Marketing,Analyst,GB,EMP002,,+44-20-555-0200
```

Required columns: `DisplayName`, `UPN`
Optional: `FirstName`, `LastName`, `Department`, `JobTitle`, `UsageLocation`, `EmployeeId`, `ManagerUPN`, `MobilePhone`, `OfficeLocation`, `CompanyName`

## Steps

### 1. Read and Validate CSV

- Parse the CSV from the file at `<csv-file>`
- Validate each row: check UPN format, non-empty DisplayName, valid UsageLocation codes
- If `--domain` is provided, append `@<domain>` to UPN values that have no domain
- If `--location` is provided, use as default UsageLocation for rows missing it
- Report validation errors before making any API calls

### 2. Dry Run (if --dry-run)

Print what would be created without making API calls:
```
DRY RUN — No changes will be made
─────────────────────────────────────────────────────────────────
Row  UPN                         Display Name      Status
1    jane.smith@contoso.com      Jane Smith        ✓ Valid
2    bob.jones@contoso.com       Bob Jones         ✓ Valid
3    invalid-email               Charlie Brown     ✗ Invalid UPN format
─────────────────────────────────────────────────────────────────
3 users to create, 1 validation error
```

### 3. Generate Passwords

Generate a unique strong password for each user: 16+ chars, mixed case, digits, symbols.

### 4. Build Batch Requests (20 per batch)

Split rows into groups of 20. For each group, build a `$batch` request:

```json
{
  "requests": [
    {
      "id": "user-<row-number>",
      "method": "POST",
      "url": "/users",
      "headers": { "Content-Type": "application/json" },
      "body": {
        "displayName": "Jane Smith",
        "givenName": "Jane",
        "surname": "Smith",
        "userPrincipalName": "jane.smith@contoso.com",
        "mailNickname": "jane.smith",
        "accountEnabled": true,
        "usageLocation": "US",
        "passwordProfile": {
          "password": "<generated>",
          "forceChangePasswordNextSignIn": true
        },
        "department": "Engineering",
        "jobTitle": "Software Engineer"
      }
    }
  ]
}
```

### 5. POST /$batch for Each Group

```
POST https://graph.microsoft.com/v1.0/$batch
```

Parse response — each sub-response has its own `status` code (201 = created, 4xx = error).

On 429 in batch response: wait `Retry-After` seconds, then retry only the failed requests.

### 6. Assign Managers (second pass)

After all users are created, assign managers for rows that had `ManagerUPN`:
- Resolve each manager UPN to an object ID (cache lookups)
- Batch `PUT /users/{userId}/manager/$ref` calls

### 7. Assign Licenses (if --license)

Batch `POST /users/{userId}/assignLicense` for all successfully created users.

### 8. Write Results CSV (if --output)

```csv
Row,UPN,DisplayName,ObjectId,Status,TempPassword,Error
1,jane.smith@contoso.com,Jane Smith,<id>,Created,Pw-Xk8m...,
2,bob.jones@contoso.com,Bob Jones,<id>,Created,Pw-Nm9q...,
3,invalid@,Charlie Brown,,Failed,,Invalid UPN format
```

### 9. Display Summary

```
Bulk Import Complete
─────────────────────────────────────────────────────────────────
Total rows:     150
Created:        147 ✓
Failed:         3 ✗
Licenses:       147 assigned (M365 E3)
─────────────────────────────────────────────────────────────────
Failed rows:
  Row 12: charlie.brown@contoso.com — ObjectConflict (UPN exists)
  Row 47: dave.smith@contoso.com — InvalidCountryArea (missing UsageLocation)
  Row 89: eve.jones — Invalid UPN format (no domain)
─────────────────────────────────────────────────────────────────
Results saved: users-import-results-20260301.csv
```

## Azure CLI Alternative

For small bulk imports, loop `az ad user create` over CSV rows:

```bash
# Create users from CSV using a bash loop
while IFS=, read -r name upn dept title location; do
  az ad user create \
    --display-name "$name" \
    --user-principal-name "$upn" \
    --password "TempP@ss$(openssl rand -hex 4)!" \
    --force-change-password-next-sign-in true \
    2>&1 | tee -a import-results.log
done < <(tail -n +2 users.csv)
```

> **Note**: For large imports (>20 users), the Graph `$batch` API is significantly faster and handles throttling better. Use `az ad user create` for small batches or one-off scripting.

## Error Handling

| Error | Action |
|-------|--------|
| `ObjectConflict` | Skip row, log as Failed; suggest updating existing user |
| `InvalidCountryArea` | Row missing usageLocation; skip license assignment |
| `429 TooManyRequests` | Honor `Retry-After`, retry batch; limit to 5 retries |
| CSV parse error | Abort with row number and column name |
