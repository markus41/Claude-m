---
name: entra-app-register
description: Register a new application in Microsoft Entra ID with best-practice security defaults
argument-hint: "<app-name> --audience single-tenant|multi-tenant [--redirect-uri <uri>] [--api-permissions <permission-list>]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Register Entra ID Application

Create a new app registration with secure defaults.

## Instructions

1. Build the application body with `displayName` and `signInAudience` based on `--audience`.
2. Map audience: `single-tenant` → `AzureADMyOrg`, `multi-tenant` → `AzureADMultipleOrgs`.
3. Add `--redirect-uri` to `web.redirectUris` if provided.
4. Disable implicit grant by default.
5. If `--api-permissions` is provided, add to `requiredResourceAccess`.
6. Create via `POST /applications`.
7. Generate a client secret with 6-month expiry via `POST /applications/{id}/addPassword`.
8. Display: Application (client) ID, Object ID, secret value (warn to save immediately), and tenant ID.
9. Remind user to add `.env` to `.gitignore`.
