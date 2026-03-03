# Authentication Methods — Reference

## Authentication Methods per User

Each user can have multiple authentication methods registered:

| Method Type | Endpoint Segment |
|-------------|-----------------|
| Microsoft Authenticator | `microsoftAuthenticatorMethods` |
| FIDO2 security key | `fido2Methods` |
| Phone (SMS/voice) | `phoneMethods` |
| Email (SSPR only) | `emailMethods` |
| Software OATH token | `softwareOathMethods` |
| Temporary Access Pass | `temporaryAccessPassMethods` |
| Windows Hello for Business | `windowsHelloForBusinessMethods` |
| Password | `passwordMethods` |

## List All Methods for a User

```
GET /users/{userId}/authentication/methods
```

Returns a polymorphic collection — each item has `@odata.type` indicating method type.

## FIDO2 Security Key Management

```
# List FIDO2 keys
GET /users/{userId}/authentication/fido2Methods

# Delete a FIDO2 key (lost/decommissioned device)
DELETE /users/{userId}/authentication/fido2Methods/{methodId}
```

## Phone Method (SMS/Voice)

```
# List registered phones
GET /users/{userId}/authentication/phoneMethods

# Add phone
POST /users/{userId}/authentication/phoneMethods
{
  "phoneNumber": "+1-206-555-0100",
  "phoneType": "mobile"
}
# phoneType options: mobile, alternateMobile, office

# Delete phone method
DELETE /users/{userId}/authentication/phoneMethods/{methodId}
```

## Temporary Access Pass (TAP)

TAP is a time-limited passcode for onboarding users without a phone:

```
POST /users/{userId}/authentication/temporaryAccessPassMethods
{
  "isUsableOnce": false,
  "startDateTime": "2026-03-01T10:00:00Z",
  "lifetimeInMinutes": 480
}
```

Response includes `temporaryAccessPass` — share securely with the user.

Delete TAP (after use or expiry):
```
DELETE /users/{userId}/authentication/temporaryAccessPassMethods/{methodId}
```

## Require MFA Registration

Force a user to re-register their MFA on next sign-in:
```
POST /users/{userId}/authentication/requireMfaRegistration
```

## Authentication Method Registration Report

```
# Get MFA/SSPR registration state for all users
GET /reports/credentialUserRegistrationDetails
  ?$filter=isMfaRegistered eq false
  &$select=userDisplayName,userPrincipalName,isMfaRegistered,isRegistered,authMethods

# Per-user registration detail
GET /reports/credentialUserRegistrationDetails/{userId}
```

`authMethods` field lists registered methods: `email`, `mobilePhone`, `officePhone`,
`securityQuestion`, `appNotification`, `appCode`, `alternateMobilePhone`, `fido`, `appPassword`, `unknownFutureValue`.

## Authentication Strength Policies

Authentication strengths define which method combinations are acceptable (used in CA policies):

```
# List all built-in and custom auth strengths
GET /policies/authenticationStrengthPolicies

# Create custom auth strength (e.g., phishing-resistant only)
POST /policies/authenticationStrengthPolicies
{
  "displayName": "Phishing-Resistant Only",
  "description": "Requires FIDO2 or Windows Hello",
  "allowedCombinations": [
    "fido2",
    "windowsHelloForBusiness"
  ]
}
```

## Authentication Methods Policy (Tenant-Wide)

Configure which methods are enabled tenant-wide:

```
GET /policies/authenticationMethodsPolicy
  ?$expand=authenticationMethodConfigurations

PATCH /policies/authenticationMethodsPolicy/authenticationMethodConfigurations/microsoftAuthenticator
{
  "state": "enabled",
  "featureSettings": {
    "numberMatchingRequiredState": { "state": "enabled" },
    "displayAppInformationRequiredState": { "state": "enabled" }
  }
}
```

## SSPR (Self-Service Password Reset) Configuration

```
GET /policies/authorizationPolicy

# Enable SSPR for all users
PATCH /policies/authorizationPolicy
{
  "allowedToUseSspr": "all"
}
# Values: all, none, selected (requires group assignment)
```

SSPR authentication methods must be configured in the Authentication Methods Policy.

## Registration Campaign (Nudge to Register)

Nudge users to register Microsoft Authenticator:
```
PATCH /policies/authenticationMethodsPolicy/authenticationMethodConfigurations/microsoftAuthenticator
{
  "registrationCampaign": {
    "snoozeDurationInDays": 7,
    "state": "enabled",
    "excludeTargets": [
      { "id": "AllUsers", "targetType": "group" }
    ],
    "includeTargets": [
      { "id": "<group-id>", "targetType": "group", "authenticationMethodRequirement": "microsoftAuthenticator" }
    ]
  }
}
```
