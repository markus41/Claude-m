---
name: lighthouse-setup
description: Set up the Lighthouse Health plugin — verify partner tenant access, GDAP relationships, and Lighthouse API connectivity
argument-hint: "[--minimal]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Lighthouse Health Plugin Setup

Guided setup for MSP/CSP Lighthouse health scanning.

## Step 1: Verify Partner Tenant

- Confirm the user has a Microsoft Partner Center account
- Verify the partner tenant has Lighthouse access enabled
- Check Azure AD app registration with Lighthouse permissions

## Step 2: Check GDAP Relationships

```
GET https://graph.microsoft.com/v1.0/tenantRelationships/delegatedAdminRelationships?$filter=status eq 'active'
```

List active GDAP relationships and confirm the partner has at least Security Reader + Global Reader roles.

## Step 3: Test Lighthouse API Access

```
GET https://graph.microsoft.com/beta/tenantRelationships/managedTenants/tenants
```

Verify at least one managed tenant is returned.

## Step 4: Output Summary

```markdown
# Lighthouse Setup Report

| Setting | Value |
|---|---|
| Partner tenant | [tenant name] |
| GDAP relationships | [count active] |
| Managed tenants | [count] |
| API connectivity | [OK / Failed] |
| Minimum roles | [OK / Missing: list] |
```
