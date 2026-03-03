# Initial M365 Security Configuration — CA Policies, PIM, Break-Glass, Security Defaults

## Configuration Sequence

Apply in this exact order to avoid lockout:

```
1. Create break-glass accounts (before disabling Security Defaults)
2. Disable Security Defaults (if using custom CA policies)
3. Create Conditional Access policies (test mode first)
4. Enable CA policies (enforced)
5. Configure PIM for privileged roles
6. Configure admin account MFA methods
7. Set authentication methods policy
8. Configure audit logging
```

---

## Step 1: Create Break-Glass Accounts

Break-glass accounts bypass CA policies and MFA — essential insurance against lockout.

```
POST https://graph.microsoft.com/v1.0/users
{
  "displayName": "Break Glass Account 1",
  "userPrincipalName": "breakglass1@{tenant}.onmicrosoft.com",
  "accountEnabled": true,
  "passwordProfile": {
    "forceChangePasswordNextSignIn": false,
    "password": "<complex-256-bit-random>"
  },
  "usageLocation": "US"
}
```

**Break-glass account requirements**:
- Use `.onmicrosoft.com` domain (not federated — immune to IdP failures)
- Strong random password (not stored digitally — printed and in physical safe)
- MFA registered via hardware FIDO2 key (not phone)
- Global Administrator role
- Excluded from ALL Conditional Access policies
- Monitored 24/7 with alerts on any sign-in

### Get Break-Glass Account Object IDs

```
GET https://graph.microsoft.com/v1.0/users
?$filter=userPrincipalName eq 'breakglass1@{tenant}.onmicrosoft.com'
&$select=id,userPrincipalName,displayName
```

Save object IDs for CA policy exclusions.

---

## Step 2: Disable Security Defaults (Before Custom CA)

```
PATCH https://graph.microsoft.com/v1.0/policies/identitySecurityDefaultsEnforcementPolicy
Authorization: Bearer {admin-token}

{
  "isEnabled": false
}
```

**Only do this if** you are immediately applying custom CA policies. Never disable Security
Defaults and leave no policies in place.

---

## Step 3: Conditional Access Policy Baseline

### CA001 — Require MFA for All Users

```json
POST https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies

{
  "displayName": "CA001 - Require MFA for All Users",
  "state": "enabledForReportingButNotEnforced",
  "conditions": {
    "users": {
      "includeUsers": ["All"],
      "excludeUsers": [
        "<break-glass-1-object-id>",
        "<break-glass-2-object-id>"
      ],
      "excludeGroups": ["<emergency-access-group-id>"]
    },
    "applications": {
      "includeApplications": ["All"]
    },
    "clientAppTypes": ["all"]
  },
  "grantControls": {
    "operator": "OR",
    "builtInControls": ["mfa"]
  }
}
```

### CA002 — Require MFA for Admins (Stricter)

```json
{
  "displayName": "CA002 - Require MFA for Privileged Admins",
  "state": "enabledForReportingButNotEnforced",
  "conditions": {
    "users": {
      "includeRoles": [
        "62e90394-69f5-4237-9190-012177145e10",
        "194ae4cb-b126-40b2-bd5b-6091b380977d",
        "f28a1f50-f6e7-4571-818b-6a12f2af6b6c",
        "fe930be7-5e62-47db-91af-98c3a49a38b1",
        "29232cdf-9323-42fd-ade2-1d097af3e4de",
        "b0f54661-2d74-4c50-afa3-1ec803f12efe"
      ],
      "excludeUsers": ["<break-glass-1-object-id>", "<break-glass-2-object-id>"]
    },
    "applications": { "includeApplications": ["All"] }
  },
  "grantControls": {
    "operator": "AND",
    "builtInControls": ["mfa", "compliantDevice"]
  }
}
```

### CA003 — Block Legacy Authentication

```json
{
  "displayName": "CA003 - Block Legacy Authentication",
  "state": "enabled",
  "conditions": {
    "users": {
      "includeUsers": ["All"],
      "excludeUsers": ["<break-glass-1-object-id>", "<break-glass-2-object-id>"]
    },
    "applications": { "includeApplications": ["All"] },
    "clientAppTypes": [
      "exchangeActiveSync",
      "other"
    ]
  },
  "grantControls": {
    "operator": "OR",
    "builtInControls": ["block"]
  }
}
```

### CA004 — Block Sign-ins from High-Risk Locations (Optional)

```json
{
  "displayName": "CA004 - Block High-Risk Countries",
  "state": "enabled",
  "conditions": {
    "users": {
      "includeUsers": ["All"],
      "excludeUsers": ["<break-glass-1-object-id>", "<break-glass-2-object-id>"]
    },
    "applications": { "includeApplications": ["All"] },
    "locations": {
      "includeLocations": ["<named-location-id-for-blocked-countries>"]
    }
  },
  "grantControls": {
    "operator": "OR",
    "builtInControls": ["block"]
  }
}
```

### Switch from Report-Only to Enforced

After monitoring for 1 week with no issues:

```
PATCH https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies/{policy-id}

{ "state": "enabled" }
```

---

## Step 4: PIM (Privileged Identity Management)

Requires Azure AD P2 license.

### Configure Role Setting (Require Justification + MFA for Activation)

```json
PATCH https://graph.microsoft.com/v1.0/policies/roleManagementPolicies/{policy-id}/rules/{rule-id}

{
  "@odata.type": "#microsoft.graph.unifiedRoleManagementPolicyEnablementRule",
  "id": "Enablement_EndUser_Assignment",
  "enabledRules": ["MultiFactorAuthentication", "Justification"],
  "target": {
    "caller": "EndUser",
    "operations": ["All"],
    "level": "Assignment",
    "inheritableSettings": [],
    "enforcedSettings": []
  }
}
```

### Assign Eligible Role (Not Active)

```json
POST https://graph.microsoft.com/v1.0/roleManagement/directory/roleEligibilityScheduleRequests

{
  "action": "adminAssign",
  "principalId": "<user-or-group-object-id>",
  "roleDefinitionId": "62e90394-69f5-4237-9190-012177145e10",
  "directoryScopeId": "/",
  "scheduleInfo": {
    "startDateTime": "2026-03-03T00:00:00Z",
    "expiration": {
      "type": "noExpiration"
    }
  },
  "justification": "MSP admin account — eligible for activation when needed"
}
```

---

## Step 5: Authentication Methods Policy

```json
PATCH https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy/authenticationMethodConfigurations/microsoftAuthenticator

{
  "state": "enabled",
  "featureSettings": {
    "displayAppInformationRequiredState": {
      "state": "enabled",
      "includeTarget": { "targetType": "group", "id": "all_users" }
    },
    "displayLocationInformationRequiredState": {
      "state": "enabled",
      "includeTarget": { "targetType": "group", "id": "all_users" }
    },
    "numberMatchingRequiredState": {
      "state": "enabled",
      "includeTarget": { "targetType": "group", "id": "all_users" }
    }
  }
}
```

---

## Step 6: Audit Logging and Alerts

### Enable Unified Audit Log

```
POST https://graph.microsoft.com/v1.0/security/auditLog/queries
```

Ensure `unified audit log ingestion` is enabled in the Microsoft Purview compliance portal
or via Exchange Online PowerShell:

```powershell
Set-AdminAuditLogConfig -UnifiedAuditLogIngestionEnabled $true
```

### Configure Entra Sign-in Risk Alerts

```json
PATCH https://graph.microsoft.com/v1.0/identityProtection/riskDetection

// Enable via Identity Protection (requires Azure AD P2):
// Portal: Entra ID → Security → Identity Protection → Alerts
```

---

## Configuration Checklist

```
Security Configuration Checklist — {Tenant}

[ ] Break-glass account 1 created and Global Admin assigned
[ ] Break-glass account 2 created and Global Admin assigned
[ ] Break-glass accounts excluded from ALL CA policies
[ ] Break-glass passwords stored in offline physical safe
[ ] Security Defaults disabled (if custom CA policies)
[ ] CA001 - Require MFA for all users (enforced)
[ ] CA002 - Require MFA for admins (enforced)
[ ] CA003 - Block legacy authentication (enforced)
[ ] PIM enabled for Global Admin, Security Admin, Exchange Admin
[ ] PIM role settings: MFA + justification required for activation
[ ] Authentication: Number matching enabled for Authenticator
[ ] Unified Audit Log enabled
[ ] Sign-in alerts configured
[ ] Admin role inventory documented
```
