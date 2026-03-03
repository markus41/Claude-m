# License Assignment — Reference

## Common Microsoft 365 SKU IDs

| Product | SKU GUID | SKU Part Number |
|---------|----------|----------------|
| Microsoft 365 E3 | `05e9a617-0261-4cee-bb44-138d3ef5d965` | `SPE_E3` |
| Microsoft 365 E5 | `06ebc4ee-1bb5-47dd-8120-11324bc54e06` | `SPE_E5` |
| Microsoft 365 Business Premium | `cbdc14ab-d96c-4c30-b9f4-6ada7cdc1d46` | `SPB` |
| Microsoft 365 Business Standard | `f245ecc8-75af-4f8e-b61f-27d8114de5f3` | `O365_BUSINESS_PREMIUM` |
| Microsoft 365 F3 | `66b55226-6b4f-492c-910c-a3b7a3c9d993` | `SPE_F1` |
| Office 365 E3 | `6fd2c87f-b296-42f0-b197-1e91e994b900` | `ENTERPRISEPACK` |
| Office 365 E1 | `18181a46-0d4e-45cd-891e-60aabd171b4e` | `STANDARDPACK` |
| Microsoft Entra ID P1 | `078d2b04-f1bd-4111-bbd4-b4b1b354cef4` | `AAD_PREMIUM` |
| Microsoft Entra ID P2 | `eec0eb4f-6444-4f95-aba0-50c24d67f998` | `AAD_PREMIUM_P2` |
| Microsoft Entra ID Governance | `7b26f5ab-a763-4c00-a1ac-f6c4b5506945` | `Identity_Governance` |
| Intune (standalone) | `f30db892-07e9-47e9-837c-80727f46fd3d` | `INTUNE_A` |
| Teams Essentials | `3ab6abff-666f-4424-bfb7-f0bc274ec7bc` | `TEAMS_ESSENTIALS` |
| Power BI Pro | `f8a1db68-be16-40ed-86d5-cb42ce701560` | `POWER_BI_PRO` |

## Get Available Licenses in Tenant

```
GET /subscribedSkus?$select=skuId,skuPartNumber,prepaidUnits,consumedUnits,capabilityStatus

→ consumedUnits = assigned
→ prepaidUnits.enabled = total purchased
→ Available = enabled - consumedUnits
```

## Assign License to User

```
POST /users/{userId}/assignLicense
{
  "addLicenses": [
    {
      "skuId": "05e9a617-0261-4cee-bb44-138d3ef5d965",
      "disabledPlans": []
    }
  ],
  "removeLicenses": []
}
```

**Prerequisites**: User must have `usageLocation` set (ISO 3166-1 alpha-2, e.g., `"US"`, `"GB"`, `"DE"`).

Assign with specific service plans disabled:
```json
{
  "addLicenses": [
    {
      "skuId": "05e9a617-0261-4cee-bb44-138d3ef5d965",
      "disabledPlans": [
        "1e7e1070-8ccb-4aca-b470-d7cb538cb07e",
        "57ff2da0-773e-42df-b2af-ffb7a2317929"
      ]
    }
  ],
  "removeLicenses": []
}
```

## Remove License from User

```
POST /users/{userId}/assignLicense
{
  "addLicenses": [],
  "removeLicenses": ["05e9a617-0261-4cee-bb44-138d3ef5d965"]
}
```

## Group-Based Licensing

Assign license to a group — all members automatically receive the license:

```
POST /groups/{groupId}/assignLicense
{
  "addLicenses": [
    {
      "skuId": "05e9a617-0261-4cee-bb44-138d3ef5d965",
      "disabledPlans": []
    }
  ],
  "removeLicenses": []
}
```

Check for assignment errors on the group:
```
GET /groups/{groupId}/membersWithLicenseErrors
  ?$select=id,displayName,userPrincipalName,licenseAssignmentStates
```

User-level license errors:
```
GET /users/{userId}?$select=licenseAssignmentStates,assignedLicenses
```

`licenseAssignmentStates` shows the error for each failed SKU:
- `CountViolation` — no available licenses
- `MutuallyExclusiveViolation` — conflicting SKU already assigned
- `InvalidCountryArea` — no or invalid `usageLocation`
- `UserDisabled` — user account disabled

## List All Users With a Specific License

```
GET /users?$filter=assignedLicenses/any(l:l/skuId eq 05e9a617-0261-4cee-bb44-138d3ef5d965)
  &$select=id,displayName,userPrincipalName,usageLocation
```

## License Report

```
GET /subscribedSkus
  ?$select=skuId,skuPartNumber,consumedUnits,prepaidUnits,servicePlans
```

Summary per SKU:
- `prepaidUnits.enabled` — purchased
- `prepaidUnits.suspended` — currently suspended (billing issue)
- `prepaidUnits.warning` — expiring soon
- `consumedUnits` — currently assigned

## Common Service Plan IDs (within M365 E3)

| Service | Plan GUID |
|---------|-----------|
| Exchange Online (Plan 2) | `efb87545-963c-4e0d-99df-69c6916d9eb0` |
| SharePoint Online (Plan 2) | `5dbe027f-2339-4123-9542-606e4d348a72` |
| Teams | `57ff2da0-773e-42df-b2af-ffb7a2317929` |
| Intune | `c1ec4a95-1f05-45b3-a911-aa3fa01094f5` |
| Entra ID P1 (in M365 E3) | `41781fb2-bc02-4b7c-bd55-b576c07bb09d` |
| Power Automate for M365 | `76846ad7-7776-4c40-a281-a386362dd1b9` |
