---
name: Azure DevOps Repos
description: >
  Deep expertise in Azure Repos — Git repository management, pull request workflows,
  branch policies, code search, and passwordless Git authentication via GCM, SSH, Entra
  OAuth, and Workload Identity Federation.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - azure devops repo
  - azure repos
  - git azure
  - pull request azure
  - branch policy
  - git credential manager
  - passwordless git
  - ado repo
  - ado pr
  - ado git
---

# Azure DevOps Repos

## Shared Workflow Routing
- Use the shared workflow spec for deterministic multi-plugin routing: [`workflows/multi-plugin-workflows.md`](../../../workflows/multi-plugin-workflows.md#incident-triage-azure-monitor--azure-functions--azure-devops).
- Apply the trigger phrases, handoff contracts, auth prerequisites, validation checkpoints, and stop conditions before escalating to the next plugin.

## Overview

Azure Repos provides unlimited free private Git repositories with enterprise-grade pull request workflows, branch policies, and code search. Every repository supports branch policies that enforce code quality gates — minimum reviewers, build validation, comment resolution, work item linking, and merge strategy control.

Git authentication supports multiple passwordless options: Git Credential Manager (GCM) with Entra OAuth broker, SSH keys, Workload Identity Federation (WIF) for CI/CD, and managed identity for Azure-hosted compute. PATs remain supported but are discouraged for interactive use.

## REST API — Repositories

| Method | Endpoint | Required Permissions | Key Parameters |
|--------|----------|---------------------|----------------|
| GET | `/_apis/git/repositories?api-version=7.1` | Code (Read) | `$top`, `continuationToken` |
| GET | `/_apis/git/repositories/{repoId}?api-version=7.1` | Code (Read) | `repoId` (GUID or name) |
| POST | `/_apis/git/repositories?api-version=7.1` | Code (Read & Write) | Body: `name`, `project` |
| PATCH | `/_apis/git/repositories/{repoId}?api-version=7.1` | Code (Read & Write) | Body: `name`, `defaultBranch` |
| DELETE | `/_apis/git/repositories/{repoId}?api-version=7.1` | Project Admin | — |
| GET | `/_apis/git/repositories/{repoId}/refs?api-version=7.1` | Code (Read) | `filter=heads/` |
| POST | `/_apis/git/repositories/{repoId}/refs?api-version=7.1` | Code (Read & Write) | Body: `[{ name, oldObjectId, newObjectId }]` |
| GET | `/_apis/git/repositories/{repoId}/commits?api-version=7.1` | Code (Read) | `searchCriteria.*`, `$top` |
| GET | `/_apis/git/repositories/{repoId}/items?api-version=7.1` | Code (Read) | `path`, `includeContent` |
| POST | `/_apis/git/repositories/{repoId}/pushes?api-version=7.1` | Code (Read & Write) | Body: `refUpdates`, `commits` |
| POST | `/_apis/search/codesearchresults?api-version=7.1-preview` | Code (Read) | Body: `searchText`, `filters` |

## REST API — Pull Requests

| Method | Endpoint | Key Parameters |
|--------|----------|----------------|
| GET | `/_apis/git/repositories/{repoId}/pullrequests?api-version=7.1` | `searchCriteria.status`, `$top` |
| POST | `/_apis/git/repositories/{repoId}/pullrequests?api-version=7.1` | Body: `sourceRefName`, `targetRefName`, `title`, `reviewers` |
| GET | `/_apis/git/repositories/{repoId}/pullrequests/{prId}?api-version=7.1` | — |
| PATCH | `/_apis/git/repositories/{repoId}/pullrequests/{prId}?api-version=7.1` | Body: `status`, `autoCompleteSetBy`, `completionOptions` |
| GET | `/_apis/git/repositories/{repoId}/pullrequests/{prId}/threads?api-version=7.1` | `$top` |
| POST | `/_apis/git/repositories/{repoId}/pullrequests/{prId}/threads?api-version=7.1` | Body: `comments`, `status` |

### Create PR Body
```json
{
  "sourceRefName": "refs/heads/feature/auth",
  "targetRefName": "refs/heads/main",
  "title": "Add OAuth 2.0 PKCE authentication",
  "description": "Implements the PKCE flow for SPA clients.\n\nCloses #1234",
  "reviewers": [{ "id": "<reviewer-user-id>" }],
  "isDraft": false,
  "completionOptions": {
    "mergeStrategy": "squash",
    "deleteSourceBranch": true,
    "transitionWorkItems": true
  }
}
```

## REST API — Branch Policies

| Method | Endpoint | Key Parameters |
|--------|----------|----------------|
| GET | `/_apis/policy/configurations?api-version=7.1` | `scope.repositoryId`, `scope.refName` |
| POST | `/_apis/policy/configurations?api-version=7.1` | Body: `isEnabled`, `isBlocking`, `type`, `settings` |
| PUT | `/_apis/policy/configurations/{configId}?api-version=7.1` | Full replacement body |
| DELETE | `/_apis/policy/configurations/{configId}?api-version=7.1` | — |

### Policy Type GUIDs

| Policy | GUID |
|--------|------|
| Minimum reviewers | `fa4e907d-c16b-4a4c-9dfa-4916e5d171ab` |
| Build validation | `0609b952-1397-4640-95ec-e00a01b2c241` |
| Comment resolution | `c6a1889d-b943-4856-b76f-9e46bb6b0df2` |
| Work item linking | `40e92b44-2fe1-4dd6-b3d8-74a9c21d0c6e` |
| Merge strategy | `fa4e907d-c16b-4a4c-9dfa-4906e5d171cb` |
| Required reviewers | `fd2167ab-b0be-447a-8ec8-39368250530e` |
| Status check | `cbdc66da-9728-4af8-aada-9a5a32e4a226` |

## Git Authentication — Quick Reference

| Method | Best For | Setup |
|--------|----------|-------|
| **GCM + Entra OAuth** | Developer workstations | Install GCM, set `credential.azreposCredentialType=oauth` |
| **SSH keys** | Linux/macOS developers | Generate ed25519 key, add to Azure DevOps SSH keys |
| **Workload Identity Federation** | CI/CD pipelines | Configure federated credential, use `az login --federated-token` |
| **Managed Identity** | Azure-hosted compute | Assign identity to VM/container, `az account get-access-token` |
| **PAT** | Legacy/service accounts | Generate PAT with Code scope, use as password |

## Best Practices

- Use GCM with Entra OAuth for interactive Git access — eliminates PAT management overhead.
- Configure branch policies on `main` and `release/*`: minimum 2 reviewers, build validation, comment resolution.
- Use `refs/heads/` prefix consistently in API calls (not bare branch names).
- Enable auto-complete on PRs to merge immediately when all checks pass.
- Use squash merge for feature branches, merge commit for release branches.
- Link work items to PRs via `#1234` syntax in PR description for traceability.
- Use code search API for cross-repo dependency discovery.
- Rotate PATs on a 90-day schedule; prefer WIF for automation.

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| Git repositories, pull requests, cherry-pick, code search | [`references/repos-prs.md`](./references/repos-prs.md) |
| Git authentication — GCM, SSH, WIF, managed identity, PAT rotation | [`references/git-authentication.md`](./references/git-authentication.md) |
| Branch policies — all types, scopes, configuration patterns | [`references/branch-policies.md`](./references/branch-policies.md) |
