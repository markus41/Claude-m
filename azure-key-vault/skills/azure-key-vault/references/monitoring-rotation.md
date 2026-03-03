# Azure Key Vault Monitoring and Secret Rotation — Deep Reference

## Overview

Key Vault monitoring uses Azure Monitor diagnostic logs, metrics, and Event Grid notifications. Secret rotation can be triggered manually, via Azure Functions with Event Grid, or through app framework integrations. This reference covers diagnostic settings, KQL queries, rotation automation patterns, and alert configurations.

## REST API Endpoints — Monitoring

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|---|---|---|---|---|
| PUT | `https://management.azure.com/{vaultId}/providers/microsoft.insights/diagnosticSettings/{name}` | Monitoring Contributor | Settings JSON body | Enable diagnostic logging |
| GET | Same path | Monitoring Reader | — | Get current diagnostic settings |
| GET | `https://management.azure.com/{vaultId}/providers/microsoft.insights/metrics` | Monitoring Reader | `metricnames`, `timespan` | Query metrics |
| POST | `https://management.azure.com/{vaultId}/providers/microsoft.insights/metricAlerts` | Monitoring Contributor | Alert rule JSON | Create metric alert |

## Diagnostic Settings Configuration

```bash
VAULT_ID=$(az keyvault show --name mykeyvault --query id -o tsv)

LAWS_ID=$(az monitor log-analytics workspace show \
  --resource-group rg-monitoring \
  --workspace-name laws-security \
  --query id -o tsv)

# Enable all diagnostic categories
az monitor diagnostic-settings create \
  --name diag-keyvault-all \
  --resource "$VAULT_ID" \
  --workspace "$LAWS_ID" \
  --logs '[
    {"category": "AuditEvent", "enabled": true, "retentionPolicy": {"enabled": true, "days": 365}},
    {"category": "AzurePolicyEvaluationDetails", "enabled": true}
  ]' \
  --metrics '[
    {"category": "AllMetrics", "enabled": true}
  ]'
```

## Key Vault Metrics Reference

| Metric | Description | Alert Threshold |
|---|---|---|
| `ServiceApiHit` | Total API requests | Spike > 2x baseline |
| `ServiceApiLatency` | Request latency (ms) | > 500 ms (p95) |
| `ServiceApiResult` | Result by status code | Error rate > 1% |
| `SaturationShoebox` | Vault utilization (storage) | > 80% |
| `Availability` | Vault availability | < 100% |
| `ServiceApiResult` filtered by `Success=false` | Failed requests | > 5 failures/min |

## KQL Queries for Key Vault Diagnostics

```kusto
// All operations in last 24 hours with result codes
AzureDiagnostics
| where ResourceType == "VAULTS"
| where TimeGenerated > ago(24h)
| where Category == "AuditEvent"
| summarize Count = count() by OperationName, ResultType, ResultDescription
| order by Count desc

// Unauthorized access attempts
AzureDiagnostics
| where ResourceType == "VAULTS"
| where TimeGenerated > ago(24h)
| where ResultType == "Forbidden" or ResultType == "Unauthorized"
| project TimeGenerated, CallerIPAddress, OperationName, ResultType, id_s, requestUri_s
| order by TimeGenerated desc

// Secret access patterns (which secrets accessed by whom)
AzureDiagnostics
| where ResourceType == "VAULTS"
| where TimeGenerated > ago(7d)
| where OperationName == "SecretGet"
| project TimeGenerated, CallerIPAddress, CallerObject = identity_claim_oid_g, SecretId = id_s
| summarize AccessCount = count() by CallerObject, SecretId
| order by AccessCount desc

// Key operations summary
AzureDiagnostics
| where ResourceType == "VAULTS"
| where TimeGenerated > ago(7d)
| where OperationName startswith "Key"
| summarize Count = count() by OperationName, bin(TimeGenerated, 1h)
| render timechart

// Latency analysis
AzureDiagnostics
| where ResourceType == "VAULTS"
| where TimeGenerated > ago(24h)
| where Category == "AuditEvent"
| summarize
    p50_ms = percentile(DurationMs, 50),
    p95_ms = percentile(DurationMs, 95),
    p99_ms = percentile(DurationMs, 99)
    by OperationName
| order by p95_ms desc

// Alert: vault accessed from unexpected IP
AzureDiagnostics
| where ResourceType == "VAULTS"
| where TimeGenerated > ago(1h)
| where OperationName in ("SecretGet", "KeyDecrypt", "KeySign")
| where not(CallerIPAddress matches regex @"^10\.|^172\.(1[6-9]|2\d|3[01])\.|^192\.168\.")
| where not(CallerIPAddress == "<trusted-pip>")
| project TimeGenerated, CallerIPAddress, OperationName, id_s
```

## Event Grid Integration for Secret Expiry

Key Vault publishes events to Azure Event Grid for secret lifecycle events:

### Event Types

| Event Type | Trigger |
|---|---|
| `Microsoft.KeyVault.SecretNearExpiry` | Secret expires within 30 days |
| `Microsoft.KeyVault.SecretExpired` | Secret has passed its `expiresOn` date |
| `Microsoft.KeyVault.SecretNewVersionCreated` | New secret version set |
| `Microsoft.KeyVault.CertificateNearExpiry` | Certificate expires within 30 days |
| `Microsoft.KeyVault.CertificateExpired` | Certificate has expired |
| `Microsoft.KeyVault.CertificateNewVersionCreated` | New certificate version issued |
| `Microsoft.KeyVault.KeyNearExpiry` | Key version expires within 30 days |
| `Microsoft.KeyVault.KeyExpired` | Key has expired |
| `Microsoft.KeyVault.KeyNewVersionCreated` | New key version created or rotated |

```bash
# Subscribe to Key Vault events and trigger an Azure Function
VAULT_ID=$(az keyvault show --name mykeyvault --query id -o tsv)
FUNC_URL="https://func-rotation.azurewebsites.net/api/rotate-secret?code=<func-key>"

az eventgrid event-subscription create \
  --name sub-kv-secret-expiry \
  --source-resource-id "$VAULT_ID" \
  --endpoint "$FUNC_URL" \
  --endpoint-type webhook \
  --included-event-types \
    Microsoft.KeyVault.SecretNearExpiry \
    Microsoft.KeyVault.SecretExpired
```

## Azure Function — Automated Secret Rotation

```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential } from "@azure/identity";

// Event Grid schema for Key Vault events
interface KeyVaultSecretNearExpiryEvent {
  id: string;
  subject: string; // e.g., "vaults/mykeyvault/secrets/db-password/versions/<version>"
  eventType: "Microsoft.KeyVault.SecretNearExpiry";
  data: {
    Id: string;
    VaultName: string;
    ObjectType: "Secret";
    ObjectName: string;
    Version: string;
    NBF: number | null;
    EXP: number;
  };
}

app.http("RotateSecret", {
  methods: ["POST"],
  authLevel: "function",
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const events = await request.json() as KeyVaultSecretNearExpiryEvent[];

    for (const event of events) {
      // Event Grid sends a validation challenge on first subscription
      if ((event as any).eventType === "Microsoft.EventGrid.SubscriptionValidationEvent") {
        return {
          jsonBody: { validationResponse: (event as any).data.validationCode },
        };
      }

      if (event.eventType !== "Microsoft.KeyVault.SecretNearExpiry") continue;

      const { VaultName, ObjectName } = event.data;
      context.log(`Rotating secret ${ObjectName} in vault ${VaultName}`);

      const client = new SecretClient(
        `https://${VaultName}.vault.azure.net`,
        new DefaultAzureCredential()
      );

      // Generate new credential value (implementation depends on secret type)
      const newValue = await generateNewCredential(ObjectName);

      // Set new version
      await client.setSecret(ObjectName, newValue, {
        expiresOn: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      });

      // Disable old versions (keep last 2 for rollback)
      const versions: Array<{ version: string; createdOn: Date }> = [];
      for await (const v of client.listPropertiesOfSecretVersions(ObjectName)) {
        if (v.version && v.createdOn) {
          versions.push({ version: v.version, createdOn: v.createdOn });
        }
      }
      versions.sort((a, b) => b.createdOn.getTime() - a.createdOn.getTime());

      for (const v of versions.slice(2)) {
        await client.updateSecretProperties(ObjectName, v.version, { enabled: false });
      }

      context.log(`Rotation complete for ${ObjectName}`);
    }

    return { status: 200 };
  },
});

async function generateNewCredential(secretName: string): Promise<string> {
  // Implement secret-type-specific rotation logic:
  // - Database password: call stored procedure to rotate
  // - API key: call third-party API to generate new key
  // - Storage SAS: regenerate with new expiry
  // - Service principal secret: call Graph API to add new credential
  throw new Error(`Rotation not implemented for secret: ${secretName}`);
}
```

## Rotation Patterns by Secret Type

### Database Password Rotation

```typescript
import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential } from "@azure/identity";
import sql from "mssql";
import crypto from "crypto";

async function rotateDatabasePassword(vaultName: string, secretName: string) {
  const client = new SecretClient(
    `https://${vaultName}.vault.azure.net`,
    new DefaultAzureCredential()
  );

  // Get current connection string
  const current = await client.getSecret(secretName);
  const connStr = current.value!;

  // Generate new password
  const newPassword = crypto.randomBytes(32).toString("base64url");

  // Connect to database and rotate the password
  const pool = await sql.connect(connStr);
  const dbUser = "app-user"; // extract from current secret or known config
  await pool.query`ALTER LOGIN ${sql.raw(dbUser)} WITH PASSWORD = ${newPassword}`;
  await pool.close();

  // Build new connection string with new password
  const newConnStr = connStr.replace(/Password=[^;]+/, `Password=${newPassword}`);

  // Store new version in Key Vault
  await client.setSecret(secretName, newConnStr, {
    expiresOn: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    tags: { rotatedAt: new Date().toISOString() },
  });
}
```

### Service Principal Secret Rotation

```typescript
import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential } from "@azure/identity";
import { Client } from "@microsoft/microsoft-graph-client";

async function rotateServicePrincipalSecret(
  vaultName: string,
  secretName: string,
  appObjectId: string
) {
  const credential = new DefaultAzureCredential();
  const kvClient = new SecretClient(`https://${vaultName}.vault.azure.net`, credential);

  // Add new client secret to App Registration via Graph API
  const graphClient = Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => {
        const token = await credential.getToken("https://graph.microsoft.com/.default");
        return token!.token;
      },
    },
  });

  const newSecret = await graphClient
    .api(`/applications/${appObjectId}/addPassword`)
    .post({
      passwordCredential: {
        displayName: `rotation-${new Date().toISOString()}`,
        endDateTime: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });

  // Store new secret value in Key Vault
  await kvClient.setSecret(secretName, newSecret.secretText, {
    expiresOn: new Date(newSecret.endDateTime),
    tags: { credentialId: newSecret.keyId, rotatedAt: new Date().toISOString() },
  });

  // Remove old client secret(s) from App Registration
  const existing = await graphClient.api(`/applications/${appObjectId}`).get();
  for (const cred of existing.passwordCredentials) {
    if (cred.keyId !== newSecret.keyId) {
      await graphClient
        .api(`/applications/${appObjectId}/removePassword`)
        .post({ keyId: cred.keyId });
    }
  }
}
```

## Alert Configuration

```bash
VAULT_ID=$(az keyvault show --name mykeyvault --query id -o tsv)
ACTION_GROUP_ID="/subscriptions/<sub>/resourceGroups/rg-monitoring/providers/microsoft.insights/actionGroups/ag-security"

# Alert on API failures
az monitor metrics alert create \
  --name "kv-api-failures" \
  --resource-group rg-prod \
  --scopes "$VAULT_ID" \
  --condition "count ServiceApiResult > 10 where ResultType includes 'Failed'" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 2 \
  --action "$ACTION_GROUP_ID" \
  --description "Key Vault API failures exceeded 10 in 5 minutes"

# Alert on high latency
az monitor metrics alert create \
  --name "kv-high-latency" \
  --resource-group rg-prod \
  --scopes "$VAULT_ID" \
  --condition "avg ServiceApiLatency > 500" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 3 \
  --action "$ACTION_GROUP_ID"
```

## Error Codes

| Code | Meaning | Remediation |
|---|---|---|
| OperationNotAllowed (403) | Vault does not have Event Grid integration enabled | Enable Key Vault event publishing in portal |
| EventGridValidationFailed (400) | Webhook validation failed | Return `validationResponse` for `SubscriptionValidationEvent` |
| DiagnosticSettingNotFound (404) | No diagnostic setting with that name | Create new setting; name must be unique per resource |
| SecretVersionNotFound (404) | Version ID invalid during rotation | Re-list versions; version may have been purged |
| ResourceNotFound (404) | Vault ID incorrect in diagnostic settings | Verify vault resource ID with `az keyvault show` |

## Throttling Limits

| Resource | Limit | Retry Strategy |
|---|---|---|
| Key Vault events to Event Grid | No published limit | Use queued Azure Function triggers for resilience |
| Log Analytics ingestion | 500 MB/day (free tier) | Use Pay-As-You-Go workspace for production |
| KQL query timeout | 10 minutes | Optimize queries; use summary tables for large date ranges |
| Alert rule evaluations | 1 per minute minimum | Use 5-minute windows for cost efficiency |

## Production Gotchas

- **Event Grid delivery guarantees**: Event Grid delivers at-least-once. Your rotation function must be idempotent — running it twice with the same event must produce the same result without creating duplicate credentials.
- **Near-expiry events fire once**: The `SecretNearExpiry` event fires once when the secret reaches the 30-day threshold. If rotation fails, you must manually retry or set up a separate daily check job.
- **Diagnostic logs have 90-second latency**: Key Vault audit logs appear in Log Analytics with up to 90-second latency. Do not rely on near-real-time log queries for security incident detection — use Azure Sentinel or Microsoft Defender for Cloud for real-time alerting.
- **Vault access log retention**: Set diagnostic log retention to at least 365 days (or more if required for compliance). By default, no retention is configured and logs are kept indefinitely in the workspace (billed by ingestion + retention).
- **Rotation window**: Design rotation to maintain overlapping validity. The old secret version should remain enabled for at least the TTL of your application's secret cache (typically 5–15 minutes). Disable the old version only after confirming the new version is in use.
- **Monitoring purge events**: Enable alerting on `SecretPurge` and `KeyPurge` operations — these are irreversible and should be rare. Any purge in production warrants investigation.
