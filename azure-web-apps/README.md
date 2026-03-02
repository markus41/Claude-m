# Azure Web Apps Plugin

Create, deploy, and manage Azure App Service web apps via ARM REST API and Azure CLI. Covers deployment slots for zero-downtime deployments, managed identity for passwordless auth, Key Vault integration for secrets, and CI/CD with GitHub Actions.

## What this plugin helps with
- Create App Service Plans and Web Apps
- Deploy via ZIP, GitHub Actions, Docker, or Local Git
- Manage deployment slots for blue-green deployments
- Configure app settings with Key Vault references
- Bind custom domains and TLS certificates

## Included commands
- `/setup` — Install Azure CLI, authenticate, and verify App Service access
- `/webapp-create` — Create a web app with an App Service Plan
- `/webapp-deploy` — Deploy code via ZIP, GitHub Actions, or Docker
- `/webapp-slots` — Create and swap deployment slots
- `/webapp-config` — Manage app settings, domains, and TLS

## Skill
- `skills/azure-web-apps/SKILL.md` — Comprehensive Azure App Service reference

## Agent
- `agents/webapp-reviewer.md` — Reviews App Service configurations for security and best practices

## Required Azure RBAC Roles
| Role | Purpose |
|---|---|
| Website Contributor | Manage web apps |
| Web Plan Contributor | Manage App Service Plans |
| Contributor | Full resource group management |
