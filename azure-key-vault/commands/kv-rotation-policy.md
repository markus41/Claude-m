---
name: kv-rotation-policy
description: "Set up automatic secret and key rotation with Event Grid notifications"
argument-hint: "--vault <vault-name> --name <secret-or-key-name> [--type <secret|key>] [--interval <days>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Configure Key Vault Rotation Policy

Set up automatic rotation for secrets and keys, with Event Grid notifications for custom rotation workflows.

## Instructions

### 1. Validate Inputs

- `--vault` -- Key Vault name. Ask if not provided.
- `--name` -- Secret or key name to configure rotation for. Ask if not provided.
- `--type` -- Either `secret` or `key`. Default: `secret`.
- `--interval` -- Rotation interval in days. Ask if not provided.

### 2. Configure Built-In Key Rotation Policy

For keys, Key Vault supports built-in automatic rotation:

```bash
az keyvault key rotation-policy update \
  --vault-name <vault-name> \
  --name <key-name> \
  --value "$(cat <<'POLICY'
{
  "lifetimeActions": [
    {
      "trigger": { "timeAfterCreate": "P90D" },
      "action": { "type": "Rotate" }
    },
    {
      "trigger": { "timeBeforeExpiry": "P30D" },
      "action": { "type": "Notify" }
    }
  ],
  "attributes": {
    "expiryTime": "P120D"
  }
}
POLICY
)"
```

Duration format: ISO 8601 (`P90D` = 90 days, `P1Y` = 1 year, `P6M` = 6 months).

Ask the user for:
- **Rotation interval** -- How often to rotate (e.g., every 90 days).
- **Expiry time** -- When the key version expires after creation.
- **Notification lead time** -- How many days before expiry to send a notification.

### 3. Configure Event Grid Notifications for Secrets

Secrets do not support built-in rotation. Use Event Grid to trigger custom rotation:

```bash
# Register the Event Grid resource provider (one-time)
az provider register --namespace Microsoft.EventGrid

# Create an Event Grid subscription for near-expiry events
VAULT_ID=$(az keyvault show --name <vault-name> --query id -o tsv)

az eventgrid event-subscription create \
  --name <subscription-name> \
  --source-resource-id "$VAULT_ID" \
  --endpoint <function-app-endpoint> \
  --included-event-types \
    "Microsoft.KeyVault.SecretNearExpiry" \
    "Microsoft.KeyVault.SecretExpired" \
    "Microsoft.KeyVault.KeyNearExpiry" \
    "Microsoft.KeyVault.KeyExpired" \
    "Microsoft.KeyVault.CertificateNearExpiry" \
    "Microsoft.KeyVault.CertificateExpired"
```

Available event types:
| Event | Trigger |
|-------|---------|
| `SecretNearExpiry` | 30 days before secret expiration |
| `SecretExpired` | Secret has expired |
| `KeyNearExpiry` | 30 days before key expiration |
| `KeyExpired` | Key has expired |
| `CertificateNearExpiry` | 30 days before certificate expiration |
| `CertificateExpired` | Certificate has expired |

### 4. Create a Custom Rotation Function (Azure Functions)

Generate a skeleton Azure Function for secret rotation:

```bash
# Scaffold the function
func init SecretRotation --worker-runtime node --language typescript
cd SecretRotation
func new --name RotateSecret --template "Azure Event Grid trigger"
npm install @azure/keyvault-secrets @azure/identity
```

The function should:
1. Receive the Event Grid event with the secret name and vault URI.
2. Generate a new secret value (or call the target service API to rotate credentials).
3. Store the new value in Key Vault using `SecretClient.setSecret()`.
4. Optionally update the consuming application or service.

Provide the function skeleton:

```typescript
import { AzureFunction, Context } from "@azure/functions";
import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential } from "@azure/identity";

const rotateSecret: AzureFunction = async (context: Context, event: any): Promise<void> => {
  const secretName = event.subject; // e.g., "secret-name"
  const vaultUri = event.data.VaultName;
  const vaultUrl = `https://${vaultUri}.vault.azure.net`;

  const client = new SecretClient(vaultUrl, new DefaultAzureCredential());

  // Generate new secret value (customize per secret type)
  const newValue = generateNewCredential(secretName);

  // Store the new version in Key Vault
  await client.setSecret(secretName, newValue, {
    expiresOn: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    tags: { rotatedBy: "auto-rotation-function", rotatedOn: new Date().toISOString() },
  });

  context.log(`Rotated secret: ${secretName}`);
};

function generateNewCredential(secretName: string): string {
  // TODO: Implement per-secret rotation logic
  // e.g., call Azure Storage API to regenerate key, call SQL to reset password, etc.
  throw new Error(`Rotation logic not implemented for: ${secretName}`);
}

export default rotateSecret;
```

### 5. Set Secret Expiration (Required for Near-Expiry Events)

Ensure the secret has an expiration date (Event Grid events only fire for secrets with `exp` set):

```bash
az keyvault secret set-attributes \
  --vault-name <vault-name> \
  --name <secret-name> \
  --expires <YYYY-MM-DDT00:00:00Z>
```

### 6. Verify Rotation Setup

```bash
# For keys: show the rotation policy
az keyvault key rotation-policy show \
  --vault-name <vault-name> \
  --name <key-name>

# For Event Grid: list subscriptions
az eventgrid event-subscription list \
  --source-resource-id "$VAULT_ID" \
  -o table
```

### 7. Display Summary

Show the user:
- Rotation type configured (built-in key rotation or Event Grid-triggered)
- Rotation interval and notification schedule
- Next steps (test rotation, monitor with `/kv-access-audit --check-logs`)
