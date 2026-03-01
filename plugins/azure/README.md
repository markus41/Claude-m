# Microsoft Azure MCP Plugin

Connect Claude to Microsoft Azure via the Model Context Protocol (MCP).

## Features

- **List Subscriptions**: View all Azure subscriptions
- **List Resource Groups**: Browse resource groups in a subscription
- **List Resources**: View resources in a resource group
- **Get Resource Details**: Retrieve detailed information about specific Azure resources

## Installation

### From Claude Code Marketplace

```bash
/plugin marketplace add markus41/Claude-m
/plugin install "Microsoft Azure MCP"
```

### Manual Configuration

Add to your `.claude/settings.json`:

```json
{
  "mcpServers": {
    "microsoft-azure": {
      "command": "node",
      "args": ["/path/to/Claude-m/dist/index.js"],
      "env": {
        "MICROSOFT_CLIENT_ID": "your-client-id",
        "MICROSOFT_CLIENT_SECRET": "your-client-secret",
        "MICROSOFT_TENANT_ID": "your-tenant-id",
        "MICROSOFT_ACCESS_TOKEN": "your-access-token"
      }
    }
  }
}
```

## Required Azure Permissions

- `https://management.azure.com/user_impersonation` - Access to Azure Resource Manager

## Available Tools

### `azure_list_subscriptions`
Lists all Azure subscriptions accessible to the signed-in user.

### `azure_list_resource_groups`
Lists all resource groups in an Azure subscription.

**Arguments:**
- `subscriptionId` (string): Azure subscription ID

### `azure_list_resources`
Lists all resources in an Azure resource group.

**Arguments:**
- `subscriptionId` (string): Azure subscription ID
- `resourceGroup` (string): Resource group name

### `azure_get_resource`
Gets details of a specific Azure resource.

**Arguments:**
- `subscriptionId` (string): Azure subscription ID
- `resourceGroup` (string): Resource group name
- `provider` (string): Resource provider namespace, e.g. Microsoft.Compute
- `resourceType` (string): Resource type, e.g. virtualMachines
- `resourceName` (string): Resource name
- `apiVersion` (string, optional): API version override

## Example Usage

```
List subscriptions:
> Use azure_list_subscriptions to see all my Azure subscriptions

View resources:
> Use azure_list_resource_groups to see resource groups in subscription xyz
```

## License

ISC
