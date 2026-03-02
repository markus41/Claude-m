# Azure Networking Plugin

Azure networking expertise — design and deploy Virtual Networks with subnets and peering, configure Network Security Groups, deploy Standard Load Balancers and Application Gateways, manage Azure Front Door for global traffic distribution, administer public and private DNS zones, set up VPN and ExpressRoute gateways, create Private Endpoints with DNS integration, and operate Azure Firewall for centralized network security.

## What This Plugin Provides

This is a **knowledge plugin** — it gives Claude deep expertise in Azure networking so it can design network topologies, create VNets and subnets, configure NSGs, deploy load balancers, manage DNS zones, set up private connectivity, and troubleshoot network issues. It does not contain runtime code, MCP servers, or executable scripts.

## Setup

Run `/setup` to install Azure CLI and verify networking resource providers:

```
/setup              # Full guided setup
/setup --minimal    # CLI + providers only
```

Requires an Azure subscription with at least Network Contributor role.

## Commands

| Command | Description |
|---------|-------------|
| `/setup` | Install Azure CLI, verify networking providers, check subscription quotas |
| `/vnet-create` | Create a VNet with subnets, peering, and service endpoints |
| `/nsg-configure` | Create and assign NSG rules, configure ASGs, enable flow logs |
| `/lb-create` | Create a Load Balancer (public or internal) with backend pool and health probes |
| `/dns-manage` | Manage public and private DNS zones and records |
| `/private-endpoint-create` | Create a Private Endpoint for Azure services with DNS integration |

## Agent

| Agent | Description |
|-------|-------------|
| **Networking Reviewer** | Reviews Azure networking configurations for security, architecture, high availability, private connectivity, and cost optimization |

## Trigger Keywords

The skill activates automatically when conversations mention: `azure networking`, `virtual network`, `vnet`, `nsg`, `network security group`, `load balancer`, `azure dns`, `front door`, `vpn gateway`, `private endpoint`, `private link`, `application gateway`, `azure firewall`, `subnet`, `peering`, `service endpoint`.

## Author

Markus Ahling
