---
name: ado-branch-policy
description: Create and manage branch policies for Azure DevOps repositories
argument-hint: "<repo> --branch <branch> --policy <type> [--min-reviewers <count>] [--build-definition <id>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Manage Branch Policies

Create, update, list, and delete branch policies for Azure DevOps Git repositories. Policies enforce code quality gates before merges.

## Prerequisites

- Authenticated to Azure DevOps (run `/ado-setup` first)
- `Edit policies` permission on the repository

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `<repo>` | Yes | Repository name or ID |
| `--branch` | Yes | Branch to protect (e.g., `main`, `release/*`) |
| `--policy` | Yes | Policy type (see below) |
| `--scope` | No | Match type: `exact` (default) or `prefix` for wildcard branches |
| `--action` | No | `create` (default), `update`, `list`, or `delete` |
| `--policy-id` | No | Policy configuration ID (required for update/delete) |

### Policy Types and Options

| Policy | Flag | Description |
|--------|------|-------------|
| `min-reviewers` | `--min-reviewers <n>` | Minimum number of approving reviewers |
| `build-validation` | `--build-definition <id>` | Require a successful build |
| `comment-resolution` | | All PR comments must be resolved |
| `work-item-linking` | | PR must link to a work item |
| `merge-strategy` | `--allowed-strategies squash,merge` | Restrict allowed merge strategies |
| `status-check` | `--status-name <name> --status-genre <genre>` | Require an external status check |
| `auto-reviewers` | `--auto-reviewer-ids <id,...> --path-filter /src/*` | Automatically add reviewers by path |
| `file-size` | `--max-file-size <MB>` | Block pushes with files exceeding size limit |

## Instructions

1. **Get repository ID** — resolve repo name to ID via `GET /_apis/git/repositories/{repo}?api-version=7.1`.

2. **Build scope** — construct the scope array:
   ```json
   [{
     "repositoryId": "{repoId}",
     "refName": "refs/heads/{branch}",
     "matchKind": "Exact"
   }]
   ```
   Use `"matchKind": "Prefix"` for wildcard branches like `release/*`.

3. **Create policy** — call `POST /_apis/policy/configurations?api-version=7.1` with:
   ```json
   {
     "isEnabled": true,
     "isBlocking": true,
     "type": { "id": "{policyTypeId}" },
     "settings": { "scope": [...], ...policySpecificSettings }
   }
   ```

   Policy type GUIDs:
   - Min reviewers: `fa4e907d-c16b-4a4c-9dfa-4916e5d171ab`
   - Build validation: `0609b952-1397-4640-95ec-e00a01b2c241`
   - Comment resolution: `c6a1889d-b943-4856-b76f-9e46bb6b0df2`
   - Work item linking: `40e92b44-2fe1-4dd6-b3d8-74a9c21d0c6e`
   - Merge strategy: `fa4e907d-c16b-4a4c-9dfa-4906e5d171cb`
   - Status check: `cbdc66da-9728-4af8-aada-9a5a32e4a226`
   - Auto-reviewers: `fd2167ab-b0be-447a-8571-44ee4ef18660`

4. **List policies** — if `--action list`:
   `GET /_apis/policy/configurations?repositoryId={repoId}&refName=refs/heads/{branch}&api-version=7.1`
   CLI: `az repos policy list --repository-id {repoId} --branch {branch}`

5. **Update policy** — if `--action update`, call `PUT /_apis/policy/configurations/{policyId}?api-version=7.1`.

6. **Delete policy** — if `--action delete`, call `DELETE /_apis/policy/configurations/{policyId}?api-version=7.1`.

7. **Display results** — show policy ID, type, branch scope, blocking status, and settings summary.

## Examples

```bash
/ado-branch-policy my-repo --branch main --policy min-reviewers --min-reviewers 2
/ado-branch-policy my-repo --branch main --policy build-validation --build-definition 42
/ado-branch-policy my-repo --branch "release/*" --policy merge-strategy --allowed-strategies squash --scope prefix
/ado-branch-policy my-repo --branch main --action list
```

## Error Handling

- **Policy type not found**: Invalid GUID — verify against the documented policy type IDs.
- **Duplicate policy**: A policy of that type already exists for the branch — use `--action update` instead.
- **Build definition not found**: List available definitions with `GET /_apis/build/definitions`.
