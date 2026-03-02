# Power Pages Plugin

Build and manage Microsoft Power Pages (formerly Portals) websites backed by Dataverse. Design page templates with Liquid, create multi-step web forms, configure table permissions and web roles, and manage authentication providers.

## What this plugin helps with
- Create and manage Power Pages sites and web pages
- Author Liquid templates with FetchXML data queries
- Build multi-step web forms for data collection
- Configure table permissions and web roles for security
- Set up authentication with Azure AD B2C or external OIDC providers

## Included commands
- `/setup` — Install PAC CLI, authenticate to Dataverse, verify portal access
- `/pages-site-create` — Create a new Power Pages site with home page
- `/pages-template-apply` — Create or update web templates with Liquid content
- `/pages-webform-create` — Scaffold multi-step web forms
- `/pages-permissions` — Configure table permissions and web roles

## Skill
- `skills/power-pages/SKILL.md` — Comprehensive Power Pages reference covering Liquid, forms, permissions, and authentication

## Agent
- `agents/pages-reviewer.md` — Reviews Liquid template quality, table permission security, and web role assignments

## Required Dataverse Roles
| Role | Purpose |
|---|---|
| System Administrator | Full access to all portal configuration tables |
| System Customizer | Create and modify portal components |

## Coverage against Microsoft documentation

| Feature domain | Coverage status |
|---|---|
| Site creation and page management | Covered |
| Liquid template language | Covered |
| Web forms (multi-step) | Covered |
| Table permissions and web roles | Covered |
| Authentication providers | Covered |
| PAC CLI for local development | Covered |
