---
name: m365-user-create
description: Create M365 user(s) with license and group assignment. Supports single user from params or bulk from CSV. Includes validation and dry-run.
argument-hint: "<userPrincipalName> or <csvPath> [--dry-run] [--license <skuId>] [--groups <groupIds>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Create M365 User(s)

Create one or more users in the Microsoft 365 tenant via Microsoft Graph API.

## Modes

### Single User
Provide user details as arguments:
- `userPrincipalName` (required): e.g., `jane.doe@contoso.com`
- `--displayName`: Full name
- `--givenName`: First name
- `--surname`: Last name
- `--department`: Department
- `--jobTitle`: Job title
- `--usageLocation`: ISO 3166-1 alpha-2 country code (required for license)
- `--license`: SKU ID to assign
- `--groups`: Comma-separated group IDs to add the user to
- `--password`: Initial password (auto-generated if omitted)

### Bulk from CSV
Provide a CSV file path:
- CSV must have headers: `displayName`, `givenName`, `surname`, `userPrincipalName`, `mailNickname`, `usageLocation`
- Optional columns: `department`, `jobTitle`, `password`, `licenseSkuId`, `groups`

## Workflow

1. **Parse input** -- Determine single vs. bulk mode
2. **Validate** -- Check all fields: UPN format, domain verification, mailNickname format, usageLocation, SKU availability
3. **Dry-run** (with `--dry-run`) -- Output a markdown table showing what would be created, with no API calls
4. **Execute** -- Create users via Graph API (use `$batch` for bulk, sequential for single)
5. **Post-create** -- Assign licenses, add to groups
6. **Report** -- Generate markdown report with per-user status, assigned password (for single user), errors

## Validation Rules

- `userPrincipalName` must be valid email format and domain must be verified in tenant
- `mailNickname` must contain only `[a-zA-Z0-9._-]`
- `usageLocation` must be a 2-letter ISO country code
- No duplicate UPNs in CSV
- UPN must not already exist in directory
- If `--license` provided, SKU must exist and have available units
- Password must meet tenant complexity policy (min 8 chars if provided)

## Important Notes

- `usageLocation` is **required** before any license can be assigned
- Passwords are auto-generated (16 chars, mixed complexity) if not provided
- Auto-generated passwords use `forceChangePasswordNextSignIn: true`
- For bulk operations (>20 users), use Graph `$batch` endpoint (20 per batch)
- Handle 429 throttling with Retry-After header and exponential backoff
- Reference: `skills/m365-admin/references/entra-id.md` for endpoint details
- Reference: `skills/m365-admin/references/bulk-operations.md` for bulk patterns
- Reference: `skills/m365-admin/examples/user-management.md` for code examples
