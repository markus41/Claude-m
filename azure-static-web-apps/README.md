# Azure Static Web Apps Plugin

Build and deploy JAMstack and SPA applications with Azure Static Web Apps. Covers built-in authentication, managed Functions API backends, PR preview environments, staticwebapp.config.json routing, custom domains, and the SWA CLI for local development.

## What this plugin helps with
- Create and manage Azure Static Web App resources
- Generate and configure staticwebapp.config.json for routing, auth, and headers
- Set up authentication with Azure AD, GitHub, and custom OIDC providers
- Create managed Functions API backends
- Enable PR preview environments for team review

## Included commands
- `/setup` — Install SWA CLI, authenticate with Azure
- `/swa-create` — Create a new Static Web App resource
- `/swa-config` — Generate or update staticwebapp.config.json
- `/swa-api-deploy` — Create and deploy managed Functions API
- `/swa-auth-configure` — Configure authentication providers

## Skill
- `skills/azure-static-web-apps/SKILL.md` — Comprehensive Azure Static Web Apps reference

## Agent
- `agents/swa-reviewer.md` — Reviews SWA configurations for correctness and security

## Required Azure Permissions
| Permission | Purpose |
|---|---|
| Contributor RBAC | Create and manage SWA resources |
| GitHub PAT (repo scope) | Link SWA to a GitHub repository |
