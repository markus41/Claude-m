---
name: pa-mda-create
description: Scaffold a complete Power Apps model-driven app as a Dataverse solution
argument-hint: "<app-name> --tables <table1,table2,...> [--publisher-name <name>] [--publisher-prefix <prefix>] [--template crud|service-desk]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - AskUserQuestion
---

# Scaffold Model-Driven App

Scaffold a complete model-driven Power Apps solution with site map, forms, views, and optionally business rules and business process flows.

## Inputs

| Argument | Required | Default | Description |
|---|---|---|---|
| `<app-name>` | Yes | — | App name (PascalCase). Used as solution name and app module name. |
| `--tables` | Yes | — | Comma-separated list of Dataverse table logical names (e.g., `cr_ticket,cr_comment`) |
| `--publisher-name` | No | `Contoso` | Solution publisher name |
| `--publisher-prefix` | No | `cr` | Solution publisher prefix (2-8 lowercase characters) |
| `--template` | No | `crud` | Template: `crud` (standard forms/views) or `service-desk` (with BPF, business rules, SLA) |

## Instructions

### Step 1: Validate Inputs

1. If `<app-name>` or `--tables` is missing, ask the user.
2. Verify `--publisher-prefix` is 2-8 lowercase letters.
3. Ensure each table name uses the publisher prefix (e.g., `cr_tablename`). If not prefixed, prepend it.

### Step 2: Initialize Solution

Run:

```bash
pac solution init --publisher-name <publisher-name> --publisher-prefix <publisher-prefix> --outputDirectory <app-name>
```

This creates the base solution folder with `Solution.xml` and project files.

### Step 3: Generate Site Map

Create the site map XML at `<app-name>/SiteMap.xml`:

```xml
<SiteMap>
  <Area Id="MainArea" Title="<app-name>">
    <Group Id="DataGroup" Title="Data">
      <!-- One SubArea per table -->
      <SubArea Id="sub_<table>" Entity="<table>" Title="<display-name>" />
    </Group>
  </Area>
</SiteMap>
```

For `service-desk` template, add a second area for Knowledge Base:

```xml
<Area Id="KBArea" Title="Knowledge Base">
  <Group Id="KBGroup" Title="Articles">
    <SubArea Id="sub_kb" Entity="<prefix>_kb_article" Title="Articles" />
  </Group>
</Area>
```

### Step 4: Generate Forms per Table

For each table, create form XML files:

**Main Form** (`<app-name>/Forms/<table>_main.xml`):

- `General` tab with sections for all table columns.
- `Related` tab with sub-grids for related tables (if any lookup relationships exist between the `--tables`).
- Timeline control section (for tables with activity tracking).

**Quick Create Form** (`<app-name>/Forms/<table>_quickcreate.xml`):

- Required fields only (name/title, status, one or two key fields).
- Compact layout suitable for modal dialogs.

### Step 5: Generate Views per Table

For each table, create view XML files:

**Active Records View** (`<app-name>/Views/<table>_active.xml`):

```xml
<savedquery>
  <name>Active <DisplayName> Records</name>
  <fetchxml>
    <fetch>
      <entity name="<table>">
        <attribute name="<primary-name>" />
        <attribute name="createdon" />
        <attribute name="modifiedon" />
        <attribute name="statecode" />
        <filter>
          <condition attribute="statecode" operator="eq" value="0" />
        </filter>
        <order attribute="modifiedon" descending="true" />
      </entity>
    </fetch>
  </fetchxml>
  <layoutxml>
    <grid>
      <row>
        <cell name="<primary-name>" width="200" />
        <cell name="createdon" width="150" />
        <cell name="modifiedon" width="150" />
      </row>
    </grid>
  </layoutxml>
</savedquery>
```

**My Records View**: Same as Active but add filter `<condition attribute="ownerid" operator="eq-userid" />`.

**Recently Created View**: Active filter + `<order attribute="createdon" descending="true" />` with `<fetch top="50">`.

### Step 6: Generate Business Rules (service-desk template only)

For the primary table (first in `--tables`), create business rules:

1. **Auto-priority rule**: If Category = "Security Incident", set Priority to "High".
2. **Lock after resolution**: If Status = "Resolved" or "Closed", lock Title, Description, Category fields.

### Step 7: Generate Business Process Flow (service-desk template only)

Create a BPF definition for the primary table with stages:

1. **New** — Required: Title, Description, Category
2. **Triage** — Required: Priority, Assigned To
3. **In Progress** — Optional: Resolution Notes
4. **Resolved** — Required: Resolution Notes, Resolved Date

### Step 8: Generate App Module Metadata

Create the app module definition for registration:

```xml
<AppModule>
  <UniqueName><app-name></UniqueName>
  <Name><app-name></Name>
  <Description>Model-driven app for <table-list></Description>
  <SiteMapId>{sitemap-guid}</SiteMapId>
  <Entities>
    <Entity logicalname="<table>" />
  </Entities>
</AppModule>
```

### Step 9: Output Summary

Display:

1. File tree of the generated solution.
2. Tables included and forms/views generated per table.
3. Business rules and BPF (if service-desk template).
4. Next steps:
   - "Export: `pac solution export --path ./<app-name>.zip --name <app-name>`"
   - "Import: `pac solution import --path ./<app-name>.zip --environment <env-url>`"
   - "Or use `/pa-deploy solution --path ./<app-name>` for guided deployment."

## Reference Files

- Template patterns: `references/app-templates.md`
- Model-driven configuration: `references/model-driven-apps.md`
- Canvas app source format: `references/canvas-app-source.md`
