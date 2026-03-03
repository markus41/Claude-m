# Workspace Roles — Assignment API, Bulk Audit, and Service Principal Patterns

This reference covers Microsoft Fabric workspace role definitions, the role assignment REST API, bulk access audit patterns, and service principal access management.

---

## Role Capability Matrix

| Capability | Admin | Member | Contributor | Viewer |
|-----------|-------|--------|-------------|--------|
| View all workspace items | Yes | Yes | Yes | Yes |
| View reports and dashboards | Yes | Yes | Yes | Yes |
| Connect to and use data in notebooks | Yes | Yes | Yes | No |
| Create / edit items (notebooks, pipelines, lakehouses) | Yes | Yes | Yes | No |
| Publish and share reports | Yes | Yes | No | No |
| Share individual items | Yes | Yes | No | No |
| Create deployment pipelines | Yes | Yes | No | No |
| Manage workspace access | Yes | No | No | No |
| Delete workspace | Yes | No | No | No |
| Configure workspace capacity | Yes | No | No | No |
| Configure workspace Git integration | Yes | No | No | No |
| Create a workspace app | Yes | Yes | No | No |
| Update a workspace app | Yes | Yes | No | No |

---

## Role Assignment REST API

**Base URL**: `https://api.fabric.microsoft.com/v1`

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/workspaces/{workspaceId}/roleAssignments` | Workspace Admin | — | Lists all role assignments |
| GET | `/workspaces/{workspaceId}/roleAssignments/{assignmentId}` | Workspace Admin | — | Returns a single assignment |
| POST | `/workspaces/{workspaceId}/roleAssignments` | Workspace Admin | `principal`, `role` | Adds a new assignment |
| PATCH | `/workspaces/{workspaceId}/roleAssignments/{assignmentId}` | Workspace Admin | `role` | Changes existing role |
| DELETE | `/workspaces/{workspaceId}/roleAssignments/{assignmentId}` | Workspace Admin | — | Removes access |

**Principal types**:
| `principalType` | Description |
|----------------|-------------|
| `User` | Individual Azure AD user |
| `Group` | Azure AD security group or M365 group |
| `ServicePrincipal` | Azure AD app registration / service principal |
| `ServicePrincipalProfile` | Multi-tenant app profile for Power BI Embedded |

```bash
TOKEN=$(az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken -o tsv)
WORKSPACE_ID="your-workspace-id"

# List all assignments
curl "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/roleAssignments" \
  -H "Authorization: Bearer ${TOKEN}"

# Add user as Contributor
curl -X POST "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/roleAssignments" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "principal": {
      "id": "user-object-id-guid",
      "type": "User"
    },
    "role": "Contributor"
  }'

# Add security group as Viewer
curl -X POST "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/roleAssignments" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "principal": {
      "id": "group-object-id-guid",
      "type": "Group"
    },
    "role": "Viewer"
  }'

# Add service principal as Member
curl -X POST "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/roleAssignments" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "principal": {
      "id": "service-principal-object-id-guid",
      "type": "ServicePrincipal"
    },
    "role": "Member"
  }'

# Change role (promote Contributor to Member)
curl -X PATCH "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/roleAssignments/${ASSIGNMENT_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"role": "Member"}'

# Remove access
curl -X DELETE "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/roleAssignments/${ASSIGNMENT_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## Admin API — Cross-Workspace Access

For tenant-wide access management, use the Power BI Admin API (requires Global Admin or Power BI Service Administrator role):

```bash
ADMIN_TOKEN=$(az account get-access-token --resource https://analysis.windows.net/powerbi/api --query accessToken -o tsv)

# List all workspaces in tenant with user details
curl "https://api.powerbi.com/v1.0/myorg/admin/groups?$top=100&$expand=users,datasets,reports" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"

# Get users for a specific workspace
curl "https://api.powerbi.com/v1.0/myorg/admin/groups/${WORKSPACE_ID}/users" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"

# Add user to workspace (admin override)
curl -X POST "https://api.powerbi.com/v1.0/myorg/admin/groups/${WORKSPACE_ID}/users" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "emailAddress": "jane@contoso.com",
    "groupUserAccessRight": "Admin"
  }'

# Remove user from workspace (admin override)
curl -X DELETE "https://api.powerbi.com/v1.0/myorg/admin/groups/${WORKSPACE_ID}/users/jane@contoso.com" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

---

## Bulk Access Audit (Python)

```python
import requests
import pandas as pd
from datetime import datetime

class FabricAccessAuditor:
    """Audit workspace access across a Fabric tenant."""

    def __init__(self, admin_token: str):
        self.token = admin_token
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.base = "https://api.powerbi.com/v1.0/myorg/admin"

    def get_all_workspaces(self) -> list:
        """Get all workspaces in tenant."""
        workspaces = []
        skip = 0
        while True:
            resp = requests.get(
                f"{self.base}/groups?$top=100&$skip={skip}",
                headers=self.headers
            ).json()
            workspaces.extend(resp.get("value", []))
            if len(resp.get("value", [])) < 100:
                break
            skip += 100
        return workspaces

    def get_workspace_users(self, workspace_id: str) -> list:
        """Get all users for a workspace."""
        resp = requests.get(
            f"{self.base}/groups/{workspace_id}/users",
            headers=self.headers
        )
        return resp.json().get("value", [])

    def generate_access_report(self) -> pd.DataFrame:
        """Generate a complete access report."""
        records = []
        workspaces = self.get_all_workspaces()

        for ws in workspaces:
            users = self.get_workspace_users(ws["id"])
            for user in users:
                records.append({
                    "AuditDate": datetime.now().isoformat(),
                    "WorkspaceName": ws.get("name"),
                    "WorkspaceId": ws.get("id"),
                    "WorkspaceType": ws.get("type"),
                    "CapacityId": ws.get("capacityId"),
                    "UserDisplayName": user.get("displayName"),
                    "UserEmail": user.get("emailAddress"),
                    "Role": user.get("groupUserAccessRight"),
                    "PrincipalType": user.get("principalType"),
                    "PrincipalId": user.get("identifier")
                })

        return pd.DataFrame(records)

    def find_excessive_admins(self, df: pd.DataFrame) -> pd.DataFrame:
        """Find workspaces with more than 2 Admin-role users (potential over-privilege)."""
        admin_counts = df[df["Role"] == "Admin"].groupby("WorkspaceName").size()
        over_privileged = admin_counts[admin_counts > 2].reset_index()
        over_privileged.columns = ["WorkspaceName", "AdminCount"]
        return over_privileged

    def find_personal_admin_assignments(self, df: pd.DataFrame) -> pd.DataFrame:
        """Find individual user Admins (prefer group assignments)."""
        return df[
            (df["Role"] == "Admin") &
            (df["PrincipalType"] == "User")
        ][["WorkspaceName", "UserEmail", "Role"]]

# Usage
auditor = FabricAccessAuditor(admin_token=ADMIN_TOKEN)
df = auditor.generate_access_report()

# Save full report
df.to_csv(f"access-audit-{datetime.now().strftime('%Y%m%d')}.csv", index=False)

# Highlight issues
print("Workspaces with > 2 Admins:")
print(auditor.find_excessive_admins(df))

print("\nPersonal (non-group) Admin assignments:")
print(auditor.find_personal_admin_assignments(df))
```

---

## Service Principal Access Patterns

### Why Use Service Principals

- Pipelines and automation should not use personal user accounts.
- Service principals do not require MFA and their tokens are long-lived.
- When a user leaves, service principal access is unaffected.
- Service principals can be audited independently from human users.

### Enable Service Principal Access in Fabric Admin

```
Fabric admin portal > Tenant settings > Developer settings:
- "Service principals can use Fabric APIs" → Enabled
- "Allow service principals to create and use profiles" → Enabled (for embedding)

Optionally restrict to specific security groups:
- Create a group "fabric-automation-spns"
- Add all service principal object IDs to this group
- Set the setting to "Specific security groups" > "fabric-automation-spns"
```

### Assign Service Principal to Workspace

```bash
# Get service principal object ID
SP_OBJECT_ID=$(az ad sp show --id $APP_ID --query id -o tsv)

# Assign as Contributor to workspace
curl -X POST "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/roleAssignments" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "principal": {
      "id": "'"${SP_OBJECT_ID}"'",
      "type": "ServicePrincipal"
    },
    "role": "Contributor"
  }'
```

### Authenticate as Service Principal

```python
from azure.identity import ClientSecretCredential

credential = ClientSecretCredential(
    tenant_id="<tenant-id>",
    client_id="<app-client-id>",
    client_secret="<app-client-secret>"
)

# Get token for Fabric API
token = credential.get_token("https://api.fabric.microsoft.com/.default").token

# Get token for Power BI API
pbi_token = credential.get_token("https://analysis.windows.net/powerbi/api/.default").token
```

---

## Error Codes and Remediation

| Error | Meaning | Fix |
|-------|---------|-----|
| `403 Forbidden` on role assignment | Caller is not Workspace Admin | Assign Admin role first via portal |
| `400 Bad Request: principal not found` | Object ID does not exist in Azure AD | Verify object ID with `az ad user show` or `az ad group show` |
| `409 Conflict` | Principal already has a role in this workspace | PATCH the existing assignment instead of POST |
| `Service principal access denied` | Service principal not enabled in tenant settings | Enable in Fabric admin portal > Tenant settings > Developer settings |
| `Role assignment limit reached` | Too many individual assignments | Use security groups instead of individual users; remove unused assignments |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Role assignments per workspace | 1,000 | Use security groups to scale |
| Workspace members visible in portal | 1,000 | More are supported but not visible in the UI |
| Service principals per tenant (Azure AD) | No limit | Manage via Azure AD app registrations |
| API requests per workspace per minute | 200 | Applies to Fabric REST API |
