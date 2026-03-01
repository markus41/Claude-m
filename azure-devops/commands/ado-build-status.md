---
name: ado-build-status
description: Check the status of recent pipeline builds
argument-hint: "[--pipeline <pipeline-id>] [--top <count>] [--branch <branch>]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Check Build Status

List recent pipeline runs and their status.

## Instructions

1. Call `GET /_apis/build/builds?api-version=7.1` with optional filters.
2. Display results as a table: Build ID, Pipeline, Branch, Status, Result, Duration, Queued By.
3. Highlight failed builds.
