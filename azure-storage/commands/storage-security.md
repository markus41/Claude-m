---
name: storage-security
description: "Generate SAS tokens, audit storage access, configure RBAC roles, firewall rules, and private endpoints"
argument-hint: "<sas-generate|audit-access|configure-rbac|configure-firewall> [--account <name>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Storage Security

Manage Azure Storage security: SAS tokens, RBAC, firewalls, and private endpoints.

## Instructions

### 1. Parse the Request

- `<action>` -- One of: `sas-generate`, `audit-access`, `configure-rbac`, `configure-firewall`. Ask if not provided.
- `--account` -- Storage account name. Ask if not provided.
- `--resource-group` -- Resource group name. Ask if not provided.

### 2. Generate SAS Token

**Account-level SAS** (access to all services):
```bash
END_DATE=$(date -u -d "+1 hour" '+%Y-%m-%dT%H:%MZ')

az storage account generate-sas \
  --account-name <storage-name> \
  --permissions rwdlacup \
  --resource-types sco \
  --services bfqt \
  --expiry $END_DATE \
  --https-only \
  --output tsv
```

**Service-level SAS** (access to a specific container):
```bash
az storage container generate-sas \
  --account-name <storage-name> \
  --name <container-name> \
  --permissions rwdl \
  --expiry $END_DATE \
  --auth-mode login \
  --as-user \
  --output tsv
```

**User delegation SAS** (recommended -- uses Azure AD, no account key):

```typescript
import { BlobServiceClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";

const blobService = new BlobServiceClient(
  `https://${accountName}.blob.core.windows.net`,
  new DefaultAzureCredential()
);

// Get user delegation key (valid up to 7 days)
const startDate = new Date();
const expiryDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour
const delegationKey = await blobService.getUserDelegationKey(startDate, expiryDate);

// Generate SAS for a specific blob
const containerClient = blobService.getContainerClient(containerName);
const blobClient = containerClient.getBlobClient(blobName);

const sasToken = generateBlobSASQueryParameters(
  {
    containerName,
    blobName,
    permissions: BlobSASPermissions.parse("r"),  // read-only
    startsOn: startDate,
    expiresOn: expiryDate,
    protocol: SASProtocol.Https,
  },
  delegationKey,
  accountName
).toString();

const sasUrl = `${blobClient.url}?${sasToken}`;
```

**SAS best practices**:
- Always set an expiry (`expiresOn`) -- prefer short-lived tokens (1-4 hours)
- Use user delegation SAS over account key SAS
- Use stored access policies for service SAS so they can be revoked
- Restrict permissions to the minimum needed (read-only when possible)
- Always require HTTPS (`protocol: SASProtocol.Https`)
- Log SAS usage via Storage Analytics or diagnostic settings

### 3. Audit Access

```bash
# Check storage account public access settings
az storage account show \
  --name <storage-name> \
  --resource-group <rg-name> \
  --query "{publicAccess:allowBlobPublicAccess, sharedKey:allowSharedKeyAccess, tlsVersion:minimumTlsVersion, httpsOnly:enableHttpsTrafficOnly}"

# List network rules
az storage account network-rule list \
  --account-name <storage-name> \
  --resource-group <rg-name>

# List RBAC role assignments
az role assignment list \
  --scope "/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Storage/storageAccounts/<storage-name>" \
  --output table

# Check for containers with public access
az storage container list \
  --account-name <storage-name> \
  --auth-mode login \
  --query "[?properties.publicAccess!='none'].{name:name, access:properties.publicAccess}" \
  --output table
```

### 4. Configure RBAC

Assign built-in storage roles instead of using shared keys:

```bash
# Storage Blob Data Contributor (read/write/delete blobs)
az role assignment create \
  --assignee <user-or-sp-id> \
  --role "Storage Blob Data Contributor" \
  --scope "/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Storage/storageAccounts/<storage-name>"

# Storage Blob Data Reader (read-only blobs)
az role assignment create \
  --assignee <user-or-sp-id> \
  --role "Storage Blob Data Reader" \
  --scope "/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Storage/storageAccounts/<storage-name>"

# Disable shared key access (enforce RBAC)
az storage account update \
  --name <storage-name> \
  --resource-group <rg-name> \
  --allow-shared-key-access false
```

**Common storage RBAC roles**:
| Role | Scope | Permissions |
|------|-------|------------|
| Storage Blob Data Owner | Blob | Full access + manage ACLs |
| Storage Blob Data Contributor | Blob | Read, write, delete blobs |
| Storage Blob Data Reader | Blob | Read blobs |
| Storage Blob Delegator | Account | Generate user delegation keys |
| Storage Queue Data Contributor | Queue | Read, write, delete messages |
| Storage Queue Data Reader | Queue | Read and peek messages |
| Storage Queue Data Message Processor | Queue | Peek, receive, delete messages |
| Storage Queue Data Message Sender | Queue | Send messages |
| Storage Table Data Contributor | Table | Read, write, delete entities |
| Storage Table Data Reader | Table | Read entities |
| Storage File Data SMB Share Contributor | Files | Read, write, delete in SMB shares |
| Storage File Data SMB Share Reader | Files | Read access to SMB shares |

### 5. Configure Firewall

```bash
# Deny all traffic by default
az storage account update \
  --name <storage-name> \
  --resource-group <rg-name> \
  --default-action Deny

# Allow specific IP addresses
az storage account network-rule add \
  --account-name <storage-name> \
  --resource-group <rg-name> \
  --ip-address <your-ip>

# Allow a VNet subnet
az storage account network-rule add \
  --account-name <storage-name> \
  --resource-group <rg-name> \
  --vnet-name <vnet-name> \
  --subnet <subnet-name>

# Allow trusted Azure services (recommended)
az storage account update \
  --name <storage-name> \
  --resource-group <rg-name> \
  --bypass AzureServices
```

### 6. Display Summary

Show the user:
- Action performed and result
- Current security posture summary
- Recommendations for any remaining security gaps
- Reminder: prefer user delegation SAS over account key SAS, RBAC over shared keys
