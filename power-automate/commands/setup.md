---
name: flow-setup
description: Prepare Power Automate flow work by confirming environment boundaries, connectors, scale expectations, and failure handling.
argument-hint: "[--environment <name>] [--solution <name>] [--connectors <connector,...>] [--trigger-volume <low|medium|high>] [--sla <minutes>]"
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

Prepare for Power Automate flow work by confirming context and constraints.

## Step 1: Identify Environment and Solution Boundaries

Identify the target Power Platform environment and, if applicable, the solution boundary for solution-aware flows. Confirm whether flows will span environments.

## Step 2: Identify Connectors and Auth Requirements

Identify which connectors the flow uses (SharePoint, Outlook, Dataverse, HTTP, etc.) and the authentication requirements for each — service principal, per-user connection, or connection reference.

## Step 3: Capture Trigger Volume and SLAs

Capture the expected trigger volume (low: <50/day, medium: 50-500/day, high: >500/day) and the target SLA for end-to-end completion time.

## Step 4: Confirm Error Handling and Notifications

Confirm error-handling expectations: retry policies, scope-based try/catch patterns, and notification targets for failure alerts (email, Teams, or custom webhook).
