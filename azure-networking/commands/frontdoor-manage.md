---
name: frontdoor-manage
description: "Create and manage Azure Front Door with endpoints, origin groups, custom domains, WAF, and cache purge"
argument-hint: "--name <fd-name> --rg <resource-group> [--sku Standard_AzureFrontDoor|Premium_AzureFrontDoor] [--endpoint <name>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Manage Azure Front Door

Create and configure Azure Front Door Standard/Premium with endpoints, origin groups, routes, custom domains, WAF policies, and cache management.

## Instructions

### 1. Validate Inputs

- `--name` — Front Door profile name. Ask if not provided.
- `--rg` — Resource group. Ask if not provided.
- `--sku` — `Standard_AzureFrontDoor` or `Premium_AzureFrontDoor` (default: `Standard_AzureFrontDoor`). Premium adds Private Link origins and enhanced WAF.
- `--endpoint` — Endpoint name. If not provided, derive from profile name.

### 2. Create Front Door Profile

```bash
az afd profile create \
  --profile-name <fd-name> \
  --resource-group <rg> \
  --sku Standard_AzureFrontDoor
```

### 3. Create Endpoint

```bash
az afd endpoint create \
  --profile-name <fd> \
  --resource-group <rg> \
  --endpoint-name <ep-name> \
  --enabled-state Enabled
```

### 4. Create Origin Group

```bash
az afd origin-group create \
  --profile-name <fd> \
  --resource-group <rg> \
  --origin-group-name <og-name> \
  --probe-request-type HEAD \
  --probe-protocol Https \
  --probe-interval-in-seconds 30 \
  --probe-path /health \
  --sample-size 4 \
  --successful-samples-required 3
```

### 5. Add Origins

```bash
az afd origin create \
  --profile-name <fd> \
  --resource-group <rg> \
  --origin-group-name <og> \
  --origin-name <origin-name> \
  --host-name <backend-hostname> \
  --origin-host-header <backend-hostname> \
  --http-port 80 \
  --https-port 443 \
  --priority 1 \
  --weight 1000
```

### 6. Create Route

```bash
az afd route create \
  --profile-name <fd> \
  --resource-group <rg> \
  --endpoint-name <ep> \
  --route-name <route-name> \
  --origin-group <og> \
  --supported-protocols Https \
  --https-redirect Enabled \
  --forwarding-protocol HttpsOnly \
  --patterns-to-match "/*"
```

### 7. Custom Domain

```bash
# Create custom domain with managed certificate
az afd custom-domain create \
  --profile-name <fd> \
  --resource-group <rg> \
  --custom-domain-name <cd-name> \
  --host-name www.contoso.com \
  --certificate-type ManagedCertificate

# Check validation status
az afd custom-domain show \
  --profile-name <fd> \
  --resource-group <rg> \
  --custom-domain-name <cd-name>
```

### 8. WAF Policy for Front Door

```bash
# Create WAF policy
az network front-door waf-policy create \
  --name <waf-name> \
  --resource-group <rg> \
  --sku Standard_AzureFrontDoor \
  --mode Prevention

# List available managed rule sets
az network front-door waf-policy managed-rule-definition list --output table

# Add managed rules
az network front-door waf-policy managed-rules add \
  --policy-name <waf> \
  --resource-group <rg> \
  --type Microsoft_DefaultRuleSet \
  --version 2.1 \
  --action Block
```

### 9. Security Policy (Attach WAF to Endpoint)

```bash
az afd security-policy create \
  --profile-name <fd> \
  --resource-group <rg> \
  --security-policy-name <sp-name> \
  --waf-policy <waf-resource-id> \
  --domains <endpoint-resource-id>
```

### 10. Purge Cache

```bash
az afd endpoint purge \
  --profile-name <fd> \
  --resource-group <rg> \
  --endpoint-name <ep> \
  --content-paths "/*"
```

### 11. Show and List

```bash
# Show Front Door profile
az afd profile show \
  --profile-name <fd> \
  --resource-group <rg>

# List endpoints
az afd endpoint list \
  --profile-name <fd> \
  --resource-group <rg> \
  --output table
```

### 12. Display Summary

Show the user:
- Front Door profile name, SKU
- Endpoints with hostnames
- Origin groups and origin counts
- Routes and routing patterns
- Custom domains and certificate status
- WAF policy and mode
- Next steps: add DNS CNAME for custom domain (`/dns-manage`), configure security headers via rule engine
