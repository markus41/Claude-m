# Entra ID Security & Identity Plugin

A Claude Code knowledge plugin for Microsoft Entra ID (Azure AD) identity governance and security — app registrations, service principals, conditional access, sign-in monitoring, and risk detection via Microsoft Graph API.

## What This Plugin Provides

This is a **knowledge plugin** -- it gives Claude deep expertise in Entra ID security so it can generate correct Graph API code for identity management, build conditional access policies safely, analyze sign-in logs, and audit permission grants. It does not contain runtime code, MCP servers, or executable scripts.

## Setup

Run `/setup` to configure authentication and verify Entra ID access:

```
/setup              # Full guided setup
/setup --minimal    # Node.js dependencies only
```

## Capabilities

| Area | What Claude Can Do |
|------|-------------------|
| **App Registrations** | Create apps with secure defaults, certificate credentials, and least-privilege permissions |
| **Service Principals** | Create and configure service principals with role assignments |
| **Conditional Access** | Build CA policies in report-only mode with MFA, device compliance, and location conditions |
| **Sign-In Logs** | Query and analyze sign-in logs to detect failed attempts and anomalies |
| **Risk Detection** | List and manage risky users with appropriate remediation actions |
| **Permission Audit** | Audit OAuth2 grants to find over-permissioned applications |
| **Review** | Analyze identity code for secure app registration, CA policy safety, and credential handling |

## Commands

| Command | Description |
|---------|-------------|
| `/entra-app-register` | Register a new application with secure defaults |
| `/entra-sp-create` | Create a service principal with role assignments |
| `/entra-ca-policy-create` | Create a conditional access policy (always report-only) |
| `/entra-signin-logs` | Query and analyze sign-in logs |
| `/entra-risky-users` | List and manage risky users |
| `/entra-permissions-audit` | Audit OAuth2 permission grants across the tenant |
| `/setup` | Configure Azure auth with identity and security permissions |

## Agent

| Agent | Description |
|-------|-------------|
| **Entra ID Security Reviewer** | Reviews app registration security, CA policy safety, permission grants, and credential handling |

## Plugin Structure

```
entra-id-security/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── entra-security/
│       └── SKILL.md
├── commands/
│   ├── entra-app-register.md
│   ├── entra-sp-create.md
│   ├── entra-ca-policy-create.md
│   ├── entra-signin-logs.md
│   ├── entra-risky-users.md
│   ├── entra-permissions-audit.md
│   └── setup.md
├── agents/
│   └── entra-security-reviewer.md
└── README.md
```

## Trigger Keywords

The skill activates automatically when conversations mention: `entra id`, `azure ad`, `app registration`, `service principal`, `conditional access`, `sign-in log`, `risky user`, `identity governance`, `permission audit`, `oauth consent`, `managed identity`, `certificate credential`.

## Author

Markus Ahling
