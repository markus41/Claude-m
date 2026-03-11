---
name: org-setup
description: Verify Azure tenant access, list management group hierarchy, confirm RBAC permissions, and establish organizational context for further commands.
argument-hint: "[--scope <tenant|management-group|subscription>] [--check-rbac] [--check-providers]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Organization Setup

Prepare the organizational context before running inventory, tagging, naming, or landing zone assessments.

## Integration Context Fail-Fast Check

Before any external API call, validate integration context from [`docs/integration-context.md`](../../docs/integration-context.md):
- `tenantId` (always required)
- `subscriptionId` (required for subscription-scope workflows)
- `environmentCloud`
- `principalType`
- `scopesOrRoles`

If validation fails, stop immediately and return a structured error using contract codes (`MissingIntegrationContext`, `InvalidIntegrationContext`, `ContextCloudMismatch`, `InsufficientScopesOrRoles`).
Redact tenant/subscription/object identifiers in setup output using contract redaction rules.

## Step 1: Verify Tenant Access

Confirm the current Azure CLI session is authenticated and has access to the target tenant.

```bash
# Verify current login context
az account show --query "{Tenant:tenantId, Subscription:name, User:user.name}" -o table

# List all accessible subscriptions
az account list --query "[].{Name:name, Id:id, State:state, TenantId:tenantId}" -o table
```

If no active session exists, instruct the user to authenticate with `az login --tenant <tenant-id>`.

## Step 2: List Management Group Hierarchy

Enumerate the management group hierarchy to understand organizational structure.

```bash
# List all management groups
az account management-group list -o table

# Show full hierarchy tree
az account management-group show \
  --name "<root-mg-or-tenant-id>" \
  --expand children \
  --recurse \
  -o json
```

Flag if:
- All subscriptions are in the root management group (no organization applied)
- Hierarchy depth exceeds 4 levels (overly complex)
- Management group names do not follow `mg-` prefix convention

## Step 3: Verify RBAC Permissions

Confirm the authenticated principal has sufficient permissions for organizational operations.

```bash
# List role assignments for current user at management group scope
az role assignment list \
  --scope "/providers/Microsoft.Management/managementGroups/<mg-name>" \
  --assignee "<current-user-object-id>" \
  -o table

# Check if current user can read management groups
az account management-group list --query "length(@)" -o tsv
```

Minimum required roles:
- `Reader` for inventory and assessment commands
- `Tag Contributor` for tag audit remediation
- `Management Group Contributor` for management group changes
- `Resource Policy Contributor` for policy operations

## Step 4: Verify Resource Provider Registration

Confirm required resource providers are registered on target subscriptions.

```bash
# Check required providers
az provider show --namespace Microsoft.Management --query "registrationState" -o tsv
az provider show --namespace Microsoft.ResourceGraph --query "registrationState" -o tsv
az provider show --namespace Microsoft.Authorization --query "registrationState" -o tsv
az provider show --namespace Microsoft.PolicyInsights --query "registrationState" -o tsv
```

Register any missing providers:
```bash
az provider register --namespace Microsoft.Management
az provider register --namespace Microsoft.ResourceGraph
```

## Step 5: Confirm Scope and Proceed

Confirm the organizational scope for subsequent commands:
- **Tenant-wide**: All management groups and subscriptions
- **Management group**: Specific management group and its children
- **Subscription**: Single subscription scope

Present the confirmed context summary:
1. `TenantId` (redacted)
2. `Scope` (management group path or subscription)
3. `AuthenticatedPrincipal` (name only)
4. `Permissions` (validated roles)
5. `ProviderRegistration` (all required providers registered)

## Output schema/format expected from the assistant
Return in this order:
1. `ContextSummary` (`Tenant`, `Scope`, `Principal`, `Roles`, `Providers`).
2. `HierarchyOverview` — management group tree or list with subscription counts.
3. `Issues` — any blockers found during setup (auth, permissions, provider registration).
4. `NextSteps` — recommended commands to run next.

## Validation checklist
- Command name is `org-setup` and matches file name.
- Tenant access verified.
- Management group hierarchy listed.
- RBAC permissions confirmed for current principal.
- Resource providers checked.
- Output includes context summary, hierarchy, issues, and next steps.
