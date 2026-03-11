---
name: entra-user-create
description: Create a new Entra ID user with full property support including department, usage location, and password policy
argument-hint: "--upn <user@domain.com> --name <display-name> [--dept <department>] [--title <job-title>] [--location <country-code>] [--manager <manager-upn>] [--license <sku-id>] [--force-mfa-register]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Create Entra ID User

Create a new user in Microsoft Entra ID with all standard properties. Optionally assign a manager, license, and require MFA registration on first sign-in.

## Steps

### 1. Parse Arguments

Required:
- `--upn` — userPrincipalName (must match a verified domain in the tenant)
- `--name` — displayName

Optional:
- `--given-name` / `--surname` — first and last name (split from `--name` if not provided)
- `--dept` — department
- `--title` — jobTitle
- `--location` — usageLocation (ISO 3166-1 alpha-2 code, e.g., `US`, `GB`, `DE`)
- `--company` — companyName
- `--phone` — mobilePhone
- `--office` — officeLocation
- `--employee-id` — employeeId
- `--manager` — UPN or object ID of the manager
- `--license` — SKU GUID to assign after creation
- `--force-mfa-register` — require MFA registration on next sign-in
- `--no-password-change` — do not force password change on first sign-in (for service accounts)

### 2. Generate Secure Password

Generate a strong random password: 16+ characters, uppercase, lowercase, digits, and symbols.
Example: `Pw-<8-random-chars>-<4-random-digits>!`

### 3. Resolve mailNickname

Derive mailNickname from the UPN prefix (part before `@`). Replace non-alphanumeric chars (except `.` `-` `_`) with `-`.

### 4. Build Request Body

```json
{
  "displayName": "<--name>",
  "givenName": "<first-name>",
  "surname": "<last-name>",
  "userPrincipalName": "<--upn>",
  "mailNickname": "<derived>",
  "accountEnabled": true,
  "passwordProfile": {
    "password": "<generated>",
    "forceChangePasswordNextSignIn": true
  },
  "usageLocation": "<--location or tenant default>",
  "department": "<--dept>",
  "jobTitle": "<--title>",
  "companyName": "<--company>",
  "officeLocation": "<--office>",
  "mobilePhone": "<--phone>",
  "employeeId": "<--employee-id>"
}
```

Omit null/empty optional fields.

### 5. POST /users

```
POST https://graph.microsoft.com/v1.0/users
Authorization: Bearer <token>
Content-Type: application/json
```

On 409 Conflict: UPN or mailNickname already exists — show the conflicting field and suggest an alternative.

### 6. Assign Manager (if --manager)

```
PUT https://graph.microsoft.com/v1.0/users/{newUserId}/manager/$ref
{ "@odata.id": "https://graph.microsoft.com/v1.0/users/{managerId}" }
```

Resolve manager ID: if `--manager` is a UPN, first `GET /users/{upn}?$select=id`.

### 7. Assign License (if --license)

Ensure `usageLocation` is set (required for license assignment).

```
POST https://graph.microsoft.com/v1.0/users/{newUserId}/assignLicense
{
  "addLicenses": [{ "skuId": "<--license>", "disabledPlans": [] }],
  "removeLicenses": []
}
```

### 8. Require MFA Registration (if --force-mfa-register)

```
POST https://graph.microsoft.com/v1.0/users/{newUserId}/authentication/requireMfaRegistration
```

### 9. Display Output

```
User created successfully
─────────────────────────────────────────────────────────────────
Display Name:   Jane Smith
UPN:            jane.smith@contoso.com
Object ID:      <user-id>
Department:     Engineering
Job Title:      Software Engineer
Usage Location: US
Password:       Pw-Xk8mN2qR-7391!  ← Store securely; not logged
Change on login: Yes
─────────────────────────────────────────────────────────────────
Manager:        john.doe@contoso.com ✓ Assigned
License:        Microsoft 365 E3 ✓ Assigned
MFA:            Registration required on next sign-in ✓
─────────────────────────────────────────────────────────────────
```

Warn: "IMPORTANT: Copy and securely deliver the temporary password. It will not be shown again."

## Azure CLI Alternative

Create the same user with `az ad user create`:

```bash
az ad user create \
  --display-name "Jane Smith" \
  --user-principal-name jane.smith@contoso.com \
  --password "Pw-Xk8mN2qR-7391!" \
  --force-change-password-next-sign-in true
```

To set additional properties after creation:

```bash
az ad user update --id jane.smith@contoso.com \
  --department "Engineering" \
  --job-title "Software Engineer"
```

Assign a manager (no direct `az ad` command — use `az rest`):

```bash
az rest --method PUT \
  --url "https://graph.microsoft.com/v1.0/users/<new-user-id>/manager/\$ref" \
  --body '{"@odata.id":"https://graph.microsoft.com/v1.0/users/<manager-id>"}'
```

## Error Handling

| Code | innerError | Fix |
|------|-----------|-----|
| `409` | `ObjectConflict` | UPN already exists. Suggest alternative UPN. |
| `400` | `PropertyConflict` | mailNickname collision. Adjust suffix (e.g., jane.smith2). |
| `400` | `Request_BadRequest` | Invalid UPN domain — check that domain is verified in tenant. |
| `403` | — | Add `User.ReadWrite.All` scope. |
