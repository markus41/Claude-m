---
name: entra-permissions-audit
description: Audit OAuth2 permission grants and app role assignments across the tenant
argument-hint: "[--over-permissioned] [--admin-consented] [--app <app-name>]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Permission Grants Audit

Audit delegated and application permission grants across the Entra ID tenant.

## Instructions

1. List all OAuth2 permission grants: `GET /oauth2PermissionGrants`.
2. List all service principal app role assignments.
3. If `--over-permissioned` is set, flag grants with broad scopes like `Directory.ReadWrite.All`, `Mail.ReadWrite`, `Files.ReadWrite.All`.
4. If `--admin-consented` is set, filter to `consentType: "AllPrincipals"`.
5. If `--app` is set, filter to the specified application.
6. Display: App Name, Permission, Type (delegated/application), Consent Type, Granted By.
7. Highlight over-permissioned grants and recommend scope reduction.
