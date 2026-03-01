---
name: alm-envvar-set
description: Set Power Platform environment variable values for a specific environment, or generate deployment settings files.
argument-hint: "<variable-name> <value> [--env target] [--generate-settings]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Set Environment Variable Values

Set environment variable values for a specific Power Platform environment, either directly via PAC CLI or by generating/updating deployment settings files.

## PAC CLI

```bash
# Set a single variable in the currently selected environment
pac env variable set --name {schema_name} --value "{value}"

# Select environment first
pac env select --env "{environment}"
pac env variable set --name cr_ApiBaseUrl --value "https://api.prod.contoso.com"
```

## Deployment Settings File

For automated deployments, use a deployment settings JSON file:

```json
{
  "EnvironmentVariables": [
    { "SchemaName": "cr_ApiBaseUrl", "Value": "https://api.prod.contoso.com" },
    { "SchemaName": "cr_MaxRetries", "Value": "3" },
    { "SchemaName": "cr_FeatureFlags", "Value": "{\"newUI\": true}" }
  ]
}
```

## Steps

1. Determine the approach:
   - **Direct set** — immediate change via PAC CLI or Web API
   - **Deployment settings** — generate/update JSON file for pipeline import
2. For direct set:
   - Verify the variable exists: `pac env variable list`
   - Set the value: `pac env variable set --name {name} --value "{value}"`
3. For deployment settings:
   - Read existing settings file (if any)
   - Add or update the variable entry
   - Write the updated JSON file
4. Validate value types:
   - String: any text
   - Number: valid numeric value
   - Boolean: `"yes"` or `"no"`
   - JSON: valid JSON string (escaped in the JSON file)

## Variable Types Reference

| Type | SchemaName Convention | Example Value |
|------|----------------------|---------------|
| String | `cr_ApiBaseUrl` | `"https://api.contoso.com"` |
| Number | `cr_MaxRetryCount` | `"5"` |
| Boolean | `cr_EnableFeatureX` | `"yes"` or `"no"` |
| JSON | `cr_FeatureFlags` | `"{\"feature1\": true}"` |
| Data Source | `cr_OrdersDataSource` | Connection reference JSON |

## Best Practices

- Use separate deployment settings files per environment
- Store settings in source control
- Never put secrets in environment variables — use Azure Key Vault
- Document each variable's purpose and expected format
