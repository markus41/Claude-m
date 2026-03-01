# Connection References

## Overview

Connection references are solution-aware components that decouple cloud flows, canvas apps, and custom connectors from specific physical connections. Instead of embedding a connection directly in a flow, the flow references a **connection reference** — a logical pointer that maps to different physical connections in each environment.

This abstraction is essential for ALM: the same solution can be deployed to dev, test, and production with each environment using its own connections (credentials, service accounts, API keys) without modifying the solution itself.

## How Connection References Work

### Architecture

```
Solution (MySolution)
├── Cloud Flow: "Process Orders"
│   └── Uses: Connection Reference "cr_sharedcommondataserviceforapps_orders"
│       ├── Dev:  → Connection "dev-service-account@contoso.com" (Dataverse)
│       ├── Test: → Connection "test-service-account@contoso.com" (Dataverse)
│       └── Prod: → Connection "prod-service-account@contoso.com" (Dataverse)
├── Cloud Flow: "Send Notifications"
│   └── Uses: Connection Reference "cr_sharedoffice365_notifications"
│       ├── Dev:  → Connection "dev-notifications@contoso.com" (Office 365)
│       ├── Test: → Connection "test-notifications@contoso.com" (Office 365)
│       └── Prod: → Connection "prod-notifications@contoso.com" (Office 365)
└── Connection Reference Definitions
    ├── cr_sharedcommondataserviceforapps_orders (Dataverse connector)
    └── cr_sharedoffice365_notifications (Office 365 connector)
```

### Dataverse Structure

Connection references are stored in the `connectionreference` table:

| Column | Description |
|--------|-------------|
| `connectionreferencelogicalname` | Unique logical name (e.g., `cr_sharedcommondataserviceforapps_abc123`) |
| `connectionreferencedisplayname` | Display name shown to users |
| `connectorid` | Full connector ID path (e.g., `/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps`) |
| `connectionid` | The physical connection GUID this reference points to (environment-specific) |
| `statecode` | 0 = Active, 1 = Inactive |
| `iscustomizable` | Whether the reference can be customized in downstream environments |

### Common Connector IDs

| Connector | Connector ID |
|-----------|-------------|
| Dataverse | `/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps` |
| SharePoint Online | `/providers/Microsoft.PowerApps/apis/shared_sharepointonline` |
| Office 365 Outlook | `/providers/Microsoft.PowerApps/apis/shared_office365` |
| Office 365 Users | `/providers/Microsoft.PowerApps/apis/shared_office365users` |
| Azure Key Vault | `/providers/Microsoft.PowerApps/apis/shared_keyvault` |
| SQL Server | `/providers/Microsoft.PowerApps/apis/shared_sql` |
| HTTP with Azure AD | `/providers/Microsoft.PowerApps/apis/shared_webcontents` |
| Custom Connector | `/providers/Microsoft.PowerApps/apis/{custom_connector_name}` |

## Mapping During Import

### Deployment Settings File

The deployment settings file provides the mapping between connection reference logical names and target environment connection IDs:

```json
{
  "ConnectionReferences": [
    {
      "LogicalName": "cr_sharedcommondataserviceforapps_abc123",
      "ConnectionId": "00000000-0000-0000-0000-000000000001",
      "ConnectorId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps"
    },
    {
      "LogicalName": "cr_sharedsharepointonline_def456",
      "ConnectionId": "00000000-0000-0000-0000-000000000002",
      "ConnectorId": "/providers/Microsoft.PowerApps/apis/shared_sharepointonline"
    },
    {
      "LogicalName": "cr_sharedoffice365_ghi789",
      "ConnectionId": "00000000-0000-0000-0000-000000000003",
      "ConnectorId": "/providers/Microsoft.PowerApps/apis/shared_office365"
    }
  ]
}
```

### Using with PAC CLI

```bash
pac solution import \
  --path ./MySolution_managed.zip \
  --settings-file ./deployment-settings/test.json \
  --activate-plugins \
  --force-overwrite
```

### Using with Web API Import

When importing via the Web API `ImportSolutionAsync`, pass connection mappings in the `ComponentParameters` array:

```typescript
interface ConnectionMapping {
  ComponentId: string;    // Connection reference logical name
  ConnectionId: string;   // Target connection GUID
  ConnectorId: string;    // Full connector path
}

async function importWithConnectionMappings(
  orgUrl: string,
  accessToken: string,
  solutionZipBase64: string,
  connectionMappings: ConnectionMapping[]
): Promise<string> {
  const response = await fetch(
    `${orgUrl}/api/data/v9.2/ImportSolutionAsync`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        OverwriteUnmanagedCustomizations: true,
        PublishWorkflows: true,
        CustomizationFile: solutionZipBase64,
        ComponentParameters: connectionMappings.map((m) => ({
          "@odata.type": "#Microsoft.Dynamics.CRM.ImportSolutionComponentParameter",
          ComponentId: m.ComponentId,
          ConnectionId: m.ConnectionId,
          ConnectorId: m.ConnectorId,
        })),
      }),
    }
  );

  const result = await response.json();
  return result.AsyncOperationId;
}
```

## Finding Connection IDs

To populate the deployment settings file, you need the connection GUIDs from each target environment.

### List Connections via Power Apps Admin API

```typescript
async function listConnections(
  environmentId: string,
  accessToken: string
): Promise<Array<{ name: string; displayName: string; connectorName: string }>> {
  const response = await fetch(
    `https://api.powerapps.com/providers/Microsoft.PowerApps/apis?api-version=2021-02-01&$filter=environment eq '${environmentId}'`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const result = await response.json();
  return result.value.map((conn: Record<string, unknown>) => ({
    name: conn.name,
    displayName: (conn.properties as Record<string, unknown>).displayName,
    connectorName: (conn.properties as Record<string, unknown>).apiId,
  }));
}
```

### List Connections via PAC CLI

```bash
# List all connections in the selected environment
pac connection list

# Output shows connection name (GUID), connector, and status
```

### Query via Dataverse Web API

```typescript
async function getConnectionReferences(
  orgUrl: string,
  accessToken: string
): Promise<Array<{ logicalName: string; connectorId: string; connectionId: string }>> {
  const response = await fetch(
    `${orgUrl}/api/data/v9.2/connectionreferences?$select=connectionreferencelogicalname,connectorid,connectionid,connectionreferencedisplayname`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
    }
  );

  const result = await response.json();
  return result.value.map((cr: Record<string, string>) => ({
    logicalName: cr.connectionreferencelogicalname,
    connectorId: cr.connectorid,
    connectionId: cr.connectionid,
  }));
}
```

## Creating Connections Programmatically

For fully automated pipelines, create connections before import.

### Service Principal Connections

Service principal (application user) connections can be created without interactive sign-in:

```typescript
async function createConnection(
  environmentId: string,
  accessToken: string,
  connectorId: string,
  connectionName: string
): Promise<string> {
  const response = await fetch(
    `https://api.powerapps.com/providers/Microsoft.PowerApps/connections?api-version=2021-02-01`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          apiId: connectorId,
          displayName: connectionName,
          environment: { name: environmentId },
          connectionParametersSet: {
            name: "oauthSP",
            values: {
              "token:clientId": { value: process.env.CLIENT_ID },
              "token:clientSecret": { value: process.env.CLIENT_SECRET },
              "token:TenantId": { value: process.env.TENANT_ID },
            },
          },
        },
      }),
    }
  );

  const result = await response.json();
  return result.name; // Connection GUID
}
```

### Sharing Connections

After creating a connection, share it with the application user or security group that runs the flows:

```typescript
async function shareConnection(
  connectionId: string,
  connectorName: string,
  principalId: string,
  accessToken: string
): Promise<void> {
  await fetch(
    `https://api.powerapps.com/providers/Microsoft.PowerApps/apis/${connectorName}/connections/${connectionId}/modifyPermissions?api-version=2021-02-01`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        put: [
          {
            properties: {
              roleName: "CanEdit",
              principal: {
                id: principalId,
                type: "ServicePrincipal",
              },
            },
          },
        ],
      }),
    }
  );
}
```

## Deployment Settings File Generation Script

Generate deployment settings by querying the target environment:

```typescript
interface DeploymentSettings {
  ConnectionReferences: Array<{
    LogicalName: string;
    ConnectionId: string;
    ConnectorId: string;
  }>;
  EnvironmentVariables: Array<{
    SchemaName: string;
    Value: string;
  }>;
}

async function generateDeploymentSettings(
  orgUrl: string,
  accessToken: string,
  solutionName: string
): Promise<DeploymentSettings> {
  // Get connection references in the solution
  const crResponse = await fetch(
    `${orgUrl}/api/data/v9.2/connectionreferences?$filter=solutionid/uniquename eq '${solutionName}'&$select=connectionreferencelogicalname,connectorid,connectionid`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const crData = await crResponse.json();

  // Get environment variables in the solution
  const evResponse = await fetch(
    `${orgUrl}/api/data/v9.2/environmentvariabledefinitions?$filter=solutionid/uniquename eq '${solutionName}'&$select=schemaname&$expand=environmentvariablevalues($select=value)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const evData = await evResponse.json();

  return {
    ConnectionReferences: crData.value.map((cr: Record<string, string>) => ({
      LogicalName: cr.connectionreferencelogicalname,
      ConnectionId: cr.connectionid || "REPLACE_WITH_TARGET_CONNECTION_ID",
      ConnectorId: cr.connectorid,
    })),
    EnvironmentVariables: evData.value.map((ev: Record<string, unknown>) => ({
      SchemaName: ev.schemaname as string,
      Value: ((ev.environmentvariablevalues as Array<{ value: string }>)?.[0]?.value) || "REPLACE_WITH_TARGET_VALUE",
    })),
  };
}
```

## Troubleshooting Connection References

### Common Issues

**Flow fails after import with "Connection not configured" error:**
The connection reference was not mapped during import. Check that the deployment settings file includes an entry for the connection reference's logical name with a valid connection ID in the target environment.

**Connection reference shows as "Not connected" in the solution:**
The physical connection in the target environment may have expired, been deleted, or the owning user no longer has access. Recreate the connection and update the deployment settings file with the new connection ID.

**Multiple connections for the same connector cause confusion:**
Clean up duplicate connections in the target environment. Use `pac connection list` to inventory all connections and remove unused ones. Standardize on one connection per connector per environment.

**Canvas apps prompt for connection on first launch:**
This typically happens when the app uses implicit connections (not connection references). Convert the app to use connection references by editing the app source and referencing the connection reference logical name instead of a direct connection.

### Validating Connection References Before Import

Run this check before importing to ensure all required connections exist in the target:

```typescript
async function validateConnectionMappings(
  orgUrl: string,
  accessToken: string,
  settingsFilePath: string
): Promise<boolean> {
  const fs = await import("fs");
  const settings = JSON.parse(fs.readFileSync(settingsFilePath, "utf-8"));
  let allValid = true;

  for (const cr of settings.ConnectionReferences ?? []) {
    // Verify the connection exists and is active
    const response = await fetch(
      `${orgUrl}/api/data/v9.2/connectionreferences?$filter=connectionreferencelogicalname eq '${cr.LogicalName}'&$select=connectionid,statecode`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await response.json();

    if (data.value.length === 0) {
      console.warn(`Connection reference not found: ${cr.LogicalName}`);
      allValid = false;
    }
  }

  return allValid;
}
```

## Connection Reference Owner Assignment

When flows use connection references, the flow runs in the context of the connection owner. For production environments, ensure connections are owned by a service account or application user — not an individual user — to prevent flow failures when employees leave or change roles.

To change the owner of a connection, the new owner must be shared on the connection with CanEdit permissions, and the connection reference in the environment must be updated to point to the new connection.

## Connection References in Canvas Apps vs. Cloud Flows

**Cloud Flows:** Connection references are the standard pattern. Each connector action in the flow designer automatically uses the solution's connection reference. No special configuration is needed beyond including the connection reference in the solution.

**Canvas Apps:** Connection references are supported but must be explicitly configured. When building a canvas app in a solution, the app's data sources should be linked to connection references rather than direct connections. This ensures the app uses the correct connection in each environment without manual reconfiguration after import.

**Custom Connectors:** Custom connectors can also use connection references. The custom connector definition must be included in the same solution (or a dependent solution), and the connection reference's connector ID must match the custom connector's full path.

## Best Practices

1. **One connection per connector per environment** — avoid duplicate connections that cause confusion
2. **Use service principal connections** — not personal user accounts, for production flows
3. **Naming convention** — `{env}-{connector}-{purpose}` (e.g., `prod-dataverse-orderprocessing`)
4. **Store deployment settings in source control** — one file per target environment
5. **Validate connection health before import** — check that target connections are active
6. **Document connection ownership** — who owns each connection, rotation schedule
7. **Use Azure Key Vault** — for connections requiring secrets, reference Key Vault instead of embedding
8. **Automate connection creation** — include in environment provisioning scripts
9. **Review connection references during solution review** — ensure no orphaned or missing references
10. **Share connections with application users** — not individual maker accounts
