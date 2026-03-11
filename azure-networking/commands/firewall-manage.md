---
name: firewall-manage
description: "Create and manage Azure Firewall with policies, network rules, application rules, and DNAT rules"
argument-hint: "--name <fw-name> --rg <resource-group> [--policy <policy-name>] [--vnet <vnet-name>] [--sku Standard|Premium]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Manage Azure Firewall

Create and configure Azure Firewall with firewall policies, rule collection groups, and network/application/DNAT rules.

## Instructions

### 1. Validate Inputs

- `--name` — Firewall name. Ask if not provided.
- `--rg` — Resource group. Ask if not provided.
- `--policy` — Firewall policy name. If not provided, create one with the same prefix as the firewall.
- `--vnet` — VNet containing `AzureFirewallSubnet`. Ask if not provided.
- `--sku` — `Standard` or `Premium` (default: `Standard`). Premium adds IDPS, TLS inspection, and URL filtering.

### 2. Create Firewall Policy

```bash
az network firewall policy create \
  --name <policy-name> \
  --resource-group <rg> \
  --location <region> \
  --sku <Standard|Premium>
```

For Premium SKU with threat intelligence and IDPS:
```bash
az network firewall policy create \
  --name <policy-name> \
  --resource-group <rg> \
  --location <region> \
  --sku Premium \
  --threat-intel-mode Deny \
  --enable-dns-proxy true \
  --dns-servers <dns-ip-1> <dns-ip-2>
```

For hierarchical policies (child inheriting from parent):
```bash
az network firewall policy create \
  --name <child-policy> \
  --resource-group <rg> \
  --location <region> \
  --sku <sku> \
  --base-policy <parent-policy-resource-id>
```

### 3. Create Public IP for Firewall

```bash
az network public-ip create \
  --name <fw-pip> \
  --resource-group <rg> \
  --sku Standard \
  --allocation-method Static
```

### 4. Create Azure Firewall

```bash
az network firewall create \
  --name <fw-name> \
  --resource-group <rg> \
  --location <region> \
  --vnet-name <vnet> \
  --firewall-policy <policy-name>
```

Configure the firewall IP:
```bash
az network firewall ip-config create \
  --firewall-name <fw-name> \
  --name <config-name> \
  --resource-group <rg> \
  --public-ip-address <fw-pip> \
  --vnet-name <vnet>
```

### 5. Create Rule Collection Group

```bash
az network firewall policy rule-collection-group create \
  --name "DefaultRuleGroup" \
  --policy-name <policy> \
  --resource-group <rg> \
  --priority 100
```

### 6. Add Network Rules

```bash
az network firewall policy rule-collection-group collection add-filter-collection \
  --rule-collection-group-name "DefaultRuleGroup" \
  --policy-name <policy> \
  --resource-group <rg> \
  --name "AllowWeb" \
  --collection-priority 200 \
  --rule-type NetworkRule \
  --action Allow \
  --rule-name "AllowHTTPS" \
  --source-addresses "*" \
  --destination-addresses "*" \
  --destination-ports 443 \
  --ip-protocols TCP
```

### 7. Add Application Rules

```bash
az network firewall policy rule-collection-group collection add-filter-collection \
  --rule-collection-group-name "DefaultRuleGroup" \
  --policy-name <policy> \
  --resource-group <rg> \
  --name "AllowFQDN" \
  --collection-priority 300 \
  --rule-type ApplicationRule \
  --action Allow \
  --rule-name "AllowMicrosoft" \
  --source-addresses "10.0.0.0/24" \
  --protocols Http=80 Https=443 \
  --target-fqdns "*.microsoft.com" "*.azure.com"
```

### 8. Add DNAT Rules

```bash
az network firewall policy rule-collection-group collection add-nat-collection \
  --rule-collection-group-name "DefaultRuleGroup" \
  --policy-name <policy> \
  --resource-group <rg> \
  --name "DNATRules" \
  --collection-priority 100 \
  --action DNAT \
  --rule-name "RDPDNAT" \
  --source-addresses "*" \
  --destination-addresses <fw-public-ip> \
  --destination-ports 3389 \
  --translated-address 10.0.1.4 \
  --translated-port 3389 \
  --ip-protocols TCP
```

### 9. Show, List, and Delete

```bash
# Show firewall details
az network firewall show --name <fw> --resource-group <rg>

# List firewalls
az network firewall list --resource-group <rg> --output table

# Show firewall policy
az network firewall policy show --name <policy> --resource-group <rg>

# Delete firewall
az network firewall delete --name <fw> --resource-group <rg> --yes
```

### 10. Get Firewall Private IP (for Route Tables)

```bash
az network firewall show \
  --name <fw> \
  --resource-group <rg> \
  --query "ipConfigurations[0].privateIpAddress" \
  --output tsv
```

### 11. Display Summary

Show the user:
- Firewall name, SKU, policy name
- Public IP address
- Private IP address (for UDR configuration)
- Rule collection groups and rule counts
- Next steps: create route tables (`/route-table-manage`) to direct traffic through firewall
