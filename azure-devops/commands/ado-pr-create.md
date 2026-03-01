---
name: ado-pr-create
description: Create a pull request in an Azure DevOps repository
argument-hint: "--source <branch> --target <branch> --title <title> [--repo <repo>] [--reviewers <user-id-1>,<user-id-2>]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Create Pull Request

Create a pull request in an Azure DevOps Git repository.

## Instructions

1. Build the PR body with `sourceRefName`, `targetRefName`, `title`, optional `description` and `reviewers`.
2. Call `POST /_apis/git/repositories/{repoId}/pullrequests?api-version=7.1`.
3. Display the PR ID, URL, and status.
