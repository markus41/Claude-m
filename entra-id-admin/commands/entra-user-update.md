---
name: entra-user-update
description: Update Entra ID user properties — department, title, location, phone, manager, and more
argument-hint: "--user <upn-or-id> [--name <display-name>] [--dept <department>] [--title <job-title>] [--location <country-code>] [--manager <manager-upn>] [--enable] [--disable]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Update Entra ID User

Update one or more properties of an existing Entra ID user. Only specified fields are changed — all others remain unchanged.

## Steps

### 1. Resolve User

- Accept `--user` as UPN (e.g., `jane.smith@contoso.com`) or object ID (GUID)
- If UPN provided: `GET /users/{upn}?$select=id,displayName,userPrincipalName,accountEnabled,onPremisesSyncEnabled,department,jobTitle`
- Check `onPremisesSyncEnabled` — if `true`, warn: "This user is synced from on-premises Active Directory. Attributes managed by on-prem AD cannot be changed via Graph and will be overwritten on next sync."

### 2. Build PATCH Body

Include only the properties specified in arguments:

```json
{
  "displayName": "<--name if provided>",
  "department": "<--dept if provided>",
  "jobTitle": "<--title if provided>",
  "usageLocation": "<--location if provided>",
  "mobilePhone": "<--phone if provided>",
  "officeLocation": "<--office if provided>",
  "companyName": "<--company if provided>",
  "employeeId": "<--employee-id if provided>",
  "employeeType": "<--employee-type if provided>",
  "accountEnabled": true|false    ← only if --enable or --disable passed
}
```

Omit any fields not specified. Never send null for unspecified fields.

### 3. PATCH User

```
PATCH https://graph.microsoft.com/v1.0/users/{userId}
Authorization: Bearer <token>
Content-Type: application/json
```

### 4. Update Manager (if --manager provided)

Resolve new manager ID then:
```
PUT https://graph.microsoft.com/v1.0/users/{userId}/manager/$ref
{ "@odata.id": "https://graph.microsoft.com/v1.0/users/{newManagerId}" }
```

To remove manager:
```
DELETE https://graph.microsoft.com/v1.0/users/{userId}/manager/$ref
```

### 5. Display Changed Fields

```
User updated
─────────────────────────────────────────────────────────────────
User:   jane.smith@contoso.com (Jane Smith)
─────────────────────────────────────────────────────────────────
Changed fields:
  Department:   "Marketing" → "Engineering"
  Job Title:    "Analyst" → "Software Engineer"
  Location:     "GB" → "US"
─────────────────────────────────────────────────────────────────
```

If the user is on-premises synced, add:
```
⚠ Warning: Changes to synced attributes will be reverted by the next AD sync cycle.
  Make these changes in on-premises Active Directory instead.
```

## Error Handling

| Code | Message | Fix |
|------|---------|-----|
| `400` | `DirectorySyncEnabled` | User is on-prem synced — edit attributes in AD |
| `400` | `Property ... is read-only` | Field cannot be set via API (e.g., `mail` for synced users) |
| `404` | Not found | Verify UPN or object ID |
| `403` | Forbidden | Add `User.ReadWrite.All` scope |
