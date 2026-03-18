# Fabric Workspace Management — Reference

## Overview

Comprehensive workspace lifecycle management covering creation, role assignments, capacity binding, Git integration, deployment pipelines, item management, and governance automation via the Fabric REST API.

---

## Workspace Lifecycle

### Create Workspace

```bash
# Create a new Fabric workspace
curl -X POST "https://api.fabric.microsoft.com/v1/workspaces" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "ws-sales-prod",
    "description": "Production workspace for Sales domain",
    "capacityId": "<fabric-capacity-id>"
  }'
```

```python
import requests

def create_workspace(name, description, capacity_id, token):
    response = requests.post(
        "https://api.fabric.microsoft.com/v1/workspaces",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={
            "displayName": name,
            "description": description,
            "capacityId": capacity_id
        }
    )
    response.raise_for_status()
    return response.json()
```

### Workspace Naming Convention

| Environment | Pattern | Example |
|---|---|---|
| Development | `ws-<domain>-dev` | `ws-sales-dev` |
| Test | `ws-<domain>-test` | `ws-sales-test` |
| Production | `ws-<domain>-prod` | `ws-sales-prod` |
| Shared | `ws-shared-<purpose>` | `ws-shared-datasets` |
| Sandbox | `ws-sandbox-<user>` | `ws-sandbox-jdoe` |

### List Workspaces

```python
def list_workspaces(token, filter_name=None):
    workspaces = []
    url = "https://api.fabric.microsoft.com/v1/workspaces"

    while url:
        response = requests.get(url, headers={"Authorization": f"Bearer {token}"})
        data = response.json()
        workspaces.extend(data.get("value", []))
        url = data.get("continuationUri")

    if filter_name:
        workspaces = [ws for ws in workspaces if filter_name.lower() in ws["displayName"].lower()]

    return workspaces
```

### Delete Workspace

```bash
curl -X DELETE "https://api.fabric.microsoft.com/v1/workspaces/$WORKSPACE_ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Role Assignments

### Workspace Roles

| Role | Permissions |
|---|---|
| Admin | Full control, manage access, delete workspace |
| Member | Create/edit/delete items, share items, manage schedule refresh |
| Contributor | Create/edit/delete items (cannot share or manage access) |
| Viewer | View items and reports only |

### Assign Role via API

```python
def assign_workspace_role(workspace_id, principal_id, principal_type, role, token):
    """
    principal_type: "User", "Group", "ServicePrincipal", "ServicePrincipalProfile"
    role: "Admin", "Member", "Contributor", "Viewer"
    """
    response = requests.post(
        f"https://api.fabric.microsoft.com/v1/workspaces/{workspace_id}/roleAssignments",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={
            "principal": {
                "id": principal_id,
                "type": principal_type
            },
            "role": role
        }
    )
    response.raise_for_status()
    return response.json()

# Assign user as Member
assign_workspace_role(ws_id, user_object_id, "User", "Member", token)

# Assign security group as Viewer
assign_workspace_role(ws_id, group_object_id, "Group", "Viewer", token)

# Assign service principal as Contributor (for CI/CD)
assign_workspace_role(ws_id, sp_object_id, "ServicePrincipal", "Contributor", token)
```

### List Role Assignments

```python
def list_workspace_roles(workspace_id, token):
    response = requests.get(
        f"https://api.fabric.microsoft.com/v1/workspaces/{workspace_id}/roleAssignments",
        headers={"Authorization": f"Bearer {token}"}
    )
    return response.json().get("value", [])
```

### Remove Role Assignment

```python
def remove_workspace_role(workspace_id, role_assignment_id, token):
    response = requests.delete(
        f"https://api.fabric.microsoft.com/v1/workspaces/{workspace_id}/roleAssignments/{role_assignment_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    response.raise_for_status()
```

---

## Item Management

### List Workspace Items

```python
def list_workspace_items(workspace_id, token, item_type=None):
    """
    item_type: "Lakehouse", "Notebook", "DataPipeline", "SemanticModel",
               "Report", "Warehouse", "Eventhouse", "KQLDatabase", etc.
    """
    url = f"https://api.fabric.microsoft.com/v1/workspaces/{workspace_id}/items"
    if item_type:
        url += f"?type={item_type}"

    items = []
    while url:
        response = requests.get(url, headers={"Authorization": f"Bearer {token}"})
        data = response.json()
        items.extend(data.get("value", []))
        url = data.get("continuationUri")

    return items
```

### Get Item by Name

```python
def get_item_by_name(workspace_id, item_name, item_type, token):
    items = list_workspace_items(workspace_id, token, item_type)
    matches = [i for i in items if i["displayName"] == item_name]
    return matches[0] if matches else None
```

### Delete Item

```python
def delete_item(workspace_id, item_id, token):
    response = requests.delete(
        f"https://api.fabric.microsoft.com/v1/workspaces/{workspace_id}/items/{item_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    response.raise_for_status()
```

---

## Capacity Management

### Assign Workspace to Capacity

```python
def assign_capacity(workspace_id, capacity_id, token):
    response = requests.post(
        f"https://api.fabric.microsoft.com/v1/workspaces/{workspace_id}/assignToCapacity",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={"capacityId": capacity_id}
    )
    response.raise_for_status()
```

### Unassign from Capacity

```python
def unassign_capacity(workspace_id, token):
    response = requests.post(
        f"https://api.fabric.microsoft.com/v1/workspaces/{workspace_id}/unassignFromCapacity",
        headers={"Authorization": f"Bearer {token}"}
    )
    response.raise_for_status()
```

---

## Git Integration

### Connect Workspace to Git

```python
def connect_workspace_to_git(workspace_id, repo_config, token):
    """
    repo_config example (Azure DevOps):
    {
        "gitProviderDetails": {
            "gitProviderType": "AzureDevOps",
            "organizationName": "my-org",
            "projectName": "my-project",
            "repositoryName": "fabric-repo",
            "branchName": "main",
            "directoryName": "/workspaces/sales-prod"
        }
    }
    """
    response = requests.post(
        f"https://api.fabric.microsoft.com/v1/workspaces/{workspace_id}/git/connect",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json=repo_config
    )
    response.raise_for_status()
    return response.json()
```

### Sync Workspace with Git

```python
def sync_from_git(workspace_id, token, conflict_resolution="PreferRemote"):
    """Pull latest changes from Git into workspace."""
    # Get current status
    status = requests.get(
        f"https://api.fabric.microsoft.com/v1/workspaces/{workspace_id}/git/status",
        headers={"Authorization": f"Bearer {token}"}
    ).json()

    if status.get("changes"):
        response = requests.post(
            f"https://api.fabric.microsoft.com/v1/workspaces/{workspace_id}/git/updateFromGit",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={
                "conflictResolution": {"conflictResolutionType": conflict_resolution},
                "allowOverrideItems": True
            }
        )
        return response.json()
    return {"message": "No changes to sync"}

def commit_to_git(workspace_id, comment, token):
    """Commit workspace changes to Git."""
    response = requests.post(
        f"https://api.fabric.microsoft.com/v1/workspaces/{workspace_id}/git/commitToGit",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={
            "mode": "All",
            "comment": comment
        }
    )
    return response.json()
```

---

## Deployment Pipelines

### Create Pipeline

```python
def create_deployment_pipeline(name, description, token):
    response = requests.post(
        "https://api.fabric.microsoft.com/v1/deploymentPipelines",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={
            "displayName": name,
            "description": description
        }
    )
    return response.json()
```

### Assign Workspace to Stage

```python
def assign_workspace_to_stage(pipeline_id, stage_order, workspace_id, token):
    """stage_order: 0=Development, 1=Test, 2=Production"""
    response = requests.post(
        f"https://api.fabric.microsoft.com/v1/deploymentPipelines/{pipeline_id}/stages/{stage_order}/assignWorkspace",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={"workspaceId": workspace_id}
    )
    return response.json()
```

### Deploy Between Stages

```python
def deploy(pipeline_id, source_stage, token, items=None, note=""):
    """Deploy all or selected items from source_stage to next stage."""
    payload = {"note": note}
    if items:
        payload["items"] = [{"itemId": i["id"], "itemType": i["type"]} for i in items]

    response = requests.post(
        f"https://api.fabric.microsoft.com/v1/deploymentPipelines/{pipeline_id}/stages/{source_stage}/deploy",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json=payload
    )
    return response.json()
```

---

## Workspace Templates

### Scaffold Standard Workspace

```python
def scaffold_domain_workspace(domain, environment, capacity_id, token):
    """Create a fully configured workspace for a data domain."""
    ws_name = f"ws-{domain}-{environment}"

    # 1. Create workspace
    ws = create_workspace(ws_name, f"{domain.title()} {environment} workspace", capacity_id, token)
    ws_id = ws["id"]

    # 2. Create standard lakehouses
    for layer in ["bronze", "silver", "gold"]:
        requests.post(
            f"https://api.fabric.microsoft.com/v1/workspaces/{ws_id}/lakehouses",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"displayName": f"lh_{layer}_{domain}"}
        )

    # 3. Assign roles
    if environment == "prod":
        assign_workspace_role(ws_id, data_engineers_group, "Group", "Member", token)
        assign_workspace_role(ws_id, data_analysts_group, "Group", "Viewer", token)
        assign_workspace_role(ws_id, cicd_service_principal, "ServicePrincipal", "Contributor", token)
    else:
        assign_workspace_role(ws_id, data_engineers_group, "Group", "Admin", token)

    return ws_id
```

---

## Governance Automation

### Workspace Audit

```python
def audit_workspaces(token):
    """Audit all workspaces for governance compliance."""
    workspaces = list_workspaces(token)
    issues = []

    for ws in workspaces:
        ws_id = ws["id"]
        name = ws["displayName"]

        # Check naming convention
        if not any(name.startswith(prefix) for prefix in ["ws-", "sandbox-"]):
            issues.append({"workspace": name, "issue": "Non-standard naming", "severity": "warning"})

        # Check role assignments
        roles = list_workspace_roles(ws_id, token)
        admins = [r for r in roles if r["role"] == "Admin"]
        if len(admins) < 2:
            issues.append({"workspace": name, "issue": "Less than 2 admins", "severity": "warning"})
        if len(admins) > 5:
            issues.append({"workspace": name, "issue": f"{len(admins)} admins (excessive)", "severity": "info"})

        # Check for service principal access (needed for CI/CD)
        sp_roles = [r for r in roles if r["principal"]["type"] == "ServicePrincipal"]
        if not sp_roles and "prod" in name:
            issues.append({"workspace": name, "issue": "No service principal for CI/CD", "severity": "warning"})

        # Check capacity assignment
        if not ws.get("capacityId"):
            issues.append({"workspace": name, "issue": "No capacity assigned", "severity": "critical"})

    return issues
```

### Orphaned Workspace Detection

```python
def find_orphaned_workspaces(token, inactive_days=90):
    """Find workspaces with no recent activity."""
    workspaces = list_workspaces(token)
    orphaned = []

    for ws in workspaces:
        items = list_workspace_items(ws["id"], token)
        if not items:
            orphaned.append({"workspace": ws["displayName"], "reason": "Empty workspace"})
            continue

        # Check last modified date across all items
        last_modified = max(
            (i.get("lastUpdatedDate", "1970-01-01") for i in items),
            default="1970-01-01"
        )
        if last_modified < (datetime.now() - timedelta(days=inactive_days)).isoformat():
            orphaned.append({
                "workspace": ws["displayName"],
                "reason": f"No activity in {inactive_days} days",
                "last_modified": last_modified,
                "item_count": len(items)
            })

    return orphaned
```

---

## Limits

| Resource | Limit |
|---|---|
| Workspaces per tenant | 1,000 (default, can be increased) |
| Items per workspace | 5,000 |
| Role assignments per workspace | 1,000 |
| Deployment pipeline stages | 3 (Dev → Test → Prod) |
| Git-connected workspaces per repo | No hard limit (recommended < 50) |
| Workspace name max length | 256 characters |
| Service principals per workspace | No hard limit |
