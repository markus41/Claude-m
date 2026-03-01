---
name: planner-bucket-create
description: Create a new bucket in a Planner plan
argument-hint: "<bucket-name> --plan <plan-id>"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Create Planner Bucket

Create a new bucket in a Planner plan.

## Instructions

1. Create the bucket: `POST /planner/buckets` with `name`, `planId`, and `orderHint`.
2. Display the bucket ID and name.
