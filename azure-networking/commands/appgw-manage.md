---
name: appgw-manage
description: "Create and manage Application Gateway with WAF, backend pools, health probes, SSL, and URL path routing"
argument-hint: "--name <agw-name> --rg <resource-group> [--sku Standard_v2|WAF_v2] [--vnet <vnet>] [--subnet <subnet>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Manage Application Gateway

Create and configure Azure Application Gateway with WAF, backend pools, health probes, SSL certificates, and URL path-based routing.

## Instructions

### 1. Validate Inputs

- `--name` — Application Gateway name. Ask if not provided.
- `--rg` — Resource group. Ask if not provided.
- `--sku` — `Standard_v2` or `WAF_v2` (default: `WAF_v2`). WAF adds OWASP CRS protection.
- `--vnet` — VNet name. Ask if not provided.
- `--subnet` — Dedicated subnet for Application Gateway (minimum /27 for WAF_v2). Ask if not provided.

### 2. Create Application Gateway

**Basic creation:**
```bash
az network application-gateway create \
  --name <agw-name> \
  --resource-group <rg> \
  --location <region> \
  --sku Standard_v2 \
  --capacity 2 \
  --vnet-name <vnet> \
  --subnet <agw-subnet> \
  --public-ip-address <agw-pip> \
  --http-settings-port 443 \
  --http-settings-protocol Https \
  --frontend-port 443 \
  --routing-rule-type Basic
```

**With WAF policy:**
```bash
az network application-gateway waf-policy create \
  --name <waf-policy> \
  --resource-group <rg> \
  --location <region>

az network application-gateway create \
  --name <agw-name> \
  --resource-group <rg> \
  --sku WAF_v2 \
  --capacity 2 \
  --vnet-name <vnet> \
  --subnet <agw-subnet> \
  --public-ip-address <agw-pip> \
  --waf-policy <waf-policy>
```

### 3. Backend Pool Management

```bash
# Create backend pool
az network application-gateway address-pool create \
  --gateway-name <agw> \
  --resource-group <rg> \
  --name <pool-name> \
  --servers <ip1> <ip2>

# Update backend pool
az network application-gateway address-pool update \
  --gateway-name <agw> \
  --resource-group <rg> \
  --name <pool> \
  --servers <ip1> <ip2> <ip3>

# List backend pools
az network application-gateway address-pool list \
  --gateway-name <agw> \
  --resource-group <rg>
```

### 4. Health Probes

```bash
az network application-gateway probe create \
  --gateway-name <agw> \
  --resource-group <rg> \
  --name <probe-name> \
  --protocol Https \
  --host-name-from-http-settings true \
  --path /health \
  --interval 30 \
  --threshold 3 \
  --timeout 30
```

### 5. HTTP Settings

```bash
az network application-gateway http-settings create \
  --gateway-name <agw> \
  --resource-group <rg> \
  --name <settings-name> \
  --port 443 \
  --protocol Https \
  --cookie-based-affinity Enabled \
  --probe <probe-name>
```

### 6. SSL Certificates

```bash
az network application-gateway ssl-cert create \
  --gateway-name <agw> \
  --resource-group <rg> \
  --name <cert-name> \
  --cert-file <pfx-path> \
  --cert-password <password>
```

### 7. URL Path Maps (Path-Based Routing)

```bash
az network application-gateway url-path-map create \
  --gateway-name <agw> \
  --resource-group <rg> \
  --name <map-name> \
  --paths "/api/*" \
  --address-pool <api-pool> \
  --http-settings <api-settings> \
  --default-address-pool <default-pool> \
  --default-http-settings <default-settings>
```

### 8. WAF Rules

```bash
# Add managed OWASP rule set
az network application-gateway waf-policy managed-rule rule-set add \
  --policy-name <waf-policy> \
  --resource-group <rg> \
  --type OWASP \
  --version 3.2

# Add custom WAF rule
az network application-gateway waf-policy custom-rule create \
  --policy-name <waf-policy> \
  --resource-group <rg> \
  --name "BlockBadBots" \
  --priority 100 \
  --rule-type MatchRule \
  --action Block
```

### 9. Show, List, and Backend Health

```bash
# Show Application Gateway
az network application-gateway show \
  --name <agw> \
  --resource-group <rg>

# List Application Gateways
az network application-gateway list \
  --resource-group <rg> \
  --output table

# Show backend health
az network application-gateway show-backend-health \
  --name <agw> \
  --resource-group <rg>
```

### 10. Display Summary

Show the user:
- Application Gateway name, SKU, capacity
- Frontend IP (public IP address)
- Backend pools with server counts
- Health probe configuration
- Routing rules (basic or path-based)
- WAF policy and mode (detection/prevention)
- Next steps: configure NSGs (`/nsg-configure`) for backend subnets, review with Networking Reviewer agent
