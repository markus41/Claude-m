---
name: research-service
description: Research a Microsoft service's Graph API — endpoints, permissions, and schemas
argument-hint: "<service-name> [--api-version v1.0|beta] [--depth quick|full]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - WebFetch
  - WebSearch
---

# Research a Microsoft Service

Research a Microsoft service's Graph API surface and produce structured output.

## Instructions

### 1. Identify the service

Parse the `<service-name>` argument (e.g., `bookings`, `planner`, `teams`, `outlook`).
Map it to the Microsoft Graph API area using the reference index in the marketplace-research SKILL.md.

### 2. Search Microsoft Learn documentation

Use multiple sources in this order:

1. **Microsoft Learn MCP tools** — call `microsoft_docs_search` with `"{service-name} Graph API reference"` and `microsoft_code_sample_search` for code examples.
2. **WebSearch** — search for `"Microsoft Graph API {service-name} endpoints site:learn.microsoft.com"`.
3. **WebFetch** — fetch the main API reference page and any linked sub-pages.

Extract from each page:
- REST endpoint URLs with HTTP methods
- Required and optional permissions (delegated + application)
- Request body schemas with field types
- Response schemas with field types
- OData query parameter support ($select, $filter, $expand, $top)
- Pagination patterns (nextLink, deltaLink)
- Rate limits or throttling notes

### 3. Organize findings

Group endpoints by operation area. For example, for Bookings:
- Businesses (CRUD)
- Services (CRUD)
- Staff Members (CRUD)
- Appointments (CRUD + cancel)
- Customers (CRUD)

### 4. Identify patterns

Note common patterns across the service:
- Standard CRUD operations
- List with pagination
- Delta queries
- Batch support
- Webhook/subscription support
- Special operations (cancel, approve, decline, etc.)

### 5. Write research output

Write structured JSON to `research-output/{service-name}.json` using this schema:

```json
{
  "service": "{service-name}",
  "displayName": "{Service Display Name}",
  "description": "One-line description of the service",
  "apiVersions": ["v1.0", "beta"],
  "baseUrl": "https://graph.microsoft.com/v1.0",
  "docUrls": [
    "https://learn.microsoft.com/en-us/graph/api/resources/{resource}?view=graph-rest-1.0"
  ],
  "areas": [
    {
      "name": "Area Name",
      "endpoints": [
        {
          "method": "GET",
          "path": "/path/{id}",
          "description": "What this endpoint does",
          "apiVersion": "v1.0",
          "permissions": {
            "delegated": ["Scope.Read"],
            "application": ["Scope.Read.All"]
          },
          "requestBody": null,
          "responseSchema": {
            "key": "type"
          },
          "queryParams": ["$select", "$filter"],
          "pagination": true
        }
      ]
    }
  ],
  "patterns": ["crud", "pagination", "delta", "webhooks"],
  "notes": "Any important caveats or limitations"
}
```

### 6. Display summary

After writing the file, display:
- Total endpoints discovered
- Permission scopes required
- API version coverage (v1.0 vs beta-only)
- Suggested plugin commands based on common operations
- File path to the research output

### Options

- `--api-version v1.0|beta` — Focus on a specific API version (default: both).
- `--depth quick|full` — `quick` fetches top-level endpoints only; `full` follows sub-resource links (default: `full`).
