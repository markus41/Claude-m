---
name: route-table-manage
description: "Create and manage route tables with user-defined routes and subnet associations"
argument-hint: "--name <rt-name> --rg <resource-group> [--routes <route-list>] [--subnet <vnet/subnet>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Manage Route Tables

Create and configure Azure route tables with user-defined routes (UDRs) and associate them with subnets.

## Instructions

### 1. Validate Inputs

- `--name` — Route table name. Ask if not provided.
- `--rg` — Resource group. Ask if not provided.
- `--routes` — Comma-separated list of routes in format `name:prefix:next-hop-type:next-hop-ip`.
- `--subnet` — Target subnet in format `vnet-name/subnet-name` to associate the route table with.

### 2. Create Route Table

```bash
az network route-table create \
  --name <rt-name> \
  --resource-group <rg> \
  --location <region> \
  --disable-bgp-route-propagation false
```

Set `--disable-bgp-route-propagation true` when you want to prevent VPN/ExpressRoute gateway routes from being injected into the subnet.

### 3. Add Routes

**Route all traffic through Azure Firewall:**
```bash
az network route-table route create \
  --route-table-name <rt> \
  --resource-group <rg> \
  --name "ToFirewall" \
  --address-prefix 0.0.0.0/0 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address <fw-private-ip>
```

**Route to VNet local:**
```bash
az network route-table route create \
  --route-table-name <rt> \
  --resource-group <rg> \
  --name "ToVNet" \
  --address-prefix 10.1.0.0/16 \
  --next-hop-type VnetLocal
```

**Next hop types:**

| Type | Use Case |
|------|----------|
| `VirtualAppliance` | Route through a firewall or NVA (requires IP address) |
| `VnetLocal` | Route within the VNet address space |
| `Internet` | Route directly to the internet |
| `VirtualNetworkGateway` | Route through VPN or ExpressRoute gateway |
| `None` | Drop the traffic (black-hole route) |

### 4. Associate with Subnet

```bash
az network vnet subnet update \
  --vnet-name <vnet> \
  --name <subnet> \
  --resource-group <rg> \
  --route-table <rt>
```

### 5. Show and List

```bash
# Show route table
az network route-table show \
  --name <rt> \
  --resource-group <rg>

# List routes in table
az network route-table route list \
  --route-table-name <rt> \
  --resource-group <rg> \
  --output table
```

### 6. Display Summary

Show the user:
- Route table name and resource group
- Routes table (name, address prefix, next hop type, next hop IP)
- Associated subnets
- BGP route propagation status
- Next steps: verify routing with Network Watcher next-hop (`az network watcher show-next-hop`)
