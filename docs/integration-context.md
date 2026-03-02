# Integration Context Contract

Use this contract for cross-plugin Microsoft workflows so Azure and M365 commands run with consistent identity context.

## Purpose
- Standardize auth/runtime context across plugins.
- Prevent tenant or subscription drift in multi-plugin chains.
- Make command failures deterministic when required context is missing.

## Standard Context Fields

| Field | Type | Required | Description | Example |
|---|---|---|---|---|
| `tenantId` | string (GUID) | Yes | Microsoft Entra tenant GUID for all Graph/Azure calls. | `72f988bf-86f1-41af-91ab-2d7cd011db47` |
| `subscriptionId` | string (GUID) | Azure commands only | Azure subscription GUID used for ARM scope resolution. | `11111111-2222-3333-4444-555555555555` |
| `environmentCloud` | enum | Yes | Cloud boundary for endpoints and tokens. Allowed: `AzureCloud`, `AzureUSGovernment`, `AzureChinaCloud`. | `AzureCloud` |
| `principalType` | enum | Yes | Identity type used to execute calls. Allowed: `delegated-user`, `service-principal`, `managed-identity`. | `delegated-user` |
| `scopesOrRoles` | list[string] | Yes | Delegated Graph scopes and/or Azure RBAC roles required by the command. | `['Policy.Read.All','Reader']` |

### Field Rules
- Treat `tenantId` as mandatory for every plugin in this repository.
- Treat `subscriptionId` as mandatory for Azure Resource Manager and Policy operations.
- Use a single `environmentCloud` value across the full chain; do not mix public and sovereign clouds.
- Declare `scopesOrRoles` at command granularity, not only plugin level.

## Required Documentation Pattern

Each plugin must document required context in **both** `README.md` and `skills/*/SKILL.md` using a section named `Integration Context Contract`.

### Required section content
1. Link to this contract: `docs/integration-context.md`.
2. A plugin-specific table that maps command families to required values for:
   - `tenantId`
   - `subscriptionId` (if applicable)
   - `environmentCloud`
   - `principalType`
   - `scopesOrRoles`
3. A short fail-fast statement that points to the command behavior below.
4. A short redaction statement that points to the redaction rules below.

### Example snippet
```md
## Integration Context Contract
- Canonical contract: `docs/integration-context.md`

| Command family | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Policy scan | required | required | AzureCloud | delegated-user or service-principal | PolicyInsights.Read, Reader |
```

## Command Fail-Fast Contract

Commands must validate required context **before** making network/API calls.

### Validation order
1. Validate schema (required fields exist and type is correct).
2. Validate cloud compatibility (endpoint set matches `environmentCloud`).
3. Validate identity compatibility (`principalType` allowed for the command).
4. Validate auth grants (`scopesOrRoles` satisfy minimum set).
5. Validate resource scope (`subscriptionId` exists for Azure-scoped commands).

### Standard fail-fast error format

```json
{
  "error": {
    "code": "MissingIntegrationContext",
    "message": "Missing required context: subscriptionId",
    "missingFields": ["subscriptionId"],
    "requiredFor": "azure-policy-security/policy-coverage",
    "nextAction": "Run /setup and provide tenantId + subscriptionId in integration context."
  }
}
```

### Error codes
- `MissingIntegrationContext` - required field absent.
- `InvalidIntegrationContext` - malformed GUID/enum/value.
- `ContextCloudMismatch` - context cloud does not match endpoint family.
- `InsufficientScopesOrRoles` - principal lacks required grants.

## Redaction Rules

Apply redaction in command output, logs, and reviewer reports.

### Sensitive identifiers
- Tenant IDs
- Subscription IDs
- Object IDs / principal IDs
- Access token fragments, secrets, client secrets, certificates

### Output redaction policy
- Show only the first 6 and last 4 characters for GUID-like IDs.
  - Example: `72f988...db47`
- Never print bearer tokens or secrets, even partially.
- For role/scope lists, keep values unredacted unless they include embedded secrets.
- If a full identifier is required for replay, store it in secure state and display a handle/reference.

### Reviewer and command docs
- Reviewer agents must flag unredacted IDs/secrets as blocking findings.
- Command docs must include at least one redacted example output.

## Multi-Plugin Chain Handoff

When handing off between plugins, pass a shared `integrationContext` object unchanged unless a command explicitly updates it.

```json
{
  "integrationContext": {
    "tenantId": "72f988bf-86f1-41af-91ab-2d7cd011db47",
    "subscriptionId": "11111111-2222-3333-4444-555555555555",
    "environmentCloud": "AzureCloud",
    "principalType": "delegated-user",
    "scopesOrRoles": [
      "Policy.Read.All",
      "PolicyInsights.Read",
      "AuditLog.Read.All",
      "Reader"
    ]
  }
}
```
