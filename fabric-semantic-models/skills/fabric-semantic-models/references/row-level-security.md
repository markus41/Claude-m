# Row-Level Security and Object-Level Security

This reference covers RLS and OLS design patterns, dynamic security with mapping tables, testing approaches, and the REST API for managing roles and testing security in Microsoft Fabric Semantic Models.

---

## RLS Architecture Overview

Row-level security filters the rows visible to a user at query time. The filter is a DAX expression on a table in the model. When a user queries the model, the DAX engine applies the role's filter expression to every query that touches that table (directly or via relationships).

**Execution flow**:
```
User query (report visual)
    │
    ▼
DAX engine applies RLS filter expression
    │
    ▼
Filter propagates through active relationships
    │
    ▼
Filtered result returned to user
```

**Key principle**: RLS filters propagate through the model's active relationships. A filter on `DimProduct[Category] = "Electronics"` also filters all fact tables that join to `DimProduct`.

---

## RLS — Static Roles

Static roles have hardcoded filter expressions. Use when:
- You have a small number of roles with fixed filter values.
- The set of roles does not change frequently.
- Roles align with organizational groups (e.g., by region, by department).

### Create a Role (Power BI Desktop)

1. Modeling > Manage roles > Create.
2. Name the role (e.g., `North America Sales`).
3. Select the table to filter.
4. Enter the DAX filter expression.
5. Save.

### Static Role Examples

```dax
// Filter by region (hardcoded)
[SalesRegion] = "North America"

// Filter by multiple values
[Country] IN {"US", "Canada", "Mexico"}

// Filter by product category
[Category] = "Electronics"

// Filter dimension table — related fact rows filtered automatically via relationship
// DimGeography filter expression:
[Region] = "EMEA"

// Multiple conditions
[Department] = "Finance" && [Confidential] = FALSE
```

---

## RLS — Dynamic Roles

Dynamic roles use `USERNAME()` or `USERPRINCIPALNAME()` (preferred in Fabric) to filter data based on the logged-in user's identity.

### USERPRINCIPALNAME() vs USERNAME()

| Function | Returns | Use In |
|----------|---------|--------|
| `USERPRINCIPALNAME()` | UPN (e.g., `jane@contoso.com`) | Fabric, Power BI service (always use this) |
| `USERNAME()` | `DOMAIN\user` in Analysis Services; UPN in Power BI | On-premises SSAS only |

**Always use `USERPRINCIPALNAME()` in Fabric semantic models.**

### Pattern 1: Direct UPN Column Match

Simple but requires UPN column in the dimension or fact table.

```dax
// DimSalesRep table has column [OwnerEmail]
[OwnerEmail] = USERPRINCIPALNAME()
```

### Pattern 2: Security Mapping Table

Centralized `UserAccess` table that maps users to data they can see.

```
UserAccess table:
  UserEmail (string) — user's UPN
  EntityType (string) — "Region", "Department", "Customer"
  EntityId (string) — the entity value the user can see
```

```dax
// DimGeography filter expression
[RegionCode] IN
    CALCULATETABLE(
        VALUES(UserAccess[EntityId]),
        UserAccess[UserEmail] = USERPRINCIPALNAME(),
        UserAccess[EntityType] = "Region"
    )

// If no matching row → user sees no data (empty table)
// This is the desired behavior for users not in UserAccess
```

### Pattern 3: Security Groups via Lookup Table

Map security groups to data access (integrate with Azure AD group membership):

```
UserGroupMapping table:
  UserEmail — synced from Azure AD
  GroupName — e.g., "EMEA-Sales", "Finance-Leads"

GroupDataAccess table:
  GroupName
  AllowedRegion
```

```dax
// DimGeography filter — resolved via group membership
[Region] IN
    CALCULATETABLE(
        VALUES(GroupDataAccess[AllowedRegion]),
        TREATAS(
            CALCULATETABLE(
                VALUES(UserGroupMapping[GroupName]),
                UserGroupMapping[UserEmail] = USERPRINCIPALNAME()
            ),
            GroupDataAccess[GroupName]
        )
    )
```

### Pattern 4: Hierarchical Security (Self + Reports)

Users can see their own data and their direct/indirect reports' data (manager hierarchy).

```dax
// EmployeeHierarchy table:
//   EmployeeEmail, ManagerEmail, IsManager
// ManagerHierarchyFlattened table (pre-computed):
//   ManagerEmail, DirectOrIndirectReportEmail

// FactSales filter expression:
[SalesRepEmail] IN
    CALCULATETABLE(
        VALUES(ManagerHierarchyFlattened[DirectOrIndirectReportEmail]),
        ManagerHierarchyFlattened[ManagerEmail] = USERPRINCIPALNAME()
    )
```

**Note**: Pre-compute the flattened hierarchy in a Lakehouse view or Power Query rather than in DAX for performance. Recursive DAX PATH functions on large employee tables are slow.

### Pattern 5: Row-Level with Time Constraint

Restrict access to data within a specific time range per user:

```dax
// UserDateAccess table: UserEmail, DataAccessStartDate
// FactSales filter:
[OrderDate] >= LOOKUPVALUE(
    UserDateAccess[DataAccessStartDate],
    UserDateAccess[UserEmail], USERPRINCIPALNAME(),
    DATE(2000, 1, 1)  -- default if user not found (returns all history)
)
```

---

## RLS with Calculation Groups

When using calculation groups alongside RLS, verify that:
1. The security filter applies to the base fact table, not the calculation group table.
2. Calculation group items that modify the filter context (`CALCULATE`, `REMOVEFILTERS`) do not inadvertently bypass RLS.

**Rule**: `REMOVEFILTERS` and `ALL` in DAX measures DO bypass RLS — they remove the RLS filter along with user-applied filters. Use `ALLEXCEPT` with care and only on columns, not entire tables, when RLS is active.

---

## Object-Level Security (OLS)

OLS hides tables or columns from specific roles. Users in an OLS-restricted role:
- Receive an error if they reference the hidden table/column in DAX directly.
- See blank or no values in visuals that reference the hidden object.
- Cannot see the object in field pickers in Power BI Desktop if connected live.

### Configure OLS (Tabular Editor)

```
1. Open Tabular Editor > Connect to model via XMLA.
2. Select a table or column.
3. Properties pane > Object-Level Security > Set per role:
   - "None" → role members cannot see this object
   - "Read" → role members can see this object
4. Save changes.
```

### OLS TMSL Example

```json
{
  "alter": {
    "object": {
      "database": "MySemanticModel",
      "role": "Sales Role"
    },
    "role": {
      "tablePermissions": [
        {
          "name": "EmployeeSalary",
          "filterExpression": "",
          "columnPermissions": [
            { "name": "BaseSalary", "metadataPermission": "none" },
            { "name": "BonusAmount", "metadataPermission": "none" }
          ]
        }
      ]
    }
  }
}
```

### Common OLS Patterns

| Scenario | Configuration |
|----------|--------------|
| Hide salary columns from all except HR | Set OLS `none` on all roles except `HR-Role` |
| Hide cost table from Sales role | Set table OLS `none` for `Sales` role |
| Hide internal/system tables | Set all columns OLS `none` for all roles |
| Executive dashboard shows additional columns | Create `Executive` role with OLS `read` on sensitive columns; other roles have OLS `none` |

---

## REST API — Role Management

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/groups/{wId}/datasets/{dId}/roles` | Dataset Write | — | Lists all roles |
| GET | `/groups/{wId}/datasets/{dId}/roles/{roleId}/members` | Dataset Write | — | Lists role members |
| POST | `/groups/{wId}/datasets/{dId}/roles` | Dataset Write | Role definition JSON | Creates a role |
| PUT | `/groups/{wId}/datasets/{dId}/roles/{roleId}` | Dataset Write | Role definition JSON | Updates role |
| DELETE | `/groups/{wId}/datasets/{dId}/roles/{roleId}` | Dataset Write | — | Deletes a role |
| POST | `/groups/{wId}/datasets/{dId}/roles/{roleId}/members` | Dataset Write | `identifier`, `principalType` | Adds member to role |
| DELETE | `/groups/{wId}/datasets/{dId}/roles/{roleId}/members/{memberId}` | Dataset Write | — | Removes member |

```bash
# List roles
curl "https://api.powerbi.com/v1.0/myorg/groups/${WORKSPACE_ID}/datasets/${DATASET_ID}/roles" \
  -H "Authorization: Bearer ${TOKEN}"

# Add a user to a role
curl -X POST \
  "https://api.powerbi.com/v1.0/myorg/groups/${WORKSPACE_ID}/datasets/${DATASET_ID}/roles/${ROLE_ID}/members" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "jane@contoso.com",
    "principalType": "User"
  }'

# Add a security group to a role
curl -X POST \
  "https://api.powerbi.com/v1.0/myorg/groups/${WORKSPACE_ID}/datasets/${DATASET_ID}/roles/${ROLE_ID}/members" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "00000000-0000-0000-0000-000000000001",
    "principalType": "Group"
  }'
```

### Test RLS via REST API (Generate Embed Token)

```bash
# Generate an embed token for a specific user + role (for testing)
curl -X POST \
  "https://api.powerbi.com/v1.0/myorg/groups/${WORKSPACE_ID}/datasets/${DATASET_ID}/GenerateToken" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "accessLevel": "View",
    "identities": [{
      "username": "testuser@contoso.com",
      "roles": ["North America Sales"],
      "datasets": ["'"${DATASET_ID}"'"]
    }]
  }'
```

---

## Testing RLS

### Power BI Desktop — View as Role

1. Open the model in Power BI Desktop.
2. Modeling > View as.
3. Select role(s) and optionally enter a UPN.
4. All report visuals update to reflect the filtered view.
5. Verify that sensitive data is hidden and allowed data is visible.

### DAX Studio — Test as User

```dax
// In DAX Studio, set "EffectiveUserName" in connection properties
// or use EVALUATE with explicit test context:

// Test what regions user sees (before connecting as user):
EVALUATE
CALCULATETABLE(
    VALUES(DimGeography[Region]),
    TREATAS({"jane@contoso.com"}, UserAccess[UserEmail]),
    UserAccess[EntityType] = "Region"
)
```

### Automated RLS Testing (Python)

```python
import requests

def test_rls_as_user(workspace_id: str, dataset_id: str, token: str,
                      test_upn: str, role_name: str, dax_query: str) -> dict:
    """Test RLS by generating an embed token for a test user and running a DAX query."""

    # Step 1: Generate token for test user + role
    gen_token_url = f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets/{dataset_id}/GenerateToken"
    token_body = {
        "accessLevel": "View",
        "identities": [{"username": test_upn, "roles": [role_name], "datasets": [dataset_id]}]
    }
    embed_resp = requests.post(gen_token_url,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json=token_body
    )
    embed_token = embed_resp.json()["token"]

    # Step 2: Run DAX query with embed token
    query_url = f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets/{dataset_id}/executeQueries"
    query_resp = requests.post(query_url,
        headers={"Authorization": f"EmbedToken {embed_token}", "Content-Type": "application/json"},
        json={"queries": [{"query": dax_query}]}
    )
    return query_resp.json()

# Example: Verify Jane only sees EMEA data
result = test_rls_as_user(
    workspace_id="...",
    dataset_id="...",
    token=admin_token,
    test_upn="jane@contoso.com",
    role_name="EMEA Sales",
    dax_query="EVALUATE SUMMARIZECOLUMNS(DimGeography[Region], \"Count\", [Order Count])"
)
print(result)
```

---

## Error Codes and Remediation

| Error | Meaning | Fix |
|-------|---------|-----|
| `RLS filter returns no rows` | DAX filter expression matches nothing for the test user | Verify `UserAccess` table has the correct UPN; check `USERPRINCIPALNAME()` format |
| `The user is not authenticated` | Embed token UPN does not match any known user | UPN must match a user in the tenant; service principal tokens ignore UPN |
| `Circular dependency in role filter` | RLS filter references a measure that references the same table | Use only columns in RLS filters; never reference measures |
| `OLS object is not accessible` | User's role has OLS "None" on the queried column | Expected behavior; update OLS configuration if access is required |
| `Cannot apply role: role not found` | Role name passed to GenerateToken does not exist in model | Verify role name matches exactly (case-sensitive) |
| `RLS bypassed by ALL()` | Measure uses ALL(table) which removes RLS | Replace `ALL(table)` with `ALL(table[column])` to preserve RLS |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Roles per model | 200 | |
| Members per role | Unlimited | Use security groups instead of individual users |
| Tables filtered per role | Unlimited | Filter as few tables as possible for performance |
| RLS filter DAX complexity | No hard limit | Complex filters increase query latency |
| OLS-restricted columns | Unlimited | |
| Nested security group depth | 5 levels | Azure AD group nesting limit |
| `GenerateToken` for RLS testing | Requires Power BI Embedded A-SKU or Premium P-SKU | Not available with Fabric trial |
