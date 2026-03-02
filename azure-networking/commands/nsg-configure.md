---
name: nsg-configure
description: "Create and assign NSG rules, configure ASGs, and enable flow logs"
argument-hint: "--name <nsg-name> --rg <resource-group> [--subnet <vnet/subnet>] [--rules <rule-list>] [--flow-logs]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Configure Network Security Groups

Create an NSG, add security rules, assign it to a subnet, and optionally enable flow logs.

## Instructions

### 1. Validate Inputs

- `--name` — NSG name. Ask if not provided.
- `--rg` — Resource group. Ask if not provided.
- `--subnet` — Target subnet in format `vnet-name/subnet-name`. Optional (NSG can be created unattached).
- `--rules` — Predefined rule set: `web-tier`, `app-tier`, `db-tier`, `bastion`, or `custom`. Default: ask.
- `--flow-logs` — Enable NSG flow logs.

### 2. Create the NSG

```bash
az network nsg create \
  --name <nsg-name> \
  --resource-group <rg> \
  --location <region> \
  --output table
```

### 3. Add Security Rules

Based on the selected rule set, create rules with appropriate priorities:

**Web Tier** (`web-tier`):
| Priority | Name | Direction | Access | Protocol | Source | Dest Port | Purpose |
|----------|------|-----------|--------|----------|--------|-----------|---------|
| 100 | AllowHTTP | Inbound | Allow | TCP | `*` | 80 | HTTP traffic |
| 110 | AllowHTTPS | Inbound | Allow | TCP | `*` | 443 | HTTPS traffic |
| 120 | AllowAzureLB | Inbound | Allow | `*` | AzureLoadBalancer | `*` | Health probes |
| 4096 | DenyAllInbound | Inbound | Deny | `*` | `*` | `*` | Explicit deny-all |

**App Tier** (`app-tier`):
| Priority | Name | Direction | Access | Protocol | Source | Dest Port | Purpose |
|----------|------|-----------|--------|----------|--------|-----------|---------|
| 100 | AllowFromWeb | Inbound | Allow | TCP | `web-subnet-cidr` | 8080 | App port from web tier |
| 110 | AllowAzureLB | Inbound | Allow | `*` | AzureLoadBalancer | `*` | Health probes |
| 4096 | DenyAllInbound | Inbound | Deny | `*` | `*` | `*` | Explicit deny-all |

**DB Tier** (`db-tier`):
| Priority | Name | Direction | Access | Protocol | Source | Dest Port | Purpose |
|----------|------|-----------|--------|----------|--------|-----------|---------|
| 100 | AllowSQL | Inbound | Allow | TCP | `app-subnet-cidr` | 1433 | SQL Server from app tier |
| 110 | AllowPostgres | Inbound | Allow | TCP | `app-subnet-cidr` | 5432 | PostgreSQL from app tier |
| 4096 | DenyAllInbound | Inbound | Deny | `*` | `*` | `*` | Explicit deny-all |

**Bastion** (`bastion`):
| Priority | Name | Direction | Access | Protocol | Source | Dest Port | Purpose |
|----------|------|-----------|--------|----------|--------|-----------|---------|
| 100 | AllowHTTPS | Inbound | Allow | TCP | Internet | 443 | Bastion control plane |
| 110 | AllowGatewayMgr | Inbound | Allow | TCP | GatewayManager | 443 | Gateway Manager |
| 120 | AllowAzureLB | Inbound | Allow | TCP | AzureLoadBalancer | 443 | Health probes |
| 4096 | DenyAllInbound | Inbound | Deny | `*` | `*` | `*` | Explicit deny-all |

For each rule:
```bash
az network nsg rule create \
  --nsg-name <nsg-name> \
  --resource-group <rg> \
  --name <rule-name> \
  --priority <priority> \
  --direction <Inbound|Outbound> \
  --access <Allow|Deny> \
  --protocol <Tcp|Udp|*> \
  --source-address-prefixes <source> \
  --destination-port-ranges <port> \
  --output table
```

### 4. Assign to Subnet

```bash
az network vnet subnet update \
  --name <subnet-name> \
  --vnet-name <vnet-name> \
  --resource-group <rg> \
  --network-security-group <nsg-name> \
  --output table
```

### 5. Enable Flow Logs (if --flow-logs)

Requires a Network Watcher and a storage account:

```bash
# Ensure Network Watcher exists
az network watcher configure \
  --resource-group NetworkWatcherRG \
  --locations <region> \
  --enabled true

# Enable flow logs
az network watcher flow-log create \
  --name <nsg-name>-flowlog \
  --nsg <nsg-id> \
  --resource-group NetworkWatcherRG \
  --storage-account <storage-account-id> \
  --enabled true \
  --format JSON \
  --log-version 2 \
  --retention 30 \
  --output table
```

### 6. Display Summary

Show the user:
- Created NSG with rule table (priority, name, direction, access, protocol, source, dest port)
- Subnet association status
- Flow log status (if enabled)
- Next steps: verify effective rules with `/setup`, review with Networking Reviewer agent
