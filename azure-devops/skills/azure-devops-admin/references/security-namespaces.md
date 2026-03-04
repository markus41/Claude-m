# Azure DevOps — Security Namespaces Reference

## Overview

Azure DevOps uses a token-based security model built on **security namespaces**, **tokens**, **access control lists (ACLs)**, and **access control entries (ACEs)**. Each namespace governs permissions for a resource type (Git repos, build pipelines, work items, etc.). Tokens are hierarchical strings identifying specific resources within a namespace. ACLs map identity descriptors to allow/deny bitmasks for a given token. This reference covers the major namespace GUIDs, token format patterns, permission bitmasks, identity descriptor formats, and the complete REST API for reading and writing security configuration.

---

## Security REST API

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/_apis/securitynamespaces?api-version=7.1` | Any authenticated user | `localOnly` | List all security namespaces |
| GET | `/_apis/securitynamespaces/{namespaceId}?api-version=7.1` | Any authenticated user | — | Get namespace details including actions |
| GET | `/_apis/accesscontrollists/{namespaceId}?api-version=7.1` | Manage Permissions | `token`, `descriptors`, `includeExtendedInfo`, `recurse` | Get ACLs for a token |
| POST | `/_apis/accesscontrolentries/{namespaceId}?api-version=7.1` | Manage Permissions | Body: `{ token, merge, accessControlEntries }` | Set ACEs (grant/deny) |
| DELETE | `/_apis/accesscontrolentries/{namespaceId}?token={token}&descriptors={descriptors}&api-version=7.1` | Manage Permissions | `token`, `descriptors` | Remove ACEs for identities |
| GET | `/_apis/identities?api-version=7.1` | Identity (Read) | `searchFilter`, `filterValue` | Resolve identity descriptors |
| GET | `/_apis/graph/users?api-version=7.1-preview.1` | Graph (Read) | `subjectTypes` | List users in the org |
| GET | `/_apis/graph/groups?api-version=7.1-preview.1` | Graph (Read) | `scopeDescriptor` | List groups |

---

## Major Security Namespaces

| Namespace | GUID | Governs |
|-----------|------|---------|
| Git Repositories | `2e9eb7ed-3c0a-47d4-87c1-0ffdd275fd87` | Repo-level and branch-level Git permissions |
| Build | `33344d9c-fc72-4d6f-aba5-fa317c3b7be8` | Build pipeline permissions |
| ReleaseManagement | `c788c36e-058b-4f2e-8dac-b15712483ed1` | Classic release pipeline permissions |
| CSS (Area Paths) | `83e28ad4-2d72-4ceb-97b0-c7726d5502c3` | Area path-scoped work item permissions |
| Iteration | `bf7bfa03-b2b7-47db-8113-fa2e002cc5b1` | Iteration path-scoped permissions |
| Project | `52d39943-cb85-4d7f-8fa8-c6baac873819` | Project-level permissions |
| WorkItemQueryFolders | `71356614-aad7-4757-8f2c-0fb3bff6f680` | Shared query folder permissions |
| VersionControlItems | `a39371cf-0841-4c16-bbd3-276e341bc052` | TFVC item-level permissions |
| Analytics | `d34d3680-dfe5-4cc6-a949-7d9c68f73cba` | Analytics views and OData access |
| Tagging | `bb50f182-8e5e-40b8-bc21-e8752a1e7ae2` | Work item tag management |
| ServiceEndpoints | `49b48001-ca20-4adc-8111-5b60c903a50c` | Service connection permissions |
| DistributedTask | `101eae8c-1709-47f9-b228-0e476c35b3ba` | Agent pools, deployment groups, environments |
| Library | `b7e84409-6553-448a-bbb2-af228e07cbeb` | Variable groups and secure files |
| Environment | `83d4c2e6-e57d-4d6e-892b-b87222b7ad20` | Pipeline environments |
| EventSubscription | `2bf24a2b-70ba-43d3-ad97-3d9e1f75571f` | Service hook subscriptions |
| Dashboard | `8adf73b7-389a-4276-b638-fe1653f7f0c1` | Dashboard permissions |
| Wiki | `2e3b65a5-aba6-4e25-aa72-6af629c73457` | Wiki page permissions |

---

## Token Format Patterns

Tokens are hierarchical strings separated by `/` that identify the resource scope:

### Git Repository Tokens

```
repoV2/{projectId}                       # All repos in project
repoV2/{projectId}/{repoId}              # Specific repo
repoV2/{projectId}/{repoId}/refs/heads/main  # Specific branch
```

### Build Tokens

```
{projectId}                              # All pipelines in project
{projectId}/{pipelineId}                 # Specific pipeline
{projectId}/{folderId}                   # Pipeline folder
```

### Area Path Tokens (CSS)

```
vstfs:///Classification/Node/{areaPathNodeId}
```

### Iteration Tokens

```
vstfs:///Classification/Node/{iterationNodeId}
```

### Project Tokens

```
$PROJECT:vstfs:///Classification/TeamProject/{projectId}
```

### Service Endpoint Tokens

```
endpoints/{projectId}                    # All endpoints in project
endpoints/{projectId}/{endpointId}       # Specific endpoint
```

### DistributedTask Tokens

```
AgentPools/{poolId}                      # Agent pool
AgentQueues/{projectId}/{queueId}        # Agent queue
```

---

## Permission Bitmasks

Permissions are stored as integer bitmasks. Each bit represents a specific action defined in the namespace.

### Git Repositories Namespace Actions

| Permission | Bit Value | Description |
|-----------|-----------|-------------|
| Administer | 1 | Full admin control |
| GenericRead | 2 | Read repo contents |
| GenericContribute | 4 | Push to non-protected branches |
| ForcePush | 8 | Force push (rewrite history) |
| CreateBranch | 16 | Create branches |
| CreateTag | 32 | Create tags |
| ManageNote | 64 | Manage Git notes |
| PolicyExempt | 128 | Bypass branch policies |
| CreateRepository | 256 | Create new repositories |
| DeleteRepository | 512 | Delete repositories |
| RenameRepository | 1024 | Rename repositories |
| EditPolicies | 2048 | Edit branch policies |
| RemoveOthersLocks | 4096 | Remove other users' locks |
| ManagePermissions | 8192 | Manage repo permissions |
| PullRequestContribute | 16384 | Contribute to PRs |
| PullRequestBypassPolicy | 32768 | Complete PRs bypassing policies |

### Build Namespace Actions

| Permission | Bit Value | Description |
|-----------|-----------|-------------|
| ViewBuilds | 1 | View build results |
| EditBuildDefinition | 2 | Edit pipeline definitions |
| DeleteBuildDefinition | 4 | Delete pipelines |
| QueueBuilds | 8 | Queue/run pipelines |
| ManageBuildQualities | 16 | Manage build qualities |
| DestroyBuilds | 32 | Permanently delete builds |
| UpdateBuildInformation | 64 | Update build information |
| AdministerBuildPermissions | 128 | Manage build permissions |
| DeleteBuilds | 256 | Delete build records |
| StopBuilds | 512 | Cancel running builds |
| RetainIndefinitely | 1024 | Retain builds indefinitely |
| ViewBuildDefinition | 2048 | View pipeline definitions |
| OverrideBuildCheckInValidation | 4096 | Override check-in validation |

### Project Namespace Actions

| Permission | Bit Value | Description |
|-----------|-----------|-------------|
| GENERIC_READ | 1 | View project |
| GENERIC_WRITE | 2 | Edit project properties |
| DELETE | 4 | Delete project |
| PUBLISH_TEST_RESULTS | 8 | Publish test results |
| ADMINISTER_BUILD | 16 | Administer build resources |
| START_BUILD | 32 | Start builds |
| EDIT_BUILD_STATUS | 64 | Edit build status |
| UPDATE_BUILD | 128 | Update build information |
| DELETE_TEST_RESULTS | 256 | Delete test results |
| VIEW_TEST_RESULTS | 512 | View test results |
| MANAGE_TEST_ENVIRONMENTS | 2048 | Manage test machines |
| MANAGE_TEST_CONFIGURATIONS | 4096 | Manage test configurations |
| WORK_ITEM_DELETE | 8192 | Delete work items |
| WORK_ITEM_MOVE | 16384 | Move work items between projects |
| WORK_ITEM_PERMANENTLY_DELETE | 32768 | Permanently delete work items |
| RENAME | 65536 | Rename project |
| MANAGE_PROPERTIES | 131072 | Manage project properties |
| MANAGE_SYSTEM_PROPERTIES | 262144 | Manage system properties |
| BYPASS_PROPERTY_CACHE | 524288 | Bypass property cache |
| BYPASS_RULES | 1048576 | Bypass work item rules |
| SUPPRESS_NOTIFICATIONS | 2097152 | Suppress notifications |
| UPDATE_VISIBILITY | 4194304 | Change project visibility |
| CHANGE_PROCESS | 8388608 | Change process template |
| AGILETOOLS_BACKLOG | 16777216 | Manage Agile tools |

---

## ACL and ACE Structure

### Access Control List (ACL)

```json
{
  "inheritPermissions": true,
  "token": "repoV2/{projectId}/{repoId}",
  "acesDictionary": {
    "Microsoft.TeamFoundation.Identity;S-1-9-...-0-1": {
      "descriptor": "Microsoft.TeamFoundation.Identity;S-1-9-...-0-1",
      "allow": 6,
      "deny": 0,
      "extendedInfo": {
        "effectiveAllow": 6,
        "effectiveDeny": 0,
        "inheritedAllow": 2,
        "inheritedDeny": 0
      }
    }
  }
}
```

### Access Control Entry (ACE) Fields

| Field | Description |
|-------|-------------|
| `descriptor` | Identity descriptor string |
| `allow` | Bitmask of explicitly allowed permissions |
| `deny` | Bitmask of explicitly denied permissions |
| `extendedInfo.effectiveAllow` | Combined allow after inheritance |
| `extendedInfo.effectiveDeny` | Combined deny after inheritance |
| `extendedInfo.inheritedAllow` | Allow bits inherited from parent |
| `extendedInfo.inheritedDeny` | Deny bits inherited from parent |

### Permission Resolution

1. **Deny wins over Allow** at the same level.
2. **Explicit overrides inherited**: a direct ACE on a resource overrides inherited permissions.
3. **Inheritance flows down** the token hierarchy (e.g., repo → branch).
4. **Not set** (neither allow nor deny) means the permission is inherited or absent.

---

## Identity Descriptors

Identity descriptors uniquely identify a user, group, or service principal:

### Format

```
Microsoft.TeamFoundation.Identity;{sid}
```

### Resolving an Identity

```bash
# Find user by email
curl -u ":$PAT" \
  "https://vssps.dev.azure.com/myorg/_apis/identities?searchFilter=General&filterValue=user@company.com&api-version=7.1"

# Find group by display name
curl -u ":$PAT" \
  "https://vssps.dev.azure.com/myorg/_apis/identities?searchFilter=General&filterValue=Contributors&api-version=7.1"
```

### Common Built-in Group Descriptors

| Group | Description |
|-------|-------------|
| `[ProjectName]\Contributors` | Default contributor group |
| `[ProjectName]\Readers` | Read-only access |
| `[ProjectName]\Project Administrators` | Full project admin |
| `[ProjectName]\Build Administrators` | Build/pipeline admin |
| `[TEAM FOUNDATION]\Project Collection Administrators` | Org-level admin |
| `[TEAM FOUNDATION]\Project Collection Build Service Accounts` | Pipeline service identity |

---

## Practical Examples

### Grant a User Contribute Permission to a Repo

```bash
# 1. Get the user's identity descriptor
DESCRIPTOR=$(curl -s -u ":$PAT" \
  "https://vssps.dev.azure.com/myorg/_apis/identities?searchFilter=General&filterValue=user@company.com&api-version=7.1" \
  | jq -r '.value[0].descriptor')

# 2. Set the ACE on the Git repo namespace
curl -u ":$PAT" \
  -H "Content-Type: application/json" \
  -X POST "https://dev.azure.com/myorg/_apis/accesscontrolentries/2e9eb7ed-3c0a-47d4-87c1-0ffdd275fd87?api-version=7.1" \
  -d "{
    \"token\": \"repoV2/${PROJECT_ID}/${REPO_ID}\",
    \"merge\": true,
    \"accessControlEntries\": [
      {
        \"descriptor\": \"$DESCRIPTOR\",
        \"allow\": 6,
        \"deny\": 0,
        \"extendedInfo\": {}
      }
    ]
  }"
```

`allow: 6` = GenericRead (2) + GenericContribute (4).

### Restrict Pipeline Edit to Admins Only

```bash
# Deny EditBuildDefinition (2) for Contributors group on a specific pipeline
curl -u ":$PAT" \
  -H "Content-Type: application/json" \
  -X POST "https://dev.azure.com/myorg/_apis/accesscontrolentries/33344d9c-fc72-4d6f-aba5-fa317c3b7be8?api-version=7.1" \
  -d "{
    \"token\": \"${PROJECT_ID}/${PIPELINE_ID}\",
    \"merge\": true,
    \"accessControlEntries\": [
      {
        \"descriptor\": \"$CONTRIBUTORS_DESCRIPTOR\",
        \"allow\": 0,
        \"deny\": 2,
        \"extendedInfo\": {}
      }
    ]
  }"
```

### Read Effective Permissions for a Repo

```bash
curl -u ":$PAT" \
  "https://dev.azure.com/myorg/_apis/accesscontrollists/2e9eb7ed-3c0a-47d4-87c1-0ffdd275fd87?token=repoV2/${PROJECT_ID}/${REPO_ID}&includeExtendedInfo=true&api-version=7.1"
```

### Remove ACEs for an Identity

```bash
curl -u ":$PAT" \
  -X DELETE \
  "https://dev.azure.com/myorg/_apis/accesscontrolentries/2e9eb7ed-3c0a-47d4-87c1-0ffdd275fd87?token=repoV2/${PROJECT_ID}/${REPO_ID}&descriptors=${DESCRIPTOR}&api-version=7.1"
```

---

## Listing All Namespaces

```bash
curl -u ":$PAT" \
  "https://dev.azure.com/myorg/_apis/securitynamespaces?api-version=7.1" \
  | jq '.value[] | {name: .name, namespaceId: .namespaceId, displayName: .displayName}'
```

Each namespace contains an `actions` array defining all available permissions with their bit values and display names.

---

## Limits and Gotchas

- **Deny always wins**: at the same scope level, a deny bit overrides an allow bit. This is the most common source of "permission denied" confusion.
- **Inheritance**: set `inheritPermissions: false` on an ACL to break inheritance. This is useful for securing specific branches or repos differently from the project default.
- **Merge behavior**: when `merge: true` in the ACE POST, new allow/deny bits are OR-ed with existing values. When `merge: false`, the ACE replaces the existing entry entirely.
- **Token case sensitivity**: tokens are generally case-sensitive. Branch ref tokens must match the exact casing of the branch name.
- **Namespace stale cache**: permission changes may take up to 1 minute to propagate due to caching. Signing out and back in forces a refresh.
- **Service account identities**: pipeline service accounts have special descriptors. Use the Graph API to find them rather than the Identity API.
- **Max ACEs per ACL**: no documented hard limit, but performance degrades beyond ~500 ACEs on a single token. Use group-based permissions instead of per-user ACEs.
- **TFVC vs Git namespaces**: `VersionControlItems` is for TFVC only. Use `Git Repositories` for Git-based repos.
- **Cross-project identities**: identity descriptors are org-scoped. The same descriptor works across all projects in the organization.
