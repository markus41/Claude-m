# Fabric Security Governance Plugin

`fabric-security-governance` is an advanced Microsoft Fabric knowledge plugin for least-privilege governance across workspaces, data access layers, and compliance controls.

## What This Plugin Provides

This is a **knowledge plugin**. It provides implementation guidance, deterministic command workflows, and reviewer checks. It does not include runtime binaries or MCP servers.

Install with:

```bash
/plugin install fabric-security-governance@claude-m-microsoft-marketplace
```

## Prerequisites

- Fabric admin or security governance permissions for target workspaces.
- Documented data classification policy and sensitivity label taxonomy.
- Identity groups mapped to business roles for access control.
- Audit and compliance stakeholders for policy review and sign-off.

## Setup

Run `/security-setup` first to baseline environment, permissions, and rollout constraints.

## Commands

| Command | Description |
|---|---|
| `/security-setup` | Prepare Fabric security governance by confirming role model, data classification, and policy owners. |
| `/workspace-rbac-design` | Design Fabric workspace role assignments using least-privilege access and separation of duties. |
| `/rls-ols-policy` | Define row-level and object-level security patterns for semantic models and shared datasets. |
| `/lineage-audit` | Audit lineage visibility and control coverage across Fabric artifacts for compliance readiness. |

## Agent

| Agent | Description |
|---|---|
| **Security Governance Reviewer** | Reviews Fabric security governance design for least privilege, data-level controls, and audit-ready lineage coverage. |

## Trigger Keywords

The skill activates when conversations mention: `fabric rbac`, `fabric rls`, `fabric ols`, `sensitivity labels fabric`, `fabric lineage governance`, `fabric audit readiness`, `least privilege fabric`, `data access policy fabric`.

## Author

Markus Ahling
