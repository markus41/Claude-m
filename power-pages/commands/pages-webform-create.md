---
name: pages-webform-create
description: Scaffold a multi-step web form for a Power Pages site
argument-hint: "<form-name> <target-entity>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - AskUserQuestion
---

# Create Web Form

Scaffold a multi-step web form for a Power Pages site.

## Step 1: Gather Requirements

Ask the user for:
1. Form name
2. Target Dataverse entity (logical name)
3. Number of steps
4. For each step: step name, form type (Insert/Edit/Read Only), and key fields

## Step 2: Create Web Form Record

```
POST https://{org}.api.crm.dynamics.com/api/data/v9.2/adx_webforms
{
  "adx_name": "<form-name>",
  "adx_websiteid@odata.bind": "/adx_websites(<website-id>)"
}
```

## Step 3: Create Web Form Steps

For each step:
```
POST https://{org}.api.crm.dynamics.com/api/data/v9.2/adx_webformsteps
{
  "adx_name": "Step 1 - Contact Information",
  "adx_type": 100000000,
  "adx_targetentitylogicalname": "<entity-name>",
  "adx_mode": 100000000,
  "adx_webformid@odata.bind": "/adx_webforms(<form-id>)",
  "adx_nextstep@odata.bind": "/adx_webformsteps(<next-step-id>)"
}
```

Mode values: 100000000 = Insert, 100000001 = Edit, 100000002 = Read Only.

## Step 4: Set Start Step

```
PATCH https://{org}.api.crm.dynamics.com/api/data/v9.2/adx_webforms(<form-id>)
{
  "adx_startstep@odata.bind": "/adx_webformsteps(<first-step-id>)"
}
```

## Step 5: Output Summary

Display the form name, all steps in order, target entity, and placement guidance.
