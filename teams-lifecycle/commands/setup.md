---
name: teams-lifecycle-setup
description: Set up the Teams Lifecycle Manager — configure Teams admin access, templates, and naming policies
argument-hint: "[--minimal]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Teams Lifecycle Setup

Guided setup for Teams lifecycle management.

## Step 1: Check Prerequisites

- Graph API access with `Team.Create`, `Group.ReadWrite.All`, `Reports.Read.All`
- Teams Administrator role for governance settings

## Step 2: Review Naming Policy

Ask the user:
- "Do you have a team naming convention?" (e.g., PRJ-Department-Name-Year)
- "Are there any blocked words?"
- Check existing group naming policy in directory settings

## Step 3: Review Templates

List available team templates:
```
GET https://graph.microsoft.com/v1.0/teamwork/teamTemplates
```

Ask: "Which templates should be available for new projects?"

## Step 4: Review Sensitivity Labels

Check available sensitivity labels and ask which should be offered during team creation.

## Step 5: Output Summary

```markdown
# Teams Lifecycle Setup Report

| Setting | Value |
|---|---|
| Teams admin access | [OK / Missing] |
| Naming convention | [convention or "none"] |
| Templates available | [count] |
| Sensitivity labels | [count available] |
| Expiration policy | [Active / Not configured] |
```
