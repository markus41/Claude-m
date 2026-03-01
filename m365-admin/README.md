# m365-admin

Claude Code knowledge plugin for Microsoft 365 tenant administration via Microsoft Graph API.

## Purpose

This plugin provides Claude with deep expertise in M365 admin operations so it can generate correct code, scripts, and advice for managing users, groups, licenses, Exchange Online, SharePoint, and bulk operations. All content is markdown-based knowledge -- no runtime code or MCP servers.

## Coverage

| Area | API | Description |
|------|-----|-------------|
| Entra ID (Azure AD) | Microsoft Graph v1.0 | User CRUD, password resets, group management, role assignments, sign-in and audit logs |
| License Management | Microsoft Graph v1.0 | SKU inventory, license assignment/revocation, usage reporting, bulk migration |
| Exchange Online | Graph + PowerShell | Mailbox settings, auto-replies, shared mailboxes, distribution lists, delegates, mail flow rules |
| SharePoint Online | Graph + REST + PnP | Site creation, permissions, storage, sharing policies, hub sites, document libraries |
| Bulk Operations | Graph $batch | CSV-driven batch processing with validation, dry-run, rate limiting, and reporting |

## Setup

Run `/setup` to configure authentication and install dependencies:

```
/setup                          # Full guided setup
/setup --minimal                # Node.js dependencies only
/setup --with-exchange          # Include Exchange Online PowerShell module
/setup --with-sharepoint-pnp    # Include PnP PowerShell module
```

## Authentication

All operations use delegated authentication with interactive browser login (MSAL). Scopes are requested dynamically based on the operation following the principle of least privilege.

## Commands

| Command | Description |
|---------|-------------|
| `/setup` | Set up the plugin — Azure app registration, dependencies, connectivity |
| `/m365-user-create` | Create user(s) with license and group assignment |
| `/m365-user-offboard` | Full offboarding: disable, revoke, remove, convert |
| `/m365-license-assign` | Assign, change, or revoke licenses |
| `/m365-group-create` | Create security, M365, or distribution groups |
| `/m365-exchange-mailbox` | Shared mailbox, auto-reply, delegates, conversion |
| `/m365-sharepoint-site` | Site creation, permissions, sharing, hub sites |
| `/m365-audit` | Sign-in logs, directory audits, license reports |

## Agent

| Agent | Description |
|-------|-------------|
| `m365-admin-reviewer` | Reviews M365 scripts for API correctness, security, bulk safety, PowerShell patterns, and offboarding completeness |

## Structure

```
m365-admin/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── m365-admin/
│       ├── SKILL.md
│       ├── references/
│       │   ├── entra-id.md
│       │   ├── exchange-online.md
│       │   ├── sharepoint-admin.md
│       │   └── bulk-operations.md
│       └── examples/
│           ├── user-management.md
│           ├── license-management.md
│           ├── exchange-operations.md
│           └── sharepoint-operations.md
├── commands/
│   ├── m365-user-create.md
│   ├── m365-user-offboard.md
│   ├── m365-license-assign.md
│   ├── m365-group-create.md
│   ├── m365-exchange-mailbox.md
│   ├── m365-sharepoint-site.md
│   ├── m365-audit.md
│   └── setup.md
├── agents/
│   └── m365-admin-reviewer.md
└── README.md
```
