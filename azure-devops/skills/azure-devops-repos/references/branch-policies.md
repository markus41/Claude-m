# Azure Repos Branch Policies Reference

## Overview

Branch policies enforce code quality gates on pull requests in Azure Repos. They are configured per-repository and per-branch (or branch pattern), ensuring that all code changes meet review, build, and compliance standards before merging. This reference covers every policy type, their configuration via REST API and CLI, multi-scope patterns, and common recipes.

---

## Policy Type GUIDs

| Policy | Type GUID | Description |
|--------|-----------|-------------|
| Minimum number of reviewers | `fa4e907d-c16b-452d-8106-7efa0cb84489` | Require N approvals before merge |
| Build validation | `0609b952-1397-4640-95ec-e00a01b2f659` | Require a successful build pipeline |
| Required reviewers (by path) | `fd2167ab-b0be-447a-8ec8-39368250530e` | Auto-add reviewers when specific file paths change |
| Comment resolution | `c6a1889d-b943-4856-b76f-9e46bb6b0df3` | All PR comments must be resolved |
| Work item linking | `40e92b44-2fe1-4dd6-b3d8-74a9c21d0c6e` | Require linked work items |
| Merge strategy | `fa4e907d-c16b-452d-8106-7efa0cb84489` | Enforce specific merge types (squash, rebase, etc.) |
| Status check | `cbdc66da-9728-4af8-aada-9a5a32e4a226` | Require external status check to pass |
| Auto-reviewers | `fd2167ab-b0be-447a-8ec8-39368250530e` | Same GUID as required reviewers; path-based auto-assignment |

---

## REST API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/_apis/policy/configurations?api-version=7.1` | List all policy configurations in a project |
| GET | `/_apis/policy/configurations/{configurationId}?api-version=7.1` | Get a specific policy configuration |
| POST | `/_apis/policy/configurations?api-version=7.1` | Create a new policy configuration |
| PUT | `/_apis/policy/configurations/{configurationId}?api-version=7.1` | Replace an entire policy configuration |
| PATCH | `/_apis/policy/configurations/{configurationId}?api-version=7.1` | Partial update a policy configuration |
| DELETE | `/_apis/policy/configurations/{configurationId}?api-version=7.1` | Delete a policy configuration |
| GET | `/_apis/policy/types?api-version=7.1` | List available policy types |
| GET | `/_apis/policy/evaluations?artifactId={pullRequestId}&api-version=7.1` | Get policy evaluations for a PR |

---

## Scope Configuration

Every policy configuration includes a `scope` array that defines which branches it applies to.

### Scope Options

| Field | Values | Description |
|-------|--------|-------------|
| `repositoryId` | GUID or `null` | `null` = all repos in project |
| `refName` | `refs/heads/main`, `refs/heads/release/*` | Branch ref pattern |
| `matchKind` | `exact`, `prefix` | `exact` = specific branch; `prefix` = wildcard pattern |

### Examples

```json
// Exact branch match
"scope": [{
  "repositoryId": "<repo-guid>",
  "refName": "refs/heads/main",
  "matchKind": "exact"
}]

// All release branches
"scope": [{
  "repositoryId": "<repo-guid>",
  "refName": "refs/heads/release/",
  "matchKind": "prefix"
}]

// All branches in all repos (project-wide)
"scope": [{
  "repositoryId": null,
  "refName": null,
  "matchKind": "prefix"
}]

// Multiple scopes in one config
"scope": [
  { "repositoryId": "<repo-guid>", "refName": "refs/heads/main", "matchKind": "exact" },
  { "repositoryId": "<repo-guid>", "refName": "refs/heads/release/", "matchKind": "prefix" }
]
```

---

## Policy Configurations

### Minimum Reviewers

```json
POST /_apis/policy/configurations?api-version=7.1
{
  "isEnabled": true,
  "isBlocking": true,
  "type": { "id": "fa4e907d-c16b-452d-8106-7efa0cb84489" },
  "settings": {
    "minimumApproverCount": 2,
    "creatorVoteCounts": false,
    "allowDownvotes": false,
    "resetOnSourcePush": true,
    "requireVoteOnLastIteration": true,
    "scope": [{
      "repositoryId": "<repo-guid>",
      "refName": "refs/heads/main",
      "matchKind": "exact"
    }]
  }
}
```

| Setting | Type | Description |
|---------|------|-------------|
| `minimumApproverCount` | int | Number of approvals required (1-10) |
| `creatorVoteCounts` | bool | Whether PR author's vote counts toward the minimum |
| `allowDownvotes` | bool | Whether PRs with rejection votes can still complete |
| `resetOnSourcePush` | bool | Clear approvals when source branch is updated |
| `requireVoteOnLastIteration` | bool | Require votes on the latest iteration |

### Build Validation

```json
{
  "isEnabled": true,
  "isBlocking": true,
  "type": { "id": "0609b952-1397-4640-95ec-e00a01b2f659" },
  "settings": {
    "buildDefinitionId": 42,
    "queueOnSourceUpdateOnly": true,
    "manualQueueOnly": false,
    "displayName": "CI Build Validation",
    "validDuration": 720,
    "filenamePatterns": ["*.cs", "*.csproj"],
    "scope": [{
      "repositoryId": "<repo-guid>",
      "refName": "refs/heads/main",
      "matchKind": "exact"
    }]
  }
}
```

| Setting | Type | Description |
|---------|------|-------------|
| `buildDefinitionId` | int | Pipeline definition to trigger |
| `queueOnSourceUpdateOnly` | bool | Only re-queue if source branch changed (not target) |
| `manualQueueOnly` | bool | If true, validation build must be manually triggered |
| `displayName` | string | Name shown in the PR policies panel |
| `validDuration` | int | Minutes the build result remains valid (0 = forever) |
| `filenamePatterns` | string[] | Only trigger when matching files change (optional) |

### Required Reviewers by File Path

```json
{
  "isEnabled": true,
  "isBlocking": true,
  "type": { "id": "fd2167ab-b0be-447a-8ec8-39368250530e" },
  "settings": {
    "requiredReviewerIds": ["<user-or-group-id-1>", "<user-or-group-id-2>"],
    "filenamePatterns": ["/src/security/*", "*.config"],
    "addedFilesOnly": false,
    "message": "Changes to security code require security team review.",
    "scope": [{
      "repositoryId": "<repo-guid>",
      "refName": "refs/heads/main",
      "matchKind": "exact"
    }]
  }
}
```

| Setting | Type | Description |
|---------|------|-------------|
| `requiredReviewerIds` | string[] | User or group GUIDs that must approve |
| `filenamePatterns` | string[] | File path patterns that trigger the requirement |
| `addedFilesOnly` | bool | If true, only trigger on newly added files |
| `message` | string | Shown to PR author explaining the requirement |

### Comment Resolution

```json
{
  "isEnabled": true,
  "isBlocking": true,
  "type": { "id": "c6a1889d-b943-4856-b76f-9e46bb6b0df3" },
  "settings": {
    "scope": [{
      "repositoryId": "<repo-guid>",
      "refName": "refs/heads/main",
      "matchKind": "exact"
    }]
  }
}
```

### Work Item Linking

```json
{
  "isEnabled": true,
  "isBlocking": true,
  "type": { "id": "40e92b44-2fe1-4dd6-b3d8-74a9c21d0c6e" },
  "settings": {
    "scope": [{
      "repositoryId": "<repo-guid>",
      "refName": "refs/heads/main",
      "matchKind": "exact"
    }]
  }
}
```

### Merge Strategy

```json
{
  "isEnabled": true,
  "isBlocking": true,
  "type": { "id": "fa4e907d-c16b-452d-8106-7efa0cb84489" },
  "settings": {
    "allowNoFastForward": true,
    "allowSquash": true,
    "allowRebase": false,
    "allowRebaseMerge": false,
    "scope": [{
      "repositoryId": "<repo-guid>",
      "refName": "refs/heads/main",
      "matchKind": "exact"
    }]
  }
}
```

| Setting | Type | Description |
|---------|------|-------------|
| `allowNoFastForward` | bool | Allow merge commit (no fast-forward) |
| `allowSquash` | bool | Allow squash merge |
| `allowRebase` | bool | Allow rebase (no merge commit) |
| `allowRebaseMerge` | bool | Allow rebase with merge commit |

### Status Check

```json
{
  "isEnabled": true,
  "isBlocking": true,
  "type": { "id": "cbdc66da-9728-4af8-aada-9a5a32e4a226" },
  "settings": {
    "statusGenre": "my-service",
    "statusName": "security-scan",
    "authorId": "<service-principal-id>",
    "invalidateOnSourcePush": true,
    "scope": [{
      "repositoryId": "<repo-guid>",
      "refName": "refs/heads/main",
      "matchKind": "exact"
    }]
  }
}
```

| Setting | Type | Description |
|---------|------|-------------|
| `statusGenre` | string | Category of the status (namespacing) |
| `statusName` | string | Specific status name to check |
| `authorId` | string | Service principal that posts the status |
| `invalidateOnSourcePush` | bool | Reset status when source branch updated |

---

## CLI Commands

```bash
# List policies for a branch
az repos policy list --repository-id <repo-id> --branch main --output table

# Create minimum reviewers policy
az repos policy approver-count create \
  --repository-id <repo-id> \
  --branch main \
  --minimum-approver-count 2 \
  --creator-vote-counts false \
  --reset-on-source-push true \
  --enabled true \
  --blocking true

# Create build validation policy
az repos policy build create \
  --repository-id <repo-id> \
  --branch main \
  --build-definition-id 42 \
  --enabled true \
  --blocking true \
  --display-name "CI Validation" \
  --valid-duration 720 \
  --queue-on-source-update-only true

# Create comment resolution policy
az repos policy comment-required create \
  --repository-id <repo-id> \
  --branch main \
  --enabled true \
  --blocking true

# Create work item linking policy
az repos policy work-item-linking create \
  --repository-id <repo-id> \
  --branch main \
  --enabled true \
  --blocking true

# Create merge strategy policy
az repos policy merge-strategy create \
  --repository-id <repo-id> \
  --branch main \
  --allow-squash true \
  --allow-no-fast-forward true \
  --allow-rebase false \
  --allow-rebase-merge false \
  --enabled true \
  --blocking true

# Update a policy
az repos policy update --id <policy-id> --blocking false

# Delete a policy
az repos policy delete --id <policy-id> --yes
```

---

## Common Policy Matrix Recipes

### Production Branch (main)

| Policy | Configuration | Blocking |
|--------|--------------|----------|
| Minimum reviewers | 2 approvals, resetOnSourcePush=true, creatorVoteCounts=false | Yes |
| Build validation | CI pipeline, validDuration=720 min | Yes |
| Comment resolution | All comments resolved | Yes |
| Work item linking | Required | Yes |
| Merge strategy | Squash only | Yes |
| Required reviewers | Security team for `/src/security/*`, `/src/auth/*` | Yes |

### Release Branches (release/*)

| Policy | Configuration | Blocking |
|--------|--------------|----------|
| Minimum reviewers | 2 approvals, resetOnSourcePush=true | Yes |
| Build validation | Release pipeline, validDuration=0 (must pass fresh) | Yes |
| Comment resolution | All comments resolved | Yes |
| Required reviewers | Release manager for all paths | Yes |
| Merge strategy | No fast-forward only (preserve merge history) | Yes |

### Feature Branches (feature/*)

| Policy | Configuration | Blocking |
|--------|--------------|----------|
| Minimum reviewers | 1 approval, creatorVoteCounts=false | Yes |
| Build validation | CI pipeline, validDuration=720 min | Optional (non-blocking) |
| Comment resolution | All comments resolved | No (advisory) |

---

## Policy Evaluations for a Pull Request

```bash
# Get policy evaluation status for a PR
GET /_apis/policy/evaluations?artifactId=vstfs:///CodeReview/CodeReviewId/{project-id}/{pull-request-id}&api-version=7.1

# Response includes each policy evaluation:
# {
#   "evaluationId": "...",
#   "configuration": { "type": { "id": "..." }, ... },
#   "status": "approved" | "rejected" | "running" | "queued" | "notApplicable",
#   "context": { ... }
# }
```

---

## Error Codes

| Error | Meaning | Remediation |
|-------|---------|-------------|
| `TF401179` | PR blocked by policy | Check which policies are failing in the PR detail |
| `TF400813` | Unauthorized to modify policies | Need Project Administrator permission |
| `PolicyTypeNotFound` | Invalid policy type GUID | Verify GUID from `/_apis/policy/types` |
| `DuplicatePolicy` | Policy with same type/scope already exists | Update existing policy instead of creating new |
| `InvalidScope` | Branch ref pattern invalid | Use `refs/heads/` prefix; verify matchKind |

---

## Common Patterns and Gotchas

**1. Policies persist by ref pattern, not branch existence**
Deleting and recreating a branch does not remove its policies. Policies match by `refName` and `matchKind`. Use the API to delete unwanted policies.

**2. `isBlocking: false` makes policies advisory**
Non-blocking policies show warnings but do not prevent merge. Use for gradual rollout of new requirements.

**3. Multiple build validation policies can coexist**
You can require multiple build pipelines to pass (e.g., CI + security scan + lint). Each is a separate policy configuration.

**4. Required reviewers are additive with minimum reviewers**
If you have a 2-reviewer minimum policy AND a required-reviewer policy, both must be satisfied. The required reviewer's approval counts toward the minimum.

**5. Policy configurations are project-scoped**
Use `repositoryId: null` to apply a policy across all repos in a project. Per-repo policies override project-wide policies only if they are more restrictive.

**6. `validDuration: 0` means the build must pass fresh every time**
For release branches, set `validDuration: 0` to ensure the latest code is always validated. For feature branches, use 720+ minutes to avoid excessive rebuilds.

**7. Status check policies require an external service**
The external service must post a status to the PR using the Git statuses API before the policy can evaluate. The `statusGenre` and `statusName` must match exactly.

**8. Scope limit is 10 scopes per configuration**
If you need to cover more than 10 branches, create separate policy configurations or use `prefix` matching with a common branch naming convention.
