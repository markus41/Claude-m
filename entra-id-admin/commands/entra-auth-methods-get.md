---
name: entra-auth-methods-get
description: List registered authentication methods for a user — MFA methods, FIDO2 keys, TAPs, and registration status
argument-hint: "<upn-or-id> [--delete <method-id>] [--add-tap] [--require-mfa-register]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Get / Manage User Authentication Methods

List all registered authentication methods for a user. Optionally delete a specific method, create a Temporary Access Pass, or require MFA re-registration.

## Steps

### 1. Resolve User

`GET /users/{upnOrId}?$select=id,displayName,userPrincipalName`

### 2. List All Auth Methods

```
GET https://graph.microsoft.com/v1.0/users/{userId}/authentication/methods
```

Returns polymorphic collection. For each item, extract `@odata.type` and relevant fields.

Also fetch registration detail:
```
GET https://graph.microsoft.com/v1.0/reports/credentialUserRegistrationDetails/{userId}
```

### 3. Display Registered Methods

```
Authentication Methods for Jane Smith (jane.smith@contoso.com)
─────────────────────────────────────────────────────────────────
Method                     Details                    ID
─────────────────────────────────────────────────────────────────
Microsoft Authenticator    iPhone 14 Pro              <method-id>
FIDO2 Security Key         YubiKey 5 NFC              <method-id>
Phone (SMS)                +1-206-555-****            <method-id>
Password                   (present)                  <method-id>
─────────────────────────────────────────────────────────────────
MFA Registered: Yes
SSPR Registered: Yes
─────────────────────────────────────────────────────────────────
```

### 4. Delete Method (if --delete <method-id>)

Determine method type from listing, then call the appropriate DELETE endpoint:
```
DELETE /users/{userId}/authentication/fido2Methods/{methodId}
DELETE /users/{userId}/authentication/phoneMethods/{methodId}
DELETE /users/{userId}/authentication/microsoftAuthenticatorMethods/{methodId}
```

### 5. Add Temporary Access Pass (if --add-tap)

```
POST https://graph.microsoft.com/v1.0/users/{userId}/authentication/temporaryAccessPassMethods
{
  "isUsableOnce": false,
  "startDateTime": "<now>",
  "lifetimeInMinutes": 480
}
```

Show the TAP value prominently. Warn it will not be shown again.

### 6. Require MFA Re-registration (if --require-mfa-register)

```
POST https://graph.microsoft.com/v1.0/users/{userId}/authentication/requireMfaRegistration
```

## Azure CLI Alternative

Auth methods management requires `az rest` with Graph API:

```bash
# List all auth methods for a user
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/users/<user-id>/authentication/methods"

# List FIDO2 keys
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/users/<user-id>/authentication/fido2Methods"

# Create Temporary Access Pass
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/users/<user-id>/authentication/temporaryAccessPassMethods" \
  --body '{"isUsableOnce":false,"lifetimeInMinutes":480}'

# Require MFA re-registration
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/users/<user-id>/authentication/requireMfaRegistration"
```

## Error Handling

| Code | Fix |
|------|-----|
| `403` | Add `UserAuthenticationMethod.ReadWrite.All` scope |
| `404` on method | Method ID not found or already deleted |
| `409` on TAP | TAP already exists — delete existing one first |
