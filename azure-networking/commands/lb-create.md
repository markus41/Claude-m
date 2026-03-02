---
name: lb-create
description: "Create a Load Balancer (public or internal) with backend pool and health probes"
argument-hint: "--name <lb-name> --rg <resource-group> --type <public|internal> [--sku <Standard|Basic>] [--backend-port <port>] [--probe-path <path>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Create an Azure Load Balancer

Create a Standard Load Balancer with frontend IP, backend pool, health probe, and load balancing rule.

## Instructions

### 1. Validate Inputs

- `--name` — Load balancer name. Ask if not provided.
- `--rg` — Resource group. Ask if not provided.
- `--type` — `public` (internet-facing) or `internal` (VNet-only). Ask if not provided.
- `--sku` — `Standard` (default, recommended) or `Basic`. Warn that Basic has no SLA and limited features.
- `--backend-port` — Port on backend VMs (default: `80`).
- `--probe-path` — HTTP health probe path (e.g., `/health`). If not set, uses TCP probe.

### 2. Create Frontend IP

**For public LB**:
```bash
# Create a public IP
az network public-ip create \
  --name <lb-name>-pip \
  --resource-group <rg> \
  --sku Standard \
  --allocation-method Static \
  --zone 1 2 3 \
  --output table

# Create the LB
az network lb create \
  --name <lb-name> \
  --resource-group <rg> \
  --sku Standard \
  --frontend-ip-name <lb-name>-frontend \
  --public-ip-address <lb-name>-pip \
  --output table
```

**For internal LB**:
```bash
az network lb create \
  --name <lb-name> \
  --resource-group <rg> \
  --sku Standard \
  --frontend-ip-name <lb-name>-frontend \
  --vnet-name <vnet-name> \
  --subnet <subnet-name> \
  --private-ip-address-version IPv4 \
  --output table
```

### 3. Create Backend Pool

```bash
az network lb address-pool create \
  --lb-name <lb-name> \
  --resource-group <rg> \
  --name <lb-name>-backend \
  --output table
```

### 4. Create Health Probe

**HTTP probe** (when `--probe-path` is provided):
```bash
az network lb probe create \
  --lb-name <lb-name> \
  --resource-group <rg> \
  --name <lb-name>-probe \
  --protocol Http \
  --port <backend-port> \
  --path <probe-path> \
  --interval 15 \
  --threshold 2 \
  --output table
```

**TCP probe** (default):
```bash
az network lb probe create \
  --lb-name <lb-name> \
  --resource-group <rg> \
  --name <lb-name>-probe \
  --protocol Tcp \
  --port <backend-port> \
  --interval 15 \
  --threshold 2 \
  --output table
```

### 5. Create Load Balancing Rule

```bash
az network lb rule create \
  --lb-name <lb-name> \
  --resource-group <rg> \
  --name <lb-name>-rule \
  --frontend-ip-name <lb-name>-frontend \
  --backend-pool-name <lb-name>-backend \
  --probe-name <lb-name>-probe \
  --protocol Tcp \
  --frontend-port 80 \
  --backend-port <backend-port> \
  --idle-timeout 15 \
  --enable-tcp-reset true \
  --output table
```

For HTTPS passthrough, add a second rule:
```bash
az network lb rule create \
  --lb-name <lb-name> \
  --resource-group <rg> \
  --name <lb-name>-https-rule \
  --frontend-ip-name <lb-name>-frontend \
  --backend-pool-name <lb-name>-backend \
  --probe-name <lb-name>-probe \
  --protocol Tcp \
  --frontend-port 443 \
  --backend-port 443 \
  --idle-timeout 15 \
  --enable-tcp-reset true \
  --output table
```

### 6. Add Backend Members

Provide instructions for adding VMs or NICs to the backend pool:

```bash
# Add a NIC to the backend pool
az network nic ip-config address-pool add \
  --nic-name <nic-name> \
  --resource-group <rg> \
  --lb-name <lb-name> \
  --address-pool <lb-name>-backend \
  --ip-config-name ipconfig1 \
  --output table
```

### 7. Display Summary

Show the user:
- Load balancer name, SKU, type (public/internal)
- Frontend IP (public IP or private IP)
- Backend pool name and member count
- Health probe configuration
- Load balancing rules table
- Next steps: add backend VMs, configure NSG rules (`/nsg-configure`) to allow LB traffic
