---
name: entra-license-assign
description: Assign or remove Microsoft 365 licenses from a user or group, with service plan control
argument-hint: "--principal <upn-or-group-name> --add <sku-id-or-name> [--remove <sku-id>] [--disable-plans <plan-id1,plan-id2>] [--set-location <country-code>]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Assign or Remove Entra ID Licenses

Assign or remove Microsoft 365 license SKUs from a user or group. Supports disabling individual service plans within a SKU.

## Steps

### 1. Resolve Principal

Accept UPN or group display name:
- User: `GET /users/{upn}?$select=id,displayName,usageLocation,assignedLicenses`
- Group: `GET /groups?$filter=displayName eq '<name>'&$select=id,displayName`

Check user `usageLocation` — if null, warn and block unless `--set-location` is provided.

### 2. Resolve SKU IDs

If `--add` is a product name (not GUID), look up in common SKU table from `references/licenses.md`:
- "M365 E3" or "Microsoft 365 E3" → `05e9a617-0261-4cee-bb44-138d3ef5d965`
- Also: `GET /subscribedSkus?$select=skuId,skuPartNumber,consumedUnits,prepaidUnits`

Show available SKUs and how many are available (purchased - consumed).

### 3. Set Usage Location (if --set-location)

```
PATCH /users/{userId}
{ "usageLocation": "<country-code>" }
```

### 4. Assign License

**To user:**
```
POST https://graph.microsoft.com/v1.0/users/{userId}/assignLicense
{
  "addLicenses": [
    {
      "skuId": "<sku-id>",
      "disabledPlans": ["<plan-id-1>", "<plan-id-2>"]
    }
  ],
  "removeLicenses": ["<remove-sku-id-if-any>"]
}
```

**To group (group-based licensing):**
```
POST https://graph.microsoft.com/v1.0/groups/{groupId}/assignLicense
{
  "addLicenses": [{ "skuId": "<sku-id>", "disabledPlans": [] }],
  "removeLicenses": []
}
```

### 5. Verify — Check for Assignment Errors

After group assignment, check for errors:
```
GET /groups/{groupId}/membersWithLicenseErrors?$select=id,displayName,licenseAssignmentStates
```

### 6. Display Output

```
License assigned
─────────────────────────────────────────────────────────────────
Principal:    Jane Smith (jane.smith@contoso.com)
License:      Microsoft 365 E3 (05e9a617...)
Assignment:   Direct
Disabled:     Yammer (service plan disabled)
─────────────────────────────────────────────────────────────────
Current licenses:
  Microsoft 365 E3    ✓ Active
  Intune (standalone) ✓ Active (group-inherited)
─────────────────────────────────────────────────────────────────
```

## Error Handling

| Code | Fix |
|------|-----|
| `400 InvalidCountryArea` | Set `usageLocation` first with `--set-location` |
| `400 CountViolation` | No available licenses — check with `GET /subscribedSkus` |
| `400 MutuallyExclusiveViolation` | Conflicting SKU already assigned |
| `403` | Add `LicenseAssignment.ReadWrite.All` scope |
