#!/usr/bin/env node
/**
 * Claude-m: MCP server for the Microsoft plugin marketplace.
 *
 * This server exposes:
 *  1. Marketplace tools – browse and inspect available plugins
 *  2. Microsoft product tools – interact with Teams, Excel, Outlook,
 *     Azure, and SharePoint via their respective plugins
 *
 * Authentication is supplied via environment variables:
 *   MICROSOFT_CLIENT_ID      – Azure AD app client ID
 *   MICROSOFT_CLIENT_SECRET  – Azure AD app client secret
 *   MICROSOFT_TENANT_ID      – Azure AD tenant ID
 *   MICROSOFT_ACCESS_TOKEN   – Pre-issued access token (optional)
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadRegistry } from "./registry.js";
import { TeamsPlugin } from "./plugins/teams.js";
import { ExcelPlugin } from "./plugins/excel.js";
import { OutlookPlugin } from "./plugins/outlook.js";
import { AzurePlugin } from "./plugins/azure.js";
import { SharePointPlugin } from "./plugins/sharepoint.js";
// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
function buildAuth() {
    return {
        clientId: process.env.MICROSOFT_CLIENT_ID ?? "",
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
        tenantId: process.env.MICROSOFT_TENANT_ID ?? "",
        accessToken: process.env.MICROSOFT_ACCESS_TOKEN,
    };
}
// ---------------------------------------------------------------------------
// Plugin registry
// ---------------------------------------------------------------------------
function buildPluginMap(auth) {
    return new Map([
        ["teams", new TeamsPlugin(auth)],
        ["excel", new ExcelPlugin(auth)],
        ["outlook", new OutlookPlugin(auth)],
        ["azure", new AzurePlugin(auth)],
        ["sharepoint", new SharePointPlugin(auth)],
    ]);
}
// ---------------------------------------------------------------------------
// Server bootstrap using McpServer high-level API
// ---------------------------------------------------------------------------
export async function createServer() {
    const auth = buildAuth();
    const plugins = buildPluginMap(auth);
    const mcp = new McpServer({ name: "claude-m", version: "1.0.0" }, {
        capabilities: { tools: {} },
        instructions: "Claude-m provides access to Microsoft products through a plugin marketplace. Use marketplace_list_plugins to see available plugins, then use the specific product tools to interact with Teams, Excel, Outlook, Azure, and SharePoint."
    });
    // ---------------------------------------------------------------------------
    // Marketplace Tools
    // ---------------------------------------------------------------------------
    mcp.registerTool("marketplace_list_plugins", {
        description: "List all available Microsoft plugins in the marketplace with their descriptions, versions, and required scopes.",
        inputSchema: z.object({}),
    }, async () => {
        const plugins = loadRegistry();
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(plugins, null, 2),
                },
            ],
        };
    });
    mcp.registerTool("marketplace_get_plugin", {
        description: "Get detailed information about a specific plugin by its ID, including all available tools and required Microsoft Graph API scopes.",
        inputSchema: z.object({
            pluginId: z.string().describe("Plugin ID (e.g. teams, excel, outlook, azure, sharepoint)"),
        }),
    }, async (args) => {
        const plugins = loadRegistry();
        const manifest = plugins.find((p) => p.id === args.pluginId);
        if (!manifest) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Plugin '${args.pluginId}' not found. Available plugins: ${plugins.map((p) => p.id).join(", ")}`,
                    },
                ],
                isError: true,
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(manifest, null, 2),
                },
            ],
        };
    });
    mcp.registerTool("marketplace_search_plugins", {
        description: "Search plugins by keyword in their name or description. Useful for discovering which plugin provides specific capabilities.",
        inputSchema: z.object({
            keyword: z.string().describe("Keyword to search for in plugin names and descriptions"),
        }),
    }, async (args) => {
        const plugins = loadRegistry();
        const keyword = args.keyword.toLowerCase();
        const matches = plugins.filter((p) => p.name.toLowerCase().includes(keyword) ||
            p.description.toLowerCase().includes(keyword) ||
            p.id.toLowerCase().includes(keyword) ||
            (p.tools ?? []).some((t) => t.toLowerCase().includes(keyword)) ||
            (p.tags ?? []).some((t) => t.toLowerCase().includes(keyword)) ||
            (p.category ?? "").toLowerCase().includes(keyword));
        if (matches.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: `No plugins found matching '${args.keyword}'. Try searching for: teams, excel, outlook, azure, sharepoint, fabric, security, analytics, devops, cloud, or productivity.`,
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        query: args.keyword,
                        matchCount: matches.length,
                        matches: matches.map((p) => ({
                            id: p.id,
                            name: p.name,
                            description: p.description,
                            category: p.category,
                            toolCount: (p.tools ?? []).length,
                        })),
                    }, null, 2),
                },
            ],
        };
    });
    mcp.registerTool("marketplace_list_tools", {
        description: "List all available tools across all plugins with their descriptions. Use this to discover what actions you can perform.",
        inputSchema: z.object({
            pluginId: z.string().optional().describe("Optional: filter tools by plugin ID"),
        }),
    }, async (args) => {
        let plugins = loadRegistry();
        if (args.pluginId) {
            plugins = plugins.filter((p) => p.id === args.pluginId);
            if (plugins.length === 0) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Plugin '${args.pluginId}' not found.`,
                        },
                    ],
                    isError: true,
                };
            }
        }
        const toolsList = plugins.flatMap((p) => (p.tools ?? []).map((toolName) => ({
            tool: toolName,
            plugin: p.id,
            pluginName: p.name,
        })));
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        totalTools: toolsList.length,
                        tools: toolsList,
                    }, null, 2),
                },
            ],
        };
    });
    // ---------------------------------------------------------------------------
    // Teams Tools
    // ---------------------------------------------------------------------------
    const teamsPlugin = plugins.get("teams");
    if (teamsPlugin) {
        mcp.registerTool("teams_list_teams", {
            description: "List all Microsoft Teams that the signed-in user has joined.",
            inputSchema: z.object({}),
        }, async () => {
            const result = await teamsPlugin.callTool("teams_list_teams", {});
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result.data ?? result.error, null, 2),
                    },
                ],
                isError: !result.success,
            };
        });
        mcp.registerTool("teams_list_channels", {
            description: "List all channels within a specific Microsoft Team.",
            inputSchema: z.object({
                teamId: z.string().describe("The ID of the team"),
            }),
        }, async (args) => {
            const result = await teamsPlugin.callTool("teams_list_channels", args);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result.data ?? result.error, null, 2),
                    },
                ],
                isError: !result.success,
            };
        });
        mcp.registerTool("teams_send_message", {
            description: "Send a message to a Microsoft Teams channel.",
            inputSchema: z.object({
                teamId: z.string().describe("Team ID"),
                channelId: z.string().describe("Channel ID"),
                message: z.string().describe("Message content (HTML or plain text)"),
            }),
        }, async (args) => {
            const result = await teamsPlugin.callTool("teams_send_message", args);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result.data ?? result.error, null, 2),
                    },
                ],
                isError: !result.success,
            };
        });
        mcp.registerTool("teams_create_meeting", {
            description: "Create a new online meeting in Microsoft Teams.",
            inputSchema: z.object({
                subject: z.string().describe("Meeting subject"),
                startDateTime: z.string().describe("ISO-8601 start date-time"),
                endDateTime: z.string().describe("ISO-8601 end date-time"),
                attendees: z.array(z.string().email()).optional().describe("Attendee email addresses"),
            }),
        }, async (args) => {
            const result = await teamsPlugin.callTool("teams_create_meeting", args);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result.data ?? result.error, null, 2),
                    },
                ],
                isError: !result.success,
            };
        });
    }
    // ---------------------------------------------------------------------------
    // Excel Tools
    // ---------------------------------------------------------------------------
    const excelPlugin = plugins.get("excel");
    if (excelPlugin) {
        mcp.registerTool("excel_list_worksheets", {
            description: "List all worksheets in an Excel workbook stored in OneDrive.",
            inputSchema: z.object({
                driveItemId: z.string().describe("OneDrive drive-item ID of the workbook"),
            }),
        }, async (args) => {
            const result = await excelPlugin.callTool("excel_list_worksheets", args);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result.data ?? result.error, null, 2),
                    },
                ],
                isError: !result.success,
            };
        });
        mcp.registerTool("excel_read_range", {
            description: "Read a cell range from an Excel workbook.",
            inputSchema: z.object({
                driveItemId: z.string().describe("OneDrive drive-item ID"),
                worksheet: z.string().describe("Worksheet name"),
                range: z.string().describe("A1 notation range, e.g. A1:D10"),
            }),
        }, async (args) => {
            const result = await excelPlugin.callTool("excel_read_range", args);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result.data ?? result.error, null, 2),
                    },
                ],
                isError: !result.success,
            };
        });
        mcp.registerTool("excel_write_range", {
            description: "Write values to a cell range in an Excel workbook.",
            inputSchema: z.object({
                driveItemId: z.string().describe("OneDrive drive-item ID"),
                worksheet: z.string().describe("Worksheet name"),
                range: z.string().describe("A1 notation range"),
                values: z.array(z.array(z.any())).describe("2-D array of values to write"),
            }),
        }, async (args) => {
            const result = await excelPlugin.callTool("excel_write_range", args);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result.data ?? result.error, null, 2),
                    },
                ],
                isError: !result.success,
            };
        });
        mcp.registerTool("excel_create_table", {
            description: "Create a named table in an Excel workbook.",
            inputSchema: z.object({
                driveItemId: z.string().describe("OneDrive drive-item ID"),
                worksheet: z.string().describe("Worksheet name"),
                range: z.string().describe("A1 notation range"),
                hasHeaders: z.boolean().optional().describe("Whether the first row contains headers"),
            }),
        }, async (args) => {
            const result = await excelPlugin.callTool("excel_create_table", args);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result.data ?? result.error, null, 2),
                    },
                ],
                isError: !result.success,
            };
        });
    }
    // ---------------------------------------------------------------------------
    // Outlook Tools
    // ---------------------------------------------------------------------------
    const outlookPlugin = plugins.get("outlook");
    if (outlookPlugin) {
        mcp.registerTool("outlook_send_email", {
            description: "Send an email via the signed-in user's Outlook mailbox.",
            inputSchema: z.object({
                to: z.array(z.string().email()).describe("Recipient email addresses"),
                subject: z.string().describe("Email subject"),
                body: z.string().describe("Email body (HTML or plain text)"),
                cc: z.array(z.string().email()).optional().describe("CC email addresses"),
                isHtml: z.boolean().optional().describe("Whether the body is HTML"),
            }),
        }, async (args) => {
            const result = await outlookPlugin.callTool("outlook_send_email", args);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result.data ?? result.error, null, 2),
                    },
                ],
                isError: !result.success,
            };
        });
        mcp.registerTool("outlook_list_emails", {
            description: "List recent emails from the signed-in user's inbox.",
            inputSchema: z.object({
                top: z.number().int().optional().describe("Max number of emails (default 10)"),
                filter: z.string().optional().describe("OData $filter expression"),
            }),
        }, async (args) => {
            const result = await outlookPlugin.callTool("outlook_list_emails", args);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result.data ?? result.error, null, 2),
                    },
                ],
                isError: !result.success,
            };
        });
        mcp.registerTool("outlook_create_event", {
            description: "Create a new calendar event in the signed-in user's Outlook calendar.",
            inputSchema: z.object({
                subject: z.string().describe("Event subject"),
                startDateTime: z.string().describe("ISO-8601 start date-time"),
                endDateTime: z.string().describe("ISO-8601 end date-time"),
                attendees: z.array(z.string().email()).optional().describe("Attendee email addresses"),
                location: z.string().optional().describe("Event location"),
                body: z.string().optional().describe("Event description (HTML)"),
            }),
        }, async (args) => {
            const result = await outlookPlugin.callTool("outlook_create_event", args);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result.data ?? result.error, null, 2),
                    },
                ],
                isError: !result.success,
            };
        });
        mcp.registerTool("outlook_list_events", {
            description: "List upcoming calendar events from the signed-in user's Outlook calendar.",
            inputSchema: z.object({
                top: z.number().int().optional().describe("Max number of events (default 10)"),
            }),
        }, async (args) => {
            const result = await outlookPlugin.callTool("outlook_list_events", args);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result.data ?? result.error, null, 2),
                    },
                ],
                isError: !result.success,
            };
        });
    }
    // ---------------------------------------------------------------------------
    // Azure Tools
    // ---------------------------------------------------------------------------
    const azurePlugin = plugins.get("azure");
    if (azurePlugin) {
        mcp.registerTool("azure_list_subscriptions", {
            description: "List all Azure subscriptions accessible to the signed-in user.",
            inputSchema: z.object({}),
        }, async () => {
            const result = await azurePlugin.callTool("azure_list_subscriptions", {});
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result.data ?? result.error, null, 2),
                    },
                ],
                isError: !result.success,
            };
        });
        mcp.registerTool("azure_list_resource_groups", {
            description: "List all resource groups in an Azure subscription.",
            inputSchema: z.object({
                subscriptionId: z.string().describe("Azure subscription ID"),
            }),
        }, async (args) => {
            const result = await azurePlugin.callTool("azure_list_resource_groups", args);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result.data ?? result.error, null, 2),
                    },
                ],
                isError: !result.success,
            };
        });
        mcp.registerTool("azure_list_resources", {
            description: "List all resources in an Azure resource group.",
            inputSchema: z.object({
                subscriptionId: z.string().describe("Azure subscription ID"),
                resourceGroup: z.string().describe("Resource group name"),
            }),
        }, async (args) => {
            const result = await azurePlugin.callTool("azure_list_resources", args);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result.data ?? result.error, null, 2),
                    },
                ],
                isError: !result.success,
            };
        });
        mcp.registerTool("azure_get_resource", {
            description: "Get details of a specific Azure resource.",
            inputSchema: z.object({
                subscriptionId: z.string().describe("Azure subscription ID"),
                resourceGroup: z.string().describe("Resource group name"),
                provider: z.string().describe("Resource provider namespace, e.g. Microsoft.Compute"),
                resourceType: z.string().describe("Resource type, e.g. virtualMachines"),
                resourceName: z.string().describe("Resource name"),
                apiVersion: z.string().optional().describe("API version override"),
            }),
        }, async (args) => {
            const result = await azurePlugin.callTool("azure_get_resource", args);
            return {
                content: [{ type: "text", text: JSON.stringify(result.data ?? result.error, null, 2) }],
                isError: !result.success,
            };
        });
        // Resource Groups — write
        mcp.registerTool("azure_create_resource_group", {
            description: "Create or update an Azure resource group.",
            inputSchema: z.object({
                subscriptionId: z.string().describe("Azure subscription ID"),
                name: z.string().describe("Resource group name"),
                location: z.string().describe("Azure region, e.g. eastus"),
                tags: z.record(z.string()).optional().describe("Optional key-value tags"),
            }),
        }, async (args) => {
            const result = await azurePlugin.callTool("azure_create_resource_group", args);
            return { content: [{ type: "text", text: JSON.stringify(result.data ?? result.error, null, 2) }], isError: !result.success };
        });
        mcp.registerTool("azure_delete_resource_group", {
            description: "Delete an Azure resource group and all its resources. This is irreversible.",
            inputSchema: z.object({
                subscriptionId: z.string().describe("Azure subscription ID"),
                resourceGroup: z.string().describe("Resource group name to delete"),
            }),
        }, async (args) => {
            const result = await azurePlugin.callTool("azure_delete_resource_group", args);
            return { content: [{ type: "text", text: JSON.stringify(result.data ?? result.error, null, 2) }], isError: !result.success };
        });
        // Resources — extended
        mcp.registerTool("azure_list_resources_by_subscription", {
            description: "List all resources across an entire Azure subscription, with optional OData filter.",
            inputSchema: z.object({
                subscriptionId: z.string().describe("Azure subscription ID"),
                filter: z.string().optional().describe("OData $filter expression"),
                top: z.number().int().optional().describe("Max number of results"),
            }),
        }, async (args) => {
            const result = await azurePlugin.callTool("azure_list_resources_by_subscription", args);
            return { content: [{ type: "text", text: JSON.stringify(result.data ?? result.error, null, 2) }], isError: !result.success };
        });
        mcp.registerTool("azure_create_or_update_resource", {
            description: "Create or update any Azure resource using a PUT operation.",
            inputSchema: z.object({
                subscriptionId: z.string().describe("Azure subscription ID"),
                resourceGroup: z.string().describe("Resource group name"),
                provider: z.string().describe("Resource provider namespace, e.g. Microsoft.Storage"),
                resourceType: z.string().describe("Resource type, e.g. storageAccounts"),
                resourceName: z.string().describe("Resource name"),
                apiVersion: z.string().describe("API version for this resource type"),
                body: z.record(z.unknown()).describe("Resource definition object"),
            }),
        }, async (args) => {
            const result = await azurePlugin.callTool("azure_create_or_update_resource", args);
            return { content: [{ type: "text", text: JSON.stringify(result.data ?? result.error, null, 2) }], isError: !result.success };
        });
        mcp.registerTool("azure_delete_resource", {
            description: "Delete a specific Azure resource by provider, type, and name.",
            inputSchema: z.object({
                subscriptionId: z.string().describe("Azure subscription ID"),
                resourceGroup: z.string().describe("Resource group name"),
                provider: z.string().describe("Resource provider namespace"),
                resourceType: z.string().describe("Resource type"),
                resourceName: z.string().describe("Resource name"),
                apiVersion: z.string().optional().describe("API version override"),
            }),
        }, async (args) => {
            const result = await azurePlugin.callTool("azure_delete_resource", args);
            return { content: [{ type: "text", text: JSON.stringify(result.data ?? result.error, null, 2) }], isError: !result.success };
        });
        mcp.registerTool("azure_move_resources", {
            description: "Move one or more Azure resources to a different resource group.",
            inputSchema: z.object({
                subscriptionId: z.string().describe("Azure subscription ID"),
                sourceResourceGroup: z.string().describe("Source resource group name"),
                targetResourceGroupId: z.string().describe("Target resource group full resource ID"),
                resourceIds: z.array(z.string()).describe("Array of full resource IDs to move"),
            }),
        }, async (args) => {
            const result = await azurePlugin.callTool("azure_move_resources", args);
            return { content: [{ type: "text", text: JSON.stringify(result.data ?? result.error, null, 2) }], isError: !result.success };
        });
        // RBAC
        mcp.registerTool("azure_list_role_assignments", {
            description: "List role assignments at subscription or resource scope.",
            inputSchema: z.object({
                subscriptionId: z.string().describe("Azure subscription ID"),
                scope: z.string().optional().describe("Optional scope path. Defaults to subscription scope."),
            }),
        }, async (args) => {
            const result = await azurePlugin.callTool("azure_list_role_assignments", args);
            return { content: [{ type: "text", text: JSON.stringify(result.data ?? result.error, null, 2) }], isError: !result.success };
        });
        mcp.registerTool("azure_create_role_assignment", {
            description: "Assign an Azure RBAC role to a principal at a given scope.",
            inputSchema: z.object({
                subscriptionId: z.string().describe("Azure subscription ID"),
                scope: z.string().describe("Full scope path for the assignment"),
                principalId: z.string().describe("Object ID of the principal"),
                roleDefinitionId: z.string().describe("Full resource ID of the role definition"),
                roleAssignmentId: z.string().optional().describe("Optional GUID for the assignment"),
            }),
        }, async (args) => {
            const result = await azurePlugin.callTool("azure_create_role_assignment", args);
            return { content: [{ type: "text", text: JSON.stringify(result.data ?? result.error, null, 2) }], isError: !result.success };
        });
        mcp.registerTool("azure_delete_role_assignment", {
            description: "Delete an Azure RBAC role assignment.",
            inputSchema: z.object({
                subscriptionId: z.string().describe("Azure subscription ID"),
                scope: z.string().describe("Full scope path where the assignment exists"),
                roleAssignmentId: z.string().describe("Role assignment GUID or resource ID"),
            }),
        }, async (args) => {
            const result = await azurePlugin.callTool("azure_delete_role_assignment", args);
            return { content: [{ type: "text", text: JSON.stringify(result.data ?? result.error, null, 2) }], isError: !result.success };
        });
        mcp.registerTool("azure_list_role_definitions", {
            description: "List built-in and custom RBAC role definitions at a scope.",
            inputSchema: z.object({
                subscriptionId: z.string().describe("Azure subscription ID"),
                scope: z.string().optional().describe("Optional scope path. Defaults to subscription scope."),
            }),
        }, async (args) => {
            const result = await azurePlugin.callTool("azure_list_role_definitions", args);
            return { content: [{ type: "text", text: JSON.stringify(result.data ?? result.error, null, 2) }], isError: !result.success };
        });
        // Tags
        mcp.registerTool("azure_list_tag_names", {
            description: "List all tag names and their values in use across an Azure subscription.",
            inputSchema: z.object({
                subscriptionId: z.string().describe("Azure subscription ID"),
            }),
        }, async (args) => {
            const result = await azurePlugin.callTool("azure_list_tag_names", args);
            return { content: [{ type: "text", text: JSON.stringify(result.data ?? result.error, null, 2) }], isError: !result.success };
        });
        mcp.registerTool("azure_update_resource_tags", {
            description: "Merge or replace tags on an Azure resource.",
            inputSchema: z.object({
                subscriptionId: z.string().describe("Azure subscription ID"),
                resourceGroup: z.string().describe("Resource group name"),
                provider: z.string().describe("Resource provider namespace"),
                resourceType: z.string().describe("Resource type"),
                resourceName: z.string().describe("Resource name"),
                apiVersion: z.string().optional().describe("API version override"),
                tags: z.record(z.string()).describe("Tags to apply"),
                operation: z.enum(["merge", "replace"]).describe("merge: add/update; replace: overwrite all tags"),
            }),
        }, async (args) => {
            const result = await azurePlugin.callTool("azure_update_resource_tags", args);
            return { content: [{ type: "text", text: JSON.stringify(result.data ?? result.error, null, 2) }], isError: !result.success };
        });
        mcp.registerTool("azure_list_resources_by_tag", {
            description: "List Azure resources filtered by a specific tag name and optional value.",
            inputSchema: z.object({
                subscriptionId: z.string().describe("Azure subscription ID"),
                tagName: z.string().describe("Tag key to filter by"),
                tagValue: z.string().optional().describe("Optional tag value to match"),
            }),
        }, async (args) => {
            const result = await azurePlugin.callTool("azure_list_resources_by_tag", args);
            return { content: [{ type: "text", text: JSON.stringify(result.data ?? result.error, null, 2) }], isError: !result.success };
        });
        // Locks
        mcp.registerTool("azure_list_locks", {
            description: "List management locks at subscription or resource group scope.",
            inputSchema: z.object({
                subscriptionId: z.string().describe("Azure subscription ID"),
                resourceGroup: z.string().optional().describe("Resource group name (omit for subscription-level)"),
            }),
        }, async (args) => {
            const result = await azurePlugin.callTool("azure_list_locks", args);
            return { content: [{ type: "text", text: JSON.stringify(result.data ?? result.error, null, 2) }], isError: !result.success };
        });
        mcp.registerTool("azure_create_lock", {
            description: "Create a CanNotDelete or ReadOnly management lock on a subscription or resource group.",
            inputSchema: z.object({
                subscriptionId: z.string().describe("Azure subscription ID"),
                resourceGroup: z.string().optional().describe("Resource group name (omit for subscription-level lock)"),
                lockName: z.string().describe("Lock name"),
                level: z.enum(["CanNotDelete", "ReadOnly"]).describe("Lock level"),
                notes: z.string().optional().describe("Optional notes about the lock"),
            }),
        }, async (args) => {
            const result = await azurePlugin.callTool("azure_create_lock", args);
            return { content: [{ type: "text", text: JSON.stringify(result.data ?? result.error, null, 2) }], isError: !result.success };
        });
        mcp.registerTool("azure_delete_lock", {
            description: "Delete a management lock from a subscription or resource group.",
            inputSchema: z.object({
                subscriptionId: z.string().describe("Azure subscription ID"),
                resourceGroup: z.string().optional().describe("Resource group name (omit for subscription-level lock)"),
                lockName: z.string().describe("Lock name to delete"),
            }),
        }, async (args) => {
            const result = await azurePlugin.callTool("azure_delete_lock", args);
            return { content: [{ type: "text", text: JSON.stringify(result.data ?? result.error, null, 2) }], isError: !result.success };
        });
        // Deployments
        mcp.registerTool("azure_validate_deployment", {
            description: "Validate an ARM template deployment without creating resources (preflight check).",
            inputSchema: z.object({
                subscriptionId: z.string().describe("Azure subscription ID"),
                resourceGroup: z.string().describe("Resource group name"),
                deploymentName: z.string().describe("Deployment name"),
                template: z.record(z.unknown()).describe("ARM template object"),
                parameters: z.record(z.unknown()).optional().describe("ARM parameters object"),
            }),
        }, async (args) => {
            const result = await azurePlugin.callTool("azure_validate_deployment", args);
            return { content: [{ type: "text", text: JSON.stringify(result.data ?? result.error, null, 2) }], isError: !result.success };
        });
        mcp.registerTool("azure_create_deployment", {
            description: "Deploy an ARM template to an Azure resource group.",
            inputSchema: z.object({
                subscriptionId: z.string().describe("Azure subscription ID"),
                resourceGroup: z.string().describe("Resource group name"),
                deploymentName: z.string().describe("Deployment name"),
                template: z.record(z.unknown()).describe("ARM template object"),
                parameters: z.record(z.unknown()).optional().describe("ARM parameters object"),
                mode: z.enum(["Incremental", "Complete"]).optional().describe("Deployment mode (default: Incremental)"),
            }),
        }, async (args) => {
            const result = await azurePlugin.callTool("azure_create_deployment", args);
            return { content: [{ type: "text", text: JSON.stringify(result.data ?? result.error, null, 2) }], isError: !result.success };
        });
        mcp.registerTool("azure_get_deployment_status", {
            description: "Get the status and operations of an ARM template deployment.",
            inputSchema: z.object({
                subscriptionId: z.string().describe("Azure subscription ID"),
                resourceGroup: z.string().describe("Resource group name"),
                deploymentName: z.string().describe("Deployment name"),
            }),
        }, async (args) => {
            const result = await azurePlugin.callTool("azure_get_deployment_status", args);
            return { content: [{ type: "text", text: JSON.stringify(result.data ?? result.error, null, 2) }], isError: !result.success };
        });
        mcp.registerTool("azure_list_deployments", {
            description: "List all ARM deployments in a resource group.",
            inputSchema: z.object({
                subscriptionId: z.string().describe("Azure subscription ID"),
                resourceGroup: z.string().describe("Resource group name"),
            }),
        }, async (args) => {
            const result = await azurePlugin.callTool("azure_list_deployments", args);
            return { content: [{ type: "text", text: JSON.stringify(result.data ?? result.error, null, 2) }], isError: !result.success };
        });
        // Virtual Machines
        mcp.registerTool("azure_list_vms", {
            description: "List Azure virtual machines in a resource group.",
            inputSchema: z.object({
                subscriptionId: z.string().describe("Azure subscription ID"),
                resourceGroup: z.string().describe("Resource group name"),
            }),
        }, async (args) => {
            const result = await azurePlugin.callTool("azure_list_vms", args);
            return { content: [{ type: "text", text: JSON.stringify(result.data ?? result.error, null, 2) }], isError: !result.success };
        });
        mcp.registerTool("azure_get_vm_status", {
            description: "Get the power state and instance view of an Azure virtual machine.",
            inputSchema: z.object({
                subscriptionId: z.string().describe("Azure subscription ID"),
                resourceGroup: z.string().describe("Resource group name"),
                vmName: z.string().describe("Virtual machine name"),
            }),
        }, async (args) => {
            const result = await azurePlugin.callTool("azure_get_vm_status", args);
            return { content: [{ type: "text", text: JSON.stringify(result.data ?? result.error, null, 2) }], isError: !result.success };
        });
        mcp.registerTool("azure_start_vm", {
            description: "Start a stopped Azure virtual machine.",
            inputSchema: z.object({
                subscriptionId: z.string().describe("Azure subscription ID"),
                resourceGroup: z.string().describe("Resource group name"),
                vmName: z.string().describe("Virtual machine name"),
            }),
        }, async (args) => {
            const result = await azurePlugin.callTool("azure_start_vm", args);
            return { content: [{ type: "text", text: JSON.stringify(result.data ?? result.error, null, 2) }], isError: !result.success };
        });
        mcp.registerTool("azure_stop_vm", {
            description: "Stop (and optionally deallocate) an Azure virtual machine.",
            inputSchema: z.object({
                subscriptionId: z.string().describe("Azure subscription ID"),
                resourceGroup: z.string().describe("Resource group name"),
                vmName: z.string().describe("Virtual machine name"),
                deallocate: z.boolean().optional().describe("If true (default), deallocate to stop billing. If false, power off without deallocation."),
            }),
        }, async (args) => {
            const result = await azurePlugin.callTool("azure_stop_vm", args);
            return { content: [{ type: "text", text: JSON.stringify(result.data ?? result.error, null, 2) }], isError: !result.success };
        });
        mcp.registerTool("azure_restart_vm", {
            description: "Restart an Azure virtual machine.",
            inputSchema: z.object({
                subscriptionId: z.string().describe("Azure subscription ID"),
                resourceGroup: z.string().describe("Resource group name"),
                vmName: z.string().describe("Virtual machine name"),
            }),
        }, async (args) => {
            const result = await azurePlugin.callTool("azure_restart_vm", args);
            return { content: [{ type: "text", text: JSON.stringify(result.data ?? result.error, null, 2) }], isError: !result.success };
        });
        // Discovery
        mcp.registerTool("azure_list_locations", {
            description: "List all available Azure regions for a subscription.",
            inputSchema: z.object({
                subscriptionId: z.string().describe("Azure subscription ID"),
            }),
        }, async (args) => {
            const result = await azurePlugin.callTool("azure_list_locations", args);
            return { content: [{ type: "text", text: JSON.stringify(result.data ?? result.error, null, 2) }], isError: !result.success };
        });
        mcp.registerTool("azure_list_providers", {
            description: "List all registered Azure resource provider namespaces for a subscription.",
            inputSchema: z.object({
                subscriptionId: z.string().describe("Azure subscription ID"),
                expand: z.string().optional().describe("Optional expand, e.g. 'resourceTypes/aliases'"),
            }),
        }, async (args) => {
            const result = await azurePlugin.callTool("azure_list_providers", args);
            return { content: [{ type: "text", text: JSON.stringify(result.data ?? result.error, null, 2) }], isError: !result.success };
        });
        mcp.registerTool("azure_get_provider_resource_types", {
            description: "Get resource types and latest API versions for a specific Azure resource provider.",
            inputSchema: z.object({
                subscriptionId: z.string().describe("Azure subscription ID"),
                provider: z.string().describe("Resource provider namespace, e.g. Microsoft.Compute"),
            }),
        }, async (args) => {
            const result = await azurePlugin.callTool("azure_get_provider_resource_types", args);
            return { content: [{ type: "text", text: JSON.stringify(result.data ?? result.error, null, 2) }], isError: !result.success };
        });
        // Policy
        mcp.registerTool("azure_list_policy_assignments", {
            description: "List Azure Policy assignments at subscription or resource scope.",
            inputSchema: z.object({
                subscriptionId: z.string().describe("Azure subscription ID"),
                scope: z.string().optional().describe("Optional scope path. Defaults to subscription scope."),
            }),
        }, async (args) => {
            const result = await azurePlugin.callTool("azure_list_policy_assignments", args);
            return { content: [{ type: "text", text: JSON.stringify(result.data ?? result.error, null, 2) }], isError: !result.success };
        });
        mcp.registerTool("azure_get_policy_compliance_summary", {
            description: "Get a compliance summary showing non-compliant resource counts for all policies in a subscription.",
            inputSchema: z.object({
                subscriptionId: z.string().describe("Azure subscription ID"),
            }),
        }, async (args) => {
            const result = await azurePlugin.callTool("azure_get_policy_compliance_summary", args);
            return { content: [{ type: "text", text: JSON.stringify(result.data ?? result.error, null, 2) }], isError: !result.success };
        });
        // Metrics
        mcp.registerTool("azure_list_metric_definitions", {
            description: "List available metric names and definitions for an Azure resource.",
            inputSchema: z.object({
                resourceId: z.string().describe("Full Azure resource ID"),
            }),
        }, async (args) => {
            const result = await azurePlugin.callTool("azure_list_metric_definitions", args);
            return { content: [{ type: "text", text: JSON.stringify(result.data ?? result.error, null, 2) }], isError: !result.success };
        });
        mcp.registerTool("azure_get_resource_metrics", {
            description: "Get time-series metric data for an Azure resource.",
            inputSchema: z.object({
                resourceId: z.string().describe("Full Azure resource ID"),
                metricNames: z.array(z.string()).describe("List of metric names to retrieve"),
                timespan: z.string().describe("ISO 8601 interval, e.g. PT1H or 2024-01-01T00:00:00Z/2024-01-02T00:00:00Z"),
                interval: z.string().optional().describe("Aggregation granularity, e.g. PT1M, PT5M, PT1H"),
                aggregation: z.enum(["Average", "Count", "Maximum", "Minimum", "Total"]).optional().describe("Aggregation type"),
            }),
        }, async (args) => {
            const result = await azurePlugin.callTool("azure_get_resource_metrics", args);
            return { content: [{ type: "text", text: JSON.stringify(result.data ?? result.error, null, 2) }], isError: !result.success };
        });
        // Service Health
        mcp.registerTool("azure_list_service_health_events", {
            description: "List Azure Service Health events (incidents, maintenance) for a subscription.",
            inputSchema: z.object({
                subscriptionId: z.string().describe("Azure subscription ID"),
                filter: z.string().optional().describe("OData $filter, e.g. \"EventType eq 'ServiceIssue'\""),
            }),
        }, async (args) => {
            const result = await azurePlugin.callTool("azure_list_service_health_events", args);
            return { content: [{ type: "text", text: JSON.stringify(result.data ?? result.error, null, 2) }], isError: !result.success };
        });
    }
    // ---------------------------------------------------------------------------
    // SharePoint Tools
    // ---------------------------------------------------------------------------
    const sharepointPlugin = plugins.get("sharepoint");
    if (sharepointPlugin) {
        mcp.registerTool("sharepoint_list_sites", {
            description: "List accessible SharePoint sites.",
            inputSchema: z.object({}),
        }, async () => {
            const result = await sharepointPlugin.callTool("sharepoint_list_sites", {});
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result.data ?? result.error, null, 2),
                    },
                ],
                isError: !result.success,
            };
        });
        mcp.registerTool("sharepoint_list_files", {
            description: "List files in a SharePoint document library or folder.",
            inputSchema: z.object({
                siteId: z.string().describe("SharePoint site ID"),
                driveId: z.string().optional().describe("Drive ID"),
                folderId: z.string().optional().describe("Folder item ID (defaults to root)"),
            }),
        }, async (args) => {
            const result = await sharepointPlugin.callTool("sharepoint_list_files", args);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result.data ?? result.error, null, 2),
                    },
                ],
                isError: !result.success,
            };
        });
        mcp.registerTool("sharepoint_upload_file", {
            description: "Upload a file to a SharePoint document library.",
            inputSchema: z.object({
                siteId: z.string().describe("SharePoint site ID"),
                driveId: z.string().optional().describe("Drive ID"),
                parentFolderId: z.string().optional().describe("Parent folder item ID"),
                fileName: z.string().describe("Name for the uploaded file"),
                content: z.string().describe("Base64-encoded file content"),
                mimeType: z.string().optional().describe("MIME type of the file"),
            }),
        }, async (args) => {
            const result = await sharepointPlugin.callTool("sharepoint_upload_file", args);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result.data ?? result.error, null, 2),
                    },
                ],
                isError: !result.success,
            };
        });
        mcp.registerTool("sharepoint_download_file", {
            description: "Get the download URL for a file in SharePoint.",
            inputSchema: z.object({
                siteId: z.string().describe("SharePoint site ID"),
                driveId: z.string().optional().describe("Drive ID"),
                itemId: z.string().describe("Drive-item ID of the file"),
            }),
        }, async (args) => {
            const result = await sharepointPlugin.callTool("sharepoint_download_file", args);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result.data ?? result.error, null, 2),
                    },
                ],
                isError: !result.success,
            };
        });
    }
    return mcp;
}
// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
const mcp = await createServer();
const transport = new StdioServerTransport();
await mcp.connect(transport);
//# sourceMappingURL=index.js.map