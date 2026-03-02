---
name: setup
description: Set up the Azure Static Web Apps plugin — install SWA CLI, configure Azure subscription
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

# Azure Static Web Apps Setup

Guide the user through setting up Azure Static Web Apps development tools.

## Step 1: Check Prerequisites

Verify Node.js and npm are installed:

```bash
node --version
npm --version
```

## Step 2: Install SWA CLI

```bash
npm install -g @azure/static-web-apps-cli
swa --version
```

## Step 3: Install Azure CLI (optional)

For ARM API management:
```bash
az --version
```

## Step 4: Authenticate

```bash
swa login
```

This opens a browser for Azure authentication.

## Step 5: Verify Setup

```bash
swa --help
```

## Step 6: Output Summary

```markdown
# SWA Plugin Setup Report

| Setting | Value |
|---|---|
| Node.js version | [version] |
| SWA CLI version | [version] |
| Azure CLI | [version / not installed] |
| Auth status | [logged in / not logged in] |
```

If `--minimal` is passed, stop after Step 2.
