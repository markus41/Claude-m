---
name: setup
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

Prepare for flow work:
1. Identify environment and solution boundaries.
2. Identify connectors and auth requirements.
3. Capture expected trigger volume and SLAs.
4. Confirm error-handling and notification expectations.
