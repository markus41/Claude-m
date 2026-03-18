---
name: teams-copilot-plugin
description: "Create a Microsoft 365 Copilot plugin (API plugin or Teams message extension) with OpenAPI spec, adaptive card responses, and auth"
argument-hint: "--name <PluginName> --type <api|message-extension> [--auth <none|api-key|oauth>] [--openapi <path>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Create a Microsoft 365 Copilot Plugin

Build a plugin that extends Microsoft 365 Copilot with custom data and actions, surfacing results as Adaptive Cards within the Copilot experience.

## Instructions

### 1. Validate Inputs

- `--name` — Plugin name (e.g., `ContosoCRM`). Ask if not provided.
- `--type` — Plugin type:
  - `api` — API-based plugin with OpenAPI spec (no bot runtime needed)
  - `message-extension` — Bot-based message extension usable in both Copilot and compose box
- `--auth` — Authentication: `none`, `api-key`, or `oauth`. Default: `api-key`.
- `--openapi` — Path to existing OpenAPI spec. If not provided, generate a sample spec.

Ask for the plugin type and a brief description of what data/actions it provides.

### 2. API Plugin Structure (when --type api)

```
<plugin-name>/
├── m365agents.yml
├── appPackage/
│   ├── manifest.json                 # v1.25 with composeExtensions (apiBased)
│   ├── apiSpecificationFile/
│   │   └── openapi.yaml             # OpenAPI 3.0 spec
│   ├── responseTemplates/
│   │   ├── search-results.json      # Adaptive Card template for search
│   │   └── action-confirm.json      # Adaptive Card template for actions
│   ├── ai-plugin.json               # AI plugin manifest for Copilot
│   ├── color.png
│   └── outline.png
├── src/
│   ├── index.ts                     # Express API server
│   ├── routes/
│   │   └── api.ts                   # API endpoint implementations
│   ├── auth/
│   │   ├── api-key.ts               # API key validation middleware
│   │   └── oauth.ts                 # OAuth token validation
│   └── data/
│       └── service.ts               # Data service layer
├── .env
└── package.json
```

### 3. OpenAPI Spec Generation

If no `--openapi` provided, generate a sample spec based on the plugin description:

```yaml
openapi: 3.0.3
info:
  title: <plugin-name> API
  version: 1.0.0
  description: <user-provided description>
servers:
  - url: https://${{BOT_DOMAIN}}
    description: Production

paths:
  /api/search:
    get:
      operationId: searchItems
      summary: Search for items
      description: Search the <plugin-name> database for matching items
      parameters:
        - name: query
          in: query
          required: true
          schema:
            type: string
          description: Search query string
        - name: limit
          in: query
          schema:
            type: integer
            default: 10
          description: Maximum results to return
      responses:
        "200":
          description: Search results
          content:
            application/json:
              schema:
                type: object
                properties:
                  results:
                    type: array
                    items:
                      $ref: "#/components/schemas/Item"

  /api/items/{id}:
    get:
      operationId: getItem
      summary: Get item details
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Item details
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Item"

  /api/items:
    post:
      operationId: createItem
      summary: Create a new item
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateItemRequest"
      responses:
        "201":
          description: Item created
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Item"

components:
  schemas:
    Item:
      type: object
      properties:
        id:
          type: string
        title:
          type: string
        description:
          type: string
        status:
          type: string
          enum: [active, archived]
        createdAt:
          type: string
          format: date-time

    CreateItemRequest:
      type: object
      required: [title]
      properties:
        title:
          type: string
        description:
          type: string

  securitySchemes:
    apiKey:
      type: apiKey
      name: X-API-Key
      in: header

security:
  - apiKey: []
```

Adjust schemas based on what the user describes the plugin provides.

### 4. AI Plugin Manifest

Generate `appPackage/ai-plugin.json`:

```json
{
  "schema_version": "v2",
  "name_for_human": "<Plugin Display Name>",
  "description_for_human": "<User-facing description>",
  "description_for_model": "<Detailed description for Copilot to understand when to invoke this plugin and what data it provides. Be specific about entity types and actions.>",
  "auth": {
    "type": "api_key",
    "api_key": {
      "name": "X-API-Key"
    }
  },
  "api": {
    "type": "openapi",
    "url": "apiSpecificationFile/openapi.yaml"
  },
  "capabilities": {
    "conversation_starters": [
      "Find recent items in <PluginName>",
      "Create a new item called...",
      "Show me the status of..."
    ]
  },
  "runtimes": [
    {
      "type": "OpenApi",
      "auth": { "type": "ApiKeyPluginVault" },
      "spec": { "url": "apiSpecificationFile/openapi.yaml" },
      "run_for_functions": ["searchItems", "getItem", "createItem"]
    }
  ]
}
```

### 5. Adaptive Card Response Templates

Generate response templates that Copilot renders for each API operation:

**Search results template** (`responseTemplates/search-results.json`):
```json
{
  "type": "AdaptiveCard",
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.5",
  "body": [
    {
      "type": "TextBlock",
      "text": "Found ${results.length} results",
      "weight": "Bolder",
      "size": "Medium"
    },
    {
      "type": "Container",
      "$data": "${results}",
      "items": [
        { "type": "TextBlock", "text": "${title}", "weight": "Bolder" },
        { "type": "TextBlock", "text": "${description}", "wrap": true, "size": "Small" },
        {
          "type": "ColumnSet",
          "columns": [
            { "type": "Column", "items": [{ "type": "TextBlock", "text": "Status: ${status}", "size": "Small", "isSubtle": true }] },
            { "type": "Column", "items": [{ "type": "TextBlock", "text": "${createdAt}", "size": "Small", "isSubtle": true }] }
          ]
        }
      ],
      "separator": true
    }
  ]
}
```

### 6. Message Extension Plugin (when --type message-extension)

Generate a bot-based message extension that works in both Copilot and the compose box:

**Manifest additions**:
```json
{
  "composeExtensions": [
    {
      "botId": "${{BOT_ID}}",
      "commands": [
        {
          "id": "searchCmd",
          "type": "query",
          "title": "Search",
          "description": "Search for items",
          "initialRun": true,
          "parameters": [
            {
              "name": "query",
              "title": "Search",
              "description": "Search query",
              "inputType": "text"
            }
          ]
        },
        {
          "id": "createCmd",
          "type": "action",
          "title": "Create Item",
          "description": "Create a new item",
          "fetchTask": true,
          "context": ["compose", "commandBox", "message"]
        }
      ]
    }
  ]
}
```

**Bot handler with Copilot-optimized responses**:
- Search: Return `MessagingExtensionResult` with preview and content cards
- Action: Return dialog for input, then confirm card on submit
- Card content optimized for both Copilot citation rendering and compose box preview

### 7. Authentication

**api-key**: Middleware validates `X-API-Key` header against stored secret.
**oauth**: MSAL.js configuration with OBO flow for delegated access.
**none**: No auth (only for internal/dev use).

For OAuth, generate Entra ID app registration guidance:
- Application ID URI: `api://<domain>/<client-id>`
- Delegated scope: `access_as_user`
- Authorized client IDs for Teams/Copilot

### 8. Testing with Copilot

Provide testing instructions:
1. Sideload the plugin via `m365agents preview --local`
2. Open Microsoft 365 Copilot in Teams
3. Enable the plugin from the Copilot plugin picker
4. Test conversation starters
5. Verify Adaptive Card rendering
6. Test action operations (create/update)

### 9. Display Summary

Show the user:
- Created files and plugin architecture
- OpenAPI spec operations and schemas
- Adaptive Card response templates
- Authentication configuration
- How to test in Copilot and compose box
- Deployment steps: `m365agents provision && m365agents deploy`
- Admin consent requirements for production
