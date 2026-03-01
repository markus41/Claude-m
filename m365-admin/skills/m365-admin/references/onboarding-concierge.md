# Onboarding Concierge — Graph API Patterns

API patterns for the guided new employee onboarding wizard.

## Create User

```
POST https://graph.microsoft.com/v1.0/users
{
  "accountEnabled": true,
  "displayName": "Jane Smith",
  "mailNickname": "jane.smith",
  "userPrincipalName": "jane.smith@contoso.com",
  "usageLocation": "US",
  "department": "Marketing",
  "jobTitle": "Marketing Coordinator",
  "passwordProfile": {
    "forceChangePasswordNextSignIn": true,
    "password": "<generated-secure-password>"
  }
}
```

## Assign License

```
POST https://graph.microsoft.com/v1.0/users/{userId}/assignLicense
{
  "addLicenses": [
    { "skuId": "05e9a617-0261-4cee-bb36-b42852bf6285" }
  ],
  "removeLicenses": []
}
```

### Common SKU Friendly Names

| Friendly Name | SKU Part Number |
|---|---|
| Microsoft 365 Business Basic | O365_BUSINESS_ESSENTIALS |
| Microsoft 365 Business Standard | O365_BUSINESS_PREMIUM |
| Microsoft 365 Business Premium | SPB |
| Microsoft 365 E1 | STANDARDPACK |
| Microsoft 365 E3 | ENTERPRISEPACK |
| Microsoft 365 E5 | ENTERPRISEPREMIUM |
| Microsoft 365 F1 | M365_F1 |

Get tenant SKUs: `GET /subscribedSkus`

## Add to Group

```
POST https://graph.microsoft.com/v1.0/groups/{groupId}/members/$ref
{
  "@odata.id": "https://graph.microsoft.com/v1.0/directoryObjects/{userId}"
}
```

## Provision OneDrive

Trigger provisioning by accessing the user's drive (creates on first access):
```
GET https://graph.microsoft.com/v1.0/users/{userId}/drive
```

If 404: retry after 30 seconds (provisioning in progress).

### Copy Template Folder

```
POST https://graph.microsoft.com/v1.0/drives/{sourceDriveId}/items/{folderId}/copy
{
  "parentReference": {
    "driveId": "{targetDriveId}",
    "id": "root"
  },
  "name": "Onboarding Materials"
}
```

## Send Welcome Email

```
POST https://graph.microsoft.com/v1.0/users/{senderId}/sendMail
{
  "message": {
    "subject": "Welcome to the team!",
    "body": {
      "contentType": "HTML",
      "content": "<h2>Welcome!</h2><p>Your account has been set up. Sign in at <a href='https://portal.office.com'>portal.office.com</a>.</p>"
    },
    "toRecipients": [
      { "emailAddress": { "address": "manager@contoso.com" } }
    ]
  },
  "saveToSentItems": true
}
```

## Create Welcome Chat (Teams)

```
POST https://graph.microsoft.com/v1.0/chats
{
  "chatType": "oneOnOne",
  "members": [
    {
      "@odata.type": "#microsoft.graph.aadUserConversationMember",
      "roles": ["owner"],
      "user@odata.bind": "https://graph.microsoft.com/v1.0/users('{managerId}')"
    },
    {
      "@odata.type": "#microsoft.graph.aadUserConversationMember",
      "roles": ["owner"],
      "user@odata.bind": "https://graph.microsoft.com/v1.0/users('{newUserId}')"
    }
  ]
}
```

## Lighthouse Multi-Tenant Patterns

### List Managed Tenants
```
GET https://graph.microsoft.com/beta/tenantRelationships/managedTenants/tenants
```

### Execute as Delegated Admin (GDAP)
All Graph calls above work with GDAP by adding the tenant context:
```
GET https://graph.microsoft.com/v1.0/users
Header: MS-CV: {correlationId}
```

Authenticate with the partner tenant's credentials and use GDAP relationship to access the customer tenant. The signed-in partner admin must have the appropriate GDAP role assignment (e.g., User Administrator, License Administrator).

### Required GDAP Roles for Onboarding
| Operation | Minimum GDAP Role |
|---|---|
| Create user | User Administrator |
| Assign license | License Administrator |
| Add to group | Groups Administrator |
| Send email | Requires delegated mailbox or application permission |
