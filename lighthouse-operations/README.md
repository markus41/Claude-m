# lighthouse-operations

Deep operational tooling for Azure Lighthouse delegation and Microsoft 365 Lighthouse multi-tenant management. Designed for MSPs and CSPs managing customer environments at scale.

Complements [`lighthouse-health`](../lighthouse-health) (which handles health scoring and reactive remediation) by providing the full operational lifecycle: delegation setup, GDAP lifecycle, baseline deployment, cross-tenant governance, alert management, and monthly reporting.

## Features

- **Azure Lighthouse** — Generate Bicep/ARM delegation templates, configure standard and JIT-eligible authorizations, deploy to customer subscriptions, verify from partner tenant
- **GDAP Lifecycle** — Create, assign, renew, and terminate Granular Delegated Admin Privilege relationships with full audit trail
- **Baseline Deployment** — Scan M365 Lighthouse management template compliance, identify gaps, generate remediation plans, apply supported actions
- **Cross-Tenant Reporting** — Monthly MSP health report with MFA coverage, device compliance, risky users, GDAP expiry, and Lighthouse delegation status
- **Alert Management** — List, triage, acknowledge, and dismiss M365 Lighthouse alerts with remediation guidance per alert type
- **Architecture Review** — AI-assisted audit of your Lighthouse/GDAP access model against security best practices

## Commands

| Command | Description |
|---------|-------------|
| `/lighthouse-operations:lighthouse-setup` | Initial setup wizard — configure partner tenant, enumerate managed tenants, verify GDAP and Lighthouse access |
| `/lighthouse-operations:gdap-manage` | Full GDAP lifecycle: create, list, renew, terminate, assign |
| `/lighthouse-operations:baseline-deploy` | Scan management template compliance and apply remediation actions |
| `/lighthouse-operations:lighthouse-report` | Generate monthly cross-tenant health report (Markdown + CSV) |
| `/lighthouse-operations:lighthouse-alerts` | List, triage, acknowledge, and dismiss active Lighthouse alerts |
| `/lighthouse-operations:azure-lighthouse-delegate` | Generate and deploy Azure Lighthouse ARM/Bicep delegation templates |

## Skill

The `lighthouse-operations` skill activates automatically when you discuss:
- Azure Lighthouse delegation, ARM/Bicep managed services templates
- GDAP lifecycle, role assignments, relationship expiry
- M365 Lighthouse baselines, management templates, compliance status
- Partner Center API for MSP operations
- Cross-tenant governance, Azure Policy via Lighthouse

## Agent

**`lighthouse-architect`** — Architectural review agent. Triggers when you ask to review or design a Lighthouse/GDAP access model. Audits role structure, security posture, and generates an architecture recommendation with prioritized actions.

Trigger phrases:
- "Review my lighthouse setup"
- "Design a GDAP structure for our MSP"
- "Is my delegation secure?"
- "Audit our managed services access model"

## Prerequisites

- Azure CLI (`az`) — authenticated to the **partner tenant**
- Microsoft Graph access — the signed-in identity needs:
  - `DelegatedAdminRelationship.ReadWrite.All` (GDAP management)
  - `ManagedTenants.ReadWrite.All` (M365 Lighthouse)
  - `ManagedServices.ReadWrite.All` (Azure Lighthouse)
- Partner Center access (for CSP onboarding flow) — requires `Partner Center Admin Agent` role

## Quick Start

### 1. Run setup

```
/lighthouse-operations:lighthouse-setup
```

This verifies prerequisites, enumerates managed tenants, and writes a `.lighthouse-config.local.md` config file.

### 2. Check GDAP relationships

```
/lighthouse-operations:gdap-manage --action list
```

### 3. Deploy a new Azure Lighthouse delegation

```
/lighthouse-operations:azure-lighthouse-delegate --customer-sub-id <subscription-id>
```

### 4. Generate monthly report

```
/lighthouse-operations:lighthouse-report
```

### 5. Triage active alerts

```
/lighthouse-operations:lighthouse-alerts --action triage
```

## Configuration

After running `lighthouse-setup`, a config file is created at `.claude/lighthouse-operations.local.md`:

```yaml
---
partner_tenant_id: <your-partner-tenant-id>
partner_tenant_name: Contoso MSP
app_id: <app-registration-id>
msp_name: "Contoso MSP"
offer_name: "Contoso MSP — Managed Services"
standard_groups:
  readers: <group-object-id>
  engineers: <group-object-id>
  security_team: <group-object-id>
  noc: <group-object-id>
  platform_admins: <group-object-id>
lighthouse_subscription_scopes:
  - production
  - development
default_delegation_location: eastus
alert_sla:
  critical_hours: 1
  high_hours: 4
  medium_hours: 24
---
```

## Related Plugins

| Plugin | Relationship |
|--------|-------------|
| [`lighthouse-health`](../lighthouse-health) | Health scoring and reactive remediation — use together for full MSP operations |
| [`msp-tenant-provisioning`](../msp-tenant-provisioning) | New customer onboarding — use before this plugin to create tenants |
| [`entra-id-security`](../entra-id-security) | Deep Entra ID security audit for individual tenants |
| [`azure-policy-security`](../azure-policy-security) | Cross-tenant Azure Policy governance |
