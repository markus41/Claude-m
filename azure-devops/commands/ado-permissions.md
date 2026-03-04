---
name: ado-permissions
description: View and manage security permissions for repos, pipelines, and area paths
argument-hint: "--resource repo|pipeline|area-path --name <name> [--action view|set] [--identity <group-or-user>] [--permission <name> --allow|--deny]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Manage Permissions

View security namespaces, get current ACLs for resources, and set or modify permissions (allow, deny, not set) for users and groups.

## Prerequisites

- Authenticated to Azure DevOps (run `/ado-setup` first)
- `Manage permissions` at the appropriate scope

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--resource` | Yes | Resource type: `repo`, `pipeline`, `area-path`, `iteration`, `project` |
| `--name` | Yes | Resource name or path |
| `--action` | No | `view` (default) or `set` |
| `--identity` | No | User email, group name, or descriptor |
| `--permission` | No | Permission name to set |
| `--allow` | No | Allow the permission |
| `--deny` | No | Deny the permission |
| `--clear` | No | Clear (not set) the permission |

## Instructions

1. **List security namespaces** — `GET /_apis/securitynamespaces?api-version=7.1`
   Key namespaces:
   - Git Repositories: `2e9eb7ed-3c0a-47d4-87c1-0ffdd275fd87`
   - Build: `33344d9c-fc72-4d6f-aba5-fa317101a7e9`
   - CSS (Area/Iteration): `83e28ad4-2d72-4ceb-97b0-c7726d5502c3`
   - Project: `52d39943-cb85-4d7f-8fa8-c6baac873819`

2. **Build security token** — construct the token path for the resource:
   - Repo: `repoV2/{projectId}/{repoId}`
   - Build definition: `{projectId}/{definitionId}`
   - Area path: `vstfs:///Classification/Node/{nodeId}`

3. **View ACLs** — `GET /_apis/accesscontrollists/{namespaceId}?token={token}&api-version=7.1`
   Decode the ACE (Access Control Entry) bitmask against namespace actions.
   Display: Identity, Permission Name, Allow/Deny/Not Set.

4. **Resolve identity** — get identity descriptor:
   `GET /_apis/identities?searchFilter=General&filterValue={nameOrEmail}&api-version=7.1`

5. **Set permission** — `POST /_apis/accesscontrolentries/{namespaceId}?api-version=7.1`:
   ```json
   {
     "token": "{token}",
     "merge": true,
     "accessControlEntries": [{
       "descriptor": "{identityDescriptor}",
       "allow": <bitmask>,
       "deny": <bitmask>
     }]
   }
   ```

6. **Common permission scenarios**:
   - **Repo: prevent force push**: Set `ForcePush` (bit 8) to deny on `main` branch
   - **Pipeline: prevent editing**: Set `EditBuildDefinition` to deny
   - **Area path: restrict work item visibility**: Set `GENERIC_READ` to deny for specific groups

7. **Display results** — show the current effective permissions table after changes.

## Examples

```bash
/ado-permissions --resource repo --name my-repo --action view
/ado-permissions --resource repo --name my-repo --action set --identity "Contributors" --permission ForcePush --deny
/ado-permissions --resource pipeline --name "CI Build" --action view --identity dev@contoso.com
/ado-permissions --resource area-path --name "Project\\Backend" --action set --identity "Contractors" --permission GENERIC_READ --deny
```

## Error Handling

- **Identity not found**: Verify email or group name — list groups with `GET /_apis/graph/groups`.
- **Invalid namespace**: Resource type does not match a known namespace — check namespace GUIDs.
- **Permission denied**: Caller lacks `Manage permissions` — escalate to project admin.
