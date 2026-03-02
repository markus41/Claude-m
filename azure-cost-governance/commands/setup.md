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

## Step 1: Confirm Billing Scope

Confirm the billing scope for analysis: subscription, management group, or tenant. Provide the explicit scope path (e.g., `/subscriptions/<id>` or `/providers/Microsoft.Management/managementGroups/<name>`).

## Step 2: Confirm Target Period

Confirm the target time period for analysis. Common presets: last 30 days, last 90 days, month-to-date (MTD), quarter-to-date (QTD). Custom date ranges use explicit `start` and `end` dates.

## Step 3: Confirm Currency and Dimensions

Confirm the reporting currency (e.g., USD, EUR) and the cost analysis dimensions to group by — service name, resource group, tag, meter category, or location.

## Step 4: Produce Execution Plan

Produce a short execution plan before running optimization actions — specify which commands to run and in what order.
