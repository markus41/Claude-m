# Environment Variables

## Overview

Environment variables in Power Platform store configuration values that differ across environments. They separate configuration from customization, enabling the same solution to behave differently in dev, test, and production without modification.

An environment variable has two parts:
1. **Definition** — the schema (name, type, display name, default value) — travels with the solution
2. **Value** — the environment-specific override — set per target environment during or after import

## Variable Types

| Type | Description | Example Values |
|------|-------------|----------------|
| **String** | Free-form text | `"https://api.contoso.com"`, `"eastus"` |
| **Number** | Decimal number | `100`, `3.14`, `0` |
| **Boolean** (Yes/No) | True or false | `"yes"` / `"no"` (stored as string) |
| **JSON** | Structured data | `{"feature1": true, "maxRetries": 3}` |
| **Data Source** | Connector + entity reference | Connection reference to a specific table |

**Note:** Boolean values are stored as the strings `"yes"` and `"no"`, not as true/false.

## Creating Environment Variables

### Via the Maker Portal

1. Navigate to `make.powerapps.com` → Solutions → Your Solution
2. New → More → Environment Variable
3. Set Display Name, Name (schema name with prefix), Type, Default Value
4. Optionally set Current Value (overrides default for this environment)

### Via Web API — Create Definition

**POST** `{orgUrl}/api/data/v9.2/environmentvariabledefinitions`

```typescript
interface EnvironmentVariableDefinition {
  schemaname: string;
  displayname: string;
  type: number; // 100000000=String, 100000001=Number, 100000002=Boolean, 100000003=JSON, 100000004=DataSource
  defaultvalue?: string;
  description?: string;
  isrequired?: boolean;
  iscustomizable?: { Value: boolean };
}

async function createEnvironmentVariableDefinition(
  orgUrl: string,
  accessToken: string,
  definition: EnvironmentVariableDefinition
): Promise<string> {
  const response = await fetch(
    `${orgUrl}/api/data/v9.2/environmentvariabledefinitions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
      body: JSON.stringify(definition),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create env var definition: ${response.status} — ${error}`);
  }

  const locationHeader = response.headers.get("OData-EntityId");
  const idMatch = locationHeader?.match(/\(([^)]+)\)/);
  return idMatch ? idMatch[1] : "";
}

// Example: Create a String variable
await createEnvironmentVariableDefinition(orgUrl, accessToken, {
  schemaname: "cr_ApiBaseUrl",
  displayname: "API Base URL",
  type: 100000000, // String
  defaultvalue: "https://api.dev.contoso.com",
  description: "Base URL for the backend API",
  isrequired: true,
});

// Example: Create a JSON variable for feature flags
await createEnvironmentVariableDefinition(orgUrl, accessToken, {
  schemaname: "cr_FeatureFlags",
  displayname: "Feature Flags",
  type: 100000003, // JSON
  defaultvalue: '{"newDashboard": false, "betaReports": false}',
  description: "Feature toggle configuration",
});
```

### Via Web API — Set Value

**POST** `{orgUrl}/api/data/v9.2/environmentvariablevalues`

The value record is linked to the definition via `EnvironmentVariableDefinitionId`:

```typescript
interface EnvironmentVariableValue {
  value: string;
  "EnvironmentVariableDefinitionId@odata.bind": string;
}

async function setEnvironmentVariableValue(
  orgUrl: string,
  accessToken: string,
  definitionId: string,
  value: string
): Promise<void> {
  // First, check if a value record already exists
  const existingResponse = await fetch(
    `${orgUrl}/api/data/v9.2/environmentvariablevalues?$filter=_environmentvariabledefinitionid_value eq '${definitionId}'&$select=environmentvariablevalueid`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
    }
  );

  const existing = await existingResponse.json();

  if (existing.value.length > 0) {
    // Update existing value
    const valueId = existing.value[0].environmentvariablevalueid;
    await fetch(
      `${orgUrl}/api/data/v9.2/environmentvariablevalues(${valueId})`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value }),
      }
    );
  } else {
    // Create new value
    await fetch(
      `${orgUrl}/api/data/v9.2/environmentvariablevalues`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          value,
          "EnvironmentVariableDefinitionId@odata.bind": `/environmentvariabledefinitions(${definitionId})`,
        }),
      }
    );
  }
}
```

### Via PAC CLI

```bash
# Set environment variable value
pac env variable set --name cr_ApiBaseUrl --value "https://api.prod.contoso.com"

# List environment variables
pac env variable list
```

## Export/Import Behavior

### What Gets Exported

When a solution containing environment variables is exported:
- **Definition** always included (schema name, type, default value)
- **Current value** included ONLY in unmanaged exports from the source environment
- **Managed exports** include the definition with default value but NOT the current value

This design ensures that target environments do not get overwritten with source environment values during import.

### Setting Values During Import

Use the deployment settings file to provide environment-specific values:

```json
{
  "EnvironmentVariables": [
    {
      "SchemaName": "cr_ApiBaseUrl",
      "Value": "https://api.test.contoso.com"
    },
    {
      "SchemaName": "cr_MaxRetries",
      "Value": "5"
    },
    {
      "SchemaName": "cr_FeatureFlags",
      "Value": "{\"newDashboard\": true, \"betaReports\": false}"
    },
    {
      "SchemaName": "cr_EnableNotifications",
      "Value": "yes"
    }
  ]
}
```

**PAC CLI import with settings:**

```bash
pac solution import \
  --path ./MySolution_managed.zip \
  --settings-file ./deployment-settings/test.json \
  --activate-plugins
```

### Per-Environment Settings Files

Maintain a settings file for each target environment:

```
deployment-settings/
├── dev.json      # Development overrides (usually not needed — values set in maker portal)
├── test.json     # Test environment values
├── uat.json      # UAT environment values
└── prod.json     # Production environment values
```

Example `prod.json`:

```json
{
  "EnvironmentVariables": [
    {
      "SchemaName": "cr_ApiBaseUrl",
      "Value": "https://api.contoso.com"
    },
    {
      "SchemaName": "cr_MaxRetries",
      "Value": "3"
    },
    {
      "SchemaName": "cr_FeatureFlags",
      "Value": "{\"newDashboard\": true, \"betaReports\": true}"
    },
    {
      "SchemaName": "cr_EnableNotifications",
      "Value": "yes"
    },
    {
      "SchemaName": "cr_SupportEmail",
      "Value": "support@contoso.com"
    }
  ],
  "ConnectionReferences": []
}
```

## Using Environment Variables

### In Cloud Flows (Power Automate)

Reference environment variables using the `parameters()` expression:

```
@parameters('cr_ApiBaseUrl')
@parameters('cr_MaxRetries')
@parameters('cr_FeatureFlags')
```

**Example: HTTP action using env var for base URL:**

```json
{
  "type": "Http",
  "inputs": {
    "method": "GET",
    "uri": "@{parameters('cr_ApiBaseUrl')}/api/v1/orders",
    "headers": {
      "Content-Type": "application/json"
    }
  }
}
```

**Example: Condition using boolean env var:**

```json
{
  "type": "If",
  "expression": {
    "equals": ["@parameters('cr_EnableNotifications')", "yes"]
  }
}
```

**Example: Parsing JSON env var:**

```json
{
  "type": "ParseJson",
  "inputs": {
    "content": "@parameters('cr_FeatureFlags')",
    "schema": {
      "type": "object",
      "properties": {
        "newDashboard": { "type": "boolean" },
        "betaReports": { "type": "boolean" }
      }
    }
  }
}
```

### In Canvas Apps

Access environment variables through the `Environment()` function:

```
// In a formula
Environment().cr_ApiBaseUrl

// In a label
"API: " & Environment().cr_ApiBaseUrl

// Conditional visibility
If(Environment().cr_EnableNotifications = "yes", true, false)
```

### In Plugins (C#)

Query the `environmentvariabledefinition` and `environmentvariablevalue` tables:

```csharp
public string GetEnvironmentVariable(IOrganizationService service, string schemaName)
{
    var query = new QueryExpression("environmentvariabledefinition")
    {
        ColumnSet = new ColumnSet("defaultvalue", "environmentvariabledefinitionid"),
        Criteria = new FilterExpression
        {
            Conditions =
            {
                new ConditionExpression("schemaname", ConditionOperator.Equal, schemaName)
            }
        }
    };

    var definition = service.RetrieveMultiple(query).Entities.FirstOrDefault();
    if (definition == null) return string.Empty;

    var valueQuery = new QueryExpression("environmentvariablevalue")
    {
        ColumnSet = new ColumnSet("value"),
        Criteria = new FilterExpression
        {
            Conditions =
            {
                new ConditionExpression(
                    "environmentvariabledefinitionid",
                    ConditionOperator.Equal,
                    definition.Id)
            }
        }
    };

    var value = service.RetrieveMultiple(valueQuery).Entities.FirstOrDefault();
    return value?.GetAttributeValue<string>("value")
        ?? definition.GetAttributeValue<string>("defaultvalue")
        ?? string.Empty;
}
```

## Current Value vs. Default Value

The resolution order:
1. **Current Value** — the `environmentvariablevalue` record for this environment (if it exists)
2. **Default Value** — the `defaultvalue` on the `environmentvariabledefinition` (fallback)

If neither exists, the variable returns empty/null.

**Important:** When deploying to a new environment:
- If the deployment settings file provides a value → that becomes the Current Value
- If no value is provided → the Default Value from the definition is used
- To clear a Current Value and revert to Default → delete the `environmentvariablevalue` record

## Data Source Environment Variables

Data Source type environment variables reference a specific table through a connector. They are used when flows or apps need to target different data sources per environment (e.g., different SharePoint sites, different SQL databases).

```json
{
  "SchemaName": "cr_OrdersDataSource",
  "Value": "{\"connectorId\": \"/providers/Microsoft.PowerApps/apis/shared_sharepointonline\", \"siteUrl\": \"https://contoso.sharepoint.com/sites/orders\", \"listName\": \"Orders\"}"
}
```

## Bulk Operations Script

TypeScript script to bulk-set environment variables from a configuration file:

```typescript
interface EnvVarConfig {
  schemaName: string;
  value: string;
}

async function bulkSetEnvironmentVariables(
  orgUrl: string,
  accessToken: string,
  variables: EnvVarConfig[]
): Promise<void> {
  for (const variable of variables) {
    // Find definition by schema name
    const defResponse = await fetch(
      `${orgUrl}/api/data/v9.2/environmentvariabledefinitions?$filter=schemaname eq '${variable.schemaName}'&$select=environmentvariabledefinitionid`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const defData = await defResponse.json();

    if (defData.value.length === 0) {
      console.warn(`Definition not found: ${variable.schemaName}`);
      continue;
    }

    const definitionId = defData.value[0].environmentvariabledefinitionid;

    // Check for existing value
    const valResponse = await fetch(
      `${orgUrl}/api/data/v9.2/environmentvariablevalues?$filter=_environmentvariabledefinitionid_value eq '${definitionId}'&$select=environmentvariablevalueid`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const valData = await valResponse.json();

    if (valData.value.length > 0) {
      // Update
      await fetch(
        `${orgUrl}/api/data/v9.2/environmentvariablevalues(${valData.value[0].environmentvariablevalueid})`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ value: variable.value }),
        }
      );
      console.log(`Updated: ${variable.schemaName} = ${variable.value}`);
    } else {
      // Create
      await fetch(
        `${orgUrl}/api/data/v9.2/environmentvariablevalues`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            value: variable.value,
            "EnvironmentVariableDefinitionId@odata.bind": `/environmentvariabledefinitions(${definitionId})`,
          }),
        }
      );
      console.log(`Created: ${variable.schemaName} = ${variable.value}`);
    }
  }
}
```

## Caching Behavior

Environment variable values are cached by the platform. After updating a value, the new value may not be immediately visible to running flows or apps. The cache refresh interval varies:

- **Cloud Flows**: Values are typically refreshed within a few minutes. Reactivating a flow forces a fresh read.
- **Canvas Apps**: Values are read when the app session starts. Users may need to close and reopen the app.
- **Model-driven Apps**: Values refresh on page reload.
- **Plugins**: Each plugin execution queries the value fresh (no caching at the plugin level), but the Dataverse platform may cache the underlying query for a short period.

To force an immediate refresh after programmatically changing a value, publish customizations:

```bash
pac solution publish
```

Or via Web API:

```typescript
await fetch(`${orgUrl}/api/data/v9.2/PublishAllXml`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
});
```

## Common Patterns

### Feature Flags

Use a JSON environment variable to manage feature toggles across environments:

```json
{
  "SchemaName": "cr_FeatureFlags",
  "Value": "{\"newCheckout\": true, \"betaDashboard\": false, \"darkMode\": true, \"maxUploadSize\": 10}"
}
```

In a flow, parse the JSON and branch on individual flags. This pattern allows toggling features per environment without redeploying the solution.

### Multi-Tenant Configuration

When the same solution serves multiple tenants or business units, use environment variables for tenant-specific settings:

- `cr_TenantApiKey` — API key per tenant (consider Key Vault for secrets)
- `cr_TenantBaseUrl` — Tenant-specific API endpoint
- `cr_TenantName` — Display name for branding
- `cr_TenantFeatures` — JSON with tenant-specific feature availability

### Environment-Specific Error Handling

Use environment variables to control error notification behavior:

- Development: `cr_ErrorNotificationEmail` = `"dev-team@contoso.com"` (verbose logging)
- Production: `cr_ErrorNotificationEmail` = `"ops-alerts@contoso.com"` (critical only)

## Best Practices

1. **Never hardcode URLs or configuration** — use environment variables for anything that changes across environments
2. **Use meaningful schema names** — `cr_ApiBaseUrl` not `cr_var1`; include publisher prefix
3. **Set default values wisely** — default should be the safest option (e.g., dev URL, feature disabled)
4. **Use JSON type for complex configuration** — feature flags, multi-value settings, structured config
5. **Store deployment settings in source control** — version-controlled, reviewable, auditable
6. **Document each variable** — description field should explain purpose, expected format, valid values
7. **Validate values in flows** — check for empty/null before using; graceful fallback
8. **Use Boolean for feature flags** — `"yes"`/`"no"` values; combine with JSON for complex flag sets
9. **Avoid storing secrets** — use Azure Key Vault connection references instead
10. **Test with default values** — ensure the solution works with defaults before first deployment
