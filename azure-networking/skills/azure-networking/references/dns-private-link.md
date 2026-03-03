# Azure DNS and Private Link — Deep Reference

## Overview

Azure DNS manages public DNS zones for internet-resolvable names and private DNS zones for VNet-internal name resolution. Azure Private Link and Private Endpoints extend Azure PaaS services into your VNet with private IP addresses, eliminating public internet exposure. The combination of private endpoints and private DNS zones is the standard pattern for securing PaaS connectivity.

## REST API Endpoints — DNS

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|---|---|---|---|---|
| PUT | `/providers/Microsoft.Network/dnsZones/{zoneName}` | DNS Zone Contributor | Location `global` | Create public DNS zone |
| PUT | `/providers/Microsoft.Network/privateDnsZones/{zoneName}` | Private DNS Zone Contributor | — | Create private DNS zone |
| PUT | `/privateDnsZones/{zone}/virtualNetworkLinks/{name}` | Private DNS Zone Contributor | `virtualNetwork.id`, `registrationEnabled` | Link private zone to VNet |
| PUT | `/dnsZones/{zone}/A/{recordSet}` | DNS Zone Contributor | TTL, A records array | Create/update A record |
| PUT | `/privateDnsZones/{zone}/A/{recordSet}` | Private DNS Zone Contributor | TTL, A records array | Create private A record |
| PUT | `/dnsZones/{zone}/CNAME/{recordSet}` | DNS Zone Contributor | TTL, CNAME value | Create CNAME |
| PUT | `/dnsZones/{zone}/TXT/{recordSet}` | DNS Zone Contributor | TTL, TXT strings | Create TXT record |
| PUT | `/dnsZones/{zone}/MX/{recordSet}` | DNS Zone Contributor | TTL, MX records | Create MX record |
| GET | `/dnsZones/{zone}/recordsets` | DNS Zone Reader | — | List all record sets |
| DELETE | `/dnsZones/{zone}/A/{recordSet}` | DNS Zone Contributor | — | Delete record set |

Base: `https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}`

## REST API Endpoints — Private Link

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|---|---|---|---|---|
| PUT | `/providers/Microsoft.Network/privateEndpoints/{name}` | Network Contributor | Subnet, private connection resource, group ID | Create private endpoint |
| GET | Same path | Network Reader | — | Get endpoint details and connection state |
| DELETE | Same path | Network Contributor | — | Delete private endpoint |
| PUT | `/providers/Microsoft.Network/privateLinkServices/{name}` | Network Contributor | Frontend IP, load balancer | Create Private Link Service |
| GET | `/providers/Microsoft.Network/{resourceType}/{name}/privateLinkResources` | Reader | — | Get supported group IDs for private endpoint |
| POST | `/privateEndpoints/{name}/privateDnsZoneGroups/{group}` | Network Contributor | DNS zone group config | Associate PE with private DNS zone for auto-registration |

## Azure CLI Patterns — Public DNS Zones

```bash
# Create public DNS zone
az network dns zone create \
  --resource-group rg-networking \
  --name "contoso.com"

# Get name servers to configure at registrar
az network dns zone show \
  --resource-group rg-networking \
  --name "contoso.com" \
  --query nameServers \
  --output table

# Create A record
az network dns record-set a create \
  --resource-group rg-networking \
  --zone-name "contoso.com" \
  --name "api" \
  --ttl 300

az network dns record-set a add-record \
  --resource-group rg-networking \
  --zone-name "contoso.com" \
  --record-set-name "api" \
  --ipv4-address "203.0.113.50"

# Create CNAME record
az network dns record-set cname set-record \
  --resource-group rg-networking \
  --zone-name "contoso.com" \
  --record-set-name "www" \
  --cname "contoso.azurefd.net" \
  --ttl 300

# Create TXT record (for domain verification)
az network dns record-set txt add-record \
  --resource-group rg-networking \
  --zone-name "contoso.com" \
  --record-set-name "@" \
  --value "v=spf1 include:spf.protection.outlook.com -all"

# Create MX records for Exchange Online
az network dns record-set mx add-record \
  --resource-group rg-networking \
  --zone-name "contoso.com" \
  --record-set-name "@" \
  --exchange "contoso-com.mail.protection.outlook.com" \
  --preference 0

# List all record sets in zone
az network dns record-set list \
  --resource-group rg-networking \
  --zone-name "contoso.com" \
  --output table
```

## Azure CLI Patterns — Private DNS Zones

```bash
# Create private DNS zone (linked to VNet)
az network private-dns zone create \
  --resource-group rg-networking \
  --name "privatelink.blob.core.windows.net"

# Link to VNet (auto-registration disabled — only for private endpoints)
az network private-dns link vnet create \
  --resource-group rg-networking \
  --zone-name "privatelink.blob.core.windows.net" \
  --name link-vnet-prod \
  --virtual-network vnet-prod-eastus \
  --registration-enabled false

# Auto-registration (for VM names) — use separate private zone per VNet
az network private-dns zone create \
  --resource-group rg-networking \
  --name "prod.internal"

az network private-dns link vnet create \
  --resource-group rg-networking \
  --zone-name "prod.internal" \
  --name link-vnet-prod-registration \
  --virtual-network vnet-prod-eastus \
  --registration-enabled true  # VMs auto-register their names

# Create A record in private zone
az network private-dns record-set a create \
  --resource-group rg-networking \
  --zone-name "prod.internal" \
  --name "sql-server" \
  --ttl 300

az network private-dns record-set a add-record \
  --resource-group rg-networking \
  --zone-name "prod.internal" \
  --record-set-name "sql-server" \
  --ipv4-address "10.10.3.5"
```

## Azure CLI Patterns — Private Endpoints

```bash
# Get storage account resource ID
STORAGE_ID=$(az storage account show \
  --name mystorageaccount \
  --resource-group rg-prod \
  --query id -o tsv)

# Create private endpoint for blob storage
az network private-endpoint create \
  --name pe-storage-blob \
  --resource-group rg-networking \
  --location eastus \
  --vnet-name vnet-prod-eastus \
  --subnet subnet-private-endpoints \
  --private-connection-resource-id "$STORAGE_ID" \
  --group-id blob \
  --connection-name conn-storage-blob

# Create private endpoint for storage file shares
az network private-endpoint create \
  --name pe-storage-file \
  --resource-group rg-networking \
  --location eastus \
  --vnet-name vnet-prod-eastus \
  --subnet subnet-private-endpoints \
  --private-connection-resource-id "$STORAGE_ID" \
  --group-id file \
  --connection-name conn-storage-file

# Create private DNS zone group (auto-creates DNS record)
az network private-endpoint dns-zone-group create \
  --endpoint-name pe-storage-blob \
  --resource-group rg-networking \
  --name zone-group-blob \
  --zone-name "privatelink.blob.core.windows.net" \
  --private-dns-zone "/subscriptions/<sub>/resourceGroups/rg-networking/providers/Microsoft.Network/privateDnsZones/privatelink.blob.core.windows.net"

# Approve a pending private endpoint connection (if auto-approve not configured)
az network private-endpoint-connection approve \
  --id "<private-endpoint-connection-resource-id>" \
  --description "Approved via automated process"

# List all private endpoints in resource group
az network private-endpoint list \
  --resource-group rg-networking \
  --output table
```

## Common Private Endpoint Group IDs

| Azure Service | Group ID(s) | Private DNS Zone |
|---|---|---|
| Azure Blob Storage | `blob`, `blob_secondary` | `privatelink.blob.core.windows.net` |
| Azure File Storage | `file` | `privatelink.file.core.windows.net` |
| Azure Queue Storage | `queue` | `privatelink.queue.core.windows.net` |
| Azure Table Storage | `table` | `privatelink.table.core.windows.net` |
| Azure Data Lake Gen2 | `dfs`, `dfs_secondary` | `privatelink.dfs.core.windows.net` |
| Azure Key Vault | `vault` | `privatelink.vaultcore.azure.net` |
| Azure SQL Database | `sqlServer` | `privatelink.database.windows.net` |
| Azure Cosmos DB (SQL API) | `Sql` | `privatelink.documents.azure.com` |
| Azure Container Registry | `registry` | `privatelink.azurecr.io` |
| Azure App Service | `sites` | `privatelink.azurewebsites.net` |
| Azure Service Bus | `namespace` | `privatelink.servicebus.windows.net` |
| Azure Event Hub | `namespace` | `privatelink.servicebus.windows.net` |
| Azure Monitor (OMS) | `azuremonitor` | `privatelink.monitor.azure.com` |
| Azure Kubernetes Service API | `management` | `privatelink.{region}.azmk8s.io` |

## TypeScript SDK Patterns

```typescript
import { NetworkManagementClient } from "@azure/arm-network";
import { DefaultAzureCredential } from "@azure/identity";

const client = new NetworkManagementClient(new DefaultAzureCredential(), subscriptionId);

// Create private endpoint for Azure SQL
const endpoint = await client.privateEndpoints.beginCreateOrUpdateAndWait(
  resourceGroup,
  "pe-sql-prod",
  {
    location: "eastus",
    subnet: { id: `/subscriptions/${sub}/resourceGroups/${rg}/providers/Microsoft.Network/virtualNetworks/vnet-prod/subnets/subnet-pe` },
    privateLinkServiceConnections: [
      {
        name: "conn-sql-prod",
        privateLinkServiceId: sqlServerId,
        groupIds: ["sqlServer"],
        requestMessage: "Automated connection from prod VNet",
      },
    ],
  }
);

console.log("Private endpoint state:", endpoint.privateLinkServiceConnections?.[0].privateLinkServiceConnectionState?.status);
// "Approved" if auto-approve is enabled, "Pending" otherwise

// Create DNS A record for private endpoint
const privateIp = endpoint.networkInterfaces?.[0]?.id; // resolve NIC to get IP
const dnsClient = new NetworkManagementClient(new DefaultAzureCredential(), subscriptionId);
await dnsClient.privateRecordSets.createOrUpdate(
  rg,
  "privatelink.database.windows.net",
  "A",
  "mysqlserver",
  { ttl: 10, aRecords: [{ ipv4Address: "10.10.3.50" }] }
);
```

## Error Codes

| Code | Meaning | Remediation |
|---|---|---|
| DnsZoneAlreadyExists (409) | Zone with same name exists in another subscription | Use unique zone names; coordinate across subscriptions |
| PrivateEndpointSubnetNetworkPoliciesEnabled (400) | Subnet has network policies enabled | Disable with `--disable-private-endpoint-network-policies` on subnet |
| PrivateLinkServiceConnectionDenied (400) | Owner rejected the PE connection | Request approval or use auto-approval via alias |
| GroupIdNotSupported (400) | Invalid group ID for the resource type | Use `az network private-link-resource list` to get valid group IDs |
| ResourceIdRequired (400) | Missing `privateLinkServiceId` | Provide the full ARM resource ID of the target service |
| DnsZoneLinkAlreadyExists (409) | VNet already linked to this private DNS zone | Use existing link; remove and recreate if misconfigured |
| RecordSetNotFound (404) | DNS record does not exist | Check zone name, record type, and record set name |

## Throttling Limits

| Resource | Limit | Notes |
|---|---|---|
| Private DNS zones per subscription | 1,000 | Use hub-and-spoke model with centralized DNS zones |
| VNet links per private DNS zone | 1,000 | Link hub VNet once; spoke VNets resolve via hub DNS resolver |
| Private endpoints per VNet | 1,000 | Consolidate onto dedicated PE subnet |
| DNS records per private DNS zone | 25,000 | Not typically a constraint for PE scenarios |
| Public DNS zones per subscription | 10,000 | Use Azure DNS for all public zones |
| Concurrent DNS zone updates | Serialized per zone | Queue zone updates; avoid parallel record creation |

## Production Gotchas

- **Subnet network policies must be disabled**: Before creating a private endpoint, disable private endpoint network policies on the subnet with `az network vnet subnet update --disable-private-endpoint-network-policies true`. This disables NSG and route table enforcement for private endpoints on that subnet.
- **DNS zone group auto-registration**: Using a `privateDnsZoneGroup` on the private endpoint automatically creates and deletes DNS A records when the endpoint is created or deleted. Without a zone group, you must manage DNS records manually.
- **Hub-and-spoke DNS architecture**: In hub-and-spoke topologies, create private DNS zones in the hub VNet's resource group and link them to the hub VNet. Spoke VNets should NOT have local copies of the same zones — use Azure DNS Private Resolver or hub-based forwarding instead.
- **Split-horizon DNS**: If both a public DNS zone and a private DNS zone exist for the same name (e.g., `contoso.blob.core.windows.net`), clients inside a linked VNet resolve to the private IP, while external clients resolve to the public IP. This is intentional and correct — do not add public DNS records that point to private IPs.
- **Private endpoint for Storage: multiple group IDs**: A storage account requires a separate private endpoint for each service (blob, file, queue, table, dfs). Each gets its own DNS A record in the corresponding private DNS zone.
- **TTL for private DNS records**: Use a short TTL (10–300 seconds) for private endpoint DNS records. Short TTL allows fast failover if the private endpoint IP changes (e.g., after recreation).
- **NXDOMAIN from split-horizon**: When using private endpoints and the VNet does not have the private DNS zone linked (or the zone group is not configured), DNS resolution returns the public IP of the PaaS service. Traffic then goes to the public endpoint, bypassing the private endpoint entirely. Always verify DNS resolution from within the VNet.
