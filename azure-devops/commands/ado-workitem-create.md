---
name: ado-workitem-create
description: Create a work item (User Story, Bug, Task) in Azure DevOps
argument-hint: "<title> --type 'User Story'|Bug|Task|Feature [--assign <email>] [--iteration <path>] [--area <path>]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Create Azure DevOps Work Item

Create a new work item in Azure DevOps Boards.

## Instructions

1. Build JSON Patch body with fields: `System.Title`, `System.WorkItemType`, optionally `System.AssignedTo`, `System.IterationPath`, `System.AreaPath`.
2. Call `POST /_apis/wit/workitems/$<type>?api-version=7.1` with `Content-Type: application/json-patch+json`.
3. Display the work item ID, URL, and assigned values.
