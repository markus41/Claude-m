---
name: pages-permissions
description: Configure table permissions and web roles for a Power Pages entity
argument-hint: "<entity-name> <scope>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - AskUserQuestion
---

# Configure Table Permissions

Set up table permissions and web roles for controlling data access in Power Pages.

## Step 1: Gather Requirements

Ask the user for:
1. Target Dataverse entity (logical name)
2. Scope: Global, Contact, Account, Self, or Parent
3. Privileges: Read, Write, Create, Delete, Append, AppendTo
4. Web role to assign the permission to

## Step 2: Create Table Permission

```
POST https://{org}.api.crm.dynamics.com/api/data/v9.2/adx_entitypermissions
{
  "adx_entityname": "<entity-logical-name>",
  "adx_entitylogicalname": "<entity-logical-name>",
  "adx_scope": 756150001,
  "adx_read": true,
  "adx_write": true,
  "adx_create": true,
  "adx_delete": false,
  "adx_append": true,
  "adx_appendto": true,
  "adx_websiteid@odata.bind": "/adx_websites(<website-id>)"
}
```

Scope values: 756150000 = Global, 756150001 = Contact, 756150002 = Account, 756150003 = Self, 756150004 = Parent.

## Step 3: Create or Get Web Role

Check if the web role exists, otherwise create it:

```
POST https://{org}.api.crm.dynamics.com/api/data/v9.2/adx_webroles
{
  "adx_name": "<role-name>",
  "adx_websiteid@odata.bind": "/adx_websites(<website-id>)"
}
```

## Step 4: Associate Permission with Web Role

Use the N:N relationship to associate the table permission with the web role:

```
POST https://{org}.api.crm.dynamics.com/api/data/v9.2/adx_entitypermissions(<permission-id>)/adx_entitypermission_webrole/$ref
{
  "@odata.id": "https://{org}.api.crm.dynamics.com/api/data/v9.2/adx_webroles(<role-id>)"
}
```

## Step 5: Output Summary

Display the table permission configuration, scope, privileges, and associated web role.
