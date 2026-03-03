# Git Integration — REST API, Sync Operations, Conflict Resolution

This reference covers the Fabric Git integration REST API, workspace connection management, sync operations, supported artifact types, and conflict resolution patterns.

---

## Git Integration REST API

**Base URL**: `https://api.fabric.microsoft.com/v1`

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| POST | `/workspaces/{wId}/git/connect` | Workspace Admin | `gitProviderDetails` | Connect workspace to Git |
| DELETE | `/workspaces/{wId}/git/disconnect` | Workspace Admin | — | Disconnect from Git |
| GET | `/workspaces/{wId}/git/connection` | Workspace Viewer | — | Returns current Git connection details |
| GET | `/workspaces/{wId}/git/status` | Workspace Viewer | — | Sync status; list of changed items |
| POST | `/workspaces/{wId}/git/commitToGit` | Workspace Contributor | `mode`, `items`, `comment` | Commit workspace changes to Git |
| POST | `/workspaces/{wId}/git/updateFromGit` | Workspace Contributor | `remoteCommitHash`, options | Pull Git changes to workspace |
| POST | `/workspaces/{wId}/git/initializeConnection` | Workspace Admin | `initializationStrategy` | Initial sync when connecting an existing workspace |

```bash
TOKEN=$(az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken -o tsv)
WORKSPACE_ID="your-workspace-id"

# Connect to Azure DevOps
curl -X POST "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/git/connect" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "gitProviderDetails": {
      "gitProviderType": "AzureDevOps",
      "organizationName": "contoso",
      "projectName": "DataPlatform",
      "repositoryName": "fabric-analytics",
      "branchName": "dev",
      "directoryName": "/workspaces/analytics-dev"
    }
  }'

# Connect to GitHub
curl -X POST "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/git/connect" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "gitProviderDetails": {
      "gitProviderType": "GitHub",
      "ownerName": "contoso-org",
      "repositoryName": "fabric-analytics",
      "branchName": "dev",
      "directoryName": "/workspaces/analytics-dev"
    }
  }'

# Get current sync status
curl "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/git/status" \
  -H "Authorization: Bearer ${TOKEN}"

# Disconnect workspace from Git
curl -X DELETE "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/git/disconnect" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## Git Status Response Schema

```json
{
  "workspaceHead": "abc123def456",
  "remoteCommitHash": "abc123def456",
  "changes": [
    {
      "itemMetadata": {
        "itemIdentifier": {
          "objectId": "item-guid",
          "logicalId": "logical-id-guid"
        },
        "itemType": "Notebook",
        "displayName": "SalesTransform"
      },
      "conflictType": "None",
      "changeType": "Modified"
    }
  ]
}
```

**`changeType` values**:
| Value | Description |
|-------|-------------|
| `Modified` | Item changed in workspace (not yet committed) |
| `Added` | New item in workspace not in Git |
| `Deleted` | Item deleted from workspace but exists in Git |
| `ConflictedBoth` | Both workspace and Git have changes |

**`conflictType` values**:
| Value | Description |
|-------|-------------|
| `None` | No conflict |
| `Conflict` | Item has conflicting changes in both workspace and Git |
| `SameChanges` | Same change in both workspace and Git (auto-resolvable) |

---

## Commit Operations

### Commit All Changes

```bash
# Commit all workspace changes to Git
curl -X POST "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/git/commitToGit" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "All",
    "workspaceHead": "<current-workspace-head-from-status>",
    "comment": "feat: add rolling 12-month sales aggregation notebook"
  }'
```

### Selective Commit

```bash
# Commit only specific items
curl -X POST "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/git/commitToGit" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "Selective",
    "workspaceHead": "<workspace-head>",
    "items": [
      {"objectId": "<notebook-guid>", "itemType": "Notebook"},
      {"objectId": "<pipeline-guid>", "itemType": "DataPipeline"}
    ],
    "comment": "fix: increase notebook timeout to 2 hours"
  }'
```

---

## Update From Git (Pull)

```bash
# Pull latest commit from connected branch
curl -X POST "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/git/updateFromGit" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "remoteCommitHash": "<target-commit-hash>",
    "conflictResolution": {
      "conflictResolutionType": "Workspace",
      "conflictResolutionPolicy": "PreferRemote"
    },
    "options": {
      "allowOverrideItems": true
    }
  }'
```

**`conflictResolutionPolicy` options**:
| Policy | Description |
|--------|-------------|
| `PreferRemote` | Git version wins — workspace changes are overwritten |
| `PreferWorkspace` | Workspace version wins — Git changes are ignored |

**`conflictResolutionType` options**:
| Type | Description |
|------|-------------|
| `Workspace` | Apply conflict resolution to workspace |
| `Git` | Apply conflict resolution to Git (not commonly used) |

---

## Initialization Strategies

When connecting a workspace that already has items:

| Strategy | Description | Use Case |
|----------|-------------|----------|
| `PreferWorkspace` | Workspace items are committed to Git; Git is overwritten | First time connecting an existing workspace to a new repo |
| `PreferRemote` | Git items are pulled to workspace; workspace is overwritten | Connecting a workspace to an existing repo branch |

```bash
curl -X POST "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/git/initializeConnection" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"initializationStrategy": "PreferWorkspace"}'
```

---

## Supported Artifact Types in Git

| Artifact Type | Git Format | Key Files |
|---------------|-----------|-----------|
| Notebook | `.Notebook/` folder | `notebook-content.py` (or `.ipynb`), `.platform` |
| Lakehouse | `.Lakehouse/` folder | `.platform` (metadata only, no data) |
| Warehouse | `.Warehouse/` folder | `.platform` |
| Data Pipeline | `.DataPipeline/` folder | `pipeline-content.json`, `.platform` |
| Semantic Model | `.SemanticModel/` folder | `definition/database.tmdl`, `definition/tables/*.tmdl` |
| Report | `.Report/` folder | `definition/report.json`, `definition/pages/*.json` |
| KQL Database | `.KQLDatabase/` folder | `.platform` (DDL not tracked) |
| Eventstream | `.Eventstream/` folder | `.platform` |
| Dataflow Gen2 | `.DataflowsGen2/` folder | `mashup.pq` (Power Query M) |
| Environment | `.Environment/` folder | `environment.yml`, `requirements.txt` |

**Note**: Lakehouse and Warehouse metadata is tracked (item exists) but table schemas and data are NOT stored in Git. Only the item's existence and properties are version-controlled.

---

## .platform File Structure

The `.platform` file is a JSON metadata file that Fabric uses to identify items during sync:

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/gitIntegration/platformProperties/2.0.0/schema.json",
  "metadata": {
    "type": "Notebook",
    "displayName": "SalesTransform",
    "description": "Transforms raw sales data from Bronze to Silver Lakehouse"
  },
  "config": {
    "version": "2.0",
    "logicalId": "00000000-0000-0000-0000-000000000001"
  }
}
```

**logicalId**: A stable GUID that identifies the item across environments. When deploying to a new workspace, the same `logicalId` creates a new item with the same definition. Never change the `logicalId` in Git — it breaks cross-workspace promotion.

---

## Conflict Resolution Workflow

### Identify Conflicts

```bash
# Check status for conflicts
STATUS=$(curl "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/git/status" \
  -H "Authorization: Bearer ${TOKEN}")

echo $STATUS | python3 -c "
import sys, json
data = json.load(sys.stdin)
conflicts = [c for c in data.get('changes', []) if c.get('conflictType') == 'Conflict']
print(f'Conflicts found: {len(conflicts)}')
for c in conflicts:
    print(f'  - {c[\"itemMetadata\"][\"displayName\"]} ({c[\"itemMetadata\"][\"itemType\"]})')
"
```

### Resolve Conflicts

**Option 1: Accept Git version (safe for CI/CD)**
```bash
curl -X POST "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/git/updateFromGit" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "remoteCommitHash": "<branch-head>",
    "conflictResolution": {
      "conflictResolutionType": "Workspace",
      "conflictResolutionPolicy": "PreferRemote"
    },
    "options": {"allowOverrideItems": true}
  }'
```

**Option 2: Accept workspace version (manual review, then commit)**
1. In Fabric portal > Git integration > Manage conflicts.
2. Select each conflicted item and choose "Keep workspace version."
3. Commit to Git with the resolved state.

---

## Error Codes and Remediation

| Error | Meaning | Fix |
|-------|---------|-----|
| `Git provider authorization failed` | OAuth token expired or not authorized for repo | Re-authorize via Fabric portal > Workspace settings > Git integration |
| `Branch not found` | Branch name in connection does not exist | Create the branch in Git first; or update connection with correct name |
| `DirectoryName path conflict` | Another workspace already uses this path | Use a unique directory path per workspace |
| `workspaceHead mismatch` | `workspaceHead` in request does not match current state | Fetch current status first; use `workspaceHead` from status response |
| `AllowOverrideItems required` | Workspace has unsaved changes preventing update | Commit or explicitly pass `allowOverrideItems: true` |
| `Item not supported for Git sync` | Item type cannot be synced to Git | Check supported artifact types; capacity items and some preview items may not sync |
| `Conflict detected: ConflictedBoth` | Both workspace and remote have changes | Resolve via portal or choose PreferRemote/PreferWorkspace policy |
| `503 Service Unavailable` | Git provider temporarily unreachable | Retry with exponential backoff |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Items per workspace in Git | No hard limit (practical < 500) | Performance degrades with many items |
| Commit message length | 300 characters | |
| Git sync operation timeout | 10 minutes | Large workspaces may need multiple sync operations |
| Concurrent sync operations | 1 per workspace | Queued; cannot run parallel syncs |
| Repository size | Provider limits apply | GitHub: 2 GB repo; ADO: 250 GB |
| Branch name length | 250 characters | |
| File size per artifact | 50 MB | Notebooks with large inline data should reference lakehouse instead |
