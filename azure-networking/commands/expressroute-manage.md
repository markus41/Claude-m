---
name: expressroute-manage
description: "Create and manage ExpressRoute circuits, peerings, and gateway connections for private on-premises connectivity"
argument-hint: "--name <er-name> --rg <resource-group> [--bandwidth <Mbps>] [--provider <name>] [--peering-location <location>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Manage ExpressRoute

Create and configure Azure ExpressRoute circuits, BGP peerings, and gateway connections for private, dedicated on-premises connectivity.

## Instructions

### 1. Validate Inputs

- `--name` — ExpressRoute circuit name. Ask if not provided.
- `--rg` — Resource group. Ask if not provided.
- `--bandwidth` — Circuit bandwidth in Mbps (e.g., `50`, `100`, `200`, `500`, `1000`). Ask if not provided.
- `--provider` — Connectivity provider (e.g., `Equinix`, `AT&T`, `Megaport`). Ask if not provided.
- `--peering-location` — Provider peering location (e.g., `Silicon Valley`, `Washington DC`). Ask if not provided.
- `--sku-tier` — `Standard` or `Premium` (default: `Standard`). Premium enables global reach and more route prefixes.

### 2. Create ExpressRoute Circuit

```bash
az network express-route create \
  --name <er-name> \
  --resource-group <rg> \
  --bandwidth 50 \
  --peering-location "Silicon Valley" \
  --provider "Equinix" \
  --sku-family MeteredData \
  --sku-tier Standard
```

After creation, provide the service key to the connectivity provider for circuit provisioning.

### 3. Create Peering

Configure Azure Private Peering for VNet access:
```bash
az network express-route peering create \
  --circuit-name <er> \
  --resource-group <rg> \
  --peering-type AzurePrivatePeering \
  --peer-asn <asn> \
  --primary-peer-subnet 10.0.0.0/30 \
  --secondary-peer-subnet 10.0.0.4/30 \
  --vlan-id <vlan>
```

### 4. Connect to VNet via ExpressRoute Gateway

Create an ExpressRoute gateway in the VNet (if not already present):
```bash
az network vnet-gateway create \
  --name <er-gw> \
  --resource-group <rg> \
  --vnet <vnet> \
  --gateway-type ExpressRoute \
  --sku ErGw1AZ \
  --public-ip-address <er-gw-pip>
```

Connect the gateway to the circuit:
```bash
az network express-route gateway connection create \
  --name <conn-name> \
  --resource-group <rg> \
  --gateway-name <er-gw> \
  --circuit-name <er> \
  --peering-name AzurePrivatePeering
```

### 5. Show, List, and Get Stats

```bash
# Show circuit
az network express-route show \
  --name <er> \
  --resource-group <rg>

# List circuits
az network express-route list \
  --resource-group <rg> \
  --output table

# Get circuit statistics (bytes in/out)
az network express-route get-stats \
  --name <er> \
  --resource-group <rg>
```

### 6. Display Summary

Show the user:
- Circuit name, bandwidth, SKU, provider, peering location
- Service key (for provider provisioning)
- Provisioning state and circuit state
- Peering configuration (ASN, subnets, VLAN)
- Connected gateways
- Next steps: configure route tables if needed, verify BGP routes with `az network vnet-gateway list-learned-routes`
