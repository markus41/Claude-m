---
name: entra-license-report
description: Generate a license usage report — available vs consumed, unassigned users, license errors, and expiring subscriptions
argument-hint: "[--sku <sku-id-or-name>] [--errors] [--unassigned] [--expiring]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# License Usage Report

Audit Microsoft 365 license consumption, identify users without required licenses, surface assignment errors, and flag expiring subscriptions.

## Steps

### 1. Get Subscribed SKUs

```
GET https://graph.microsoft.com/v1.0/subscribedSkus
  ?$select=skuId,skuPartNumber,consumedUnits,prepaidUnits,capabilityStatus,appliesTo,servicePlans
```

Build summary table: purchased, assigned, available, warning (prepaidUnits.warning > 0).

### 2. License Errors Report (--errors)

For each group with license assignments:
```
GET /groups/{groupId}/membersWithLicenseErrors?$select=id,displayName,userPrincipalName,licenseAssignmentStates
```

Also query users directly:
```
GET /users?$filter=licenseAssignmentStates/any(s:s/state eq 'Error')
  &$select=id,displayName,userPrincipalName,licenseAssignmentStates
```

### 3. Users with No License (--unassigned)

```
GET /users?$filter=assignedLicenses/$count eq 0 and accountEnabled eq true
  &$count=true&ConsistencyLevel=eventual
  &$select=id,displayName,userPrincipalName,department,createdDateTime
```

### 4. Filter by SKU (--sku)

```
GET /users?$filter=assignedLicenses/any(l:l/skuId eq <sku-id>)
  &$select=id,displayName,userPrincipalName,assignedLicenses
  &$count=true&ConsistencyLevel=eventual
```

### 5. Display Output

```
License Usage Report — contoso.onmicrosoft.com
─────────────────────────────────────────────────────────────────
Generated: 2026-03-01 10:00 UTC
─────────────────────────────────────────────────────────────────
SKU                     Purchased  Assigned  Available  Status
─────────────────────────────────────────────────────────────────
Microsoft 365 E3        500        487       13         OK
Microsoft 365 E5        50         50        0          ⚠ FULL
Intune                  100        73        27         OK
Microsoft Entra P2      25         24        1          ⚠ Low
─────────────────────────────────────────────────────────────────
⚠ M365 E5: No licenses available. Next assignment will fail.
⚠ Entra P2: 1 remaining — consider purchasing more for PIM expansion.
─────────────────────────────────────────────────────────────────
License Errors: 3 users affected
  Jane Smith — CountViolation (M365 E5 full)
  Bob Jones  — InvalidCountryArea (missing usageLocation)
─────────────────────────────────────────────────────────────────
Users with no license: 12
  Use: /entra-id-admin:entra-license-assign --principal <user> --add "M365 E3"
```

## Error Handling

| Code | Fix |
|------|-----|
| `403` | Add `Directory.Read.All` and `LicenseAssignment.ReadWrite.All` scope |
