---
name: vnet-create
description: "Create a Virtual Network with subnets, peering, and service endpoints"
argument-hint: "--name <vnet-name> --rg <resource-group> --region <location> [--address-space <CIDR>] [--subnets <list>] [--peer <vnet-id>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Create a Virtual Network

Create an Azure Virtual Network with subnets, optional peering, and service endpoints.

## Instructions

### 1. Validate Inputs

- `--name` — VNet name (2-64 chars, alphanumeric, hyphens, underscores). Ask if not provided.
- `--rg` — Target resource group. Ask if not provided. Create if it does not exist.
- `--region` — Azure region (e.g., `eastus2`, `westeurope`). Ask if not provided.
- `--address-space` — CIDR block (default: `10.0.0.0/16`). Must be a valid RFC 1918 range.
- `--subnets` — Comma-separated list of `name:cidr` pairs (e.g., `web:10.0.1.0/24,app:10.0.2.0/24,db:10.0.3.0/24`).
- `--peer` — Resource ID of a VNet to peer with.

### 2. Plan Address Space

If subnets are not specified, suggest a default layout based on the address space:

For `/16` (65,536 IPs):
| Subnet | CIDR | IPs | Purpose |
|--------|------|-----|---------|
| `web` | `x.x.1.0/24` | 251 | Web tier / App Gateway |
| `app` | `x.x.2.0/24` | 251 | Application tier |
| `db` | `x.x.3.0/24` | 251 | Database tier |
| `AzureBastionSubnet` | `x.x.255.0/26` | 59 | Azure Bastion (required name) |
| `GatewaySubnet` | `x.x.254.0/27` | 27 | VPN/ExpressRoute Gateway (required name) |

Note: Azure reserves 5 IPs per subnet (first 4 + last 1).

Ask the user to confirm or customize the subnet layout.

### 3. Create the VNet

```bash
az network vnet create \
  --name <vnet-name> \
  --resource-group <rg> \
  --location <region> \
  --address-prefixes <address-space> \
  --output table
```

### 4. Create Subnets

For each subnet:
```bash
az network vnet subnet create \
  --name <subnet-name> \
  --vnet-name <vnet-name> \
  --resource-group <rg> \
  --address-prefixes <subnet-cidr> \
  --output table
```

For subnets with service endpoints:
```bash
az network vnet subnet create \
  --name <subnet-name> \
  --vnet-name <vnet-name> \
  --resource-group <rg> \
  --address-prefixes <subnet-cidr> \
  --service-endpoints Microsoft.Storage Microsoft.Sql Microsoft.KeyVault \
  --output table
```

### 5. Configure Peering (if --peer)

Create bidirectional peering:
```bash
# Local to remote
az network vnet peering create \
  --name <local-vnet>-to-<remote-vnet> \
  --vnet-name <local-vnet> \
  --resource-group <rg> \
  --remote-vnet <remote-vnet-id> \
  --allow-vnet-access \
  --output table

# Remote to local
az network vnet peering create \
  --name <remote-vnet>-to-<local-vnet> \
  --vnet-name <remote-vnet-name> \
  --resource-group <remote-rg> \
  --remote-vnet <local-vnet-id> \
  --allow-vnet-access \
  --output table
```

### 6. Generate Bicep Template

Optionally generate a `vnet.bicep` file capturing the created resources for reproducible deployments:

```bicep
param vnetName string = '<vnet-name>'
param location string = '<region>'
param addressPrefix string = '<address-space>'

resource vnet 'Microsoft.Network/virtualNetworks@2023-11-01' = {
  name: vnetName
  location: location
  properties: {
    addressSpace: {
      addressPrefixes: [addressPrefix]
    }
    subnets: [
      // Generated subnet entries
    ]
  }
}
```

### 7. Display Summary

Show the user:
- Created VNet name, region, and address space
- Subnet table with names, CIDRs, and available IPs
- Peering status (if configured)
- Next steps: create NSGs (`/nsg-configure`), deploy load balancers (`/lb-create`)
