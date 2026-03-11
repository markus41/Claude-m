---
name: bastion-manage
description: "Create and manage Azure Bastion for secure RDP/SSH access to VMs without public IP exposure"
argument-hint: "--name <bastion-name> --rg <resource-group> --vnet <vnet> [--sku Basic|Standard]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Manage Azure Bastion

Create and configure Azure Bastion for secure, browser-based or native client RDP/SSH access to VMs.

## Instructions

### 1. Validate Inputs

- `--name` — Bastion host name. Ask if not provided.
- `--rg` — Resource group. Ask if not provided.
- `--vnet` — VNet that must contain an `AzureBastionSubnet` (minimum /26). Ask if not provided.
- `--sku` — `Basic` or `Standard` (default: `Standard`). Standard enables native client support, tunneling, and IP-based connection.

### 2. Prerequisites

Ensure the VNet has an `AzureBastionSubnet` (minimum /26):
```bash
az network vnet subnet create \
  --vnet-name <vnet> \
  --resource-group <rg> \
  --name AzureBastionSubnet \
  --address-prefixes <bastion-subnet-cidr>
```

Create a public IP for Bastion:
```bash
az network public-ip create \
  --name <bastion-pip> \
  --resource-group <rg> \
  --sku Standard \
  --allocation-method Static \
  --location <region>
```

### 3. Create Bastion

```bash
az network bastion create \
  --name <bastion-name> \
  --resource-group <rg> \
  --vnet-name <vnet> \
  --public-ip-address <bastion-pip> \
  --location <region> \
  --sku Standard
```

### 4. Connect to VM via Bastion (Standard SKU — Native Client)

**SSH connection:**
```bash
az network bastion ssh \
  --name <bastion> \
  --resource-group <rg> \
  --target-resource-id <vm-resource-id> \
  --auth-type ssh-key \
  --username <user> \
  --ssh-key <key-path>
```

**RDP connection:**
```bash
az network bastion rdp \
  --name <bastion> \
  --resource-group <rg> \
  --target-resource-id <vm-resource-id>
```

### 5. Tunnel for Custom Port Forwarding (Standard SKU)

Forward a remote port to a local port through Bastion:
```bash
az network bastion tunnel \
  --name <bastion> \
  --resource-group <rg> \
  --target-resource-id <vm-resource-id> \
  --resource-port 22 \
  --port 2222
```

Then connect locally: `ssh user@localhost -p 2222`

### 6. Show, List, and Delete

```bash
# Show Bastion
az network bastion show \
  --name <bastion> \
  --resource-group <rg>

# List Bastion hosts
az network bastion list \
  --resource-group <rg> \
  --output table

# Delete Bastion
az network bastion delete \
  --name <bastion> \
  --resource-group <rg> \
  --yes
```

### 7. Display Summary

Show the user:
- Bastion name, SKU, location
- Public IP address
- VNet and subnet association
- Supported features (native client, tunneling based on SKU)
- Next steps: configure NSG on AzureBastionSubnet (`/nsg-configure --rules bastion`), connect to VMs
