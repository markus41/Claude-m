---
name: private-endpoint-create
description: "Create a Private Endpoint for Azure services with DNS integration"
argument-hint: "--name <pe-name> --rg <resource-group> --service <resource-id> --group-id <group> --vnet <vnet-name> --subnet <subnet-name>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Create a Private Endpoint

Create a Private Endpoint for an Azure PaaS service with automatic Private DNS zone integration.

## Instructions

### 1. Validate Inputs

- `--name` — Private Endpoint name. Ask if not provided.
- `--rg` — Resource group. Ask if not provided.
- `--service` — Resource ID of the target Azure service. Ask if not provided.
- `--group-id` — Sub-resource group ID. Depends on the service type:
  | Service | Group ID | Private DNS Zone |
  |---------|----------|-----------------|
  | Storage (Blob) | `blob` | `privatelink.blob.core.windows.net` |
  | Storage (File) | `file` | `privatelink.file.core.windows.net` |
  | Storage (Table) | `table` | `privatelink.table.core.windows.net` |
  | Storage (Queue) | `queue` | `privatelink.queue.core.windows.net` |
  | SQL Database | `sqlServer` | `privatelink.database.windows.net` |
  | Key Vault | `vault` | `privatelink.vaultcore.azure.net` |
  | App Service | `sites` | `privatelink.azurewebsites.net` |
  | Cosmos DB (SQL) | `Sql` | `privatelink.documents.azure.com` |
  | Azure Cache for Redis | `redisCache` | `privatelink.redis.cache.windows.net` |
  | Event Hubs | `namespace` | `privatelink.servicebus.windows.net` |
  | Service Bus | `namespace` | `privatelink.servicebus.windows.net` |
  | ACR | `registry` | `privatelink.azurecr.io` |
- `--vnet` — VNet name where the Private Endpoint will be created. Ask if not provided.
- `--subnet` — Subnet name within the VNet. Ask if not provided.

### 2. Create the Private Endpoint

```bash
az network private-endpoint create \
  --name <pe-name> \
  --resource-group <rg> \
  --vnet-name <vnet-name> \
  --subnet <subnet-name> \
  --private-connection-resource-id <service-resource-id> \
  --group-ids <group-id> \
  --connection-name <pe-name>-connection \
  --output table
```

### 3. Create Private DNS Zone (if not exists)

Determine the correct zone name from the group-id mapping above, then:

```bash
# Check if zone already exists
az network private-dns zone show \
  --name <dns-zone-name> \
  --resource-group <rg> \
  --output table 2>/dev/null

# Create if missing
az network private-dns zone create \
  --name <dns-zone-name> \
  --resource-group <rg> \
  --output table
```

### 4. Link DNS Zone to VNet

```bash
az network private-dns link vnet create \
  --name <dns-zone-name>-link \
  --zone-name <dns-zone-name> \
  --resource-group <rg> \
  --virtual-network <vnet-id> \
  --registration-enabled false \
  --output table
```

### 5. Create DNS Zone Group

Link the Private Endpoint to the Private DNS zone for automatic A record creation:

```bash
az network private-endpoint dns-zone-group create \
  --endpoint-name <pe-name> \
  --resource-group <rg> \
  --name default \
  --zone-name <dns-zone-name> \
  --private-dns-zone <dns-zone-id> \
  --output table
```

### 6. Verify DNS Resolution

```bash
# Get the private IP assigned to the endpoint
az network private-endpoint show \
  --name <pe-name> \
  --resource-group <rg> \
  --query "customDnsConfigs[0].{fqdn:fqdn, ipAddresses:ipAddresses}" \
  --output table

# Verify DNS resolves to the private IP (from a VM in the VNet)
nslookup <service-fqdn>
```

### 7. Disable Public Access (Recommended)

After the Private Endpoint is working, disable public network access on the target service:

```bash
# Example for Storage Account
az storage account update \
  --name <storage-account> \
  --resource-group <rg> \
  --default-action Deny \
  --output table

# Example for SQL Server
az sql server update \
  --name <sql-server> \
  --resource-group <rg> \
  --enable-public-network false \
  --output table
```

### 8. Display Summary

Show the user:
- Private Endpoint name, resource group, subnet
- Connected service and group ID
- Private IP address assigned
- Private DNS zone and FQDN
- Next steps: verify from a VM in the VNet, disable public access, review with Networking Reviewer agent
