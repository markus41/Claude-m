# Azure Load Balancer and Application Gateway — Deep Reference

## Overview

Azure provides two primary load balancing services for distributing inbound traffic: Azure Load Balancer (Layer 4, TCP/UDP) and Azure Application Gateway (Layer 7, HTTP/HTTPS). Load Balancer is used for non-HTTP workloads, internal services, and low-latency scenarios. Application Gateway provides SSL termination, WAF, URL-based routing, and session affinity for web applications.

## Azure Load Balancer — REST API Endpoints

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|---|---|---|---|---|
| PUT | `/providers/Microsoft.Network/loadBalancers/{name}` | Network Contributor | SKU, frontend IPs, backend pools, rules, probes | Create Standard Load Balancer |
| GET | Same path | Network Reader | — | Get LB configuration |
| PUT | `/loadBalancers/{lb}/backendAddressPools/{pool}` | Network Contributor | `loadBalancerBackendAddresses` | Update backend pool members |
| PUT | `/loadBalancers/{lb}/loadBalancingRules/{rule}` | Network Contributor | Frontend IP, backend pool, probe, port, protocol | Add load balancing rule |
| PUT | `/loadBalancers/{lb}/probes/{probe}` | Network Contributor | Protocol, port, intervalInSeconds, numberOfProbes | Add health probe |
| PUT | `/loadBalancers/{lb}/inboundNatRules/{rule}` | Network Contributor | Frontend IP, backend NIC, port | NAT rule for direct VM access |

Base: `https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}`

## Azure CLI — Standard Load Balancer

```bash
# Create public IP for LB
az network public-ip create \
  --name pip-lb-prod \
  --resource-group rg-networking \
  --location eastus \
  --sku Standard \
  --allocation-method Static \
  --zone 1 2 3

# Create Standard Load Balancer
az network lb create \
  --name lb-prod-web \
  --resource-group rg-networking \
  --location eastus \
  --sku Standard \
  --frontend-ip-name frontend-web \
  --public-ip-address pip-lb-prod \
  --backend-pool-name pool-web-servers

# Create health probe
az network lb probe create \
  --lb-name lb-prod-web \
  --resource-group rg-networking \
  --name probe-https \
  --protocol Https \
  --port 443 \
  --path "/health" \
  --interval 15 \
  --threshold 2

# Create load balancing rule
az network lb rule create \
  --lb-name lb-prod-web \
  --resource-group rg-networking \
  --name rule-https \
  --frontend-ip-name frontend-web \
  --backend-pool-name pool-web-servers \
  --frontend-port 443 \
  --backend-port 443 \
  --protocol Tcp \
  --probe-name probe-https \
  --idle-timeout 4 \
  --enable-tcp-reset true \
  --disable-outbound-snat true  # required when using Outbound Rules

# Create outbound rule (for SNAT)
az network lb outbound-rule create \
  --lb-name lb-prod-web \
  --resource-group rg-networking \
  --name outbound-web \
  --frontend-ip-configs frontend-web \
  --backend-pool pool-web-servers \
  --protocol All \
  --outbound-ports 10000

# Add VM NIC to backend pool
az network nic ip-config address-pool add \
  --nic-name nic-vm-web-01 \
  --ip-config-name ipconfig1 \
  --resource-group rg-prod \
  --lb-name lb-prod-web \
  --address-pool pool-web-servers

# Create internal load balancer (no public IP)
az network lb create \
  --name lb-internal-app \
  --resource-group rg-networking \
  --location eastus \
  --sku Standard \
  --frontend-ip-name frontend-app \
  --private-ip-address 10.10.2.100 \
  --private-ip-address-version IPv4 \
  --subnet subnet-app \
  --vnet-name vnet-prod-eastus \
  --backend-pool-name pool-app-servers
```

## Application Gateway — REST API Endpoints

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|---|---|---|---|---|
| PUT | `/providers/Microsoft.Network/applicationGateways/{name}` | Network Contributor | Full AppGW JSON | Create Application Gateway |
| GET | Same path | Network Reader | — | Get current configuration |
| PATCH | Same path | Network Contributor | Partial JSON | Update specific properties |
| PUT | `/applicationGateways/{gw}/backendAddressPools/{pool}` | Network Contributor | Backend addresses | Update pool |
| PUT | `/applicationGateways/{gw}/httpListeners/{listener}` | Network Contributor | Frontend port, SSL cert, hostname | Add listener |
| PUT | `/applicationGateways/{gw}/requestRoutingRules/{rule}` | Network Contributor | Listener, backend pool, HTTP settings | Add routing rule |
| POST | `/applicationGateways/{gw}/start` | Network Contributor | — | Start stopped gateway |
| POST | `/applicationGateways/{gw}/stop` | Network Contributor | — | Stop gateway (saves cost) |

## Azure CLI — Application Gateway

```bash
# Create dedicated subnet (minimum /27 for WAF_v2 SKU)
az network vnet subnet create \
  --vnet-name vnet-prod-eastus \
  --resource-group rg-networking \
  --name subnet-appgw \
  --address-prefix 10.10.10.0/24

# Create public IP for AppGW
az network public-ip create \
  --name pip-appgw-prod \
  --resource-group rg-networking \
  --location eastus \
  --sku Standard \
  --allocation-method Static \
  --zone 1 2 3

# Create Application Gateway v2 with WAF
az network application-gateway create \
  --name appgw-prod \
  --resource-group rg-networking \
  --location eastus \
  --sku WAF_v2 \
  --capacity 2 \
  --vnet-name vnet-prod-eastus \
  --subnet subnet-appgw \
  --public-ip-address pip-appgw-prod \
  --frontend-port 443 \
  --http-settings-port 8080 \
  --http-settings-protocol Http \
  --routing-rule-type Basic \
  --servers 10.10.2.10 10.10.2.11 \
  --cert-file /certs/api-contoso-com.pfx \
  --cert-password "$CERT_PASSWORD"

# Add health probe
az network application-gateway probe create \
  --gateway-name appgw-prod \
  --resource-group rg-networking \
  --name probe-api \
  --protocol Http \
  --host-name-from-http-settings true \
  --path "/api/health" \
  --interval 30 \
  --threshold 3 \
  --timeout 30

# Add backend HTTP settings referencing probe
az network application-gateway http-settings create \
  --gateway-name appgw-prod \
  --resource-group rg-networking \
  --name settings-api \
  --port 8080 \
  --protocol Http \
  --probe probe-api \
  --timeout 30 \
  --cookie-based-affinity Disabled \
  --connection-draining-timeout 30 \
  --host-name-from-backend-pool true

# Add URL-path-based routing rule
az network application-gateway url-path-map create \
  --gateway-name appgw-prod \
  --resource-group rg-networking \
  --name path-map-api \
  --paths "/api/*" \
  --rule-name rule-api \
  --address-pool pool-api \
  --http-settings settings-api \
  --default-address-pool pool-web \
  --default-http-settings settings-web

# Enable WAF prevention mode
az network application-gateway waf-config set \
  --gateway-name appgw-prod \
  --resource-group rg-networking \
  --enabled true \
  --firewall-mode Prevention \
  --rule-set-version 3.2 \
  --rule-set-type OWASP
```

## TypeScript SDK — Reading LB / AppGW Status

```typescript
import { NetworkManagementClient } from "@azure/arm-network";
import { DefaultAzureCredential } from "@azure/identity";

const client = new NetworkManagementClient(new DefaultAzureCredential(), subscriptionId);

// Get Load Balancer backend health
const lbHealth = await client.loadBalancers.beginListInboundNatRulePortMappingsAndWait(
  resourceGroup,
  lbName,
  backendPoolName,
  { ipAddress: "10.10.1.5" }
);

// Check Application Gateway operational state
const appGw = await client.applicationGateways.get(resourceGroup, appGwName);
console.log("Operational state:", appGw.operationalState); // Running | Stopped | Starting | Stopping

// Get Application Gateway backend health
const health = await client.applicationGateways.beginBackendHealthAndWait(
  resourceGroup,
  appGwName
);
for (const pool of health.backendAddressPools ?? []) {
  console.log("Pool:", pool.backendAddressPool?.id);
  for (const server of pool.backendHttpSettingsCollection ?? []) {
    for (const s of server.servers ?? []) {
      console.log(`  ${s.address}: ${s.health}`); // Healthy | Unhealthy | Unknown | Partial
    }
  }
}
```

## Error Codes

| Code | Meaning | Remediation |
|---|---|---|
| InternalLoadBalancerNoSubnet (400) | Internal LB missing subnet config | Provide subnet ID in frontend IP configuration |
| SubnetRequiresNSGForDelegation (400) | AppGW subnet needs NSG | Create and associate NSG with required AppGW rules |
| ApplicationGatewayTierNotSupportedInThisRegion (400) | WAF_v2 not available in region | Choose a supported region |
| BackendHealthUnhealthy | Backend server failing health probe | Check application health endpoint; verify NSG allows probe source `168.63.129.16` |
| SslCertificateNotFound (400) | SSL certificate not found in AppGW | Upload PFX or reference Key Vault certificate |
| LoadBalancerInboundNatPoolSizeExceeded (400) | NAT pool port range too small | Expand port range; use larger CIDR for frontend |
| GatewayP2SVpnGatewayConnectionConflict (409) | Conflicting VPN P2S connection | Check Gateway subnet associations |
| ApplicationGatewayOperationInProgress (409) | Another operation in progress | Wait for current operation to complete; poll `provisioningState` |

## Throttling Limits

| Resource | Limit | Notes |
|---|---|---|
| Standard LB frontend IPs | 600 | Use one LB per tier (web, app, data) |
| Standard LB backend pool members | 1,000 | Scale with VMSS across multiple pools if needed |
| Standard LB rules | 1,500 | Combine ports where possible |
| Application Gateway v2 instances | 125 autoscale max | Configure min capacity ≥ 2 for HA |
| Application Gateway listeners | 200 | Use wildcard listeners for multi-tenant apps |
| Application Gateway backend pools | 100 | One pool per microservice or app tier |
| Application Gateway URL path rules | 100 per path map | Use regex-based routing in WAF_v2 |
| AppGW capacity units | 125 (max autoscale) | Monitor `ApplicationGatewayTotalTime` for sizing |

## Production Gotchas

- **SNAT port exhaustion**: Standard Load Balancer provides 1,024 SNAT ports per backend instance by default (with default outbound rules disabled). For workloads with many outbound connections (e.g., HTTP crawlers, large-scale APIs), configure explicit Outbound Rules with `allocatedOutboundPorts` to avoid SNAT exhaustion and intermittent connection failures.
- **AppGW health probe source IP**: Application Gateway health probes originate from `168.63.129.16` (the Azure platform IP). Ensure NSG rules allow TCP inbound from this IP on the backend port.
- **AppGW and private backend endpoints**: If backend servers are behind private endpoints, AppGW requires a private DNS zone or custom DNS configured to resolve the private endpoint hostname. Mismatched hostname resolution causes `Unhealthy` backend state.
- **Connection draining**: Enable connection draining on AppGW HTTP settings to allow in-flight requests to complete before a backend is removed from the pool (during deployments). Set drain timeout to match your longest expected request duration.
- **Cookie-based affinity (session stickiness)**: AppGW inserts an `ApplicationGatewayAffinity` cookie to pin users to the same backend instance. This is useful for legacy stateful apps but prevents true horizontal scaling. Prefer stateless application design.
- **WAF exclusions**: WAF OWASP rules can block legitimate requests (e.g., JSON payloads with special characters). Use WAF detection mode first, review logs in Log Analytics, then add targeted exclusions before switching to prevention mode.
- **LB and Availability Zones**: Standard Load Balancer with zone-redundant frontend IPs survives a single zone failure without interruption. Zone-pinned frontend IPs fail if the zone fails. Use zone-redundant for production.
