---
name: alm-solution-import
description: Import a Power Platform solution with connection reference and environment variable mapping via deployment settings.
argument-hint: "<solution.zip> [--settings-file deploy.json] [--upgrade] [--env target-env]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Import Power Platform Solution

Import a managed or unmanaged solution zip into a target Power Platform environment, with optional connection reference and environment variable mapping.

## PAC CLI

```bash
# Basic import
pac solution import --path ./MySolution.zip --activate-plugins --force-overwrite

# Import with deployment settings (connection refs + env vars)
pac solution import --path ./MySolution.zip \
  --settings-file ./deployment-settings/test.json \
  --activate-plugins \
  --force-overwrite \
  --publish-changes

# Import as holding solution (for upgrade workflow)
pac solution import --path ./MySolution.zip --import-as-holding
# Then apply upgrade:
pac solution upgrade --solution-name MySolution --async
```

## Steps

1. Determine the solution zip path
2. Determine the target environment (ensure auth is configured)
3. Check if deployment settings are needed (connection references, environment variables)
4. If deployment settings exist, generate or validate the settings JSON file
5. Determine import strategy:
   - **Direct import** — overwrites existing, quick
   - **Holding + Upgrade** — clean replacement, removes deprecated components
6. Generate the import command with appropriate flags
7. Remind about publishing customizations after import

## Deployment Settings File Format

```json
{
  "EnvironmentVariables": [
    { "SchemaName": "cr_ApiBaseUrl", "Value": "https://api.target.com" }
  ],
  "ConnectionReferences": [
    {
      "LogicalName": "cr_sharedconnector_ref",
      "ConnectionId": "target-connection-guid",
      "ConnectorId": "/providers/Microsoft.PowerApps/apis/shared_connector"
    }
  ]
}
```

## Post-Import

- Publish customizations: `pac solution import --publish-changes` or separately
- Verify flows are active
- Test connection references are mapped correctly
- Validate environment variable values
