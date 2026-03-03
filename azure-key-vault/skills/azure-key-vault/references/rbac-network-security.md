# Azure Key Vault RBAC and Network Security — Deep Reference

## Overview

Azure Key Vault supports two authorization models: Azure RBAC (recommended) and vault access policies (legacy). Network security is enforced via firewall rules, virtual network service endpoints, and private endpoints. This reference covers RBAC role definitions, network configuration patterns, and managed identity integration.

## Authorization Models

| Feature | Azure RBAC | Vault Access Policies |
|---|---|---|
| Granularity | Per-vault, per-secret, per-key, per-certificate | Per-vault (all objects of a type) |
| Conditional Access | Supported | Not supported |
| Deny assignments | Supported | Not supported |
| Privileged Identity Management | Supported | Not supported |
| Audit in Activity Log | Full audit trail | Limited |
| Recommendation | Use for new vaults | Legacy; migrate to RBAC |

## Azure RBAC Roles for Key Vault

| Role | Permissions | Use Case |
|---|---|---|
| Key Vault Administrator | Full management of vault, keys, secrets, certificates; cannot purge | Vault administration |
| Key Vault Certificates Officer | Manage certificates (create, import, delete, update policy) | PKI automation services |
| Key Vault Certificates User | Read certificate public key and metadata | Applications reading certificates |
| Key Vault Crypto Officer | Manage keys (create, import, delete, rotate); no cryptographic use | Key lifecycle management |
| Key Vault Crypto User | Use keys for crypto operations (encrypt, decrypt, sign, verify, wrap) | Applications using keys |
| Key Vault Crypto Service Encryption User | `wrapKey`, `unwrapKey` only | Storage/SQL transparent encryption (service-managed CMK) |
| Key Vault Crypto Service Release User | Secure key release (Confidential Computing) | Attestation-based key release |
| Key Vault Reader | Read vault metadata and object metadata; no value access | Monitoring, auditing |
| Key Vault Secrets Officer | Manage secrets (set, get, delete, list, restore, backup) | Secret lifecycle management |
| Key Vault Secrets User | Read secret values | Applications reading secrets |
| Key Vault Purge | Purge soft-deleted objects (irreversible) | Emergency cleanup only |

## REST API Endpoints for RBAC

| Method | Endpoint | Notes |
|---|---|---|
| PUT | `https://management.azure.com/{vaultResourceId}/providers/Microsoft.Authorization/roleAssignments/{guid}` | Assign RBAC role |
| DELETE | `https://management.azure.com/{vaultResourceId}/providers/Microsoft.Authorization/roleAssignments/{guid}` | Remove role assignment |
| GET | `https://management.azure.com/{vaultResourceId}/providers/Microsoft.Authorization/roleAssignments` | List assignments |

## Azure CLI Patterns — RBAC

```bash
VAULT_ID=$(az keyvault show --name mykeyvault --query id -o tsv)
APP_PRINCIPAL_ID="<managed-identity-or-sp-object-id>"

# Assign Key Vault Secrets User to a managed identity
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee-object-id "$APP_PRINCIPAL_ID" \
  --assignee-principal-type ServicePrincipal \
  --scope "$VAULT_ID"

# Assign at secret level (granular)
SECRET_ID="$VAULT_ID/secrets/db-connection-string"
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee-object-id "$APP_PRINCIPAL_ID" \
  --assignee-principal-type ServicePrincipal \
  --scope "$SECRET_ID"

# Assign Key Vault Crypto User for key operations
az role assignment create \
  --role "Key Vault Crypto User" \
  --assignee-object-id "$APP_PRINCIPAL_ID" \
  --assignee-principal-type ServicePrincipal \
  --scope "$VAULT_ID"

# List all role assignments on vault
az role assignment list \
  --scope "$VAULT_ID" \
  --include-inherited \
  --output table

# Remove a role assignment
az role assignment delete \
  --role "Key Vault Secrets User" \
  --assignee "$APP_PRINCIPAL_ID" \
  --scope "$VAULT_ID"

# Check if RBAC authorization mode is enabled
az keyvault show \
  --name mykeyvault \
  --query "properties.enableRbacAuthorization"

# Enable RBAC authorization (migrate from access policies)
az keyvault update \
  --name mykeyvault \
  --enable-rbac-authorization true
```

## Network Security Configuration

### Firewall Rules

```bash
# Default deny — block all public network access
az keyvault update \
  --name mykeyvault \
  --default-action Deny

# Allow specific IP or CIDR
az keyvault network-rule add \
  --name mykeyvault \
  --ip-address "203.0.113.0/24"

# Add VNet subnet (requires service endpoint on subnet)
az network vnet subnet update \
  --vnet-name vnet-prod \
  --name subnet-app \
  --resource-group rg-prod \
  --service-endpoints Microsoft.KeyVault

az keyvault network-rule add \
  --name mykeyvault \
  --vnet-name vnet-prod \
  --subnet subnet-app \
  --resource-group rg-prod

# Allow Azure trusted services (Azure Backup, Azure Disk Encryption, etc.)
az keyvault update \
  --name mykeyvault \
  --bypass AzureServices

# Completely restrict to private endpoint only
az keyvault update \
  --name mykeyvault \
  --default-action Deny \
  --bypass None \
  --public-network-access Disabled
```

### Private Endpoint Configuration

```bash
VAULT_ID=$(az keyvault show --name mykeyvault --query id -o tsv)

# Create private endpoint
az network private-endpoint create \
  --name pe-keyvault \
  --resource-group rg-prod \
  --vnet-name vnet-prod \
  --subnet subnet-private-endpoints \
  --private-connection-resource-id "$VAULT_ID" \
  --group-id vault \
  --connection-name conn-keyvault-vault

# Create private DNS zone for Key Vault
az network private-dns zone create \
  --resource-group rg-prod \
  --name privatelink.vaultcore.azure.net

# Link DNS zone to VNet
az network private-dns link vnet create \
  --resource-group rg-prod \
  --zone-name privatelink.vaultcore.azure.net \
  --name dns-link-vnet-prod \
  --virtual-network vnet-prod \
  --registration-enabled false

# Create DNS A record from private endpoint NIC
NIC_ID=$(az network private-endpoint show \
  --name pe-keyvault \
  --resource-group rg-prod \
  --query "networkInterfaces[0].id" -o tsv)

PE_IP=$(az network nic show --ids "$NIC_ID" \
  --query "ipConfigurations[0].privateIPAddress" -o tsv)

az network private-dns record-set a create \
  --resource-group rg-prod \
  --zone-name privatelink.vaultcore.azure.net \
  --name mykeyvault

az network private-dns record-set a add-record \
  --resource-group rg-prod \
  --zone-name privatelink.vaultcore.azure.net \
  --record-set-name mykeyvault \
  --ipv4-address "$PE_IP"
```

## TypeScript SDK — Managed Identity Access

```typescript
import { SecretClient } from "@azure/keyvault-secrets";
import { KeyClient } from "@azure/keyvault-keys";
import {
  DefaultAzureCredential,
  ManagedIdentityCredential,
  WorkloadIdentityCredential,
} from "@azure/identity";

const vaultUrl = `https://${process.env.KEY_VAULT_NAME}.vault.azure.net`;

// Option 1: DefaultAzureCredential (tries managed identity, env vars, CLI, etc.)
// Best for production + local dev flexibility
const credential = new DefaultAzureCredential();

// Option 2: Explicit system-assigned managed identity (no config needed)
// const credential = new ManagedIdentityCredential();

// Option 3: User-assigned managed identity (specify client ID)
// const credential = new ManagedIdentityCredential("<user-assigned-client-id>");

// Option 4: Workload Identity (AKS with OIDC issuer)
// const credential = new WorkloadIdentityCredential();

const secretClient = new SecretClient(vaultUrl, credential);
const keyClient = new KeyClient(vaultUrl, credential);

// Usage
const secret = await secretClient.getSecret("db-connection-string");
console.log("Connection string retrieved via managed identity");
```

## Conditional Access for Key Vault

Conditional Access policies can enforce MFA, device compliance, or trusted locations for interactive Key Vault access:

```json
// Example: Require MFA for Key Vault admin operations from non-trusted locations
{
  "conditions": {
    "applications": { "includeApplications": ["cfa8b339-82a2-471a-a3c9-0fc0be7a4093"] },
    "users": { "includeGroups": ["<kv-admins-group-id>"] },
    "locations": { "excludeLocations": ["<trusted-named-location-id>"] }
  },
  "grantControls": {
    "operator": "AND",
    "builtInControls": ["mfa"]
  }
}
```

Note: Application ID `cfa8b339-82a2-471a-a3c9-0fc0be7a4093` is the Azure Key Vault service principal ID.

## Privileged Identity Management (PIM) for Key Vault

```bash
# Eligible (just-in-time) role assignment using PIM
# Users request activation for a limited time window

# List eligible assignments for Key Vault Secrets Officer
az rest --method GET \
  --uri "https://management.azure.com/subscriptions/<sub>/providers/Microsoft.Authorization/roleEligibilityScheduleInstances?api-version=2022-04-01-preview&\$filter=asTarget()"

# Activate PIM role (via az cli extension for PIM)
az pim role assignment activate \
  --role "Key Vault Secrets Officer" \
  --resource-id "<vault-resource-id>" \
  --justification "Rotating production database passwords" \
  --duration "PT2H" # 2 hours maximum
```

## Error Codes

| Code | Meaning | Remediation |
|---|---|---|
| Forbidden (403) | RBAC role not assigned or access policy missing | Assign correct RBAC role; wait up to 5 minutes for propagation |
| NetworkAclsViolation (403) | Client IP not in firewall allowlist | Add client IP or use private endpoint |
| VaultAccessDenied (403) | Vault has RBAC disabled and no access policy | Enable RBAC authorization or add access policy |
| VaultPurgeProtectionEnabled (409) | Cannot disable purge protection | Purge protection is permanent; plan accordingly |
| RbacAuthorizationNotEnabled (400) | Vault access policy mode; RBAC API not available | Switch vault to RBAC authorization mode |
| Unauthorized (401) | Invalid or expired token | Refresh Entra ID token; check managed identity assignment |
| ConflictError (409) | Trying to add duplicate role assignment | Idempotent: check existing assignments before adding |

## Throttling Limits

| Resource | Limit | Retry Strategy |
|---|---|---|
| RBAC role assignment reads | No limit | Cache results; use `list` sparingly |
| RBAC propagation delay | Up to 5 minutes | Build retry logic; do not assume immediate availability |
| Network rule changes | Near-instantaneous | Allow 30–60 seconds for firewall rule propagation |
| Private endpoint DNS propagation | Up to 5 minutes | Verify DNS resolution before testing connectivity |

## Production Gotchas

- **RBAC propagation delay**: After assigning a RBAC role, it can take up to 5 minutes for the assignment to take effect. Do not assume immediate access in deployment pipelines; add a wait or retry loop.
- **Access policies are vault-wide**: Vault access policies cannot be scoped to individual secrets/keys. A principal with `get` on secrets can access all secrets. Migrate to RBAC for object-level scoping.
- **Public network access for build pipelines**: If your CI/CD pipeline (GitHub Actions, Azure DevOps) needs vault access, either add the agent IP to the firewall allowlist or configure a self-hosted agent in the VNet. Ephemeral agent IPs change frequently.
- **Trusted services bypass is limited**: The `AzureServices` bypass allows only a specific set of Microsoft services (Backup, Encryption, etc.) to bypass firewall rules. Your custom app services do NOT get this bypass — they must be in the VNet or IP allowlist.
- **Private endpoint disables public DNS**: After creating a private endpoint and private DNS zone, the vault's public DNS name resolves to the private IP within the VNet. Clients outside the VNet will not be able to reach the vault even if they have RBAC access.
- **MFA for service principals**: Conditional Access MFA requirements do not apply to service principal tokens (non-interactive auth). Use certificate-based authentication for service principals rather than client secrets to meet strong auth requirements.
