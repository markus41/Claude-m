# Azure VPN Gateway and ExpressRoute — Deep Reference

## Overview

Azure VPN Gateway provides encrypted site-to-site (IPsec/IKE) and point-to-site (P2S) connectivity between on-premises networks and Azure VNets over the public internet. Azure ExpressRoute provides private, dedicated connectivity from on-premises to Azure over a carrier-provisioned circuit, bypassing the public internet. This reference covers gateway provisioning, BGP routing, and connection configurations.

## REST API Endpoints — VPN Gateway

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|---|---|---|---|---|
| PUT | `/providers/Microsoft.Network/virtualNetworkGateways/{name}` | Network Contributor | SKU, VPN type, gateway subnet, public IP | Create VPN Gateway (30–45 min) |
| GET | Same path | Network Reader | — | Get gateway details and status |
| PUT | `/providers/Microsoft.Network/localNetworkGateways/{name}` | Network Contributor | On-premises IP, address space | Define on-premises endpoint |
| PUT | `/providers/Microsoft.Network/connections/{name}` | Network Contributor | Gateway IDs, IPsec policy, shared key | Create S2S connection |
| POST | `/virtualNetworkGateways/{gw}/generatevpnclientpackage` | Network Contributor | Auth method, client type | Generate P2S VPN client package |
| GET | `/virtualNetworkGateways/{gw}/vpnclientipsecpolicies` | Network Reader | — | Get P2S IPsec policies |
| POST | `/virtualNetworkGateways/{gw}/getLearnedRoutes` | Network Reader | — | Get BGP-learned routes |
| POST | `/virtualNetworkGateways/{gw}/getAdvertisedRoutes` | Network Reader | — | Get routes advertised to peers |
| POST | `/connections/{conn}/resetSharedKey` | Network Contributor | New shared key | Reset IPsec pre-shared key |

Base: `https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}`

## Azure CLI — VPN Gateway (Site-to-Site)

```bash
# GatewaySubnet must be named exactly "GatewaySubnet" (minimum /27)
az network vnet subnet create \
  --vnet-name vnet-prod-eastus \
  --resource-group rg-networking \
  --name GatewaySubnet \
  --address-prefix 10.10.254.0/27

# Create public IP for VPN Gateway (Zone-redundant)
az network public-ip create \
  --name pip-vpngw-prod \
  --resource-group rg-networking \
  --location eastus \
  --sku Standard \
  --allocation-method Static \
  --zone 1 2 3

# Create active-active VPN Gateway (two public IPs for HA)
az network public-ip create \
  --name pip-vpngw-prod-2 \
  --resource-group rg-networking \
  --location eastus \
  --sku Standard \
  --allocation-method Static \
  --zone 1 2 3

# Create VPN Gateway (SKU selection: Basic, VpnGw1-VpnGw5, VpnGw1AZ-VpnGw5AZ)
az network vnet-gateway create \
  --name vpngw-prod \
  --resource-group rg-networking \
  --location eastus \
  --vnet vnet-prod-eastus \
  --gateway-type Vpn \
  --vpn-type RouteBased \
  --sku VpnGw2AZ \
  --public-ip-address pip-vpngw-prod pip-vpngw-prod-2 \
  --active-active \
  --enable-bgp true \
  --asn 65010 \
  --no-wait  # Gateway creation takes 30-45 minutes

# Wait for gateway to be ready
az network vnet-gateway wait \
  --name vpngw-prod \
  --resource-group rg-networking \
  --created

# Create Local Network Gateway (on-premises endpoint)
az network local-gateway create \
  --name lgw-onprem-dc1 \
  --resource-group rg-networking \
  --location eastus \
  --gateway-ip-address "203.0.113.1" \
  --address-prefixes "192.168.0.0/16" "10.0.0.0/8" \
  --asn 65020 \
  --bgp-peering-address "192.168.255.1"

# Create Site-to-Site connection
az network vpn-connection create \
  --name conn-to-onprem-dc1 \
  --resource-group rg-networking \
  --location eastus \
  --vnet-gateway1 vpngw-prod \
  --local-gateway2 lgw-onprem-dc1 \
  --shared-key "$(openssl rand -base64 32)" \
  --enable-bgp true \
  --connection-protocol IKEv2

# Verify connection status
az network vpn-connection show \
  --name conn-to-onprem-dc1 \
  --resource-group rg-networking \
  --query "connectionStatus" \
  --output tsv
# Returns: Connected | Connecting | NotConnected | Unknown
```

## Custom IPsec/IKE Policy

```bash
# Create S2S connection with custom IPsec/IKE policy (for compliance or compatibility)
az network vpn-connection create \
  --name conn-to-onprem-strict \
  --resource-group rg-networking \
  --location eastus \
  --vnet-gateway1 vpngw-prod \
  --local-gateway2 lgw-onprem-dc1 \
  --shared-key "$VPN_SHARED_KEY" \
  --connection-protocol IKEv2 \
  --set ipsecPolicies='[{
    "saLifeTimeSeconds": 27000,
    "saDataSizeKilobytes": 102400000,
    "ipsecEncryption": "AES256",
    "ipsecIntegrity": "SHA256",
    "ikeEncryption": "AES256",
    "ikeIntegrity": "SHA384",
    "dhGroup": "DHGroup24",
    "pfsGroup": "ECP384"
  }]'
```

## Point-to-Site VPN (P2S)

```bash
# Configure P2S with Azure AD authentication (recommended for remote workers)
# Requires: Azure VPN app registration in tenant

az network vnet-gateway update \
  --name vpngw-prod \
  --resource-group rg-networking \
  --set "vpnClientConfiguration={
    \"vpnClientAddressPool\": {\"addressPrefixes\": [\"172.16.0.0/24\"]},
    \"vpnClientProtocols\": [\"OpenVPN\"],
    \"aadAudience\": \"41b23e61-6c1e-4545-b367-cd054e0ed4b4\",
    \"aadIssuer\": \"https://sts.windows.net/<tenant-id>/\",
    \"aadTenant\": \"https://login.microsoftonline.com/<tenant-id>\"
  }"

# Download VPN client configuration
az network vnet-gateway vpn-client generate \
  --name vpngw-prod \
  --resource-group rg-networking \
  --processor-architecture Amd64 \
  --authentication-method AAD
```

## Azure CLI — ExpressRoute

```bash
# Create ExpressRoute Circuit (circuit provisioned by carrier)
az network express-route create \
  --name er-circuit-chicago \
  --resource-group rg-networking \
  --location eastus \
  --bandwidth 1000 \
  --peering-location "Chicago" \
  --provider "Equinix" \
  --sku-family MeteredData \
  --sku-tier Standard

# After carrier provisions — get service key for carrier configuration
az network express-route show \
  --name er-circuit-chicago \
  --resource-group rg-networking \
  --query "serviceKey" \
  --output tsv

# Create ExpressRoute Gateway (must use specific SKUs)
az network vnet-gateway create \
  --name ergw-prod \
  --resource-group rg-networking \
  --location eastus \
  --vnet vnet-prod-eastus \
  --gateway-type ExpressRoute \
  --sku ErGw2AZ \
  --public-ip-address pip-ergw-prod

# Wait for gateway creation
az network vnet-gateway wait \
  --name ergw-prod \
  --resource-group rg-networking \
  --created

# Connect ExpressRoute Gateway to circuit
ER_CIRCUIT_ID=$(az network express-route show \
  --name er-circuit-chicago \
  --resource-group rg-networking \
  --query id -o tsv)

az network vpn-connection create \
  --name conn-er-chicago \
  --resource-group rg-networking \
  --location eastus \
  --vnet-gateway1 ergw-prod \
  --express-route-circuit2 "$ER_CIRCUIT_ID" \
  --routing-weight 0

# Configure BGP private peering on circuit
az network express-route peering create \
  --circuit-name er-circuit-chicago \
  --resource-group rg-networking \
  --peering-type AzurePrivatePeering \
  --peer-asn 65020 \
  --primary-peer-subnet "172.31.0.0/30" \
  --secondary-peer-subnet "172.31.0.4/30" \
  --shared-key "$ER_SHARED_KEY" \
  --vlan-id 100
```

## BGP Route Management

```bash
# View routes learned from on-premises via BGP
az network vnet-gateway list-learned-routes \
  --name vpngw-prod \
  --resource-group rg-networking \
  --output table

# View routes advertised to on-premises
az network vnet-gateway list-advertised-routes \
  --name vpngw-prod \
  --resource-group rg-networking \
  --peer "192.168.255.1" \
  --output table

# Add custom BGP communities to filter routes
az network express-route update \
  --name er-circuit-chicago \
  --resource-group rg-networking \
  --set "globalReachEnabled=true"
```

## SKU Selection Reference

### VPN Gateway SKUs

| SKU | Aggregate Throughput | S2S Tunnels | BGP | Zone-Redundant |
|---|---|---|---|---|
| Basic | 100 Mbps | 10 | No | No |
| VpnGw1 | 650 Mbps | 30 | Yes | No |
| VpnGw2 | 1 Gbps | 30 | Yes | No |
| VpnGw3 | 1.25 Gbps | 30 | Yes | No |
| VpnGw1AZ | 650 Mbps | 30 | Yes | Yes |
| VpnGw2AZ | 1 Gbps | 30 | Yes | Yes |
| VpnGw5AZ | 10 Gbps | 100 | Yes | Yes |

### ExpressRoute Gateway SKUs

| SKU | Max Circuit Connections | Zone-Redundant | FastPath |
|---|---|---|---|
| Standard | 10 | No | No |
| HighPerformance | 10 | No | No |
| UltraPerformance | 10 | No | Yes |
| ErGw1AZ | 10 | Yes | No |
| ErGw2AZ | 10 | Yes | No |
| ErGw3AZ | 10 | Yes | Yes |

## Error Codes

| Code | Meaning | Remediation |
|---|---|---|
| VpnGatewaySubnetRequiredSize (400) | GatewaySubnet too small | Minimum /27 for VPN; /26 recommended for ExpressRoute |
| GatewaySubnetNotFound (400) | No GatewaySubnet in VNet | Create subnet named exactly `GatewaySubnet` |
| VpnConnectionNotReady (409) | Gateway provisioning in progress | Wait for `provisioningState: Succeeded` |
| SharedKeyMismatch | S2S connection shared key mismatch | Verify shared key on both ends; use `resetSharedKey` |
| BGPPeerNotConnected | BGP peer not established | Check ASN, BGP peering address, NSG rules on GatewaySubnet |
| ExpressRouteCircuitNotProvisioned | Carrier has not provisioned circuit | Provide service key to carrier; wait for `ServiceProviderProvisioningState: Provisioned` |
| GatewaySkuNotSupportedForConnection | SKU mismatch | Use ERGw SKU for ExpressRoute, VpnGw SKU for VPN |

## Throttling Limits

| Resource | Limit | Notes |
|---|---|---|
| VPN tunnels per gateway | 30 (VpnGw1-3), 100 (VpnGw4-5) | Use active-active for HA without consuming extra tunnels |
| ExpressRoute circuits per gateway | 10 | Use multiple gateways for more circuits |
| BGP routes per connection | 4,000 | Aggregate on-premises routes; advertise summaries |
| P2S connections per gateway | 250 (VpnGw1) – 10,000 (VpnGw5AZ) | Scale gateway SKU for large remote worker deployments |
| VPN Gateway provisioning time | 30–45 minutes | Plan for this in deployment pipelines; use `--no-wait` |

## Production Gotchas

- **Gateway subnet sizing**: Use /27 minimum for VPN Gateway and /27 minimum for ExpressRoute Gateway. A /28 subnet will cause deployment failures. Reserving /26 or larger gives room for future expansion (dual gateways, UDRs, etc.).
- **Active-active VPN requires BGP**: Active-active VPN Gateway mode requires BGP to be enabled and requires BGP peering on the on-premises device. Without BGP, only active-standby mode is available.
- **Don't add UDRs to GatewaySubnet**: Adding user-defined routes (UDRs) to the GatewaySubnet can break VPN or ExpressRoute connectivity. The Gateway uses system routes to forward traffic. Only add UDRs if explicitly required and with full understanding of the routing implications.
- **ExpressRoute and VPN coexistence**: You can have both an ExpressRoute gateway and a VPN gateway in the same VNet. They share the GatewaySubnet. Use VPN as a failover for ExpressRoute, but configure routing weights appropriately (ExpressRoute preferred).
- **BGP ASN conflicts**: Azure VPN Gateway uses ASN 65515 by default. On-premises devices must use a different ASN. Also, ASNs 65515 and 65520 are reserved for Azure. Use the range 64512–65534 (private ASNs).
- **ExpressRoute FastPath**: FastPath bypasses the ExpressRoute Gateway for data-plane traffic, reducing latency. It requires the UltraPerformance or ErGw3AZ SKU and is supported only for specific backend VM sizes. Enable it for latency-sensitive workloads.
- **P2S split tunneling**: By default, P2S sends all traffic through the VPN (full tunnel). Configure split tunneling to only route Azure-bound traffic via VPN and keep internet traffic local. This is critical for performance with large remote worker populations.
