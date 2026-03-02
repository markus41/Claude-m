---
name: pages-site-create
description: Create a new Power Pages site with a home page and basic navigation
argument-hint: "<site-name>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - AskUserQuestion
---

# Create Power Pages Site

Guide the user through creating a new Power Pages site with the Dataverse Web API.

## Step 1: Gather Requirements

Ask the user for:
1. Site name (display name)
2. Site template (blank, customer self-service, partner portal, community)
3. Primary language (default: English - 1033)

## Step 2: Create Website Record

Create the website record in Dataverse:

```
POST https://{org}.api.crm.dynamics.com/api/data/v9.2/adx_websites
{
  "adx_name": "<site-name>",
  "adx_primarydomainname": "<site-name>.powerappsportals.com",
  "adx_defaultlanguage": 1033
}
```

## Step 3: Create Home Page

```
POST https://{org}.api.crm.dynamics.com/api/data/v9.2/adx_webpages
{
  "adx_name": "Home",
  "adx_partialurl": "/",
  "adx_isroot": true,
  "adx_websiteid@odata.bind": "/adx_websites(<website-id>)"
}
```

## Step 4: Create Basic Web Template

```
POST https://{org}.api.crm.dynamics.com/api/data/v9.2/adx_webtemplates
{
  "adx_name": "Default Layout",
  "adx_source": "{% include 'Header' %}{{ page.content }}{% include 'Footer' %}",
  "adx_websiteid@odata.bind": "/adx_websites(<website-id>)"
}
```

## Step 5: Output Summary

Display the created site details with the portal URL and created record IDs.
