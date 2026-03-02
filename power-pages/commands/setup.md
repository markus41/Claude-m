---
name: setup
description: Set up the Power Pages plugin — install PAC CLI, configure Dataverse connection, and verify portal access
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

# Power Pages Setup

Guide the user through setting up Power Pages development tools.

## Step 1: Check Prerequisites

Verify the Power Platform CLI (PAC) is installed:

```bash
pac --version
```

If PAC is not installed, instruct the user:
- Install via .NET tool: `dotnet tool install --global Microsoft.PowerApps.CLI.Tool`
- Or download from https://aka.ms/PowerAppsCLI

## Step 2: Authenticate to Dataverse

```bash
pac auth create --environment https://{org}.crm.dynamics.com
```

This opens a browser for interactive authentication. The user needs System Administrator or System Customizer role in the target environment.

## Step 3: Verify Power Pages Sites

```bash
pac pages list
```

This lists all Power Pages sites in the connected environment.

## Step 4: Install Node.js Dependencies (optional)

If the user wants to use the Dataverse Web API directly:

```bash
npm init -y && npm install @azure/identity node-fetch
```

## Step 5: Output Summary

Display the setup results:

```markdown
# Power Pages Plugin Setup Report

| Setting | Value |
|---|---|
| PAC CLI version | [version] |
| Dataverse environment | [org URL] |
| Auth status | [connected / not connected] |
| Power Pages sites found | [count] |
```

If `--minimal` is passed, stop after Step 1 (PAC CLI verification only).
