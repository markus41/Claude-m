---
name: ado-repo-create
description: Create a new Git repository in an Azure DevOps project
argument-hint: "<repo-name> [--project <project>] [--default-branch main]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Create Azure DevOps Repository

Create a new Git repository in the specified Azure DevOps project.

## Instructions

1. Call `POST /_apis/git/repositories?api-version=7.1` with `name` and `project`.
2. If `--default-branch` is specified, initialize with that branch.
3. Display the repo ID, clone URL (HTTPS and SSH), and web URL.
