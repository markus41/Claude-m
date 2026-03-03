# Azure VNet, Subnets, and Network Security Groups — Deep Reference

## Overview

Azure Virtual Networks (VNets) provide isolated, private IP address space for Azure workloads. Subnets segment the VNet address space and can be associated with Network Security Groups (NSGs) for traffic filtering and with route tables for custom routing. This reference covers VNet provisioning, subnet design, NSG rule management, and VNet peering.

## REST API Endpoints

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|---|---|---|---|---|
| PUT | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Network/virtualNetworks/{name}` | Network Contributor | Address space, subnets, DNS settings | Create or replace VNet |
| GET | Same path | Network Reader | — | Get VNet details |
| DELETE | Same path | Network Contributor | — | Fails if subnets have resources |
| PUT | `/virtualNetworks/{vnet}/subnets/{subnetName}` | Network Contributor | `addressPrefix`, `serviceEndpoints`, `delegations` | Create or update subnet |
| DELETE | `/virtualNetworks/{vnet}/subnets/{subnetName}` | Network Contributor | — | Fails if resources are deployed |
| PUT | `/resourceGroups/{rg}/providers/Microsoft.Network/networkSecurityGroups/{nsg}` | Network Contributor | Security rules array | Create NSG |
| PUT | `/networkSecurityGroups/{nsg}/securityRules/{rule}` | Network Contributor | Priority, direction, ports, action | Add/update a rule |
| DELETE | `/networkSecurityGroups/{nsg}/securityRules/{rule}` | Network Contributor | — | Remove rule |
| PUT | `/virtualNetworks/{vnet}/virtualNetworkPeerings/{peeringName}` | Network Contributor (both VNets) | `remoteVirtualNetwork.id`, traffic settings | Create peering link |
| PUT | `/virtualNetworks/{vnet}/subnets/{subnet}` with `routeTable` | Network Contributor | Route table resource ID | Associate route table |

Base: `https://management.azure.com`

## Azure CLI Patterns — VNet and Subnets

```bash
# Create VNet with multiple subnets
az network vnet create \
  --name vnet-prod-eastus \
  --resource-group rg-networking \
  --location eastus \
  --address-prefix 10.10.0.0/16 \
  --dns-servers 10.10.0.4 10.10.0.5

# Add subnets
az network vnet subnet create \
  --vnet-name vnet-prod-eastus \
  --resource-group rg-networking \
  --name subnet-web \
  --address-prefix 10.10.1.0/24 \
  --network-security-group nsg-web

az network vnet subnet create \
  --vnet-name vnet-prod-eastus \
  --resource-group rg-networking \
  --name subnet-app \
  --address-prefix 10.10.2.0/24 \
  --network-security-group nsg-app

az network vnet subnet create \
  --vnet-name vnet-prod-eastus \
  --resource-group rg-networking \
  --name subnet-data \
  --address-prefix 10.10.3.0/24 \
  --network-security-group nsg-data \
  --service-endpoints Microsoft.Sql Microsoft.Storage

az network vnet subnet create \
  --vnet-name vnet-prod-eastus \
  --resource-group rg-networking \
  --name AzureBastionSubnet \
  --address-prefix 10.10.255.0/27

# Reserved subnet names
# - AzureFirewallSubnet (min /26)
# - AzureFirewallManagementSubnet (min /26)
# - AzureBastionSubnet (min /27)
# - GatewaySubnet (min /27)
# - RouteServerSubnet (min /27)
```

## Azure CLI Patterns — NSG Rules

```bash
# Create NSG
az network nsg create \
  --name nsg-web \
  --resource-group rg-networking \
  --location eastus

# Allow HTTPS inbound from internet
az network nsg rule create \
  --nsg-name nsg-web \
  --resource-group rg-networking \
  --name Allow-HTTPS-Inbound \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes Internet \
  --source-port-ranges "*" \
  --destination-address-prefixes VirtualNetwork \
  --destination-port-ranges 443

# Allow HTTP inbound (for redirect)
az network nsg rule create \
  --nsg-name nsg-web \
  --resource-group rg-networking \
  --name Allow-HTTP-Inbound \
  --priority 110 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes Internet \
  --destination-port-ranges 80

# Allow Azure Load Balancer health probes
az network nsg rule create \
  --nsg-name nsg-web \
  --resource-group rg-networking \
  --name Allow-LB-Health \
  --priority 120 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes AzureLoadBalancer \
  --destination-port-ranges 80 443

# Deny all other inbound
az network nsg rule create \
  --nsg-name nsg-web \
  --resource-group rg-networking \
  --name Deny-All-Inbound \
  --priority 4096 \
  --direction Inbound \
  --access Deny \
  --protocol "*" \
  --source-address-prefixes "*" \
  --destination-port-ranges "*"

# Allow outbound to app tier
az network nsg rule create \
  --nsg-name nsg-web \
  --resource-group rg-networking \
  --name Allow-Outbound-App \
  --priority 100 \
  --direction Outbound \
  --access Allow \
  --protocol Tcp \
  --destination-address-prefixes 10.10.2.0/24 \
  --destination-port-ranges 8080

# Associate NSG to subnet
az network vnet subnet update \
  --vnet-name vnet-prod-eastus \
  --resource-group rg-networking \
  --name subnet-web \
  --network-security-group nsg-web

# View effective security rules on a NIC
az network nic show-effective-nsg \
  --name nic-vm-web-01 \
  --resource-group rg-prod \
  --output table
```

## Application Security Groups (ASG)

ASGs allow grouping of VMs by role and referencing the group in NSG rules instead of IP addresses:

```bash
# Create ASGs
az network asg create \
  --name asg-web-servers \
  --resource-group rg-networking \
  --location eastus

az network asg create \
  --name asg-app-servers \
  --resource-group rg-networking \
  --location eastus

# Associate NIC with ASG
az network nic ip-config update \
  --resource-group rg-prod \
  --nic-name nic-vm-web-01 \
  --name ipconfig1 \
  --application-security-groups asg-web-servers

# NSG rule referencing ASG (instead of IP prefixes)
az network nsg rule create \
  --nsg-name nsg-app \
  --resource-group rg-networking \
  --name Allow-Web-to-App \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-asgs asg-web-servers \
  --destination-asgs asg-app-servers \
  --destination-port-ranges 8080
```

## VNet Peering

```bash
# Get VNet resource IDs
VNET_A_ID=$(az network vnet show --name vnet-prod-eastus --resource-group rg-networking-prod --query id -o tsv)
VNET_B_ID=$(az network vnet show --name vnet-shared-eastus --resource-group rg-networking-shared --query id -o tsv)

# Create peering from A to B
az network vnet peering create \
  --name peer-prod-to-shared \
  --resource-group rg-networking-prod \
  --vnet-name vnet-prod-eastus \
  --remote-vnet "$VNET_B_ID" \
  --allow-vnet-access \
  --allow-forwarded-traffic \
  --allow-gateway-transit false \
  --use-remote-gateways false

# Create peering from B to A (must be bidirectional)
az network vnet peering create \
  --name peer-shared-to-prod \
  --resource-group rg-networking-shared \
  --vnet-name vnet-shared-eastus \
  --remote-vnet "$VNET_A_ID" \
  --allow-vnet-access \
  --allow-forwarded-traffic \
  --allow-gateway-transit true   # B has gateway; allow A to use it
```

## Route Tables (User Defined Routes)

```bash
# Create route table
az network route-table create \
  --name rt-prod-app \
  --resource-group rg-networking \
  --location eastus \
  --disable-bgp-route-propagation true

# Force all internet traffic through Azure Firewall
az network route-table route create \
  --route-table-name rt-prod-app \
  --resource-group rg-networking \
  --name route-to-firewall \
  --address-prefix 0.0.0.0/0 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address 10.10.100.4  # Azure Firewall private IP

# Route traffic to hub VNet through firewall
az network route-table route create \
  --route-table-name rt-prod-app \
  --resource-group rg-networking \
  --name route-to-hub \
  --address-prefix 10.0.0.0/8 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address 10.10.100.4

# Associate route table with subnet
az network vnet subnet update \
  --vnet-name vnet-prod-eastus \
  --resource-group rg-networking \
  --name subnet-app \
  --route-table rt-prod-app
```

## NSG Flow Logs

```bash
STORAGE_ID=$(az storage account show \
  --name mystorageaccount \
  --resource-group rg-networking \
  --query id -o tsv)

NSG_ID=$(az network nsg show \
  --name nsg-web \
  --resource-group rg-networking \
  --query id -o tsv)

# Enable NSG flow logs v2 (includes traffic analytics)
az network watcher flow-log create \
  --location eastus \
  --name flowlog-nsg-web \
  --nsg "$NSG_ID" \
  --storage-account "$STORAGE_ID" \
  --enabled true \
  --format JSON \
  --log-version 2 \
  --interval 10 \
  --traffic-analytics true \
  --workspace "$LAWS_ID" \
  --workspace-region eastus
```

## Error Codes

| Code | Meaning | Remediation |
|---|---|---|
| InUseSubnetCannotBeDeleted (400) | Subnet has resources deployed | Delete all resources in subnet before deleting |
| SubnetAlreadyInUseByAnotherResource (400) | Subnet delegated to different service | Remove delegation or use a different subnet |
| NSGRulePriorityConflict (400) | Rule with same priority exists | Choose a unique priority value |
| PeeringStateNotConnected (400) | Remote peering link not created | Create the peering from both sides |
| AddressSpaceOverlap (400) | VNet or subnet CIDR overlaps with existing | Use non-overlapping address spaces |
| VNetLocalValidationFailure (400) | Cannot create resource in subnet (service policy) | Check subnet delegations and service endpoints |
| OverlappingAddressSpaces (400) | Peered VNets have overlapping address space | Address spaces must not overlap for peering |

## Throttling Limits

| Resource | Limit | Notes |
|---|---|---|
| VNets per subscription | 1,000 | Soft limit; request increase via support |
| Subnets per VNet | 3,000 | Practical limit for manageability |
| NSGs per subscription | 5,000 | Associate one NSG per NIC/subnet |
| NSG rules per NSG | 1,000 (inbound + outbound combined) | Use ASGs to consolidate rules |
| VNet peerings per VNet | 500 | Consider Virtual WAN for hub-spoke at scale |
| Route tables per subscription | 200 | Share route tables across subnets of the same tier |
| Routes per route table | 400 | Consolidate CIDRs where possible |

## Production Gotchas

- **Subnet address space immutability**: You cannot resize a subnet while resources are deployed in it. Plan address spaces generously — use /24 subnets for most tiers and /27 or smaller for dedicated service subnets (Bastion, Gateway).
- **NSG is stateful**: NSG rules are stateful. If you allow inbound TCP on port 443, the return traffic is automatically allowed — you do not need an explicit outbound rule for established connections.
- **NSG on subnet vs NIC**: NSG rules on the subnet apply to all NICs in the subnet. NSG rules on a NIC apply to that NIC only. If both are present, traffic must pass both NSG evaluations (subnet NSG → NIC NSG for inbound; NIC NSG → subnet NSG for outbound).
- **AzureLoadBalancer service tag**: The Standard Load Balancer health probe source IP is `168.63.129.16` which matches the `AzureLoadBalancer` service tag. Always allow this in NSG rules or your health probes will fail and your backend pool will drain.
- **VNet peering is not transitive**: If VNet A peers with VNet B and VNet B peers with VNet C, traffic from A to C is NOT routed through B. Use Virtual WAN or Azure Firewall in a hub-and-spoke topology for transitive routing.
- **Subnet delegation**: Some Azure services (Container Apps, App Service Integration, Bastion, etc.) require exclusive subnet delegation. A delegated subnet can only be used by the delegated service — you cannot deploy other resources to it.
- **DenyAllInbound is implicit**: Azure NSGs have an implicit deny-all rule at priority 65500. You do not need to add a deny-all rule unless you want to log the denied traffic (the implicit rule does not generate flow logs).
- **BGP route propagation**: When a subnet has a route table with `disableBgpRoutePropagation = true`, VPN Gateway routes are not propagated to the subnet. Use this carefully — it blocks on-premises connectivity for that subnet.
