---
name: vpn-manage
description: "Create and manage VPN Gateways — site-to-site, point-to-site, local network gateways, and connection monitoring"
argument-hint: "--name <gw-name> --rg <resource-group> --vnet <vnet> [--sku VpnGw1|VpnGw2|VpnGw1AZ] [--type s2s|p2s]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Manage VPN Gateway

Create and configure Azure VPN Gateways for site-to-site and point-to-site connectivity.

## Instructions

### 1. Validate Inputs

- `--name` — VPN Gateway name. Ask if not provided.
- `--rg` — Resource group. Ask if not provided.
- `--vnet` — VNet with a `GatewaySubnet` (minimum /27). Ask if not provided.
- `--sku` — Gateway SKU (default: `VpnGw1`). Use `VpnGw1AZ`+ for zone-redundant production.
- `--type` — `s2s` (site-to-site) or `p2s` (point-to-site). Ask if not provided.

### 2. Create VPN Gateway

Gateway creation takes 30-45 minutes. Use `--no-wait` to avoid blocking.

```bash
az network vnet-gateway create \
  --name <gw-name> \
  --resource-group <rg> \
  --vnet <vnet> \
  --gateway-type Vpn \
  --vpn-type RouteBased \
  --sku VpnGw1 \
  --public-ip-address <gw-pip> \
  --no-wait
```

### 3. Create Local Network Gateway (Site-to-Site)

Represents the on-premises network endpoint:

```bash
az network local-gateway create \
  --name <lgw-name> \
  --resource-group <rg> \
  --gateway-ip-address <on-prem-public-ip> \
  --local-address-prefixes 10.1.0.0/16 192.168.0.0/24
```

### 4. Create Site-to-Site VPN Connection

```bash
az network vpn-connection create \
  --name <conn-name> \
  --resource-group <rg> \
  --vnet-gateway1 <gw-name> \
  --local-gateway2 <lgw-name> \
  --shared-key <psk> \
  --connection-protocol IKEv2
```

### 5. Configure Point-to-Site VPN

```bash
az network vnet-gateway update \
  --name <gw-name> \
  --resource-group <rg> \
  --address-prefixes 172.16.0.0/24 \
  --client-protocol OpenVPN
```

### 6. Show, List, and Monitor

```bash
# Show gateway
az network vnet-gateway show \
  --name <gw> \
  --resource-group <rg>

# List gateways
az network vnet-gateway list \
  --resource-group <rg> \
  --output table

# Show connection
az network vpn-connection show \
  --name <conn> \
  --resource-group <rg>

# List connections
az network vpn-connection list \
  --resource-group <rg> \
  --output table

# Connection monitoring — check status and bytes transferred
az network vpn-connection show \
  --name <conn> \
  --resource-group <rg> \
  --query "{Status:connectionStatus, InBytes:ingressBytesTransferred, OutBytes:egressBytesTransferred}"
```

### 7. Reset Gateway

Use when the gateway is in a degraded state:

```bash
az network vnet-gateway reset \
  --name <gw> \
  --resource-group <rg>
```

### 8. Display Summary

Show the user:
- Gateway name, SKU, type (VPN)
- Public IP address
- Connection status (Connected/Connecting/NotConnected)
- Bytes transferred (ingress/egress)
- P2S client address pool (if configured)
- Next steps: create route tables (`/route-table-manage`), configure NSGs on GatewaySubnet
