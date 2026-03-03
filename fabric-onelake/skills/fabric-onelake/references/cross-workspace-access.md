# Cross-Workspace Access

## Overview

OneLake enables data sharing across Fabric workspaces without duplicating data. The primary mechanism is OneLake shortcuts combined with workspace identity. This reference covers cross-workspace shortcut patterns, workspace identity setup, data sharing without copy, lineage across workspaces, and access control for shared data.

---

## Cross-Workspace Shortcut Architecture

```
Source Workspace (publisher)          Consumer Workspace (subscriber)
├── gold-lakehouse                     ├── analytics-lakehouse
│   └── Tables/                        │   └── Tables/
│       ├── dim_customers (source)      │       └── shared_dim_customers ← shortcut
│       ├── fact_sales (source)         │           (points to gold-lakehouse.Tables/dim_customers)
│       └── dim_products (source)       │
└── [workspace identity enabled]       └── [workspace identity granted access]
```

**Key prerequisites**:
1. Source workspace must have **workspace identity** enabled.
2. Consumer workspace identity must have at least **Read + ReadAll** on the source lakehouse item.
3. Shortcut is created in the consumer workspace pointing to the source item.

---

## Workspace Identity

A workspace identity is a system-assigned managed identity for each Fabric workspace. It enables cross-workspace authentication without user credentials.

### Enable Workspace Identity

**Via Portal**:
1. Open the Fabric workspace.
2. Go to **Workspace settings** > **OneLake** > **Workspace identity**.
3. Click **Enable** and confirm.

**Via API**:
```bash
TOKEN=$(az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken -o tsv)

curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/identity" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Workspace Identity Details

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/identity"
```

Response includes `applicationId` (the SPN object ID) and `tenantId`. Use these to grant permissions.

---

## Grant Access to Source Item

After enabling workspace identity on the **source** workspace, grant the **consumer** workspace identity access to the source lakehouse.

### Via Fabric Portal (Share Item)

1. Navigate to the source lakehouse in the Fabric portal.
2. Click **Share** (or the `...` menu > Share).
3. In the recipient field, enter the consumer workspace name (it resolves to the workspace identity).
4. Grant: **Read** + **ReadAll** (minimum for read-only shortcut).
5. Optionally: **Write** if the consumer needs to write through the shortcut.

### Via REST API (Role Assignment)

```bash
# Grant consumer workspace identity access to source lakehouse
curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/<source-workspace-id>/items/<source-lakehouse-id>/permissions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "principal": {
      "id":   "<consumer-workspace-identity-object-id>",
      "type": "ServicePrincipal"
    },
    "roles": ["ReadAll"]
  }'
```

---

## Create Cross-Workspace Shortcut

```bash
# Create shortcut in consumer workspace pointing to source lakehouse table
curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/<consumer-workspace-id>/items/<consumer-lakehouse-id>/shortcuts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "shared_dim_customers",
    "path": "Tables",
    "target": {
      "oneLake": {
        "workspaceId": "<source-workspace-id>",
        "itemId":      "<source-lakehouse-id>",
        "path":        "Tables/dim_customers"
      }
    }
  }'
```

### Python Helper — Create Multiple Shortcuts

```python
import requests

def create_cross_workspace_shortcuts(token, consumer_workspace_id, consumer_lakehouse_id,
                                      source_workspace_id, source_lakehouse_id, table_names):
    """Create OneLake shortcuts for a list of tables from source to consumer workspace."""
    url     = (f"https://api.fabric.microsoft.com/v1/workspaces/{consumer_workspace_id}"
               f"/items/{consumer_lakehouse_id}/shortcuts")
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    results = []

    for table_name in table_names:
        payload = {
            "name": f"shared_{table_name}",
            "path": "Tables",
            "target": {
                "oneLake": {
                    "workspaceId": source_workspace_id,
                    "itemId":      source_lakehouse_id,
                    "path":        f"Tables/{table_name}"
                }
            }
        }
        resp = requests.post(url, json=payload, headers=headers)
        if resp.status_code == 201:
            print(f"Created shortcut for {table_name}")
            results.append({"table": table_name, "status": "created"})
        elif resp.status_code == 409:
            print(f"Shortcut already exists for {table_name}")
            results.append({"table": table_name, "status": "exists"})
        else:
            print(f"FAILED for {table_name}: {resp.status_code} — {resp.text[:200]}")
            results.append({"table": table_name, "status": "failed", "error": resp.text[:200]})

    return results

results = create_cross_workspace_shortcuts(
    token                = TOKEN,
    consumer_workspace_id = CONSUMER_WS_ID,
    consumer_lakehouse_id = CONSUMER_LH_ID,
    source_workspace_id   = SOURCE_WS_ID,
    source_lakehouse_id   = SOURCE_LH_ID,
    table_names           = ["dim_customers", "dim_products", "dim_date", "fact_sales"]
)
```

---

## Access Shortcuts from Consumer Workspace

### PySpark in Consumer Notebook

```python
# Option 1: Three-part naming (shortcut appears as local table in attached lakehouse)
df = spark.sql("""
    SELECT c.CustomerID, c.Segment, SUM(f.TotalAmount) AS Revenue
    FROM shared_dim_customers c
    JOIN analytics_lakehouse.fact_sales_local f ON c.CustomerKey = f.CustomerKey
    GROUP BY c.CustomerID, c.Segment
""")

# Option 2: Explicit ABFSS path (using workspace/item GUIDs for stability)
df = spark.read.format("delta").load(
    "abfss://<consumer-workspace-guid>@onelake.dfs.fabric.microsoft.com"
    "/<consumer-lakehouse-guid>/Tables/shared_dim_customers"
)

# Option 3: Cross-workspace direct path (no shortcut required if identity has access)
df = spark.read.format("delta").load(
    "abfss://<source-workspace-guid>@onelake.dfs.fabric.microsoft.com"
    "/<source-lakehouse-guid>/Tables/dim_customers"
)
```

### SQL Endpoint Query (Warehouse or Lakehouse SQL)

```sql
-- Query shortcut table via SQL endpoint (three-part name)
SELECT
    c.CustomerName,
    c.Segment,
    SUM(f.TotalAmount) AS Revenue
FROM ConsumerLakehouse.dbo.shared_dim_customers c
JOIN ConsumerWarehouse.fact.Sales f ON c.CustomerKey = f.CustomerKey
GROUP BY c.CustomerName, c.Segment;
```

---

## Data Sharing Without Copy — Best Practices

### One-Copy Principle

```
Central Data Domain (gold-workspace)
├── Publishes dim_customers, dim_products
└── Grants Read+ReadAll to domain workspace identities

Domain A Workspace (sales-workspace)
├── shortcuts → shared_dim_customers → central gold-workspace
├── shortcuts → shared_dim_products  → central gold-workspace
└── Owns: fact_sales (local Delta table)

Domain B Workspace (marketing-workspace)
├── shortcuts → shared_dim_customers → central gold-workspace
└── Owns: campaign_events (local Delta table)
```

No data is duplicated. Every consumer reads the same source-of-truth data from the central workspace.

### When to Materialize vs Use Shortcut

| Scenario | Use Shortcut | Materialize (Copy) |
|----------|-------------|-------------------|
| Dimension tables (< 10 GB) | Yes — real-time, no duplication | Only if shortcut latency is unacceptable |
| Large fact tables (> 1 TB) | Yes for cross-workspace sharing | If complex transformations needed locally |
| External data (ADLS, S3) | Yes — shortcut is read-only | If you need to write back or apply security |
| Data from different tenant | B2B shortcut | Full copy if B2B is not feasible |
| High-frequency random reads | Evaluate latency | Materialize if shortcut adds too much overhead |

---

## Lineage Across Workspaces

### View Lineage in Portal

1. Navigate to a lakehouse or warehouse item.
2. Click the **...** menu > **View lineage**.
3. Lineage shows upstream shortcuts (pointing to source workspaces) and downstream consumers.
4. Click on a shortcut node to see the source workspace and item.

### Lineage API

```bash
# Get lineage for an item (upstream and downstream)
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<item-id>/lineage" \
  | python -m json.tool
```

### Track Shortcut Dependencies

```python
def get_all_shortcuts_for_workspace(token, workspace_id):
    """Get all shortcuts across all lakehouses in a workspace."""
    import requests

    headers = {"Authorization": f"Bearer {token}"}
    items_url = f"https://api.fabric.microsoft.com/v1/workspaces/{workspace_id}/items?type=Lakehouse"
    items = requests.get(items_url, headers=headers).json().get("value", [])

    all_shortcuts = []
    for item in items:
        sc_url = f"https://api.fabric.microsoft.com/v1/workspaces/{workspace_id}/items/{item['id']}/shortcuts"
        scs    = requests.get(sc_url, headers=headers).json().get("value", [])
        for sc in scs:
            sc["lakehouseName"] = item["displayName"]
            sc["lakhouseId"]    = item["id"]
        all_shortcuts.extend(scs)

    return all_shortcuts

shortcuts = get_all_shortcuts_for_workspace(TOKEN, WORKSPACE_ID)
for sc in shortcuts:
    target = sc.get("target", {})
    source = "OneLake" if "oneLake" in target else list(target.keys())[0]
    print(f"{sc['lakehouseName']}/{sc['path']}/{sc['name']} ← {source}")
```

---

## Access Control for Shared Data

### Layer 1: Item-Level Sharing

Control who can read the entire source lakehouse:

```bash
# List current permissions on a lakehouse item
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<lakehouse-id>/permissions"

# Add a permission
curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<lakehouse-id>/permissions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "principal": { "id": "<consumer-workspace-identity-id>", "type": "ServicePrincipal" },
    "roles": ["Read", "ReadAll"]
  }'
```

### Layer 2: OneLake Data Access Roles (Folder-Level)

Restrict which tables/folders a consumer can see within the lakehouse:

```bash
curl -X PUT \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<lakehouse-id>/dataAccessRoles/DomainAAccess" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "members": [
      { "principalId": "<domain-a-workspace-identity>", "principalType": "ServicePrincipal" }
    ],
    "decisionRules": [
      {
        "effect": "Permit",
        "permission": [{
          "attributeName": "Path",
          "attributeValueIncludedIn": ["Tables/dim_customers/*", "Tables/dim_products/*"]
        }]
      }
    ]
  }'
```

Domain A can only read `dim_customers` and `dim_products`, not `fact_sales` or other sensitive tables.

### Layer 3: SQL Endpoint Row/Column Security

For consumers using the SQL endpoint, apply RLS or column masking:

```sql
-- RLS in the source lakehouse SQL endpoint restricts consumer access by region
CREATE SECURITY POLICY rls.RegionFilter
ADD FILTER PREDICATE rls.fn_RegionCheck(region) ON dbo.fact_sales
WITH (STATE = ON, SCHEMABINDING = OFF);
```

---

## Error Codes Table

| Error | Meaning | Remediation |
|-------|---------|-------------|
| `Shortcut creation: 403 Forbidden` | Consumer workspace identity not granted access to source | Grant Read+ReadAll on source lakehouse to consumer workspace identity |
| `Workspace identity not found` | Workspace identity not enabled | Enable via Workspace Settings > OneLake > Workspace identity |
| `Cross-workspace shortcut: 404 on source` | Source workspace/item GUID wrong | Verify GUIDs via the Fabric REST API |
| `DFS: 403 on shortcut path` | Data access role restricts the path | Check OneLake data access roles on the source item |
| `Shortcut data stale` | Source data changed but shortcut read old cache | Shortcut reads live data; if stale, check Dataverse shortcut sync lag |
| `Lineage API: empty` | No lineage generated | Run at least one pipeline or notebook using the item; lineage populates lazily |
| `Circular shortcut dependency` | Shortcut pointing to another shortcut | Fabric does not support shortcut chaining; point directly to source |

---

## Throttling / Limits Table

| Resource | Limit | Notes |
|----------|-------|-------|
| Workspace identities per workspace | 1 | One system identity per workspace |
| Shortcuts per lakehouse | No documented hard limit | Large numbers add metadata overhead |
| Cross-workspace read latency | Near-zero (OneLake is distributed) | External shortcut (ADLS/S3) adds network latency |
| Workspace identity provisioning | Near-instant | May take 30–60 seconds to become active |
| Data access role members per role | No documented limit | Use Entra groups for scalable access management |
| Shortcut to deleted source | Fails silently | Test shortcut health after source changes |
