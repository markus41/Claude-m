---
name: ado-repo-create
description: Create a new Git repository in an Azure DevOps project
argument-hint: "<repo-name> [--project <project>] [--default-branch main] [--gitignore node|dotnet|python] [--import <url>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Create Azure DevOps Repository

Create a new Git repository in the specified Azure DevOps project, optionally initializing it with a .gitignore, importing from a URL, or forking an existing repo.

## Prerequisites

- Authenticated to Azure DevOps (run `/ado-setup` first)
- `Create repository` permission on the target project

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `<repo-name>` | Yes | Name of the new repository |
| `--project` | No | Target project (default: `ADO_PROJECT` env var) |
| `--default-branch` | No | Default branch name (default: `main`) |
| `--gitignore` | No | Initialize with .gitignore template: `node`, `dotnet`, `python`, `java`, `go` |
| `--import` | No | Import from a remote Git URL |
| `--fork` | No | Fork an existing repo by name or ID |

## Instructions

1. **Create the repository** — call `POST https://dev.azure.com/{org}/{project}/_apis/git/repositories?api-version=7.1` with body `{ "name": "<repo-name>" }`. Alternatively: `az repos create --name <repo-name> --project <project>`.

2. **Initialize default branch** — if `--default-branch` is specified (or defaults to `main`), push an initial commit:
   - Create a `POST /_apis/git/repositories/{repoId}/pushes?api-version=7.1` with a refUpdate creating `refs/heads/{branch}` from `0000000000000000000000000000000000000000` and a commit containing a README.md.

3. **Add .gitignore** — if `--gitignore` is specified, include the appropriate template content in the initial commit. Use the standard GitHub gitignore templates for the selected language.

4. **Import from URL** — if `--import` is specified, call `POST /_apis/git/repositories/{repoId}/importRequests?api-version=7.1` with `{ "parameters": { "gitSource": { "url": "<url>" } } }`. Poll until import completes.

5. **Fork existing repo** — if `--fork` is specified, call `POST /_apis/git/repositories?api-version=7.1` with `{ "name": "<repo-name>", "parentRepository": { "id": "<source-repo-id>" } }`.

6. **Set default branch** — call `PATCH /_apis/git/repositories/{repoId}?api-version=7.1` with `{ "defaultBranch": "refs/heads/{branch}" }`.

7. **Display results** — show:
   - Repository ID and name
   - Clone URL (HTTPS): `https://dev.azure.com/{org}/{project}/_git/{repo}`
   - Clone URL (SSH): `git@ssh.dev.azure.com:v3/{org}/{project}/{repo}`
   - Web URL
   - Default branch

## Examples

```bash
/ado-repo-create my-service --gitignore dotnet --default-branch main
/ado-repo-create migrated-app --import https://github.com/org/repo.git
/ado-repo-create my-fork --fork upstream-repo
```

## Error Handling

- **409 Conflict**: Repository name already exists — suggest a different name or confirm overwrite.
- **Import fails**: Check source URL is publicly accessible or provide credentials. Poll import status for error details.
- **403 Forbidden**: User lacks `Create repository` permission — advise contacting project admin.
