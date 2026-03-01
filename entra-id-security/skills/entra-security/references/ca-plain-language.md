# Conditional Access — Plain-Language Mapping

Maps common plain-language requests to Conditional Access policy configurations.

## Admin Role IDs (Built-in)

| Role | ID |
|---|---|
| Global Administrator | 62e90394-69f5-4237-9190-012177145e10 |
| User Administrator | fe930be7-5e62-47db-91af-98c3a49a38b1 |
| Exchange Administrator | 29232cdf-9323-42fd-ade2-1d097af3e4de |
| SharePoint Administrator | f28a1f50-f6e7-4571-818b-6a12f2af6b6c |
| Security Administrator | 194ae4cb-b126-40b2-bd5b-6091b380977d |
| Compliance Administrator | 17315797-102d-40b4-93e0-432062caca18 |
| Billing Administrator | b0f54661-2d74-4c50-afa3-1ec803f12efe |
| Helpdesk Administrator | 729827e3-9c14-49f7-bb1b-9608f156bbb8 |

## Template: Require MFA for Admins

```json
{
  "displayName": "Require MFA for Admins",
  "state": "enabledForReportingButNotEnforced",
  "conditions": {
    "users": {
      "includeRoles": [
        "62e90394-69f5-4237-9190-012177145e10",
        "fe930be7-5e62-47db-91af-98c3a49a38b1",
        "29232cdf-9323-42fd-ade2-1d097af3e4de",
        "f28a1f50-f6e7-4571-818b-6a12f2af6b6c",
        "194ae4cb-b126-40b2-bd5b-6091b380977d"
      ]
    },
    "applications": { "includeApplications": ["All"] }
  },
  "grantControls": {
    "operator": "OR",
    "builtInControls": ["mfa"]
  }
}
```

## Template: Block Legacy Authentication

```json
{
  "displayName": "Block Legacy Authentication",
  "state": "enabledForReportingButNotEnforced",
  "conditions": {
    "users": { "includeUsers": ["All"] },
    "applications": { "includeApplications": ["All"] },
    "clientAppTypes": ["exchangeActiveSync", "other"]
  },
  "grantControls": {
    "operator": "OR",
    "builtInControls": ["block"]
  }
}
```

## Template: Require MFA Outside Trusted Locations

```json
{
  "displayName": "Require MFA Outside Office",
  "state": "enabledForReportingButNotEnforced",
  "conditions": {
    "users": { "includeUsers": ["All"] },
    "applications": { "includeApplications": ["All"] },
    "locations": {
      "includeLocations": ["All"],
      "excludeLocations": ["{trustedLocationId}"]
    }
  },
  "grantControls": {
    "operator": "OR",
    "builtInControls": ["mfa"]
  }
}
```

## Template: Require Compliant Device

```json
{
  "displayName": "Require Compliant Device for Finance",
  "state": "enabledForReportingButNotEnforced",
  "conditions": {
    "users": { "includeGroups": ["{financeGroupId}"] },
    "applications": { "includeApplications": ["All"] }
  },
  "grantControls": {
    "operator": "OR",
    "builtInControls": ["compliantDevice"]
  }
}
```

## Template: Block Risky Countries

Requires a named location first:

```
POST https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations
{
  "@odata.type": "#microsoft.graph.countryNamedLocation",
  "displayName": "Blocked Countries",
  "countriesAndRegions": ["KP", "IR", "RU"],
  "includeUnknownCountriesAndRegions": false
}
```

Then the policy:

```json
{
  "displayName": "Block Sign-in from Blocked Countries",
  "state": "enabledForReportingButNotEnforced",
  "conditions": {
    "users": { "includeUsers": ["All"] },
    "applications": { "includeApplications": ["All"] },
    "locations": {
      "includeLocations": ["{blockedCountriesLocationId}"]
    }
  },
  "grantControls": {
    "operator": "OR",
    "builtInControls": ["block"]
  }
}
```

## What-If API

```
POST https://graph.microsoft.com/beta/identity/conditionalAccess/evaluate
{
  "appliedPoliciesOnly": false,
  "conditionalAccessWhatIfSubject": { "userId": "{userId}" },
  "conditionalAccessContext": {
    "includeApplications": ["All"]
  },
  "conditionalAccessWhatIfConditions": {
    "userRiskLevel": "low",
    "signInRiskLevel": "low",
    "clientAppType": "browser",
    "country": "US"
  }
}
```

## Create Policy via Graph

```
POST https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies
Content-Type: application/json

{policy JSON from template above}
```

## Update Policy State

```
PATCH https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies/{policyId}
{
  "state": "enabled"
}
```

States: `enabled`, `disabled`, `enabledForReportingButNotEnforced`

## Required Permissions

| Operation | Permission |
|---|---|
| Create/update CA policy | `Policy.ReadWrite.ConditionalAccess` |
| Read CA policies | `Policy.Read.All` |
| What-If evaluation | `Policy.Read.All` (beta) |
| Named locations | `Policy.ReadWrite.ConditionalAccess` |
