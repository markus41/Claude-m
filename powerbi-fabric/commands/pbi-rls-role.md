---
name: pbi-rls-role
description: Generate Row-Level Security role definition — TMDL syntax and REST API payload, with static filter and dynamic USERPRINCIPALNAME() pattern
argument-hint: "<role-name> [--table <table>] [--filter '<dax-filter>'] [--dynamic]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# RLS Role Generator

Generate a complete Row-Level Security (RLS) role definition for a Power BI semantic model. Produces TMDL syntax ready for a PBIP project and a TMSL/REST API payload for programmatic deployment.

## Part 1: Understanding RLS in Power BI

Power BI RLS restricts data access at the row level based on the identity of the user viewing a report. There are two primary patterns:

**Static RLS**: A hardcoded DAX filter is applied to a table for every member of the role. Everyone in the "West Region" role sees only rows where `[Region] = "West"`. The filter does not change based on who is logged in — it is fixed for the role.

**Dynamic RLS**: The filter expression evaluates at query time using `USERPRINCIPALNAME()` (in the Power BI service) or `USERNAME()` (in Analysis Services / XMLA). The logged-in user's email is compared against a column in a security mapping table. One role definition covers all users — no need to create a separate role per person or region.

Use dynamic RLS whenever:
- User-to-data mappings change frequently
- The data scope is user-specific (each user sees their own records)
- You need a single maintainable role rather than one role per value

Use static RLS when:
- You have a small, stable set of data partitions (e.g., regions, departments)
- You want simpler auditing with explicit role membership

---

## Part 2: TMDL Syntax for RLS

TMDL (Tabular Model Definition Language) is the text-based format used in PBIP projects. RLS roles are defined in `<Dataset>/definition/roles.tmdl` (or inline in `database.tmdl`).

### Static Role (no --dynamic flag)

```
role '<role-name>'
    modelPermission: read

    tablePermission '<table-name>'
        filterExpression: [Region] = "West"
```

With a custom filter provided via `--filter`:

```
role '<role-name>'
    modelPermission: read

    tablePermission '<table-name>'
        filterExpression: <dax-filter>
```

### Dynamic Role (--dynamic flag)

The dynamic pattern requires a security mapping table (typically called `Users` or `SecurityMap`) with a column holding user principal names (UPNs).

```
role '<role-name>'
    modelPermission: read

    tablePermission 'Users'
        filterExpression: [UserPrincipalName] = USERPRINCIPALNAME()

    tablePermission 'Sales'
        filterExpression: RELATED(Users[UserPrincipalName]) = USERPRINCIPALNAME()
```

### Key TMDL RLS Details

- `modelPermission: read` is the minimum required. Other valid values: `readRefresh`, `admin`. Do not grant `admin` to RLS roles — it bypasses the security filters entirely.
- `tablePermission` blocks can target multiple tables in the same role. Each table that needs filtering requires its own block.
- Tables without a `tablePermission` block are **unfiltered** — all rows are visible to role members. Be deliberate about which tables need filters.
- For dynamic RLS with a security mapping table:
  - The `Users` (security) table needs a direct filter: `[UserPrincipalName] = USERPRINCIPALNAME()`
  - Related fact tables propagate the filter via `RELATED(Users[UserPrincipalName]) = USERPRINCIPALNAME()`
- **Bidirectional relationships**: If the relationship between the security table and fact table is single-direction (most common), `RELATED()` works when filtering from the one-side to the many-side. If you have a many-to-many relationship, use `CROSSFILTER` or `LOOKUPVALUE()` instead:

```
tablePermission 'Orders'
    filterExpression:
        LOOKUPVALUE(
            Users[UserPrincipalName],
            Users[UserPrincipalName], USERPRINCIPALNAME(),
            Users[Region], 'Orders'[Region]
        ) = USERPRINCIPALNAME()
```

---

## Part 3: REST API Payload

### Adding Members to an Existing Role

Use the Power BI REST API to assign users to a role after the role exists in the model:

```
POST https://api.powerbi.com/v1.0/myorg/datasets/{datasetId}/addRoleMembers
Authorization: Bearer <token>
Content-Type: application/json

{
  "members": [
    {"memberType": "User", "memberName": "user@domain.com"},
    {"memberType": "Group", "memberName": "group-object-id"}
  ],
  "roleName": "<role-name>"
}
```

Valid `memberType` values: `User`, `Group`, `App` (service principal).

### Creating the Role via XMLA / TMSL

Standard Power BI REST API cannot create RLS role definitions — that requires either:
1. PBIP project deployment (recommended for PBIP workflows)
2. XMLA endpoint using TMSL (Tabular Model Scripting Language)
3. Tabular Editor connected to XMLA

TMSL payload for XMLA endpoint (`POST` to workspace XMLA endpoint):

```json
{
  "createOrReplace": {
    "object": {
      "database": "<dataset-name>"
    },
    "database": {
      "roles": [
        {
          "name": "<role-name>",
          "modelPermission": "read",
          "tablePermissions": [
            {
              "name": "<table-name>",
              "filterExpression": "<DAX filter expression>"
            }
          ],
          "members": [
            {
              "memberName": "user@domain.com",
              "memberType": "User"
            }
          ]
        }
      ]
    }
  }
}
```

For dynamic RLS, provide multiple `tablePermissions` entries. For the `filterExpression` value, escape double quotes as needed for JSON string encoding.

XMLA endpoint URL format:
```
powerbi://api.powerbi.com/v1.0/myorg/<workspace-name>
```

---

## Part 4: Testing RLS

Before deploying, always verify the role filters data as expected.

**Power BI Desktop (during development)**
1. Go to Modeling tab → Manage Roles
2. Create / view the role definition
3. Click "View as Role" and select the role
4. Verify the visual data matches expectations
5. For dynamic RLS, test with a hardcoded email: temporarily replace `USERPRINCIPALNAME()` with `"testuser@domain.com"` during testing, then revert

**Power BI Service (after publishing)**
1. Open the dataset (semantic model) in the workspace
2. Click the `...` menu → Security
3. In the Row-Level Security pane, find the role and click "Test as role"
4. The report opens in a sandboxed view showing filtered data

**REST API verification**
1. Open the report in a browser
2. Open browser developer tools → Network tab
3. Filter for requests to `analysis.windows.net` or `api.powerbi.com`
4. Look at the DAX query payload — it should contain the filter context injected by the role

**PowerShell / CLI testing**
```powershell
# Get role members for a dataset
$datasetId = "<dataset-id>"
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "https://api.powerbi.com/v1.0/myorg/datasets/$datasetId/roles" -Headers $headers
```

---

## Part 5: Common Pitfalls

**Case sensitivity**: `USERPRINCIPALNAME()` returns the UPN in lowercase (e.g., `jane.doe@contoso.com`). If your security mapping table column stores mixed-case values, the comparison will fail. Use `LOWER([UserPrincipalName]) = USERPRINCIPALNAME()` or ensure the column is stored in lowercase.

**Guest users**: External/guest user UPNs in Azure AD use the format `user_domain.com#EXT#@yourtenant.onmicrosoft.com`. If your model needs to support guest users, store this format in the security table or use string manipulation:
```
SUBSTITUTE([UserPrincipalName], "@", "_") & "#EXT#@yourtenant.onmicrosoft.com"
```

**Service principal / app context**: When a report is embedded using a service principal, `USERPRINCIPALNAME()` returns the app's object ID or is empty. Use `USERNAME()` instead, or pass the effective identity via the Embed Token API (`EffectiveIdentity`).

**Workspace admins bypass RLS**: Members of the workspace with Admin, Member, or Contributor roles see all data regardless of RLS when viewing via the service. RLS only applies to users with Viewer access or when the dataset is consumed via an app.

**RLS and DirectQuery**: RLS filters are passed to the upstream data source. Ensure the data source supports row-level filtering at query time (most relational databases do).

---

## Error Handling

- If `--table` is not provided: prompt the user — "Which table should the filter be applied to? Provide the exact table name as it appears in the model."
- If `--dynamic` is specified but no Users/security table name is given: warn — "Dynamic RLS requires a security mapping table with a UserPrincipalName column. Which table holds the user-to-data mapping?"
- If `--filter` is provided with `--dynamic`: warn that these are mutually exclusive patterns and ask which the user intends.
- If the role name contains spaces: remind the user to wrap it in single quotes in TMDL (`role 'My Role Name'`).
