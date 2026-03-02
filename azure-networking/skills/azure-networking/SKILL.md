---
name: Azure Networking
description: >
  Deep expertise in Azure networking — design and deploy Virtual Networks with subnets and peering,
  configure Network Security Groups and Application Security Groups, deploy Standard Load Balancers
  and Application Gateways, manage Azure Front Door for global traffic distribution, administer
  public and private DNS zones, set up VPN and ExpressRoute gateways, create Private Endpoints
  with DNS integration, and operate Azure Firewall for centralized network security. Targets
  cloud architects and infrastructure engineers building production Azure network topologies.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - azure networking
  - virtual network
  - vnet
  - nsg
  - network security group
  - load balancer
  - azure dns
  - front door
  - vpn gateway
  - private endpoint
  - private link
  - application gateway
  - azure firewall
  - subnet
  - peering
  - service endpoint
---

# Azure Networking

## 1. Azure Networking Overview

Azure networking provides the foundational connectivity, security, and traffic delivery services for all cloud workloads.

**Service categories**:

| Category | Services | Purpose |
|----------|----------|---------|
| Connectivity | VNet, VNet Peering, VPN Gateway, ExpressRoute, Virtual WAN | Connect resources to each other and to on-premises |
| Security | NSG, ASG, Azure Firewall, DDoS Protection, Private Link | Control and protect network traffic |
| Delivery | Load Balancer, Application Gateway, Front Door, Traffic Manager, CDN | Distribute traffic for performance and availability |
| Monitoring | Network Watcher, Connection Monitor, NSG Flow Logs, Traffic Analytics | Observe and diagnose network behavior |

**Hub-spoke topology** (recommended for enterprise):

```
                    ┌─────────────────────┐
                    │     Hub VNet         │
                    │  ┌───────────────┐   │
 On-premises ──────►│  │ Azure Firewall │   │
 (VPN/ExpressRoute) │  └───────────────┘   │
                    │  ┌───────────────┐   │
                    │  │ Azure Bastion  │   │
                    │  └───────────────┘   │
                    │  ┌───────────────┐   │
                    │  │ DNS Resolver   │   │
                    │  └───────────────┘   │
                    └───────┬───┬───────────┘
                       Peering │ │ Peering
                    ┌──────────┘ └──────────┐
              ┌─────▼─────┐          ┌──────▼────┐
              │ Spoke VNet │          │ Spoke VNet │
              │ (Workload) │          │ (Workload) │
              └────────────┘          └────────────┘
```

- **Hub** hosts shared services: firewall, VPN/ExpressRoute gateway, Bastion, DNS.
- **Spokes** host application workloads, peered to the hub.
- Traffic between spokes routes through the hub firewall via User Defined Routes (UDRs).
- DNS queries forward to a central DNS resolver or Azure-provided DNS in the hub.

**Key design decisions**:
- Region: Single-region vs multi-region (Front Door for global routing).
- Connectivity: VPN (encrypted over internet) vs ExpressRoute (private circuit) vs both.
- Segmentation: Subnets + NSGs for micro-segmentation, Azure Firewall for centralized policy.
- PaaS access: Public endpoints (with firewall rules) vs Private Endpoints (fully private).

## 2. Virtual Networks & Subnets

A Virtual Network (VNet) is the fundamental building block for private networking in Azure. Each VNet exists in a single region and subscription.

**Address space planning** (RFC 1918):

| Range | CIDR | Addresses | Typical Use |
|-------|------|-----------|-------------|
| `10.0.0.0/8` | 10.0.0.0 – 10.255.255.255 | 16.7M | Large enterprises, hub-spoke |
| `172.16.0.0/12` | 172.16.0.0 – 172.31.255.255 | 1M | Medium deployments |
| `192.168.0.0/16` | 192.168.0.0 – 192.168.255.255 | 65K | Small environments, dev/test |

**Rules**:
- Address spaces must not overlap between peered VNets or with on-premises ranges.
- Azure reserves 5 IPs per subnet: network address, default gateway, 2 DNS, broadcast.
- Minimum subnet size is /29 (3 usable IPs). Recommended minimum is /27 for flexibility.

**Subnet delegation**: Some services require dedicated subnets with delegation:

| Service | Delegation | Minimum Subnet Size |
|---------|-----------|-------------------|
| Azure Bastion | `Microsoft.Network/bastionHosts` | /26 (64 IPs) |
| VPN/ExpressRoute Gateway | None (uses `GatewaySubnet` name) | /27 (32 IPs) |
| Azure Firewall | None (uses `AzureFirewallSubnet` name) | /26 (64 IPs) |
| App Service (VNet Integration) | `Microsoft.Web/serverFarms` | /28 (16 IPs) |
| Container Instances | `Microsoft.ContainerInstance/containerGroups` | /28+ |
| Azure SQL Managed Instance | `Microsoft.Sql/managedInstances` | /27+ (dedicated) |

**Create a VNet with subnets** (Azure CLI):
```bash
az network vnet create \
  --name hub-vnet \
  --resource-group networking-rg \
  --location eastus2 \
  --address-prefixes 10.0.0.0/16

az network vnet subnet create --name web --vnet-name hub-vnet --resource-group networking-rg --address-prefixes 10.0.1.0/24
az network vnet subnet create --name app --vnet-name hub-vnet --resource-group networking-rg --address-prefixes 10.0.2.0/24
az network vnet subnet create --name db --vnet-name hub-vnet --resource-group networking-rg --address-prefixes 10.0.3.0/24
az network vnet subnet create --name AzureBastionSubnet --vnet-name hub-vnet --resource-group networking-rg --address-prefixes 10.0.255.0/26
az network vnet subnet create --name GatewaySubnet --vnet-name hub-vnet --resource-group networking-rg --address-prefixes 10.0.254.0/27
```

**VNet peering** connects two VNets for direct traffic flow via the Azure backbone:

```bash
# Bidirectional peering (must be created from both sides)
az network vnet peering create \
  --name hub-to-spoke1 \
  --vnet-name hub-vnet --resource-group networking-rg \
  --remote-vnet /subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.Network/virtualNetworks/spoke1-vnet \
  --allow-vnet-access --allow-forwarded-traffic --allow-gateway-transit

az network vnet peering create \
  --name spoke1-to-hub \
  --vnet-name spoke1-vnet --resource-group spoke1-rg \
  --remote-vnet /subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.Network/virtualNetworks/hub-vnet \
  --allow-vnet-access --allow-forwarded-traffic --use-remote-gateways
```

**Peering options**:
- `--allow-vnet-access`: Allow traffic between peered VNets (required).
- `--allow-forwarded-traffic`: Allow traffic forwarded from other VNets (needed for hub routing).
- `--allow-gateway-transit`: Hub shares its gateway with the spoke.
- `--use-remote-gateways`: Spoke uses the hub's gateway (mutual with `--allow-gateway-transit`).

**Service endpoints** vs **Private Endpoints**:
| Aspect | Service Endpoints | Private Endpoints |
|--------|-------------------|-------------------|
| Traffic path | Microsoft backbone (public IP) | Private IP in your VNet |
| DNS | Public FQDN resolves to public IP | Public FQDN resolves to private IP |
| Granularity | Per-subnet, per-service | Per-resource |
| Cost | Free | Per-hour + data processing |
| NSG support | Limited | Full (with network policies enabled) |

**Bicep template** for a VNet:
```bicep
param vnetName string = 'hub-vnet'
param location string = resourceGroup().location

resource vnet 'Microsoft.Network/virtualNetworks@2023-11-01' = {
  name: vnetName
  location: location
  properties: {
    addressSpace: {
      addressPrefixes: ['10.0.0.0/16']
    }
    subnets: [
      { name: 'web', properties: { addressPrefix: '10.0.1.0/24' } }
      { name: 'app', properties: { addressPrefix: '10.0.2.0/24' } }
      { name: 'db', properties: { addressPrefix: '10.0.3.0/24' } }
    ]
  }
}
```

## 3. Network Security Groups

Network Security Groups (NSGs) filter inbound and outbound traffic for subnets and NICs using stateful rules evaluated by priority.

**Rule anatomy**:

| Property | Description | Values |
|----------|-------------|--------|
| Priority | Lower number = higher priority | 100 – 4096 (custom), 65000+ (default) |
| Direction | Traffic direction | Inbound, Outbound |
| Source | Source IP, CIDR, service tag, or ASG | `10.0.1.0/24`, `Internet`, `VirtualNetwork`, ASG name |
| Source port | Source port ranges | `*`, `80`, `1024-65535` |
| Destination | Destination IP, CIDR, service tag, or ASG | Same options as source |
| Dest port | Destination port ranges | `*`, `443`, `80,443`, `8080-8090` |
| Protocol | Network protocol | `Tcp`, `Udp`, `Icmp`, `Esp`, `Ah`, `*` |
| Action | Allow or deny | `Allow`, `Deny` |

**Default rules** (cannot be deleted, lowest priority):

| Priority | Name | Direction | Access | Source | Dest | Port |
|----------|------|-----------|--------|--------|------|------|
| 65000 | AllowVnetInBound | Inbound | Allow | VirtualNetwork | VirtualNetwork | `*` |
| 65001 | AllowAzureLoadBalancerInBound | Inbound | Allow | AzureLoadBalancer | `*` | `*` |
| 65500 | DenyAllInBound | Inbound | Deny | `*` | `*` | `*` |
| 65000 | AllowVnetOutBound | Outbound | Allow | VirtualNetwork | VirtualNetwork | `*` |
| 65001 | AllowInternetOutBound | Outbound | Allow | `*` | Internet | `*` |
| 65500 | DenyAllOutBound | Outbound | Deny | `*` | `*` | `*` |

**Service tags** simplify rule management by representing groups of Azure IP prefixes:

| Service Tag | Description |
|-------------|-------------|
| `Internet` | All public IPs outside Azure |
| `VirtualNetwork` | VNet address space + peered VNets + on-premises (if connected) |
| `AzureLoadBalancer` | Azure infrastructure health probes |
| `AzureCloud` | All Azure datacenter IPs |
| `Storage` | Azure Storage service IPs |
| `Sql` | Azure SQL Database service IPs |
| `AzureKeyVault` | Azure Key Vault service IPs |
| `AzureMonitor` | Azure Monitor endpoints |
| `GatewayManager` | Azure VPN/App Gateway management |
| `AzureActiveDirectory` | Microsoft Entra ID endpoints |

**Application Security Groups (ASGs)** group NICs by role instead of IP:

```bash
# Create ASGs
az network asg create --name web-asg --resource-group networking-rg --location eastus2
az network asg create --name app-asg --resource-group networking-rg --location eastus2

# Associate NIC with ASG
az network nic ip-config update \
  --nic-name web-vm-nic --name ipconfig1 --resource-group networking-rg \
  --application-security-groups web-asg

# Use ASG in NSG rule
az network nsg rule create \
  --nsg-name app-nsg --resource-group networking-rg \
  --name AllowFromWeb --priority 100 --direction Inbound --access Allow \
  --protocol Tcp --destination-port-ranges 8080 \
  --source-asgs web-asg --destination-asgs app-asg
```

**NSG flow logs** capture metadata about traffic hitting NSG rules:

```bash
az network watcher flow-log create \
  --name web-nsg-flowlog \
  --nsg /subscriptions/<sub>/resourceGroups/networking-rg/providers/Microsoft.Network/networkSecurityGroups/web-nsg \
  --resource-group NetworkWatcherRG \
  --storage-account /subscriptions/<sub>/resourceGroups/networking-rg/providers/Microsoft.Storage/storageAccounts/flowlogssa \
  --enabled true --format JSON --log-version 2 --retention 30 \
  --traffic-analytics true --workspace /subscriptions/<sub>/resourceGroups/networking-rg/providers/Microsoft.OperationalInsights/workspaces/net-logs
```

**Effective security rules** show the combined rules from NSGs on the subnet and NIC:

```bash
az network nic list-effective-nsg --name web-vm-nic --resource-group networking-rg
```

**Common rule patterns**:

Web tier (public-facing):
```bash
az network nsg rule create --nsg-name web-nsg --resource-group networking-rg --name AllowHTTPS --priority 100 --direction Inbound --access Allow --protocol Tcp --source-address-prefixes Internet --destination-port-ranges 443
az network nsg rule create --nsg-name web-nsg --resource-group networking-rg --name AllowHTTP --priority 110 --direction Inbound --access Allow --protocol Tcp --source-address-prefixes Internet --destination-port-ranges 80
az network nsg rule create --nsg-name web-nsg --resource-group networking-rg --name AllowLB --priority 120 --direction Inbound --access Allow --protocol '*' --source-address-prefixes AzureLoadBalancer --destination-port-ranges '*'
```

App tier (internal):
```bash
az network nsg rule create --nsg-name app-nsg --resource-group networking-rg --name AllowFromWebTier --priority 100 --direction Inbound --access Allow --protocol Tcp --source-address-prefixes 10.0.1.0/24 --destination-port-ranges 8080
az network nsg rule create --nsg-name app-nsg --resource-group networking-rg --name DenyAllInbound --priority 4096 --direction Inbound --access Deny --protocol '*' --source-address-prefixes '*' --destination-port-ranges '*'
```

DB tier (restricted):
```bash
az network nsg rule create --nsg-name db-nsg --resource-group networking-rg --name AllowSQLFromApp --priority 100 --direction Inbound --access Allow --protocol Tcp --source-address-prefixes 10.0.2.0/24 --destination-port-ranges 1433
az network nsg rule create --nsg-name db-nsg --resource-group networking-rg --name DenyAllInbound --priority 4096 --direction Inbound --access Deny --protocol '*' --source-address-prefixes '*' --destination-port-ranges '*'
```

## 4. Azure Load Balancer

Azure Load Balancer operates at Layer 4 (TCP/UDP) and distributes traffic across backend pool members.

**SKU comparison**:

| Feature | Basic | Standard | Gateway |
|---------|-------|----------|---------|
| Backend pool size | 300 | 5000 | 5000 |
| Health probes | TCP, HTTP | TCP, HTTP, HTTPS | TCP, HTTP, HTTPS |
| Availability zones | No | Zone-redundant / zonal | Zone-redundant |
| SLA | None | 99.99% | 99.99% |
| Outbound rules | No | Yes | N/A |
| HA Ports | No | Yes (internal only) | Yes |
| Pricing | Free | Per-rule + data | Per-rule + data |
| NSG requirement | Optional | Required on backend | Required on backend |
| Global/cross-region | No | Yes | No |

**Recommendation**: Always use Standard SKU for production. Basic is being retired.

**Public vs internal**:
- **Public**: Internet-facing, has a public IP frontend. Used for web applications and APIs.
- **Internal**: VNet-only, has a private IP frontend. Used for internal tiers (app, DB, middleware).

**Health probes** determine backend instance health:

| Protocol | Use When | Configuration |
|----------|----------|---------------|
| HTTP/HTTPS | App exposes a health endpoint | Path: `/health`, expected response: `200` |
| TCP | App listens on a port but has no HTTP endpoint | Port: backend port |

```bash
# Create a Standard public LB
az network public-ip create --name web-lb-pip --resource-group networking-rg --sku Standard --allocation-method Static --zone 1 2 3
az network lb create --name web-lb --resource-group networking-rg --sku Standard --frontend-ip-name web-frontend --public-ip-address web-lb-pip
az network lb address-pool create --lb-name web-lb --resource-group networking-rg --name web-backend
az network lb probe create --lb-name web-lb --resource-group networking-rg --name web-probe --protocol Http --port 80 --path /health --interval 15 --threshold 2
az network lb rule create --lb-name web-lb --resource-group networking-rg --name web-rule --frontend-ip-name web-frontend --backend-pool-name web-backend --probe-name web-probe --protocol Tcp --frontend-port 443 --backend-port 443 --idle-timeout 15 --enable-tcp-reset true
```

**Outbound rules** (Standard SKU) control SNAT for outbound connections:

```bash
az network lb outbound-rule create \
  --lb-name web-lb --resource-group networking-rg \
  --name outbound-rule \
  --frontend-ip-configs web-frontend \
  --address-pool web-backend \
  --protocol All \
  --idle-timeout 15 \
  --outbound-ports 10000
```

**HA Ports** (internal LB, Standard SKU) load-balance all ports and protocols:

```bash
az network lb rule create \
  --lb-name internal-lb --resource-group networking-rg \
  --name ha-rule \
  --frontend-ip-name internal-frontend \
  --backend-pool-name internal-backend \
  --probe-name tcp-probe \
  --protocol All --frontend-port 0 --backend-port 0
```

HA Ports are required when load-balancing network virtual appliances (NVAs) that must see all traffic.

**Cross-region LB** (Standard SKU) distributes traffic across regional LBs:

```bash
az network cross-region-lb create \
  --name global-lb --resource-group networking-rg \
  --sku Standard --frontend-ip-name global-frontend
```

## 5. Application Gateway

Application Gateway is a Layer 7 (HTTP/HTTPS) load balancer with WAF, SSL termination, and URL-based routing.

**SKUs**:
- **Standard_v2**: Layer 7 load balancing, autoscaling, zone redundancy.
- **WAF_v2**: Adds Web Application Firewall with OWASP CRS 3.2 rules, bot protection, custom rules.

**Key capabilities**:

| Feature | Description |
|---------|-------------|
| URL-based routing | Route `/api/*` to API backend, `/static/*` to storage |
| Path-based routing | Multiple backend pools based on URL path |
| SSL termination | Terminate TLS at the gateway, forward HTTP to backends |
| End-to-end TLS | Re-encrypt traffic to backends with backend certificates |
| Autoscaling | Scale instances 0-125 based on traffic |
| Cookie affinity | Session stickiness via gateway-managed cookies |
| Rewrites | Modify request/response headers and URL |
| Health probes | Custom HTTP probes per backend pool |
| WebSocket/HTTP/2 | Full support for modern protocols |

**Listener types**:
- **Basic**: Single site — all requests on a port go to one routing rule.
- **Multi-site**: Host header routing — `api.contoso.com` to one backend, `web.contoso.com` to another.

**WAF policy**:

```bash
az network application-gateway waf-policy create \
  --name web-waf-policy --resource-group networking-rg

az network application-gateway waf-policy managed-rule rule-set add \
  --policy-name web-waf-policy --resource-group networking-rg \
  --type OWASP --version 3.2

az network application-gateway waf-policy managed-rule rule-set add \
  --policy-name web-waf-policy --resource-group networking-rg \
  --type Microsoft_BotManagerRuleSet --version 1.0
```

**Create Application Gateway** (Azure CLI):

```bash
az network application-gateway create \
  --name web-appgw \
  --resource-group networking-rg \
  --location eastus2 \
  --sku WAF_v2 \
  --capacity 2 \
  --vnet-name hub-vnet \
  --subnet appgw-subnet \
  --public-ip-address appgw-pip \
  --http-settings-port 80 \
  --http-settings-protocol Http \
  --frontend-port 443 \
  --waf-policy web-waf-policy \
  --priority 100
```

**Bicep template** for Application Gateway with WAF:

```bicep
resource appGw 'Microsoft.Network/applicationGateways@2023-11-01' = {
  name: 'web-appgw'
  location: location
  properties: {
    sku: { name: 'WAF_v2', tier: 'WAF_v2' }
    autoscaleConfiguration: { minCapacity: 1, maxCapacity: 10 }
    gatewayIPConfigurations: [
      { name: 'gateway-ip', properties: { subnet: { id: appgwSubnet.id } } }
    ]
    frontendIPConfigurations: [
      { name: 'public-frontend', properties: { publicIPAddress: { id: appgwPip.id } } }
    ]
    frontendPorts: [
      { name: 'port-443', properties: { port: 443 } }
    ]
    backendAddressPools: [
      { name: 'web-backend', properties: { backendAddresses: [] } }
    ]
    backendHttpSettingsCollection: [
      { name: 'http-settings', properties: { port: 80, protocol: 'Http', requestTimeout: 30 } }
    ]
    httpListeners: [
      { name: 'https-listener', properties: {
        frontendIPConfiguration: { id: resourceId('Microsoft.Network/applicationGateways/frontendIPConfigurations', 'web-appgw', 'public-frontend') }
        frontendPort: { id: resourceId('Microsoft.Network/applicationGateways/frontendPorts', 'web-appgw', 'port-443') }
        protocol: 'Https'
        sslCertificate: { id: resourceId('Microsoft.Network/applicationGateways/sslCertificates', 'web-appgw', 'tls-cert') }
      }}
    ]
    requestRoutingRules: [
      { name: 'web-rule', properties: {
        priority: 100
        ruleType: 'Basic'
        httpListener: { id: resourceId('Microsoft.Network/applicationGateways/httpListeners', 'web-appgw', 'https-listener') }
        backendAddressPool: { id: resourceId('Microsoft.Network/applicationGateways/backendAddressPools', 'web-appgw', 'web-backend') }
        backendHttpSettings: { id: resourceId('Microsoft.Network/applicationGateways/backendHttpSettingsCollection', 'web-appgw', 'http-settings') }
      }}
    ]
    firewallPolicy: { id: wafPolicy.id }
  }
}
```

## 6. Azure Front Door

Azure Front Door is a global Layer 7 load balancer and CDN with built-in WAF, SSL, and intelligent routing.

**Tiers**:
- **Standard**: Global load balancing + CDN + custom domains + basic analytics.
- **Premium**: Adds WAF, Private Link origins, enhanced analytics, bot protection.

**Key capabilities**:

| Feature | Description |
|---------|-------------|
| Global anycast | Requests enter via the nearest Microsoft POP (190+ locations) |
| SSL offloading | Managed certificates or BYOC, automatic HTTP-to-HTTPS redirect |
| Caching | CDN-style caching at edge POPs with configurable TTL |
| WAF | DDoS L7, OWASP CRS, bot protection, rate limiting, geo-filtering |
| Health probes | Probe backend origins and route away from unhealthy ones |
| Session affinity | Sticky sessions via Front Door cookies |
| URL rewrite/redirect | Rewrite paths, redirect HTTP to HTTPS, redirect domains |
| Private Link origins | Connect to App Service, Storage, or custom backends via Private Link |
| Rules engine | Match conditions + actions for request/response manipulation |

**Architecture**:

```
Client → Front Door POP (nearest) → Origin Group → Origin (regional backend)
                                  ↕
                            WAF Policy
                            Caching Rules
                            Route Rules
```

**Create Front Door** (Azure CLI):

```bash
# Create profile
az afd profile create \
  --profile-name contoso-fd \
  --resource-group networking-rg \
  --sku Premium_AzureFrontDoor

# Create endpoint
az afd endpoint create \
  --endpoint-name contoso-endpoint \
  --profile-name contoso-fd \
  --resource-group networking-rg \
  --enabled-state Enabled

# Create origin group
az afd origin-group create \
  --origin-group-name web-origins \
  --profile-name contoso-fd \
  --resource-group networking-rg \
  --probe-request-type GET \
  --probe-protocol Https \
  --probe-interval-in-seconds 30 \
  --probe-path /health \
  --sample-size 4 \
  --successful-samples-required 3

# Add origins
az afd origin create \
  --origin-name eastus-origin \
  --origin-group-name web-origins \
  --profile-name contoso-fd \
  --resource-group networking-rg \
  --host-name webapp-eastus.azurewebsites.net \
  --origin-host-header webapp-eastus.azurewebsites.net \
  --http-port 80 --https-port 443 \
  --priority 1 --weight 1000

az afd origin create \
  --origin-name westeurope-origin \
  --origin-group-name web-origins \
  --profile-name contoso-fd \
  --resource-group networking-rg \
  --host-name webapp-westeurope.azurewebsites.net \
  --origin-host-header webapp-westeurope.azurewebsites.net \
  --http-port 80 --https-port 443 \
  --priority 1 --weight 1000

# Create route
az afd route create \
  --route-name default-route \
  --endpoint-name contoso-endpoint \
  --profile-name contoso-fd \
  --resource-group networking-rg \
  --origin-group web-origins \
  --supported-protocols Https \
  --patterns-to-match '/*' \
  --forwarding-protocol HttpsOnly \
  --https-redirect Enabled
```

**Custom domain**:

```bash
az afd custom-domain create \
  --custom-domain-name contoso-domain \
  --profile-name contoso-fd \
  --resource-group networking-rg \
  --host-name www.contoso.com \
  --certificate-type ManagedCertificate

# Associate with route
az afd route update \
  --route-name default-route \
  --endpoint-name contoso-endpoint \
  --profile-name contoso-fd \
  --resource-group networking-rg \
  --custom-domains contoso-domain
```

**Caching rules** via rule set:

```bash
az afd rule-set create --rule-set-name CacheRules --profile-name contoso-fd --resource-group networking-rg

az afd rule create \
  --rule-set-name CacheRules --rule-name CacheStatic \
  --profile-name contoso-fd --resource-group networking-rg \
  --order 1 \
  --match-variable UrlFileExtension --operator Contains --match-values "css" "js" "png" "jpg" "woff2" \
  --action-name CacheExpiration --cache-behavior Override --cache-duration 7.00:00:00
```

## 7. Azure DNS

Azure DNS hosts DNS zones and provides name resolution using Microsoft's global anycast network.

**Public DNS zones** host records for internet-facing domains:

```bash
az network dns zone create --name contoso.com --resource-group networking-rg
```

**Record types**:

| Type | Purpose | Example Value |
|------|---------|---------------|
| A | IPv4 address | `20.50.100.10` |
| AAAA | IPv6 address | `2001:db8::1` |
| CNAME | Canonical name alias | `webapp.azurewebsites.net` |
| MX | Mail exchange | `10 mail.contoso.com` |
| TXT | Text (SPF, DKIM, verification) | `v=spf1 include:spf.protection.outlook.com -all` |
| SRV | Service location | `10 5 5060 sip.contoso.com` |
| CAA | Certificate Authority Authorization | `0 issue "letsencrypt.org"` |
| NS | Name server (auto-created) | `ns1-01.azure-dns.com.` |
| SOA | Start of authority (auto-created) | Serial, refresh, retry, expire |

**Common records**:

```bash
# Website A record
az network dns record-set a add-record --zone-name contoso.com --resource-group networking-rg --record-set-name www --ipv4-address 20.50.100.10

# CNAME for API
az network dns record-set cname set-record --zone-name contoso.com --resource-group networking-rg --record-set-name api --cname api-contoso.azurefd.net

# MX for email
az network dns record-set mx add-record --zone-name contoso.com --resource-group networking-rg --record-set-name @ --exchange contoso-com.mail.protection.outlook.com --preference 10

# SPF record
az network dns record-set txt add-record --zone-name contoso.com --resource-group networking-rg --record-set-name @ --value "v=spf1 include:spf.protection.outlook.com -all"

# CAA record
az network dns record-set caa add-record --zone-name contoso.com --resource-group networking-rg --record-set-name @ --flags 0 --tag issue --value "letsencrypt.org"
```

**Private DNS zones** provide name resolution within VNets:

```bash
# Create private zone
az network private-dns zone create --name contoso.internal --resource-group networking-rg

# Link to VNet (with auto-registration)
az network private-dns link vnet create \
  --name hub-vnet-link \
  --zone-name contoso.internal \
  --resource-group networking-rg \
  --virtual-network hub-vnet \
  --registration-enabled true
```

When `--registration-enabled true`, VMs in the linked VNet automatically get A records in the private zone (`vm-name.contoso.internal`).

**Private DNS zones for Private Endpoints** (required zone names):

| Service | Zone Name |
|---------|-----------|
| Blob Storage | `privatelink.blob.core.windows.net` |
| SQL Database | `privatelink.database.windows.net` |
| Key Vault | `privatelink.vaultcore.azure.net` |
| App Service | `privatelink.azurewebsites.net` |
| Cosmos DB | `privatelink.documents.azure.com` |
| ACR | `privatelink.azurecr.io` |
| Event Hubs | `privatelink.servicebus.windows.net` |

**DNS-based traffic management**: Use alias records to point to Azure resources:

```bash
# Alias A record pointing to a public IP (auto-updates if IP changes)
az network dns record-set a create --zone-name contoso.com --resource-group networking-rg --name www --target-resource /subscriptions/<sub>/resourceGroups/networking-rg/providers/Microsoft.Network/publicIPAddresses/web-pip
```

## 8. VPN & ExpressRoute

VPN Gateway and ExpressRoute provide hybrid connectivity between Azure and on-premises networks.

**VPN Gateway SKUs**:

| SKU | S2S Tunnels | P2S Connections | Throughput | Zone Redundant |
|-----|-------------|-----------------|------------|----------------|
| VpnGw1 | 30 | 250 | 650 Mbps | No |
| VpnGw1AZ | 30 | 250 | 650 Mbps | Yes |
| VpnGw2 | 30 | 500 | 1 Gbps | No |
| VpnGw2AZ | 30 | 500 | 1 Gbps | Yes |
| VpnGw3 | 30 | 1000 | 1.25 Gbps | No |
| VpnGw3AZ | 30 | 1000 | 1.25 Gbps | Yes |
| VpnGw4 | 100 | 5000 | 5 Gbps | No |
| VpnGw4AZ | 100 | 5000 | 5 Gbps | Yes |
| VpnGw5 | 100 | 10000 | 10 Gbps | No |
| VpnGw5AZ | 100 | 10000 | 10 Gbps | Yes |

**Site-to-Site (S2S) VPN** connects on-premises networks to Azure:

```bash
# Create VPN gateway (takes 30-45 min)
az network vnet-gateway create \
  --name hub-vpngw \
  --resource-group networking-rg \
  --location eastus2 \
  --vnet hub-vnet \
  --gateway-type Vpn \
  --vpn-type RouteBased \
  --sku VpnGw2AZ \
  --public-ip-addresses hub-vpngw-pip \
  --no-wait

# Create local network gateway (represents on-premises)
az network local-gateway create \
  --name onprem-lgw \
  --resource-group networking-rg \
  --location eastus2 \
  --gateway-ip-address <on-prem-public-ip> \
  --local-address-prefixes 192.168.0.0/16

# Create connection
az network vpn-connection create \
  --name hub-to-onprem \
  --resource-group networking-rg \
  --vnet-gateway1 hub-vpngw \
  --local-gateway2 onprem-lgw \
  --shared-key <pre-shared-key> \
  --connection-type IPsec
```

**Point-to-Site (P2S) VPN** connects individual clients to Azure:

```bash
az network vnet-gateway update \
  --name hub-vpngw \
  --resource-group networking-rg \
  --address-prefixes 172.16.0.0/24 \
  --client-protocol OpenVPN \
  --vpn-auth-type AAD \
  --aad-tenant "https://login.microsoftonline.com/<tenant-id>" \
  --aad-audience "41b23e61-6c1e-4545-b367-cd054e0ed4b4" \
  --aad-issuer "https://sts.windows.net/<tenant-id>/"
```

**ExpressRoute** provides a private, dedicated connection via a connectivity provider:

```bash
# Create ExpressRoute circuit
az network express-route create \
  --name contoso-er \
  --resource-group networking-rg \
  --location eastus2 \
  --bandwidth 1000 \
  --provider "Equinix" \
  --peering-location "Washington DC" \
  --sku-family MeteredData \
  --sku-tier Standard

# Create ExpressRoute gateway
az network vnet-gateway create \
  --name hub-ergw \
  --resource-group networking-rg \
  --location eastus2 \
  --vnet hub-vnet \
  --gateway-type ExpressRoute \
  --sku ErGw1AZ \
  --public-ip-addresses hub-ergw-pip
```

**Connection types**:
| Type | Use Case |
|------|----------|
| IPsec (S2S VPN) | Encrypted tunnel over public internet |
| OpenVPN (P2S VPN) | Remote workers connecting to Azure |
| ExpressRoute | Private, high-bandwidth, low-latency connection |
| VNet-to-VNet VPN | Encrypted VNet peering across regions |

**BGP** enables dynamic routing between Azure and on-premises:

```bash
az network vnet-gateway create \
  --name hub-vpngw --resource-group networking-rg --vnet hub-vnet \
  --gateway-type Vpn --sku VpnGw2AZ \
  --asn 65515 --bgp-peering-address 10.0.254.30 \
  --public-ip-addresses hub-vpngw-pip
```

## 9. Private Link & Private Endpoints

Private Link brings Azure PaaS services into your VNet via a private IP address, eliminating public internet exposure.

**How it works**:
1. A Private Endpoint is created in your VNet subnet, receiving a private IP from that subnet.
2. DNS is configured so the service's public FQDN resolves to the private IP.
3. Traffic from your VNet to the service stays entirely on the Microsoft backbone.
4. The service's public endpoint can be disabled.

**Supported services** (common):

| Service | Group ID | Private DNS Zone |
|---------|----------|-----------------|
| Storage (Blob) | `blob` | `privatelink.blob.core.windows.net` |
| Storage (File) | `file` | `privatelink.file.core.windows.net` |
| SQL Database | `sqlServer` | `privatelink.database.windows.net` |
| Key Vault | `vault` | `privatelink.vaultcore.azure.net` |
| App Service | `sites` | `privatelink.azurewebsites.net` |
| Cosmos DB (SQL API) | `Sql` | `privatelink.documents.azure.com` |
| ACR | `registry` | `privatelink.azurecr.io` |
| Event Hubs | `namespace` | `privatelink.servicebus.windows.net` |
| Azure Cache for Redis | `redisCache` | `privatelink.redis.cache.windows.net` |

**Create a Private Endpoint** (complete flow):

```bash
# 1. Create Private Endpoint
az network private-endpoint create \
  --name storage-pe \
  --resource-group networking-rg \
  --vnet-name hub-vnet \
  --subnet db \
  --private-connection-resource-id /subscriptions/<sub>/resourceGroups/networking-rg/providers/Microsoft.Storage/storageAccounts/contososa \
  --group-ids blob \
  --connection-name storage-pe-connection

# 2. Create Private DNS Zone
az network private-dns zone create \
  --name privatelink.blob.core.windows.net \
  --resource-group networking-rg

# 3. Link zone to VNet
az network private-dns link vnet create \
  --name blob-dns-link \
  --zone-name privatelink.blob.core.windows.net \
  --resource-group networking-rg \
  --virtual-network hub-vnet \
  --registration-enabled false

# 4. Create DNS zone group (auto-creates A record)
az network private-endpoint dns-zone-group create \
  --endpoint-name storage-pe \
  --resource-group networking-rg \
  --name default \
  --zone-name privatelink.blob.core.windows.net \
  --private-dns-zone /subscriptions/<sub>/resourceGroups/networking-rg/providers/Microsoft.Network/privateDnsZones/privatelink.blob.core.windows.net

# 5. Disable public access
az storage account update --name contososa --resource-group networking-rg --default-action Deny
```

**Private Link Service** exposes your own service behind a Standard Load Balancer to consumers via Private Link:

```bash
az network private-link-service create \
  --name my-pls \
  --resource-group networking-rg \
  --vnet-name hub-vnet \
  --subnet app \
  --lb-name internal-lb \
  --lb-frontend-ip-configs internal-frontend \
  --location eastus2
```

Consumers in other VNets or subscriptions create a Private Endpoint pointing to your Private Link Service.

**Network policies for Private Endpoints**:

By default, NSG rules and UDRs do not apply to Private Endpoint traffic. To enable them:

```bash
az network vnet subnet update \
  --name db \
  --vnet-name hub-vnet \
  --resource-group networking-rg \
  --private-endpoint-network-policies Enabled
```

This allows NSGs to filter traffic destined for Private Endpoints and UDRs to route it.

## 10. Azure Firewall

Azure Firewall is a managed, cloud-based network security service that protects Azure VNet resources with built-in high availability and scalability.

**SKU comparison**:

| Feature | Basic | Standard | Premium |
|---------|-------|----------|---------|
| Throughput | 250 Mbps | 30 Gbps | 100 Gbps |
| DNAT rules | Yes | Yes | Yes |
| Network rules | Yes | Yes | Yes |
| Application rules | Limited | Yes (FQDN filtering) | Yes (FQDN + URL path) |
| Threat intelligence | No | Alert + deny | Alert + deny |
| IDPS | No | No | Signature-based (65K+ signatures) |
| TLS inspection | No | No | Yes (intercept + decrypt) |
| Web categories | No | Standard | Extended |
| DNS proxy | No | Yes | Yes |
| IP Groups | Yes | Yes | Yes |
| Forced tunneling | No | Yes | Yes |
| Pricing | Low | Medium | High |

**Firewall policy hierarchy**:
- **Base policy**: Organization-level rules (e.g., block known malicious IPs).
- **Regional policy**: Inherits base + adds region-specific rules.
- **Application policy**: Inherits regional + adds app-specific rules.

```bash
# Create base policy
az network firewall policy create \
  --name org-base-policy \
  --resource-group networking-rg \
  --sku Premium \
  --threat-intel-mode Deny \
  --idps-mode Deny

# Create regional policy inheriting base
az network firewall policy create \
  --name eastus-policy \
  --resource-group networking-rg \
  --sku Premium \
  --base-policy /subscriptions/<sub>/resourceGroups/networking-rg/providers/Microsoft.Network/firewallPolicies/org-base-policy
```

**Rule types**:

| Rule Type | OSI Layer | Use Case | Example |
|-----------|-----------|----------|---------|
| DNAT | L3/L4 | Inbound port forwarding | Forward public IP:443 to internal server |
| Network | L3/L4 | IP/port/protocol filtering | Allow 10.0.2.0/24 to 10.0.3.0/24:1433 |
| Application | L7 | FQDN and URL filtering | Allow `*.microsoft.com`, block `*.torrent.com` |

**Rule collection groups and rules**:

```bash
# Create rule collection group
az network firewall policy rule-collection-group create \
  --name DefaultRuleCollectionGroup \
  --policy-name eastus-policy \
  --resource-group networking-rg \
  --priority 200

# Add network rule collection
az network firewall policy rule-collection-group collection add-filter-collection \
  --name AllowInternalTraffic \
  --policy-name eastus-policy \
  --resource-group networking-rg \
  --rule-collection-group-name DefaultRuleCollectionGroup \
  --collection-priority 100 \
  --action Allow \
  --rule-type NetworkRule \
  --rule-name AllowAppToDb \
  --source-addresses 10.0.2.0/24 \
  --destination-addresses 10.0.3.0/24 \
  --destination-ports 1433 \
  --ip-protocols TCP

# Add application rule collection
az network firewall policy rule-collection-group collection add-filter-collection \
  --name AllowWebAccess \
  --policy-name eastus-policy \
  --resource-group networking-rg \
  --rule-collection-group-name DefaultRuleCollectionGroup \
  --collection-priority 200 \
  --action Allow \
  --rule-type ApplicationRule \
  --rule-name AllowMicrosoft \
  --source-addresses 10.0.0.0/16 \
  --protocols Https=443 \
  --target-fqdns "*.microsoft.com" "*.azure.com" "*.windows.net"
```

**Deploy Azure Firewall**:

```bash
az network firewall create \
  --name hub-firewall \
  --resource-group networking-rg \
  --location eastus2 \
  --sku AZFW_VNet \
  --tier Premium \
  --vnet-name hub-vnet \
  --firewall-policy eastus-policy \
  --public-ip-count 1

# Get private IP for UDR
az network firewall show --name hub-firewall --resource-group networking-rg --query "ipConfigurations[0].privateIpAddress" -o tsv
```

**User Defined Routes (UDRs)** force spoke traffic through the firewall:

```bash
# Create route table
az network route-table create --name spoke-rt --resource-group networking-rg --location eastus2

# Route all traffic to firewall
az network route-table route create \
  --route-table-name spoke-rt --resource-group networking-rg \
  --name to-firewall \
  --address-prefix 0.0.0.0/0 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address <firewall-private-ip>

# Associate with spoke subnets
az network vnet subnet update --name app --vnet-name spoke1-vnet --resource-group spoke1-rg --route-table spoke-rt
```

## 11. Network Troubleshooting

Azure Network Watcher provides diagnostic and monitoring tools for Azure networking.

**Network Watcher tools**:

| Tool | Purpose | Use When |
|------|---------|----------|
| IP Flow Verify | Check if a packet is allowed or denied by NSG rules | VM cannot reach a service |
| Next Hop | Show the next hop for traffic from a VM | Traffic routing seems incorrect |
| Connection Troubleshoot | Test connectivity between two endpoints | End-to-end connectivity fails |
| Packet Capture | Capture network packets on a VM NIC | Deep traffic analysis needed |
| NSG Diagnostics | Evaluate NSG rules for a specific traffic flow | NSG rules seem wrong |
| Topology | Visual map of network resources | Understanding network layout |
| Connection Monitor | Continuous monitoring of connectivity | Ongoing monitoring |

**IP Flow Verify** — check if traffic is allowed:

```bash
az network watcher test-ip-flow \
  --direction Inbound \
  --protocol TCP \
  --local 10.0.2.4:8080 \
  --remote 10.0.1.4:* \
  --vm <vm-name> \
  --resource-group networking-rg
```

Returns: `Access: Allow/Deny` and the NSG rule name that matched.

**Next Hop** — trace the routing path:

```bash
az network watcher show-next-hop \
  --vm <vm-name> \
  --resource-group networking-rg \
  --source-ip 10.0.2.4 \
  --dest-ip 10.0.3.4
```

Returns: `NextHopType` (VirtualAppliance, VNetLocal, Internet, etc.) and `NextHopIpAddress`.

**Connection Troubleshoot** — test end-to-end:

```bash
az network watcher test-connectivity \
  --source-resource <source-vm-id> \
  --dest-resource <dest-vm-id> \
  --dest-port 1433 \
  --resource-group networking-rg
```

**Packet Capture**:

```bash
# Start capture
az network watcher packet-capture create \
  --name capture-01 \
  --vm <vm-name> \
  --resource-group networking-rg \
  --storage-account <storage-account-id> \
  --time-limit 60 \
  --filters '[{"protocol":"TCP","localPort":"8080"}]'

# Stop and download
az network watcher packet-capture stop --name capture-01 --location eastus2
```

**NSG Diagnostics**:

```bash
az network watcher run-configuration-diagnostic \
  --resource <nic-id> \
  --direction Inbound \
  --protocol TCP \
  --source 10.0.1.4 \
  --destination 10.0.2.4 \
  --port 8080
```

**Topology view**:

```bash
az network watcher show-topology --resource-group networking-rg --location eastus2
```

## 12. Common Patterns

### Pattern 1: Hub-Spoke with Azure Firewall

A centralized hub VNet with Azure Firewall, Bastion, and VPN Gateway. Spoke VNets peer to the hub and route all egress through the firewall.

```
On-premises ──VPN──► Hub VNet (10.0.0.0/16)
                     ├── AzureFirewallSubnet (10.0.0.0/26) → Azure Firewall
                     ├── GatewaySubnet (10.0.254.0/27) → VPN Gateway
                     ├── AzureBastionSubnet (10.0.255.0/26) → Bastion
                     └── management (10.0.10.0/24) → Jump boxes
                          │
              ┌────Peering─┴───Peering────┐
              ▼                            ▼
        Spoke 1 VNet (10.1.0.0/16)   Spoke 2 VNet (10.2.0.0/16)
        ├── web (10.1.1.0/24)        ├── web (10.2.1.0/24)
        ├── app (10.1.2.0/24)        ├── app (10.2.2.0/24)
        └── db  (10.1.3.0/24)        └── db  (10.2.3.0/24)
```

Key configuration:
- UDR on every spoke subnet: `0.0.0.0/0` → firewall private IP.
- Peering: hub has `--allow-gateway-transit`, spokes have `--use-remote-gateways`.
- Firewall policy: application rules for FQDN filtering, network rules for inter-spoke and on-prem traffic.
- NSGs: per-subnet rules as defense-in-depth behind the firewall.

### Pattern 2: Public Web App with Application Gateway WAF + NSGs

A public-facing web application behind Application Gateway with WAF for Layer 7 protection and NSGs for Layer 4 defense-in-depth.

```
Internet → Application Gateway (WAF_v2) → Web VMs (NSG: allow from AppGw subnet only)
                                         → App VMs (NSG: allow from web subnet only)
                                         → DB (Private Endpoint, NSG: allow from app subnet only)
```

Key configuration:
- Application Gateway in a dedicated subnet (`appgw-subnet`, /24).
- WAF policy with OWASP 3.2 + bot protection in prevention mode.
- Web NSG: allow 80/443 from `appgw-subnet` CIDR only, deny all else.
- App NSG: allow 8080 from `web-subnet` CIDR only.
- DB: Private Endpoint (no public access), NSG: allow 1433 from `app-subnet` CIDR.
- HTTPS end-to-end: TLS at App Gateway, re-encrypt to backends.

### Pattern 3: Private PaaS with Private Endpoints

All PaaS services (Storage, SQL, Key Vault, ACR) accessed exclusively via Private Endpoints with no public network access.

```
App VMs (10.0.2.0/24) → Private Endpoints (10.0.3.0/24):
   ├── contososa.blob.core.windows.net → 10.0.3.4 (privatelink.blob.core.windows.net)
   ├── contososql.database.windows.net → 10.0.3.5 (privatelink.database.windows.net)
   ├── contosokv.vault.azure.net       → 10.0.3.6 (privatelink.vaultcore.azure.net)
   └── contosoacr.azurecr.io           → 10.0.3.7 (privatelink.azurecr.io)
```

Key configuration:
- Dedicated subnet for Private Endpoints (`pe-subnet`).
- One Private DNS zone per service type, linked to all VNets that need resolution.
- DNS zone groups on each Private Endpoint for automatic A record management.
- Public access disabled on every PaaS resource (`--default-action Deny`).
- Network policies enabled on the PE subnet if NSG/UDR filtering is needed.

### Pattern 4: Multi-Region with Front Door + Regional Load Balancers

Global traffic distribution with Azure Front Door routing to regional Standard Load Balancers, each backed by zone-redundant VM scale sets.

```
Clients (worldwide)
     │
     ▼
Azure Front Door (Premium)
├── WAF policy (OWASP + bot protection + rate limiting)
├── Custom domain (www.contoso.com, managed cert)
├── Health probes → /health on each origin
│
├── Origin Group: web-origins (latency-based routing)
│   ├── East US: Regional LB (Standard, zone-redundant) → VMSS (zones 1,2,3)
│   └── West Europe: Regional LB (Standard, zone-redundant) → VMSS (zones 1,2,3)
│
└── Caching: static assets cached at edge POPs (7-day TTL for CSS/JS/images)
```

Key configuration:
- Front Door Premium with WAF policy in prevention mode.
- Latency-based routing: Front Door sends each request to the nearest healthy origin.
- Regional LBs: Standard SKU, zone-redundant public IPs, HTTP health probes on `/health`.
- VMSS: 3 availability zones per region, autoscale rules.
- NSGs: allow inbound only from `AzureFrontDoor.Backend` service tag on port 443.
- Health probes: Front Door probes origins every 30 seconds, removes unhealthy origins.
- Failover: if an entire region goes down, Front Door routes 100% to the healthy region.
