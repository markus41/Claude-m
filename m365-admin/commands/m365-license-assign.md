---
name: m365-license-assign
description: Assign, change, or revoke M365 licenses. Lists available SKUs, validates availability, and supports bulk operations from CSV.
argument-hint: "<userPrincipalName> --sku <skuId> [--remove-sku <skuId>] [--disabled-plans <planIds>] [--csv <path>] [--dry-run]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Assign / Change M365 Licenses

Manage license assignments for M365 users via Microsoft Graph API.

## Operations

### Assign License
Assign a new license to a user:
- `--sku <skuId>`: SKU ID to assign (use `GET /subscribedSkus` to list available)
- `--disabled-plans <planIds>`: Comma-separated service plan IDs to disable within the SKU

### Remove License
Remove a license from a user:
- `--remove-sku <skuId>`: SKU ID to remove

### Migrate License
Swap one license for another in a single operation:
- `--remove-sku <oldSkuId> --sku <newSkuId>`: Atomic swap (both in one `assignLicense` call)

### Bulk from CSV
- CSV columns: `userPrincipalName`, `addSkuId`, `removeSkuId`, `disabledPlans` (semicolon-separated)

## Workflow

1. **List SKUs** -- GET `/subscribedSkus` to show available licenses with consumed/available counts
2. **Validate** -- Check user exists, has `usageLocation` set, SKU exists, sufficient available licenses
3. **Dry-run** (with `--dry-run`) -- Preview changes in markdown table
4. **Execute** -- POST `/users/{id}/assignLicense` for each user
5. **Report** -- Per-user status with SKU names, success/failure, error details

## Pre-flight Checks

- User must have `usageLocation` set (PATCH to set it if needed)
- SKU must exist in tenant (`GET /subscribedSkus`)
- Available count (`prepaidUnits.enabled - consumedUnits`) must be > 0 for assignments
- Disabled plan IDs must be valid service plans within the target SKU
- For migrations (remove + add): perform as a single `assignLicense` call to avoid a gap

## Common SKU Reference

| License | skuPartNumber |
|---|---|
| Office 365 E1 | STANDARDPACK |
| Office 365 E3 | ENTERPRISEPACK |
| Office 365 E5 | ENTERPRISEPREMIUM |
| Microsoft 365 Business Basic | O365_BUSINESS_ESSENTIALS |
| Microsoft 365 Business Standard | O365_BUSINESS_PREMIUM |
| Microsoft 365 Business Premium | SPB |
| Microsoft 365 E3 | SPE_E3 |
| Microsoft 365 E5 | SPE_E5 |

## Important Notes

- License assignment and removal in the same `assignLicense` call is atomic
- For bulk migrations, check total new license capacity before starting
- Handle 429 throttling (directory write limit: ~3 per second per tenant)
- Reference: `skills/m365-admin/references/entra-id.md` for SKU IDs and endpoint details
- Reference: `skills/m365-admin/examples/license-management.md` for code examples
- Reference: `skills/m365-admin/references/bulk-operations.md` for bulk patterns
