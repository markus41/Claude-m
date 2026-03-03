---
name: pa-custom-connector
description: Design and build a custom Power Platform connector from an existing REST API — OpenAPI 2.0 spec, authentication configuration, code policy, webhook triggers, and solution packaging.
argument-hint: "<api-name> [--auth <oauth2|apikey|basic|client-credentials>] [--webhook] [--solution <solution-name>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Custom Connector Creation

## Purpose
Build a production-quality custom Power Platform connector from a REST API:
OpenAPI 2.0 definition, authentication setup, code policy, webhook/trigger support,
testing, and solution-aware packaging using `references/custom-connectors.md`.

## Required Inputs
- API name and base URL
- API documentation or existing OpenAPI spec (if available)
- Authentication type (OAuth2, API Key, Basic, client credentials)
- Actions to expose (list of endpoints to wrap)
- Whether the API supports webhooks/callbacks (for trigger definition)
- Target solution name (for solution packaging)

## Steps

### 1. Gather API Information
- Base URL and API version pattern
- Auth flow type and endpoints (token URL, authorization URL, scopes)
- List of actions: HTTP method, path, request body schema, response schema
- Any pagination patterns (OData `$top`/`$skip`, cursor-based, `Link` header)
- Rate limits / throttle behavior (needed for testing guidance)

### 2. Build OpenAPI 2.0 Specification
Using `references/custom-connectors.md` YAML template as base:
- Set `swagger: "2.0"`, `info.title`, `info.version`
- Add `x-ms-connector-metadata` block (Website, Privacy policy, Categories)
- Define `securityDefinitions` for chosen auth type
- For each action:
  - `operationId` (PascalCase, unique): `GetProduct`, `CreateOrder`, `DeleteItem`
  - `x-ms-summary`: Human-readable action name for UI
  - `x-ms-visibility`: `important` (show by default), `advanced` (hide by default), `internal` (hide always)
  - Parameters with `x-ms-summary` for each
  - Response schema with property-level `x-ms-summary`
- For sensitive POST/DELETE: add `x-ms-no-generic-test: true`
- Write OpenAPI to `connector/apiDefinition.swagger.json`

### 3. Configure Authentication
Based on `--auth` flag:
- **OAuth2 authorization code**: include `authorizationUrl`, `tokenUrl`, `refreshUrl`, `scopes`
- **API Key**: define `in: header` or `in: query`, set `name`
- **Basic**: simple `type: basic` securityDefinition
- **Client credentials**: `flow: application` with `tokenUrl` and tenant-specific scope
- Note any client ID/secret placeholder values — document where to enter them

### 4. Add Code Policy (If Needed)
Situations requiring code policy:
- API returns non-standard pagination that needs flattening
- Request needs computed headers (HMAC signature, custom timestamp)
- Response needs field normalization or renaming for usability
- Authentication flow requires token pre-processing

Write C# code policy in `connector/script.csx` using pattern from reference file.

### 5. Define Webhook Trigger (If API Supports Webhooks)
- Add POST endpoint for subscription registration with `x-ms-trigger: single`
- Add DELETE endpoint for unsubscription with `x-ms-trigger-unsubscribe: true`
- Add `x-ms-notification-url: true` to callback URL parameter
- Define trigger output schema matching webhook payload

### 6. Create Connector Definition Files
```
connector/
  apiDefinition.swagger.json   ← OpenAPI 2.0 spec
  apiProperties.json           ← Publisher, icon color, tier (Standard/Premium)
  icon.png                     ← 1:1 ratio, 100x100px, non-white background
  script.csx                   ← Code policy (if applicable)
  README.md                    ← Setup instructions, required app registration steps
```

`apiProperties.json`:
```json
{
  "properties": {
    "displayName": "Contoso Inventory",
    "iconBrandColor": "#007ee5",
    "capability": [],
    "policyTemplateInstances": [],
    "publisher": "Contoso",
    "stackOwner": "Contoso"
  }
}
```

### 7. Deploy and Package

```bash
# Create connector from definition
pac connector create \
  --solution-unique-name YourSolution \
  --outputDirectory ./connector

# Update existing connector
pac connector update \
  --connector-id existing-id \
  --outputDirectory ./connector

# Verify connector in environment
pac connector list --environment-id env-id
```

### 8. Testing Guidance
Provide test cases for each action:
- Happy path: valid inputs → expected 200 response
- Auth failure: expired/invalid credentials → 401 handling
- Not found: invalid ID → 404 handling
- Throttle test: rapid calls → 429 handling
- Schema validation: missing required fields → 400 handling

### 9. Output
Deliver:
- Complete `apiDefinition.swagger.json` (all requested actions)
- `apiProperties.json`
- `script.csx` (if code policy needed)
- `README.md` with setup steps (app registration, API key location, etc.)
- PAC CLI deploy commands
- Test cases for each action
- Connection reference configuration for solution-aware deployment

## Quality Checks
- All `operationId` values unique and PascalCase
- All parameters have `x-ms-summary`
- Destructive operations have `x-ms-no-generic-test: true`
- Sensitive parameters marked `x-ms-visibility: internal` if user-invisible
- Auth credentials never hardcoded in spec (placeholders only)
- Icon meets size/format requirements (1:1, 100x100, non-white)
