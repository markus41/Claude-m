---
name: pages-template-apply
description: Create or update a web template with Liquid content
argument-hint: "<template-name>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - AskUserQuestion
---

# Apply Web Template

Create or update a Power Pages web template with Liquid content.

## Step 1: Gather Requirements

Ask the user for:
1. Template name
2. Template purpose (layout, partial, header, footer, custom entity list)
3. Whether this is a new template or update to existing

## Step 2: Check for Existing Template

Query Dataverse for existing web templates with the same name:

```
GET https://{org}.api.crm.dynamics.com/api/data/v9.2/adx_webtemplates?$filter=adx_name eq '<template-name>'
```

## Step 3: Generate Liquid Template

Based on the purpose, generate a Liquid template. Include:
- Proper `{% extends %}` or `{% include %}` tags for layout inheritance
- FetchXML queries for data-driven content
- Null checks for dynamic content
- Responsive HTML with CSS classes

## Step 4: Create or Update Template

For new templates:
```
POST https://{org}.api.crm.dynamics.com/api/data/v9.2/adx_webtemplates
{
  "adx_name": "<template-name>",
  "adx_source": "<liquid-content>",
  "adx_websiteid@odata.bind": "/adx_websites(<website-id>)"
}
```

For existing templates:
```
PATCH https://{org}.api.crm.dynamics.com/api/data/v9.2/adx_webtemplates(<template-id>)
{
  "adx_source": "<liquid-content>"
}
```

## Step 5: Output Summary

Display the template name, ID, and a preview of the Liquid content.
