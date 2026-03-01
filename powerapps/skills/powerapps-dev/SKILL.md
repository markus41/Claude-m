---
name: Power Apps Development
description: >
  Deep expertise in Microsoft Power Apps — canvas app Power Fx formulas, model-driven app
  configuration, custom connector development, component libraries, PCF code components,
  solution checker validation, and responsive layout design.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - power apps
  - powerapps
  - canvas app
  - model-driven
  - power fx
  - custom connector
  - component library
  - pcf control
  - gallery
  - form control
  - app formula
  - delegation
  - patch function
  - collect function
---

# Power Apps Development

## Power Apps Overview

Microsoft Power Apps is a low-code application development platform in the Power Platform family. It provides two primary app types:

**Canvas Apps** give full pixel-level control over the UI. Developers drag controls onto a canvas, bind them to data sources, and write Power Fx formulas for behavior and logic. Canvas apps run in a browser or mobile player.

**Model-Driven Apps** are built on top of Dataverse tables. The UI is auto-generated from the data model — forms, views, dashboards, and business process flows are configured rather than designed from scratch. Model-driven apps enforce consistent navigation, security roles, and business rules.

## Power Fx Language

Power Fx is the formula language used in canvas apps (and increasingly across Power Platform). It's inspired by Excel formulas, making it approachable for spreadsheet users.

### Core Functions

**Data operations**:
- `Patch(DataSource, Record, Changes)` — Create or update a record. The most important data write function.
- `Collect(Collection, Records)` — Add records to a collection (local in-memory table) or data source.
- `ClearCollect(Collection, Records)` — Clear a collection and add new records.
- `Remove(DataSource, Record)` — Delete a record.
- `UpdateIf(DataSource, Condition, Changes)` — Update records matching a condition.
- `RemoveIf(DataSource, Condition)` — Delete records matching a condition.
- `LookUp(DataSource, Condition, Column)` — Return the first matching record or column value.
- `Filter(DataSource, Condition)` — Return all matching records.
- `Search(DataSource, SearchText, Column1, Column2)` — Full-text search across columns.
- `Sort(Table, Column, Order)` — Sort a table by a column.
- `SortByColumns(Table, Column1, Order1, Column2, Order2)` — Multi-column sort.

**Text**:
- `Concatenate(str1, str2)` or `str1 & str2` — Join strings.
- `Text(Value, Format)` — Format numbers, dates, and times as text.
- `Value(Text)` — Parse text to a number.
- `Left`, `Right`, `Mid`, `Len`, `Find`, `Substitute`, `Upper`, `Lower`, `Trim`.

**Logic**:
- `If(Condition, TrueResult, FalseResult)` — Conditional branching.
- `Switch(Value, Match1, Result1, Match2, Result2, DefaultResult)` — Multi-way branching.
- `IsBlank(Value)`, `IsEmpty(Table)` — Null and empty checks.
- `Coalesce(Value1, Value2)` — Return first non-blank value.

**Navigation**:
- `Navigate(Screen, Transition, Context)` — Navigate to a screen with optional context variables.
- `Back()` — Return to the previous screen.
- `Set(Variable, Value)` — Set a global variable.
- `UpdateContext({Var1: Value1})` — Set context (screen-scoped) variables.

**User**:
- `User()` — Returns `.Email`, `.FullName`, `.Image` of the signed-in user.

### Delegation

Delegation is the most critical performance concept in canvas apps. When a formula can be delegated, the data source (e.g., Dataverse, SharePoint, SQL) processes the query server-side and returns only the results. When delegation is not supported, Power Apps downloads up to 500 (or 2,000 max) rows and processes locally.

**Delegable functions**: `Filter`, `Sort`, `SortByColumns`, `Search` (Dataverse only), `LookUp`, `FirstN`.

**Delegable operators** (varies by data source): `=`, `<>`, `<`, `>`, `<=`, `>=`, `&&`, `||`, `!`, `in`, `exactin`, `StartsWith`.

**Non-delegable** (always local): `CountRows`, `Sum`, `Average`, `GroupBy`, `AddColumns`, `DropColumns`, `ShowColumns`, `RenameColumns`, `Distinct`, `First`, `Last`, `ForAll` (as aggregate), `Concat`.

**Dataverse** has the broadest delegation support. **SharePoint** and **SQL Server** have partial support. **Excel** has no delegation.

### Collections and Variables

- **Global variables** (`Set`): Accessible from any screen. Used for app-wide state (selected record, user preferences).
- **Context variables** (`UpdateContext`): Screen-scoped. Reset when navigating away. Good for modal dialogs and temporary state.
- **Collections** (`Collect`, `ClearCollect`): In-memory tables. Used for offline caching, temporary data manipulation, and multi-step form workflows.

### Error Handling

- `IfError(Value, Fallback)` — Return fallback if the value is an error.
- `IsError(Value)` — Check if a value is an error.
- `Notify(Message, NotificationType)` — Display a toast notification. Types: `Success`, `Error`, `Warning`, `Information`.
- `Errors(DataSource)` — Return a table of errors from the last data operation.

## Model-Driven App Configuration

### Forms

Model-driven app forms are configured via Dataverse form designer or solution XML:

- **Main forms**: Full-page record forms with tabs, sections, and controls.
- **Quick create forms**: Compact forms for rapid data entry (modal).
- **Quick view forms**: Read-only embedded views of related records.
- **Card forms**: Compact representations for mobile views.

Key form elements: tabs, sections, columns, sub-grids (related records), business process flows, timeline (notes/activities), web resources.

### Views

Views are saved queries that display records in a grid:

- **Public views**: Available to all users.
- **Personal views**: Created by individual users.
- **System views**: Default views (Active Records, Inactive Records, etc.).
- **Quick find views**: Used by the search bar.

Defined by a FetchXML query and a layoutxml for column display.

### Business Rules

Declarative server-side or client-side logic on forms:

- Show/hide fields based on conditions.
- Set field values.
- Set required/optional fields.
- Show error messages.
- Lock/unlock fields.

Business rules run without code and are defined in the Dataverse solution.

### Business Process Flows

Guided multi-stage processes that walk users through a defined workflow. Each stage has steps (fields to complete). Stages can span multiple tables (e.g., Lead → Opportunity → Order).

### Site Map

Defines the navigation structure: areas → groups → sub-areas (links to tables, dashboards, web resources, or custom pages).

## Custom Connectors

Custom connectors wrap external REST APIs for use in Power Apps, Power Automate, and Copilot Studio.

**Definition** (OpenAPI 2.0 / Swagger):
```json
{
  "swagger": "2.0",
  "info": { "title": "My API", "version": "1.0" },
  "host": "api.example.com",
  "basePath": "/v1",
  "schemes": ["https"],
  "securityDefinitions": {
    "oauth2": {
      "type": "oauth2",
      "flow": "accessCode",
      "authorizationUrl": "https://login.example.com/authorize",
      "tokenUrl": "https://login.example.com/token",
      "scopes": { "read": "Read access" }
    }
  },
  "paths": {
    "/items": {
      "get": {
        "summary": "List items",
        "operationId": "ListItems",
        "produces": ["application/json"],
        "responses": {
          "200": {
            "description": "Success",
            "schema": {
              "type": "array",
              "items": { "$ref": "#/definitions/Item" }
            }
          }
        }
      }
    }
  }
}
```

**Auth types**: API Key, Basic, OAuth 2.0 (authorization code, client credentials), Azure AD.

**Policy templates**: Set Host URL, route request, set header, convert JSON to object.

## Component Libraries

Reusable canvas component libraries allow you to build controls once and share across multiple apps:

- **Canvas components**: Custom controls with input/output properties, built with the same Power Fx formulas.
- **Input properties**: Parameters passed into the component (e.g., `ItemColor`, `DataSource`).
- **Output properties**: Values emitted from the component (e.g., `SelectedItem`).
- **Behavior properties**: Actions triggered by events (e.g., `OnSelect`, `OnChange`).

Component libraries are stored as Dataverse solutions and can be published to the tenant.

## Responsive Design

Canvas apps support responsive layouts using container controls:

- **Horizontal container**: Lay out children side by side.
- **Vertical container**: Stack children vertically.
- **Flexible height/width**: Use `LayoutMinWidth` and `LayoutMinHeight` for responsive breakpoints.
- **Fill portions**: Allocate space proportionally among siblings.

## Solution Checker

The Power Apps Solution Checker runs static analysis to identify performance issues, security vulnerabilities, and design anti-patterns. Key rule categories:

- **Performance**: N+1 queries, unbounded loops, missing delegation warnings.
- **Security**: Hardcoded credentials, insecure HTTP connections.
- **Reliability**: Unhandled errors, missing required fields.
- **Maintainability**: Unused variables, overly complex formulas.
- **Web API**: Deprecated API usage, incorrect metadata.

Run via `pac solution check --path <solution.zip>` or via the Power Platform admin center.

## Best Practices

- **Delegation first**: Design data access patterns to be delegable. Use Dataverse as the primary data source for the best delegation support.
- **Minimize data calls**: Use `ClearCollect` on app start for reference data, then filter collections locally.
- **Concurrent loading**: Use `Concurrent()` in `App.OnStart` to load multiple data sources in parallel.
- **Component reuse**: Build component libraries for common UI patterns (headers, sidebars, data cards).
- **Naming conventions**: Use prefixes — `scr` for screens, `btn` for buttons, `gal` for galleries, `txt` for text inputs, `lbl` for labels, `ico` for icons.
- **Error handling**: Wrap data operations with `IfError` and show `Notify` messages to users.
- **App.Formulas**: Use `App.Formulas` (named formulas) instead of `App.OnStart` for declarative data loading — they're recalculated automatically and improve app startup time.

## Reference Files

| Reference | Path | Content |
|-----------|------|---------|
| Power Fx Functions | `references/power-fx-functions.md` | Complete function reference with delegation info |
| Model-Driven Config | `references/model-driven-config.md` | Forms, views, business rules, site map |
| Custom Connectors | `references/custom-connectors.md` | OpenAPI definition, auth, policies |
| Responsive Layout | `references/responsive-layout.md` | Container controls and responsive patterns |

## Example Files

| Example | Path | Content |
|---------|------|---------|
| CRUD Canvas App | `examples/crud-canvas-app.md` | Complete Dataverse CRUD with gallery, form, and error handling |
| Custom Connector | `examples/custom-connector.md` | REST API wrapper with OAuth 2.0 |
| Component Library | `examples/component-library.md` | Reusable header, sidebar, and data card components |
| Responsive App | `examples/responsive-app.md` | Mobile-first responsive layout with containers |
