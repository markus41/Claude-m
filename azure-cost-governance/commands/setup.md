---
name: setup
description: Prepare Azure cost governance analysis by confirming scope, timeframe, dimensions, and an execution plan.
argument-hint: "[--scope <subscription|management-group|tenant>] [--period <last-30-days|last-90-days|custom>] [--currency <code>] [--dimensions <service,resource-group,tag,...>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Setup

Use this command before cost analysis tasks.

1. Confirm billing scope (subscription, management group, or tenant).
2. Confirm target period (for example: last 30/90 days).
3. Confirm currency and cost dimensions (service, resource group, tag).
4. Produce a short plan before running optimization actions.
