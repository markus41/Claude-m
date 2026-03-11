# Azure Organization & Governance

Azure organizational hierarchy and governance workflows — management groups, subscription management, resource group organization, resource tagging, naming conventions, Azure Landing Zones, and tenant-level governance.

## What this plugin helps with
- Design and assess management group hierarchies aligned with Cloud Adoption Framework
- Inventory subscriptions, resource groups, and resources across the tenant
- Audit tag compliance and enforce consistent tagging strategies
- Validate resource names against CAF naming conventions
- Deploy or assess Azure Landing Zone architectures (hub-spoke, Virtual WAN)
- Configure RBAC at scale using management group inheritance
- Apply Azure Policy at management group scope for organization-wide governance

## Install

```bash
/plugin install azure-organization@claude-m-microsoft-marketplace
```

## Included commands

| Command | Description |
|---|---|
| `org-setup` | Verify tenant access, list management group hierarchy, confirm RBAC permissions |
| `org-inventory` | Full tenant inventory — subscriptions, resource groups, resources by type/region/tag |
| `org-tag-audit` | Scan resources for tag compliance, report missing required tags, suggest remediation |
| `org-naming-check` | Validate resource names against CAF conventions, report violations, suggest corrections |
| `org-landing-zone` | Deploy or assess Azure Landing Zone architecture and readiness |

## Agent

| Agent | Description |
|---|---|
| `org-reviewer` | Reviews organizational structure for hierarchy design, tagging, naming, RBAC, and policy coverage |

## Skill
- `skills/azure-organization/SKILL.md`

## Plugin structure
- `.claude-plugin/plugin.json`
- `skills/azure-organization/SKILL.md`
- `skills/azure-organization/references/management-groups.md`
- `skills/azure-organization/references/naming-conventions.md`
- `skills/azure-organization/references/landing-zones.md`
- `commands/org-setup.md`
- `commands/org-inventory.md`
- `commands/org-tag-audit.md`
- `commands/org-naming-check.md`
- `commands/org-landing-zone.md`
- `agents/org-reviewer.md`

## Example prompts

- "Use `azure-organization` to show the management group hierarchy and identify subscriptions still in the root group."
- "Use `azure-organization` to run a full inventory of subscriptions and resources grouped by type and region."
- "Use `azure-organization` to audit all resources for missing Environment, Owner, and CostCenter tags."
- "Use `azure-organization` to validate resource names against CAF naming conventions and suggest corrections."
- "Use `azure-organization` to assess the current environment against Azure Landing Zone best practices."
- "Use `azure-organization` to check RBAC assignments at the management group scope and flag Owner at root."

## Related plugins

| Plugin | Relationship |
|---|---|
| `azure-policy-security` | Policy assignments and compliance at management group scope |
| `azure-cost-governance` | Cost allocation by tags and subscription budgets |
| `entra-id-admin` | RBAC groups and PIM configuration |
| `azure-networking` | Landing zone connectivity (hub-spoke, Virtual WAN) |
| `azure-tenant-assessment` | Entry-point tenant assessment for new environments |
