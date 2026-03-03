# Capacity Management — SKU Definitions, REST API, Resize, Pause/Resume

This reference covers the Fabric capacity REST API, SKU specifications, capacity lifecycle operations, workspace assignment, and workload settings management.

---

## Capacity REST API

**Base URL**: `https://api.fabric.microsoft.com/v1`

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/capacities` | Capacity Viewer | — | Lists capacities accessible to caller |
| GET | `/capacities/{capacityId}` | Capacity Admin | — | Returns SKU, state, region, display name |
| PATCH | `/capacities/{capacityId}` | Capacity Admin | `sku`, `displayName` | Resize or rename |
| POST | `/capacities/{capacityId}/resume` | Capacity Admin | — | Resume a paused capacity |
| POST | `/capacities/{capacityId}/suspend` | Capacity Admin | — | Pause capacity (billing stops) |
| GET | `/capacities/{capacityId}/workspaces` | Capacity Admin | — | Lists assigned workspaces |
| POST | `/workspaces/{wId}/assignToCapacity` | Workspace Admin + Capacity Contributor | `capacityId` | Assign workspace |
| DELETE | `/workspaces/{wId}/unassignFromCapacity` | Workspace Admin | — | Move to Shared capacity |

```bash
TOKEN=$(az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken -o tsv)

# List accessible capacities
curl "https://api.fabric.microsoft.com/v1/capacities" \
  -H "Authorization: Bearer ${TOKEN}"

# Get capacity details
curl "https://api.fabric.microsoft.com/v1/capacities/${CAPACITY_ID}" \
  -H "Authorization: Bearer ${TOKEN}"

# Resize capacity from F32 to F64
curl -X PATCH "https://api.fabric.microsoft.com/v1/capacities/${CAPACITY_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"sku": {"name": "F64", "tier": "Fabric"}}'

# Pause capacity
curl -X POST "https://api.fabric.microsoft.com/v1/capacities/${CAPACITY_ID}/suspend" \
  -H "Authorization: Bearer ${TOKEN}"

# Resume capacity
curl -X POST "https://api.fabric.microsoft.com/v1/capacities/${CAPACITY_ID}/resume" \
  -H "Authorization: Bearer ${TOKEN}"

# List workspaces on capacity
curl "https://api.fabric.microsoft.com/v1/capacities/${CAPACITY_ID}/workspaces" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Capacity GET response**:
```json
{
  "id": "00000000-0000-0000-0000-000000000001",
  "displayName": "Analytics-Prod-F64",
  "sku": { "name": "F64", "tier": "Fabric" },
  "region": "East US",
  "state": "Active",
  "capacityUserAccessRight": "Admin"
}
```

**State values**: `Active`, `Paused` (suspended), `Scaling` (resize in progress), `Inactive` (provisioning)

---

## Admin API — Tenant-Wide Capacity Management

```bash
ADMIN_TOKEN=$(az account get-access-token \
  --resource "https://analysis.windows.net/powerbi/api" \
  --query accessToken -o tsv)

# List ALL capacities in tenant
curl "https://api.powerbi.com/v1.0/myorg/admin/capacities" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"

# Get detailed capacity info with workload settings
curl "https://api.powerbi.com/v1.0/myorg/admin/capacities?$expand=workloads" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"

# List workloads on a capacity
curl "https://api.powerbi.com/v1.0/myorg/admin/capacities/${CAPACITY_ID}/workloads" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"

# Update Dataflow workload — set max memory to 40%
curl -X PATCH \
  "https://api.powerbi.com/v1.0/myorg/admin/capacities/${CAPACITY_ID}/workloads/dataflow" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"state": "Enabled", "maxMemoryPercentageSetByUser": 40}'

# Update Semantic Models workload memory
curl -X PATCH \
  "https://api.powerbi.com/v1.0/myorg/admin/capacities/${CAPACITY_ID}/workloads/semanticModels" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"state": "Enabled", "maxMemoryPercentageSetByUser": 60}'
```

---

## SKU Specifications

| SKU | CUs | vCores (Spark) | Memory (GB, approx.) | Max Concurrent Spark Sessions | Recommended Scenarios |
|-----|-----|---------------|---------------------|------------------------------|----------------------|
| F2 | 2 | 0.25 | 3 | 1 | Development sandbox |
| F4 | 4 | 0.5 | 6 | 1–2 | Dev/test teams |
| F8 | 8 | 1 | 12 | 2–3 | Small production |
| F16 | 16 | 2 | 24 | 3–4 | Small-medium production |
| F32 | 32 | 4 | 48 | 5–6 | Medium production |
| F64 | 64 | 8 | 96 | 8–10 | Standard enterprise |
| F128 | 128 | 16 | 192 | 14–16 | Large enterprise |
| F256 | 256 | 32 | 384 | 24–32 | Very large enterprise |
| F512 | 512 | 64 | 768 | 48–64 | Hyperscale |
| F1024 | 1024 | 128 | 1536 | 96–128 | Hyperscale |
| F2048 | 2048 | 256 | 3072 | 192–256 | Maximum |

**Notes**:
- Concurrent Spark session limits are approximate; actual limits depend on session size and workload mix.
- F2 and F4 do not support all Fabric features (e.g., no Eventstream, no Real-Time Dashboards <30s refresh).
- F64+ recommended for Direct Lake semantic models with large datasets.

---

## Capacity State Machine

```
         ┌──────────────────────────────────┐
         │         Provisioning             │ (first creation)
         └─────────────┬────────────────────┘
                       │ Ready
                       ▼
         ┌──────────────────────────────────┐
    ┌───►│            Active                │◄───┐
    │    │  (billing on, workloads run)     │    │
    │    └─────────────┬────────────────────┘    │
    │                  │ suspend API              │ resume API
    │                  ▼                          │
    │    ┌──────────────────────────────────┐     │
    │    │           Paused                 │─────┘
    │    │  (billing stopped, ~5 min resume │
    │    │   time for F64+)                 │
    │    └──────────────────────────────────┘
    │
    └─── Scaling (resize in progress — non-disruptive)
```

**Resume latency by SKU**:
| SKU | Typical Resume Time |
|-----|---------------------|
| F2–F16 | 1–2 minutes |
| F32–F64 | 2–4 minutes |
| F128–F256 | 4–7 minutes |
| F512+ | 7–12 minutes |

---

## Workspace Assignment

### Assign and Unassign Workspaces

```bash
# Assign workspace to a capacity
curl -X POST "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/assignToCapacity" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"capacityId": "'${CAPACITY_ID}'"}'

# Move workspace to Shared capacity (free tier)
curl -X DELETE "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/unassignFromCapacity" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Bulk Workspace Migration (Python)

```python
import requests

def migrate_workspaces_to_capacity(
    workspace_ids: list,
    target_capacity_id: str,
    token: str
) -> dict:
    """Move multiple workspaces to a target capacity."""
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    results = {"success": [], "failed": []}

    for ws_id in workspace_ids:
        resp = requests.post(
            f"https://api.fabric.microsoft.com/v1/workspaces/{ws_id}/assignToCapacity",
            headers=headers,
            json={"capacityId": target_capacity_id}
        )
        if resp.status_code in (200, 204):
            results["success"].append(ws_id)
        else:
            results["failed"].append({"workspaceId": ws_id, "error": resp.text})

    print(f"Migrated {len(results['success'])}/{len(workspace_ids)} workspaces")
    return results
```

---

## Workload Settings

Workload settings control how much of the capacity's resources each workload type can consume.

| Workload | Default Max Memory | Configurable |
|----------|-------------------|-------------|
| Semantic Models | 20% | Yes (10–40%) |
| Dataflows | 20% | Yes (10–40%) |
| Paginated Reports | Not applicable | No |
| Spark (Notebooks, Pipelines) | Remaining capacity | No (controlled by Spark config) |

**Best practice**:
- Increase Semantic Models memory to 30–40% on reporting-heavy capacities.
- Reduce Dataflows memory to 15% if Dataflows are rarely used.
- Sum of configured workload memory percentages should not exceed 80% to leave headroom for Spark and system overhead.

---

## Error Codes and Remediation

| Error | Meaning | Fix |
|-------|---------|-----|
| `403 Forbidden` | Caller lacks Capacity Admin role | Assign role in Azure portal > Capacity resource |
| `Capacity is paused` | Operations fail because capacity is suspended | Resume capacity before running workloads |
| `SKU not available in region` | Requested SKU not yet available in the capacity's Azure region | Check Azure product availability page; choose adjacent region |
| `Cannot assign workspace: capacity in wrong state` | Capacity is scaling or paused | Wait for Active state |
| `Workspace already assigned to another capacity` | Workspace is on a different capacity | Unassign from current capacity first |
| `Scaling in progress` | Another resize is already in progress | Wait 5–15 minutes for scaling to complete |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Capacities per Azure subscription | No hard limit | |
| Workspaces per capacity | No hard limit | Performance recommendation: < 1000 |
| Resize frequency | No documented limit | Each resize takes 5–15 min; avoid rapid resizing |
| Concurrent workload setting updates | 1 per capacity | |
| Minimum billable unit | 1 hour | Pausing within the first hour still charges for 1 hour |
