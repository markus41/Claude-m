---
name: swa-config
description: Generate or update staticwebapp.config.json with routes, auth, and headers
argument-hint: "[--spa] [--auth] [--headers]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - AskUserQuestion
---

# Configure Static Web App

Generate or update the staticwebapp.config.json file.

## Step 1: Detect Framework

Check for package.json, angular.json, next.config.js, etc. to determine the framework.

## Step 2: Generate Configuration

Based on flags and framework, generate a configuration with:
- **--spa**: Add navigation fallback for single-page apps
- **--auth**: Add authentication routes and role-based access
- **--headers**: Add security headers (CSP, X-Frame-Options, etc.)

## Step 3: Write Config File

Write staticwebapp.config.json to the project root.

## Step 4: Output Summary

Display the generated routes, auth configuration, and header policies.
