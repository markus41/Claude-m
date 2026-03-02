---
name: dns-manage
description: "Manage Azure DNS zones and records — public and private zones"
argument-hint: "--zone <zone-name> --rg <resource-group> [--private] [--record <type:name:value>] [--link-vnet <vnet-id>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Manage Azure DNS

Create and manage public and private DNS zones and records.

## Instructions

### 1. Validate Inputs

- `--zone` — DNS zone name (e.g., `contoso.com` for public, `privatelink.blob.core.windows.net` for private). Ask if not provided.
- `--rg` — Resource group. Ask if not provided.
- `--private` — Create a private DNS zone instead of public.
- `--record` — Record to add in format `type:name:value` (e.g., `A:www:1.2.3.4`, `CNAME:api:api.contoso.azurefd.net`).
- `--link-vnet` — VNet resource ID to link to a private DNS zone.

### 2. Create DNS Zone

**Public zone**:
```bash
az network dns zone create \
  --name <zone-name> \
  --resource-group <rg> \
  --output table
```

**Private zone**:
```bash
az network private-dns zone create \
  --name <zone-name> \
  --resource-group <rg> \
  --output table
```

### 3. Link Private Zone to VNet (if --private and --link-vnet)

```bash
az network private-dns link vnet create \
  --name <zone-name>-link \
  --zone-name <zone-name> \
  --resource-group <rg> \
  --virtual-network <vnet-id> \
  --registration-enabled false \
  --output table
```

Set `--registration-enabled true` if the VNet should auto-register VM DNS records in this zone.

### 4. Add DNS Records (if --record)

**Public zone records**:

```bash
# A record
az network dns record-set a add-record \
  --zone-name <zone-name> \
  --resource-group <rg> \
  --record-set-name <name> \
  --ipv4-address <ip> \
  --output table

# AAAA record
az network dns record-set aaaa add-record \
  --zone-name <zone-name> \
  --resource-group <rg> \
  --record-set-name <name> \
  --ipv6-address <ip> \
  --output table

# CNAME record
az network dns record-set cname set-record \
  --zone-name <zone-name> \
  --resource-group <rg> \
  --record-set-name <name> \
  --cname <target> \
  --output table

# MX record
az network dns record-set mx add-record \
  --zone-name <zone-name> \
  --resource-group <rg> \
  --record-set-name @ \
  --exchange <mail-server> \
  --preference <priority> \
  --output table

# TXT record
az network dns record-set txt add-record \
  --zone-name <zone-name> \
  --resource-group <rg> \
  --record-set-name <name> \
  --value "<txt-value>" \
  --output table
```

**Private zone records**:

```bash
# A record (private)
az network private-dns record-set a add-record \
  --zone-name <zone-name> \
  --resource-group <rg> \
  --record-set-name <name> \
  --ipv4-address <ip> \
  --output table

# CNAME record (private)
az network private-dns record-set cname set-record \
  --zone-name <zone-name> \
  --resource-group <rg> \
  --record-set-name <name> \
  --cname <target> \
  --output table
```

### 5. Configure Name Server Delegation (Public Zones)

After creating a public zone, display the NS records for domain registrar configuration:

```bash
az network dns zone show \
  --name <zone-name> \
  --resource-group <rg> \
  --query "nameServers" \
  --output tsv
```

Instruct the user to update the NS records at their domain registrar to point to these Azure DNS name servers.

### 6. Display Summary

Show the user:
- Zone name, type (public/private), resource group
- Records added (table of type, name, value, TTL)
- VNet links (for private zones)
- Name servers (for public zones)
- Next steps: configure Private Endpoints (`/private-endpoint-create`), verify resolution with `nslookup`
