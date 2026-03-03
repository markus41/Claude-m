# Data Governance — Lineage, Purview Data Map, Scanner API, and OneLake Access Roles

This reference covers data lineage in Microsoft Fabric, integration with Microsoft Purview Data Map, the Power BI Scanner API for cross-workspace governance scans, and OneLake data access role management.

---

## Data Lineage in Fabric

### Lineage View

The Fabric lineage view shows how data flows through items in a workspace:

```
External Sources (Azure SQL, Event Hubs, Snowflake)
    │ (Dataflow Gen2, Pipelines, Eventstreams)
    ▼
Bronze Lakehouse (raw data)
    │ (Notebooks, Pipelines)
    ▼
Silver Lakehouse (cleaned data)
    │ (Notebooks)
    ▼
Gold Lakehouse (aggregated, business-ready)
    │
    ├──► Semantic Model (Power BI)
    │         │
    │         └──► Power BI Reports / Dashboards
    │
    └──► Fabric Warehouse (SQL queries)
```

**Access lineage view**:
1. Open the Fabric workspace.
2. Click the **Lineage** view icon in the toolbar (graph/network icon).
3. Items appear as nodes; data flows as directed edges.
4. Click any item to see its dependencies and downstream consumers.
5. Hover over edges to see the transformation type (Notebook, Pipeline, Dataflow).

### Lineage Metadata via REST API

```bash
# Get lineage for a specific item (Power BI REST API)
curl "https://api.powerbi.com/v1.0/myorg/admin/datasets/${DATASET_ID}/upstreamDataflows" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"

# Get items that depend on a specific dataset (downstream)
curl "https://api.powerbi.com/v1.0/myorg/admin/datasets/${DATASET_ID}/usageMetrics" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

---

## Power BI Scanner API

The Scanner API provides a full tenant-wide inventory of workspaces, items, schemas, expressions, and lineage. Essential for governance at scale.

### Scanner API Workflow

```
Step 1: POST /workspaces/modified   → Get list of workspaces changed since last scan
Step 2: POST /workspaces/getInfo    → Start scan for specific workspaces
Step 3: GET /workspaces/scanStatus/{scanId}  → Poll for completion
Step 4: GET /workspaces/scanResult/{scanId}  → Retrieve full scan results
```

### Full Tenant Scan

```python
import requests
import time
from typing import Optional

class FabricScannerAPI:
    """Power BI Scanner API client for governance scans."""

    def __init__(self, admin_token: str):
        self.token = admin_token
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        self.base = "https://api.powerbi.com/v1.0/myorg/admin"

    def start_workspace_scan(self, workspace_ids: list,
                              include_schemas: bool = True,
                              include_expressions: bool = True,
                              include_lineage: bool = True) -> str:
        """Start a scan for specified workspaces. Returns scan ID."""
        body = {
            "workspaces": workspace_ids,
            "datasetSchemas": include_schemas,
            "datasetExpressions": include_expressions,
            "lineage": include_lineage
        }
        resp = requests.post(
            f"{self.base}/workspaces/getInfo",
            headers=self.headers,
            json=body
        )
        resp.raise_for_status()
        scan_id = resp.json()["id"]
        print(f"Scan started: {scan_id}")
        return scan_id

    def wait_for_scan(self, scan_id: str, timeout_seconds: int = 300) -> dict:
        """Poll until scan completes."""
        start = time.time()
        while time.time() - start < timeout_seconds:
            time.sleep(10)
            status_resp = requests.get(
                f"{self.base}/workspaces/scanStatus/{scan_id}",
                headers=self.headers
            ).json()
            if status_resp["status"] == "Succeeded":
                return status_resp
            elif status_resp["status"] == "Failed":
                raise Exception(f"Scan failed: {status_resp}")
        raise TimeoutError(f"Scan {scan_id} did not complete within {timeout_seconds}s")

    def get_scan_results(self, scan_id: str) -> dict:
        """Retrieve full scan results."""
        resp = requests.get(
            f"{self.base}/workspaces/scanResult/{scan_id}",
            headers=self.headers
        )
        resp.raise_for_status()
        return resp.json()

    def get_modified_workspaces(self, modified_since: Optional[str] = None) -> list:
        """Get workspaces changed since a specific timestamp (ISO 8601)."""
        url = f"{self.base}/workspaces/modified"
        params = {}
        if modified_since:
            params["modifiedSince"] = modified_since
        resp = requests.get(url, headers=self.headers, params=params)
        return resp.json().get("workspaceIds", [])


# Full scan usage
scanner = FabricScannerAPI(admin_token=ADMIN_TOKEN)

# Get all workspace IDs (use get_modified_workspaces for incremental)
all_workspaces_resp = requests.get(
    "https://api.powerbi.com/v1.0/myorg/admin/groups?$top=1000",
    headers={"Authorization": f"Bearer {ADMIN_TOKEN}"}
)
workspace_ids = [ws["id"] for ws in all_workspaces_resp.json()["value"]]

# Scan in batches (max 100 per request)
batch_size = 100
all_results = []
for i in range(0, len(workspace_ids), batch_size):
    batch = workspace_ids[i:i + batch_size]
    scan_id = scanner.start_workspace_scan(batch)
    scanner.wait_for_scan(scan_id)
    results = scanner.get_scan_results(scan_id)
    all_results.extend(results.get("workspaces", []))

print(f"Scanned {len(all_results)} workspaces")
```

### Parse Scan Results for Governance Insights

```python
import pandas as pd

def extract_dataset_lineage(scan_results: list) -> pd.DataFrame:
    """Extract dataset-to-datasource lineage from scan results."""
    rows = []
    for ws in scan_results:
        for dataset in ws.get("datasets", []):
            for source in dataset.get("datasourceUsages", []):
                rows.append({
                    "WorkspaceName": ws.get("name"),
                    "DatasetName": dataset.get("name"),
                    "DatasetId": dataset.get("id"),
                    "SourceType": source.get("datasourceId"),
                    "ConnectionDetails": source.get("connectionDetails")
                })
    return pd.DataFrame(rows)

def find_datasets_without_sensitivity_label(scan_results: list) -> list:
    """Find all datasets that do not have a sensitivity label."""
    unlabeled = []
    for ws in scan_results:
        for dataset in ws.get("datasets", []):
            if not dataset.get("sensitivityLabel"):
                unlabeled.append({
                    "workspace": ws["name"],
                    "dataset": dataset["name"],
                    "id": dataset["id"]
                })
    return unlabeled

def find_datasets_with_external_datasources(scan_results: list) -> list:
    """Find datasets connecting to external (non-Fabric) data sources."""
    external = []
    internal_types = {"PowerBIDataset", "Lakehouse", "Warehouse"}

    for ws in scan_results:
        for dataset in ws.get("datasets", []):
            for source in dataset.get("datasourceUsages", []):
                conn = source.get("connectionDetails", {})
                if conn.get("type") not in internal_types:
                    external.append({
                        "workspace": ws["name"],
                        "dataset": dataset["name"],
                        "sourceType": conn.get("type"),
                        "server": conn.get("server"),
                        "database": conn.get("database")
                    })
    return external
```

---

## Microsoft Purview Data Map Integration

### Enable Purview Integration

```
1. Azure Portal > Microsoft Purview account > Settings > Fabric integration
2. OR: Power BI Admin portal > Tenant settings > Microsoft Purview hub
3. Click "Connect" and select the Purview account
4. Grant the Purview MSI "Fabric Contributor" role on the tenant (for scanning)
```

### What Gets Registered in Purview

After integration:
| Fabric Item Type | Appears in Purview Catalog | Lineage Tracked |
|-----------------|---------------------------|-----------------|
| Lakehouse | Yes (as data assets) | Yes |
| Warehouse | Yes (as data assets) | Yes |
| Semantic Model / Dataset | Yes | Yes (upstream sources) |
| Power BI Report | Yes | Yes (from dataset) |
| Pipeline | Yes | Yes (source to destination) |
| Notebook | Limited | Yes (if using lakehouse APIs) |

### Query Purview Catalog for Fabric Assets

```python
from azure.purview.catalog import PurviewCatalogClient
from azure.identity import DefaultAzureCredential

credential = DefaultAzureCredential()
client = PurviewCatalogClient(
    endpoint="https://<your-purview-account>.purview.azure.com",
    credential=credential
)

# Search for Fabric lakehouses
search_results = client.discovery.query(
    search_request={
        "keywords": "lakehouse",
        "filter": {
            "and": [
                {"entityType": "powerbi_dataset"},
                {"attributeName": "qualifiedName", "operator": "contains", "attributeValue": "fabric"}
            ]
        },
        "limit": 100
    }
)

for result in search_results.get("value", []):
    print(f"Asset: {result.get('name')} | Type: {result.get('entityType')} | Label: {result.get('sensitivityLabel')}")
```

---

## OneLake Data Access Roles

OneLake data access roles (preview) provide item-level, path-based access control within a Lakehouse — allowing different users to access different tables within the same Lakehouse.

### Role Structure

```json
{
  "name": "SalesRegionAccess",
  "decisionRules": [
    {
      "effect": "Permit",
      "permission": [
        {
          "attributeName": "Path",
          "attributeValueIncludedIn": [
            "Tables/FactSales",
            "Tables/DimProduct",
            "Tables/DimCustomer",
            "Files/reports/sales"
          ]
        }
      ]
    }
  ],
  "members": {
    "entraMembers": [
      {
        "objectId": "<group-object-id>",
        "tenantId": "<tenant-id>"
      }
    ]
  }
}
```

### OneLake Data Access Roles API

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/workspaces/{wId}/items/{lhId}/dataAccessRoles` | Workspace Admin | — | Lists all roles on a Lakehouse |
| POST | `/workspaces/{wId}/items/{lhId}/dataAccessRoles` | Workspace Admin | Role definition JSON | Creates a new access role |
| PATCH | `/workspaces/{wId}/items/{lhId}/dataAccessRoles/{roleId}` | Workspace Admin | Partial update | Update role definition |
| DELETE | `/workspaces/{wId}/items/{lhId}/dataAccessRoles/{roleId}` | Workspace Admin | — | Removes access role |

```bash
# Create an OneLake data access role
curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/items/${LAKEHOUSE_ID}/dataAccessRoles" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "FinanceTeamAccess",
    "decisionRules": [
      {
        "effect": "Permit",
        "permission": [
          {
            "attributeName": "Path",
            "attributeValueIncludedIn": [
              "Tables/FactBudget",
              "Tables/FactActuals",
              "Tables/DimCostCenter"
            ]
          }
        ]
      }
    ],
    "members": {
      "entraMembers": [
        { "objectId": "'${FINANCE_GROUP_ID}'", "tenantId": "'${TENANT_ID}'" }
      ]
    }
  }'

# List existing roles on a Lakehouse
curl "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/items/${LAKEHOUSE_ID}/dataAccessRoles" \
  -H "Authorization: Bearer ${TOKEN}"
```

### OneLake Access Roles vs Workspace RBAC

| Concern | Workspace RBAC | OneLake Data Access Roles |
|---------|---------------|--------------------------|
| Granularity | Whole workspace | Per-table or per-folder within a Lakehouse |
| Use case | Control who works in the workspace | Control which data in a shared Lakehouse each team sees |
| Interaction | Applied to all items | Applied only to OneLake paths |
| Enforcement | Fabric portal + API | OneLake ADLS Gen2 ACL enforcement |

---

## Error Codes and Remediation

| Error | Meaning | Fix |
|-------|---------|-----|
| `Scanner API 429: Too Many Requests` | Exceeded scan rate limit | Reduce batch frequency; use `modifiedSince` parameter for incremental scans |
| `Purview connection failed` | Purview MSI lacks permissions on Fabric tenant | Grant Fabric Reader/Contributor role to Purview MSI |
| `OneLake role not enforced` | Feature preview not enabled | Enable "OneLake data access roles" in Fabric admin tenant settings |
| `Lineage shows broken connections` | Item renamed or moved between workspaces | Reconnect in Fabric portal; lineage does not auto-heal on item moves |
| `Scan result missing datasets` | Datasets without XMLA permission are excluded | Ensure scanning service principal has XMLA access enabled in tenant settings |
| `403 on dataAccessRoles API` | Caller not Workspace Admin | Assign Admin role before managing OneLake roles |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Scanner API workspaces per batch | 100 | Split large tenants into batches |
| Scanner API requests per hour | 10 | For large tenants, use `modifiedSince` for incremental scans |
| Purview scan frequency | Daily (automatic) | Manual re-scan can be triggered in Purview portal |
| OneLake data access roles per Lakehouse | 100 | Preview limit |
| OneLake role paths per rule | No documented limit | Large path lists increase evaluation time |
| Lineage depth in Fabric lineage view | Unlimited | Visual performance may degrade for very deep chains |
