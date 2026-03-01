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
import { PluginAuth } from "./types.js";
import { TeamsPlugin } from "./plugins/teams.js";
import { ExcelPlugin } from "./plugins/excel.js";
import { OutlookPlugin } from "./plugins/outlook.js";
import { AzurePlugin } from "./plugins/azure.js";
import { SharePointPlugin } from "./plugins/sharepoint.js";
import { BasePlugin } from "./plugins/base.js";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

function buildAuth(): PluginAuth {
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

function buildPluginMap(auth: PluginAuth): Map<string, BasePlugin> {
  return new Map<string, BasePlugin>([
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

export async function createServer(): Promise<McpServer> {
  const auth = buildAuth();
  const plugins = buildPluginMap(auth);
  const registry = loadRegistry();

  const mcp = new McpServer(
    { name: "claude-m", version: "1.0.0" },
    {
      capabilities: { tools: {} },
      instructions: "Claude-m provides access to Microsoft products through a plugin marketplace. Use marketplace_list_plugins to see available plugins, then use the specific product tools to interact with Teams, Excel, Outlook, Azure, and SharePoint."
    }
  );

  // ---------------------------------------------------------------------------
  // Marketplace Tools
  // ---------------------------------------------------------------------------

  mcp.registerTool(
    "marketplace_list_plugins",
    {
      description: "List all available Microsoft plugins in the marketplace with their descriptions, versions, and required scopes.",
      inputSchema: z.object({}),
    },
    async () => {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(registry, null, 2),
          },
        ],
      };
    }
  );

  mcp.registerTool(
    "marketplace_get_plugin",
    {
      description: "Get detailed information about a specific plugin by its ID, including all available tools and required Microsoft Graph API scopes.",
      inputSchema: z.object({
        pluginId: z.string().describe("Plugin ID (e.g. teams, excel, outlook, azure, sharepoint)"),
      }),
    },
    async (args) => {
      const manifest = registry.find((p) => p.id === args.pluginId);
      if (!manifest) {
        return {
          content: [
            {
              type: "text",
              text: `Plugin '${args.pluginId}' not found. Available plugins: ${registry.map((p) => p.id).join(", ")}`,
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
    }
  );

  mcp.registerTool(
    "marketplace_search_plugins",
    {
      description: "Search plugins by keyword in their name or description. Useful for discovering which plugin provides specific capabilities.",
      inputSchema: z.object({
        keyword: z.string().describe("Keyword to search for in plugin names and descriptions"),
      }),
    },
    async (args) => {
      const keyword = args.keyword.toLowerCase();
      const matches = registry.filter(
        (p) =>
          p.name.toLowerCase().includes(keyword) ||
          p.description.toLowerCase().includes(keyword) ||
          p.id.toLowerCase().includes(keyword) ||
          p.tools.some((t) => t.toLowerCase().includes(keyword))
      );

      if (matches.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No plugins found matching '${args.keyword}'. Try searching for: teams, excel, outlook, azure, sharepoint, email, calendar, files, or resources.`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                query: args.keyword,
                matchCount: matches.length,
                matches: matches.map((p) => ({
                  id: p.id,
                  name: p.name,
                  description: p.description,
                  toolCount: p.tools.length,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  mcp.registerTool(
    "marketplace_list_tools",
    {
      description: "List all available tools across all plugins with their descriptions. Use this to discover what actions you can perform.",
      inputSchema: z.object({
        pluginId: z.string().optional().describe("Optional: filter tools by plugin ID"),
      }),
    },
    async (args) => {
      let plugins = registry;
      if (args.pluginId) {
        plugins = registry.filter((p) => p.id === args.pluginId);
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

      const toolsList = plugins.flatMap((p) =>
        p.tools.map((toolName) => ({
          tool: toolName,
          plugin: p.id,
          pluginName: p.name,
        }))
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                totalTools: toolsList.length,
                tools: toolsList,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ---------------------------------------------------------------------------
  // Teams Tools
  // ---------------------------------------------------------------------------

  const teamsPlugin = plugins.get("teams");
  if (teamsPlugin) {
    mcp.registerTool(
      "teams_list_teams",
      {
        description: "List all Microsoft Teams that the signed-in user has joined.",
        inputSchema: z.object({}),
      },
      async () => {
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
      }
    );

    mcp.registerTool(
      "teams_list_channels",
      {
        description: "List all channels within a specific Microsoft Team.",
        inputSchema: z.object({
          teamId: z.string().describe("The ID of the team"),
        }),
      },
      async (args) => {
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
      }
    );

    mcp.registerTool(
      "teams_send_message",
      {
        description: "Send a message to a Microsoft Teams channel.",
        inputSchema: z.object({
          teamId: z.string().describe("Team ID"),
          channelId: z.string().describe("Channel ID"),
          message: z.string().describe("Message content (HTML or plain text)"),
        }),
      },
      async (args) => {
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
      }
    );

    mcp.registerTool(
      "teams_create_meeting",
      {
        description: "Create a new online meeting in Microsoft Teams.",
        inputSchema: z.object({
          subject: z.string().describe("Meeting subject"),
          startDateTime: z.string().describe("ISO-8601 start date-time"),
          endDateTime: z.string().describe("ISO-8601 end date-time"),
          attendees: z.array(z.string().email()).optional().describe("Attendee email addresses"),
        }),
      },
      async (args) => {
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
      }
    );
  }

  // ---------------------------------------------------------------------------
  // Excel Tools
  // ---------------------------------------------------------------------------

  const excelPlugin = plugins.get("excel");
  if (excelPlugin) {
    mcp.registerTool(
      "excel_list_worksheets",
      {
        description: "List all worksheets in an Excel workbook stored in OneDrive.",
        inputSchema: z.object({
          driveItemId: z.string().describe("OneDrive drive-item ID of the workbook"),
        }),
      },
      async (args) => {
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
      }
    );

    mcp.registerTool(
      "excel_read_range",
      {
        description: "Read a cell range from an Excel workbook.",
        inputSchema: z.object({
          driveItemId: z.string().describe("OneDrive drive-item ID"),
          worksheet: z.string().describe("Worksheet name"),
          range: z.string().describe("A1 notation range, e.g. A1:D10"),
        }),
      },
      async (args) => {
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
      }
    );

    mcp.registerTool(
      "excel_write_range",
      {
        description: "Write values to a cell range in an Excel workbook.",
        inputSchema: z.object({
          driveItemId: z.string().describe("OneDrive drive-item ID"),
          worksheet: z.string().describe("Worksheet name"),
          range: z.string().describe("A1 notation range"),
          values: z.array(z.array(z.any())).describe("2-D array of values to write"),
        }),
      },
      async (args) => {
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
      }
    );

    mcp.registerTool(
      "excel_create_table",
      {
        description: "Create a named table in an Excel workbook.",
        inputSchema: z.object({
          driveItemId: z.string().describe("OneDrive drive-item ID"),
          worksheet: z.string().describe("Worksheet name"),
          range: z.string().describe("A1 notation range"),
          hasHeaders: z.boolean().optional().describe("Whether the first row contains headers"),
        }),
      },
      async (args) => {
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
      }
    );
  }

  // ---------------------------------------------------------------------------
  // Outlook Tools
  // ---------------------------------------------------------------------------

  const outlookPlugin = plugins.get("outlook");
  if (outlookPlugin) {
    mcp.registerTool(
      "outlook_send_email",
      {
        description: "Send an email via the signed-in user's Outlook mailbox.",
        inputSchema: z.object({
          to: z.array(z.string().email()).describe("Recipient email addresses"),
          subject: z.string().describe("Email subject"),
          body: z.string().describe("Email body (HTML or plain text)"),
          cc: z.array(z.string().email()).optional().describe("CC email addresses"),
          isHtml: z.boolean().optional().describe("Whether the body is HTML"),
        }),
      },
      async (args) => {
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
      }
    );

    mcp.registerTool(
      "outlook_list_emails",
      {
        description: "List recent emails from the signed-in user's inbox.",
        inputSchema: z.object({
          top: z.number().int().optional().describe("Max number of emails (default 10)"),
          filter: z.string().optional().describe("OData $filter expression"),
        }),
      },
      async (args) => {
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
      }
    );

    mcp.registerTool(
      "outlook_create_event",
      {
        description: "Create a new calendar event in the signed-in user's Outlook calendar.",
        inputSchema: z.object({
          subject: z.string().describe("Event subject"),
          startDateTime: z.string().describe("ISO-8601 start date-time"),
          endDateTime: z.string().describe("ISO-8601 end date-time"),
          attendees: z.array(z.string().email()).optional().describe("Attendee email addresses"),
          location: z.string().optional().describe("Event location"),
          body: z.string().optional().describe("Event description (HTML)"),
        }),
      },
      async (args) => {
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
      }
    );

    mcp.registerTool(
      "outlook_list_events",
      {
        description: "List upcoming calendar events from the signed-in user's Outlook calendar.",
        inputSchema: z.object({
          top: z.number().int().optional().describe("Max number of events (default 10)"),
        }),
      },
      async (args) => {
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
      }
    );
  }

  // ---------------------------------------------------------------------------
  // Azure Tools
  // ---------------------------------------------------------------------------

  const azurePlugin = plugins.get("azure");
  if (azurePlugin) {
    mcp.registerTool(
      "azure_list_subscriptions",
      {
        description: "List all Azure subscriptions accessible to the signed-in user.",
        inputSchema: z.object({}),
      },
      async () => {
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
      }
    );

    mcp.registerTool(
      "azure_list_resource_groups",
      {
        description: "List all resource groups in an Azure subscription.",
        inputSchema: z.object({
          subscriptionId: z.string().describe("Azure subscription ID"),
        }),
      },
      async (args) => {
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
      }
    );

    mcp.registerTool(
      "azure_list_resources",
      {
        description: "List all resources in an Azure resource group.",
        inputSchema: z.object({
          subscriptionId: z.string().describe("Azure subscription ID"),
          resourceGroup: z.string().describe("Resource group name"),
        }),
      },
      async (args) => {
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
      }
    );

    mcp.registerTool(
      "azure_get_resource",
      {
        description: "Get details of a specific Azure resource.",
        inputSchema: z.object({
          subscriptionId: z.string().describe("Azure subscription ID"),
          resourceGroup: z.string().describe("Resource group name"),
          provider: z.string().describe("Resource provider namespace, e.g. Microsoft.Compute"),
          resourceType: z.string().describe("Resource type, e.g. virtualMachines"),
          resourceName: z.string().describe("Resource name"),
          apiVersion: z.string().optional().describe("API version override"),
        }),
      },
      async (args) => {
        const result = await azurePlugin.callTool("azure_get_resource", args);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result.data ?? result.error, null, 2),
            },
          ],
          isError: !result.success,
        };
      }
    );
  }

  // ---------------------------------------------------------------------------
  // SharePoint Tools
  // ---------------------------------------------------------------------------

  const sharepointPlugin = plugins.get("sharepoint");
  if (sharepointPlugin) {
    mcp.registerTool(
      "sharepoint_list_sites",
      {
        description: "List accessible SharePoint sites.",
        inputSchema: z.object({}),
      },
      async () => {
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
      }
    );

    mcp.registerTool(
      "sharepoint_list_files",
      {
        description: "List files in a SharePoint document library or folder.",
        inputSchema: z.object({
          siteId: z.string().describe("SharePoint site ID"),
          driveId: z.string().optional().describe("Drive ID"),
          folderId: z.string().optional().describe("Folder item ID (defaults to root)"),
        }),
      },
      async (args) => {
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
      }
    );

    mcp.registerTool(
      "sharepoint_upload_file",
      {
        description: "Upload a file to a SharePoint document library.",
        inputSchema: z.object({
          siteId: z.string().describe("SharePoint site ID"),
          driveId: z.string().optional().describe("Drive ID"),
          parentFolderId: z.string().optional().describe("Parent folder item ID"),
          fileName: z.string().describe("Name for the uploaded file"),
          content: z.string().describe("Base64-encoded file content"),
          mimeType: z.string().optional().describe("MIME type of the file"),
        }),
      },
      async (args) => {
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
      }
    );

    mcp.registerTool(
      "sharepoint_download_file",
      {
        description: "Get the download URL for a file in SharePoint.",
        inputSchema: z.object({
          siteId: z.string().describe("SharePoint site ID"),
          driveId: z.string().optional().describe("Drive ID"),
          itemId: z.string().describe("Drive-item ID of the file"),
        }),
      },
      async (args) => {
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
      }
    );
  }

  return mcp;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const mcp = await createServer();
const transport = new StdioServerTransport();
await mcp.connect(transport);
