# Azure Repos and Pull Requests Reference

## Overview

Azure Repos provides Git repository hosting with enterprise-grade pull request workflows, branch policies, code search, and a full REST API. This reference covers repository management, the complete PR lifecycle, branch policies, cherry-pick/revert operations, and code search.

---

## Repository REST API

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/_apis/git/repositories?api-version=7.1` | Code (Read) | `$top`, `continuationToken` | Lists all repos in a project |
| GET | `/_apis/git/repositories/{repoId}?api-version=7.1` | Code (Read) | — | `repoId` can be GUID or name |
| POST | `/_apis/git/repositories?api-version=7.1` | Code (Read & Write) | Body: `name`, `project` | Creates a new repository |
| PATCH | `/_apis/git/repositories/{repoId}?api-version=7.1` | Code (Read & Write) | Body: `name`, `defaultBranch` | Rename or change default branch |
| DELETE | `/_apis/git/repositories/{repoId}?api-version=7.1` | Project Admin | — | Soft-deletes; recoverable for 30 days |
| GET | `/_apis/git/repositories/{repoId}/refs?api-version=7.1` | Code (Read) | `filter=heads/`, `filterContains` | List branches and tags |
| POST | `/_apis/git/repositories/{repoId}/refs?api-version=7.1` | Code (Read & Write) | Body: array of `{ name, oldObjectId, newObjectId }` | Create or delete branch |
| GET | `/_apis/git/repositories/{repoId}/commits?api-version=7.1` | Code (Read) | `searchCriteria.itemVersion.version`, `$top` | List commits |
| GET | `/_apis/git/repositories/{repoId}/items?api-version=7.1` | Code (Read) | `path`, `versionDescriptor`, `includeContent` | Get file content or directory listing |
| POST | `/_apis/git/repositories/{repoId}/pushes?api-version=7.1` | Code (Read & Write) | Body: `refUpdates`, `commits` | Push one or more commits |
| GET | `/_apis/git/repositories/{repoId}/stats/branches?api-version=7.1` | Code (Read) | — | Branch ahead/behind counts vs. default |
| POST | `/_apis/search/codesearchresults?api-version=7.1-preview` | Code (Read) | Body: `searchText`, `filters`, `$top` | Cross-repo code search |

---

## Pull Request REST API

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/_apis/git/pullrequests?api-version=7.1` | Code (Read) | `searchCriteria.*`, `$top` | Search PRs across all repos in project |
| GET | `/_apis/git/repositories/{repoId}/pullrequests?api-version=7.1` | Code (Read) | `searchCriteria.status`, `searchCriteria.creatorId` | Repo-scoped PR list |
| POST | `/_apis/git/repositories/{repoId}/pullrequests?api-version=7.1` | Code (Read & Write) | Body: full PR create body | Create a new PR |
| GET | `/_apis/git/repositories/{repoId}/pullrequests/{prId}?api-version=7.1` | Code (Read) | — | Get full PR including merge status |
| PATCH | `/_apis/git/repositories/{repoId}/pullrequests/{prId}?api-version=7.1` | Code (Read & Write) | Body: fields to update | Update title, description, status |
| POST | `/_apis/git/repositories/{repoId}/pullrequests/{prId}/reviewers/{reviewerId}?api-version=7.1` | Code (Read & Write) | Body: `vote`, `isRequired` | Add/update reviewer vote |
| GET | `/_apis/git/repositories/{repoId}/pullrequests/{prId}/threads?api-version=7.1` | Code (Read) | `$top` | List comment threads |
| POST | `/_apis/git/repositories/{repoId}/pullrequests/{prId}/threads?api-version=7.1` | Code (Read & Write) | Body: `comments`, `threadContext` | Create a comment thread |
| PATCH | `/_apis/git/repositories/{repoId}/pullrequests/{prId}/threads/{threadId}?api-version=7.1` | Code (Read & Write) | Body: `status` | Resolve/reactivate a thread |
| PATCH | `/_apis/git/repositories/{repoId}/pullrequests/{prId}/threads/{threadId}/comments/{commentId}?api-version=7.1` | Code (Read & Write) | Body: `content` | Edit a comment |
| GET | `/_apis/git/repositories/{repoId}/pullrequests/{prId}/workitems?api-version=7.1` | Code (Read) | — | Get linked work items |
| POST | `/_apis/git/repositories/{repoId}/pullrequests/{prId}/labels?api-version=7.1` | Code (Read & Write) | Body: `name` | Add a label to a PR |
| GET | `/_apis/git/repositories/{repoId}/pullrequests/{prId}/statuses?api-version=7.1` | Code (Read) | — | Get external status contributions |

---

## Creating a Pull Request

```typescript
import axios from "axios";

const ORG = "myorg";
const PROJECT = "myproject";
const REPO_ID = "my-repo";
const PAT = process.env.ADO_PAT!;
const auth = Buffer.from(`:${PAT}`).toString("base64");

const BASE = `https://dev.azure.com/${ORG}/${PROJECT}/_apis/git/repositories/${REPO_ID}`;
const HEADERS = {
  Authorization: `Basic ${auth}`,
  "Content-Type": "application/json",
};

async function createPullRequest() {
  const body = {
    sourceRefName: "refs/heads/feature/my-feature",
    targetRefName: "refs/heads/main",
    title: "feat: add user authentication",
    description: [
      "## Summary",
      "Implements OAuth 2.0 PKCE flow for SPA clients.",
      "",
      "## Changes",
      "- Added `/auth/login` and `/auth/callback` endpoints",
      "- Added MSAL integration",
      "",
      "Closes #1234",
    ].join("\n"),
    reviewers: [{ id: "<reviewer-aad-object-id>" }],
    isDraft: false,
    workItemRefs: [{ id: "1234" }],
    completionOptions: {
      mergeCommitMessage: "Merge feature/my-feature into main",
      squashMerge: true,
      deleteSourceBranch: true,
    },
  };

  const response = await axios.post(
    `${BASE}/pullrequests?api-version=7.1`,
    body,
    { headers: HEADERS }
  );

  return response.data; // PR object with pullRequestId
}
```

---

## Completing (Merging) a Pull Request

```typescript
async function completePullRequest(prId: number, lastMergeSourceCommit: string) {
  const body = {
    status: "completed",
    lastMergeSourceCommit: {
      commitId: lastMergeSourceCommit,   // Must match current source commit
    },
    completionOptions: {
      mergeStrategy: "squash",           // squash | noFastForward | rebase | rebaseMerge
      deleteSourceBranch: true,
      transitionWorkItems: true,         // Auto-close linked work items
    },
  };

  const response = await axios.patch(
    `${BASE}/pullrequests/${prId}?api-version=7.1`,
    body,
    { headers: HEADERS }
  );

  return response.data;
}
```

---

## Branch Policy Configuration

### Policy Type GUIDs

| Policy | Type GUID |
|--------|-----------|
| Minimum number of reviewers | `fa4e907d-c16b-452d-8106-7efa0cb84489` |
| Build validation | `0609b952-1397-4640-95ec-e00a01b2f659` |
| Required reviewer by file path | `fd2167ab-b0be-447a-8ec8-39368250530e` |
| Comment requirements | `c6a1889d-b943-4856-b76f-9e46bb6b0df3` |
| Work item linking | `40e92b44-2fe1-4dd6-b3d8-74a9c21d0c6e` |
| Merge strategy | `fa4e907d-c16b-452d-8106-7efa0cb84489` |
| Status check required | `cbdc66da-9728-4af8-aada-9a5a32e4a226` |

### Create a Minimum Reviewers Policy

```typescript
async function createReviewerPolicy(
  repoId: string,
  branchRef: string,
  minimumApproverCount: number
) {
  const body = {
    isEnabled: true,
    isBlocking: true,
    type: { id: "fa4e907d-c16b-452d-8106-7efa0cb84489" },
    settings: {
      minimumApproverCount,
      creatorVoteCounts: false,          // Author cannot approve own PR
      allowDownvotes: false,
      resetOnSourcePush: true,           // Reset approvals when source branch updated
      requireVoteOnLastIteration: true,
      scope: [
        {
          repositoryId: repoId,
          refName: branchRef,            // e.g. "refs/heads/main"
          matchKind: "exact",            // exact | prefix
        },
      ],
    },
  };

  const response = await axios.post(
    `https://dev.azure.com/${ORG}/${PROJECT}/_apis/policy/configurations?api-version=7.1`,
    body,
    { headers: HEADERS }
  );

  return response.data;
}
```

### Create a Build Validation Policy

```typescript
async function createBuildValidationPolicy(
  repoId: string,
  branchRef: string,
  buildDefinitionId: number
) {
  const body = {
    isEnabled: true,
    isBlocking: true,
    type: { id: "0609b952-1397-4640-95ec-e00a01b2f659" },
    settings: {
      buildDefinitionId,
      queueOnSourceUpdateOnly: true,     // Do not requeue if only target branch changed
      manualQueueOnly: false,
      displayName: "CI Build Validation",
      validDuration: 720,                // Minutes policy result remains valid
      scope: [
        {
          repositoryId: repoId,
          refName: branchRef,
          matchKind: "exact",
        },
      ],
    },
  };

  const response = await axios.post(
    `https://dev.azure.com/${ORG}/${PROJECT}/_apis/policy/configurations?api-version=7.1`,
    body,
    { headers: HEADERS }
  );

  return response.data;
}
```

---

## Cherry-Pick and Revert via API

```typescript
// Cherry-pick a commit to another branch
async function cherryPick(
  repoId: string,
  commitId: string,
  targetBranch: string
) {
  const body = {
    generatedRefName: `refs/heads/cp-${commitId.substring(0, 8)}`,
    source: {
      commitId,
    },
    onto: targetBranch,    // e.g. "refs/heads/release/v2"
  };

  const response = await axios.post(
    `${BASE}/cherrypick?api-version=7.1`,
    body,
    { headers: HEADERS }
  );

  return response.data;  // Returns a cherry-pick operation; poll status
}

// Revert a commit (creates a new commit that undoes the changes)
async function revertCommit(
  repoId: string,
  commitId: string,
  targetBranch: string
) {
  const body = {
    generatedRefName: `refs/heads/revert-${commitId.substring(0, 8)}`,
    source: {
      commitId,
    },
    onto: targetBranch,
  };

  const response = await axios.post(
    `${BASE}/reverts?api-version=7.1`,
    body,
    { headers: HEADERS }
  );

  return response.data;
}
```

---

## Code Search API

```typescript
async function searchCode(query: string, repositories: string[]) {
  const body = {
    searchText: query,
    $skip: 0,
    $top: 25,
    filters: {
      Project: [PROJECT],
      Repository: repositories,
      CodeElement: ["def", "class"],  // Optional: "def" | "class" | "comment" | "ref"
    },
    $orderBy: [
      { field: "filename", sortOrder: "ASC" }
    ],
    includeFacets: true,
  };

  const response = await axios.post(
    `https://almsearch.dev.azure.com/${ORG}/_apis/search/codesearchresults?api-version=7.1-preview.1`,
    body,
    { headers: HEADERS }
  );

  return response.data;  // { count, results: [{ fileName, path, project, repository, matches }] }
}
```

---

## Branch Lock and Unlock

```typescript
// Lock a branch to prevent direct pushes
async function lockBranch(repoId: string, branchName: string, lock: boolean) {
  const body = { isLocked: lock };

  const response = await axios.patch(
    `${BASE}/refs/heads/${branchName}?api-version=7.1`,
    body,
    { headers: HEADERS }
  );

  return response.data;
}
```

---

## Reviewer Vote Values

| Value | Meaning |
|-------|---------|
| `10` | Approved |
| `5` | Approved with suggestions |
| `0` | No vote (reset) |
| `-5` | Waiting for author |
| `-10` | Rejected |

---

## Error Codes

| Code | Meaning | Remediation |
|------|---------|-------------|
| `TF401019` | Repository not found | Verify repo GUID or name; check project scope |
| `TF400813` | Unauthorized | Check PAT scopes: Code (Read), Code (Read & Write) |
| `TF40166` | PR source branch does not exist | Push the branch before creating the PR |
| `TF401179` | PR conflicts with a blocking policy | Resolve the policy violation (reviews, build, comments) |
| `TF400856` | Merge conflict | Rebase or merge target branch into source before completing |
| `TF401163` | PR auto-complete set but policies not met | All required policies must pass before auto-complete triggers |
| `GitRecallableObjectNotFound` | Commit ID not found (cherry-pick/revert) | Ensure commit exists in the source repo |
| `VstsSearchUnavailable` | Code search index not ready | Wait for indexing; available ~15 min after repo push |

---

## Limits

| Resource | Limit | Notes |
|---|---|---|
| PR description length | 4,000 characters | Truncated in UI if exceeded |
| Reviewers per PR | 100 | Includes required and optional |
| Comment threads per PR | No hard limit | UI degrades beyond ~1,000 threads |
| Repositories per project | 1,000 | Contact support for increase |
| Code search result size | 1,000 results per query | Use `$skip` for pagination; max 1,000 per page |
| Branch policy scopes per configuration | 10 | Create separate configurations per scope if needed |
| Push size | 5 GB | Large file support via Git LFS |
| LFS storage (free) | 2 GB | Purchase additional storage |
| File path length | 260 characters (Windows) | Longer paths may fail Windows agent checkouts |
| Concurrent PR builds | Limited by agent pool | Configure `maxParallel` on pool |

---

## Common Patterns and Gotchas

**1. Always capture `lastMergeSourceCommit` before completing**
The completion API requires the current source commit ID. Fetch the PR, read `lastMergeSourceCommit.commitId`, and pass it in the complete request. Stale IDs cause `TF400856`.

**2. Draft PRs bypass build validation policies**
PRs created with `isDraft: true` do not trigger build validation policies. If your pipeline auto-creates PRs, be explicit about the draft state.

**3. Branch policies are scoped to the policy configuration, not the branch**
Deleting and re-creating a branch does not remove associated policies. Policies persist by `refName` match. Use `prefix` match (`refs/heads/release/`) to cover all release branches with one policy.

**4. Required reviewers `isRequired: true` cannot approve their own changes**
Even if `creatorVoteCounts: true`, a PR creator who is also a required reviewer cannot fulfill their own required review.

**5. Auto-complete does not trigger immediately**
Setting `autoCompleteSetBy` puts the PR in queue; it completes after all blocking policies pass. If a new push occurs after auto-complete is set, policies reset and the PR waits again.

**6. Cherry-pick creates a new branch, not a direct push**
The cherry-pick API does not push directly to the target branch. It creates a new branch (`generatedRefName`). You must then create a PR from that branch.

**7. Code search indexing has a delay**
New repository content is indexed asynchronously. Expect up to 15 minutes for fresh pushes to appear in code search results.

**8. Reviewer votes reset on source branch push**
Policies configured with `resetOnSourcePush: true` clear all approvals when the source branch is updated. This is the recommended setting for main/release branches but can be frustrating during active development.

**9. PAT expiry affects CI service connections**
If a PAT is used for service connections or pipeline authentication, its expiry silently breaks pipelines. Use Azure AD service principals with federated credentials for longer-lived automation.

**10. Forks have a separate PR flow**
PRs from forks go through `forks.pullrequests` endpoint and have restricted variable access in pipelines (secrets not exposed to fork builds by default). Review the fork pipeline security settings before enabling.
