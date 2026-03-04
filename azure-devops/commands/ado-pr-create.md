---
name: ado-pr-create
description: Create a pull request in an Azure DevOps repository
argument-hint: "--source <branch> --target <branch> --title <title> [--repo <repo>] [--reviewers <id,...>] [--draft] [--auto-complete] [--merge-strategy squash|merge|rebase|rebase-merge]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Create Pull Request

Create a pull request in an Azure DevOps Git repository with full configuration for reviewers, auto-complete, work item linking, and merge strategy.

## Prerequisites

- Authenticated to Azure DevOps (run `/ado-setup` first)
- Source branch pushed to remote
- `Contribute to pull requests` permission on the repository

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--source` | Yes | Source branch name |
| `--target` | Yes | Target branch name (typically `main`) |
| `--title` | Yes | PR title |
| `--repo` | No | Repository name or ID (default: current repo) |
| `--description` | No | PR description body (Markdown supported) |
| `--reviewers` | No | Comma-separated reviewer identifiers (email, ID, or team name) |
| `--required-reviewers` | No | Comma-separated required reviewer IDs |
| `--draft` | No | Create as draft PR |
| `--auto-complete` | No | Enable auto-complete when all policies pass |
| `--merge-strategy` | No | Merge strategy: `squash`, `merge`, `rebase`, `rebase-merge` (default: `squash`) |
| `--delete-branch` | No | Delete source branch after merge (default: true) |
| `--work-items` | No | Comma-separated work item IDs to link |
| `--labels` | No | Comma-separated labels/tags |
| `--template` | No | Load PR description from a template file path |

## Instructions

1. **Resolve reviewer identities** — if `--reviewers` or `--required-reviewers` are provided, resolve display names or emails to Azure DevOps identity IDs via `GET /_apis/identities?searchFilter=General&filterValue={name}&api-version=7.1`.

2. **Load template** — if `--template` is specified, read the file content and use it as the PR description.

3. **Build PR body**:
   ```json
   {
     "sourceRefName": "refs/heads/{source}",
     "targetRefName": "refs/heads/{target}",
     "title": "{title}",
     "description": "{description}",
     "isDraft": false,
     "reviewers": [
       { "id": "{reviewer-id}", "isRequired": true }
     ],
     "labels": [{ "name": "{label}" }],
     "workItemRefs": [{ "id": "{work-item-id}" }]
   }
   ```

4. **Create PR** — call `POST /_apis/git/repositories/{repoId}/pullrequests?api-version=7.1`.
   CLI: `az repos pr create --source-branch {source} --target-branch {target} --title "{title}" --draft --auto-complete --squash --delete-source-branch`.

5. **Set auto-complete** — if `--auto-complete` is specified, call `PATCH /_apis/git/repositories/{repoId}/pullrequests/{prId}?api-version=7.1` with:
   ```json
   {
     "autoCompleteSetBy": { "id": "{current-user-id}" },
     "completionOptions": {
       "mergeStrategy": "squash",
       "deleteSourceBranch": true,
       "transitionWorkItems": true,
       "mergeCommitMessage": "{title}"
     }
   }
   ```

6. **Add work item links** — if `--work-items` was not included in the creation body, link them via `PATCH` with `workItemRefs`.

7. **Display results** — show PR ID, URL, status, reviewers, linked work items, and merge strategy.

## Examples

```bash
/ado-pr-create --source feature/auth --target main --title "Add OAuth support" --reviewers "alice@contoso.com,bob@contoso.com" --auto-complete --merge-strategy squash
/ado-pr-create --source fix/bug-123 --target main --title "Fix null ref" --draft --work-items 123,456
/ado-pr-create --source release/v2 --target main --title "Release v2.0" --template .azuredevops/pull_request_template.md --labels release,v2
```

## Error Handling

- **409 Conflict**: An active PR already exists for this source/target pair — show existing PR link.
- **No commits between branches**: Source branch is up to date with target — inform user.
- **Reviewer not found**: Identity search returned no results — ask user to verify email or team name.
- **Branch not found**: Source or target branch does not exist — list available branches.
