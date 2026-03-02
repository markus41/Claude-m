---
name: swa-auth-configure
description: Configure authentication providers for a Static Web App
argument-hint: "<provider>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - AskUserQuestion
---

# Configure Authentication

Set up authentication providers for the Static Web App.

## Step 1: Select Provider

Ask the user which provider to configure:
1. Azure AD (Microsoft Entra ID)
2. GitHub
3. Google
4. Twitter
5. Apple
6. Custom OIDC

## Step 2: Configure Provider

For built-in providers (GitHub, Twitter, Google, Apple), no additional configuration is needed — they work out of the box.

For Azure AD or custom OIDC, update staticwebapp.config.json:

```json
{
  "auth": {
    "identityProviders": {
      "azureActiveDirectory": {
        "registration": {
          "openIdIssuer": "https://login.microsoftonline.com/<tenant-id>/v2.0",
          "clientIdSettingName": "AAD_CLIENT_ID",
          "clientSecretSettingName": "AAD_CLIENT_SECRET"
        }
      }
    }
  }
}
```

## Step 3: Add Route Protection

Add authenticated routes to staticwebapp.config.json:

```json
{
  "routes": [
    {
      "route": "/dashboard/*",
      "allowedRoles": ["authenticated"]
    }
  ]
}
```

## Step 4: Output Summary

Display configured providers, protected routes, and login/logout URLs.
