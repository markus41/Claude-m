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

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
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
// Tool descriptors (static definitions matching the registry)
// ---------------------------------------------------------------------------

const STATIC_TOOLS = [
  // ---- Marketplace -------------------------------------------------------
  {
    name: "marketplace_list_plugins",
    description: "List all available Microsoft plugins in the marketplace.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "marketplace_get_plugin",
    description: "Get detailed information about a specific plugin by its ID.",
    inputSchema: {
      type: "object",
      properties: {
        pluginId: {
          type: "string",
          description: "Plugin ID (e.g. teams, excel, outlook, azure, sharepoint)",
        },
      },
      required: ["pluginId"],
    },
  },

  // ---- Teams -------------------------------------------------------------
  {
    name: "teams_list_teams",
    description: "List all Microsoft Teams the signed-in user has joined.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "teams_list_channels",
    description: "List channels within a specific Microsoft Team.",
    inputSchema: {
      type: "object",
      properties: {
        teamId: { type: "string", description: "The ID of the team" },
      },
      required: ["teamId"],
    },
  },
  {
    name: "teams_send_message",
    description: "Send a message to a Microsoft Teams channel.",
    inputSchema: {
      type: "object",
      properties: {
        teamId: { type: "string", description: "Team ID" },
        channelId: { type: "string", description: "Channel ID" },
        message: { type: "string", description: "Message content (HTML or plain text)" },
      },
      required: ["teamId", "channelId", "message"],
    },
  },
  {
    name: "teams_create_meeting",
    description: "Create a new online meeting in Microsoft Teams.",
    inputSchema: {
      type: "object",
      properties: {
        subject: { type: "string", description: "Meeting subject" },
        startDateTime: { type: "string", description: "ISO-8601 start date-time" },
        endDateTime: { type: "string", description: "ISO-8601 end date-time" },
        attendees: {
          type: "array",
          items: { type: "string", format: "email" },
          description: "Attendee email addresses",
        },
      },
      required: ["subject", "startDateTime", "endDateTime"],
    },
  },

  // ---- Excel -------------------------------------------------------------
  {
    name: "excel_list_worksheets",
    description: "List all worksheets in an Excel workbook stored in OneDrive.",
    inputSchema: {
      type: "object",
      properties: {
        driveItemId: { type: "string", description: "OneDrive drive-item ID of the workbook" },
      },
      required: ["driveItemId"],
    },
  },
  {
    name: "excel_read_range",
    description: "Read a cell range from an Excel workbook.",
    inputSchema: {
      type: "object",
      properties: {
        driveItemId: { type: "string", description: "OneDrive drive-item ID" },
        worksheet: { type: "string", description: "Worksheet name" },
        range: { type: "string", description: "A1 notation range, e.g. A1:D10" },
      },
      required: ["driveItemId", "worksheet", "range"],
    },
  },
  {
    name: "excel_write_range",
    description: "Write values to a cell range in an Excel workbook.",
    inputSchema: {
      type: "object",
      properties: {
        driveItemId: { type: "string", description: "OneDrive drive-item ID" },
        worksheet: { type: "string", description: "Worksheet name" },
        range: { type: "string", description: "A1 notation range" },
        values: {
          type: "array",
          items: { type: "array", items: {} },
          description: "2-D array of values to write",
        },
      },
      required: ["driveItemId", "worksheet", "range", "values"],
    },
  },
  {
    name: "excel_create_table",
    description: "Create a named table in an Excel workbook.",
    inputSchema: {
      type: "object",
      properties: {
        driveItemId: { type: "string", description: "OneDrive drive-item ID" },
        worksheet: { type: "string", description: "Worksheet name" },
        range: { type: "string", description: "A1 notation range" },
        hasHeaders: { type: "boolean", description: "Whether the first row contains headers" },
      },
      required: ["driveItemId", "worksheet", "range"],
    },
  },

  // ---- Outlook -----------------------------------------------------------
  {
    name: "outlook_send_email",
    description: "Send an email via the signed-in user's Outlook mailbox.",
    inputSchema: {
      type: "object",
      properties: {
        to: {
          type: "array",
          items: { type: "string", format: "email" },
          description: "Recipient addresses",
        },
        subject: { type: "string", description: "Email subject" },
        body: { type: "string", description: "Email body (HTML or plain text)" },
        cc: {
          type: "array",
          items: { type: "string", format: "email" },
          description: "CC addresses",
        },
        isHtml: { type: "boolean", description: "Whether the body is HTML" },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "outlook_list_emails",
    description: "List recent emails from the signed-in user's inbox.",
    inputSchema: {
      type: "object",
      properties: {
        top: { type: "integer", description: "Max number of emails (default 10)" },
        filter: { type: "string", description: "OData $filter expression" },
      },
      required: [],
    },
  },
  {
    name: "outlook_create_event",
    description: "Create a new calendar event in the signed-in user's Outlook calendar.",
    inputSchema: {
      type: "object",
      properties: {
        subject: { type: "string", description: "Event subject" },
        startDateTime: { type: "string", description: "ISO-8601 start date-time" },
        endDateTime: { type: "string", description: "ISO-8601 end date-time" },
        attendees: {
          type: "array",
          items: { type: "string", format: "email" },
          description: "Attendee email addresses",
        },
        location: { type: "string", description: "Event location" },
        body: { type: "string", description: "Event description (HTML)" },
      },
      required: ["subject", "startDateTime", "endDateTime"],
    },
  },
  {
    name: "outlook_list_events",
    description: "List upcoming calendar events from the signed-in user's Outlook calendar.",
    inputSchema: {
      type: "object",
      properties: {
        top: { type: "integer", description: "Max number of events (default 10)" },
      },
      required: [],
    },
  },

  // ---- Azure -------------------------------------------------------------
  {
    name: "azure_list_subscriptions",
    description: "List all Azure subscriptions accessible to the signed-in user.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "azure_list_resource_groups",
    description: "List all resource groups in an Azure subscription.",
    inputSchema: {
      type: "object",
      properties: {
        subscriptionId: { type: "string", description: "Azure subscription ID" },
      },
      required: ["subscriptionId"],
    },
  },
  {
    name: "azure_list_resources",
    description: "List all resources in an Azure resource group.",
    inputSchema: {
      type: "object",
      properties: {
        subscriptionId: { type: "string", description: "Azure subscription ID" },
        resourceGroup: { type: "string", description: "Resource group name" },
      },
      required: ["subscriptionId", "resourceGroup"],
    },
  },
  {
    name: "azure_get_resource",
    description: "Get details of a specific Azure resource.",
    inputSchema: {
      type: "object",
      properties: {
        subscriptionId: { type: "string", description: "Azure subscription ID" },
        resourceGroup: { type: "string", description: "Resource group name" },
        provider: {
          type: "string",
          description: "Resource provider namespace, e.g. Microsoft.Compute",
        },
        resourceType: { type: "string", description: "Resource type, e.g. virtualMachines" },
        resourceName: { type: "string", description: "Resource name" },
        apiVersion: { type: "string", description: "API version override" },
      },
      required: ["subscriptionId", "resourceGroup", "provider", "resourceType", "resourceName"],
    },
  },

  // ---- SharePoint --------------------------------------------------------
  {
    name: "sharepoint_list_sites",
    description: "List accessible SharePoint sites.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "sharepoint_list_files",
    description: "List files in a SharePoint document library or folder.",
    inputSchema: {
      type: "object",
      properties: {
        siteId: { type: "string", description: "SharePoint site ID" },
        driveId: { type: "string", description: "Drive ID (optional)" },
        folderId: { type: "string", description: "Folder item ID (optional, defaults to root)" },
      },
      required: ["siteId"],
    },
  },
  {
    name: "sharepoint_upload_file",
    description: "Upload a file to a SharePoint document library.",
    inputSchema: {
      type: "object",
      properties: {
        siteId: { type: "string", description: "SharePoint site ID" },
        driveId: { type: "string", description: "Drive ID (optional)" },
        parentFolderId: { type: "string", description: "Parent folder item ID (optional)" },
        fileName: { type: "string", description: "Name for the uploaded file" },
        content: { type: "string", description: "Base64-encoded file content" },
        mimeType: { type: "string", description: "MIME type of the file" },
      },
      required: ["siteId", "fileName", "content"],
    },
  },
  {
    name: "sharepoint_download_file",
    description: "Get the download URL for a file in SharePoint.",
    inputSchema: {
      type: "object",
      properties: {
        siteId: { type: "string", description: "SharePoint site ID" },
        driveId: { type: "string", description: "Drive ID (optional)" },
        itemId: { type: "string", description: "Drive-item ID of the file" },
      },
      required: ["siteId", "itemId"],
    },
  },
] as const;

// ---------------------------------------------------------------------------
// Routing helpers
// ---------------------------------------------------------------------------

const PLUGIN_TOOL_PREFIXES: Record<string, string> = {
  teams_: "teams",
  excel_: "excel",
  outlook_: "outlook",
  azure_: "azure",
  sharepoint_: "sharepoint",
};

function resolvePlugin(
  toolName: string,
  plugins: Map<string, BasePlugin>
): BasePlugin | undefined {
  for (const [prefix, pluginId] of Object.entries(PLUGIN_TOOL_PREFIXES)) {
    if (toolName.startsWith(prefix)) {
      return plugins.get(pluginId);
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Server bootstrap
// ---------------------------------------------------------------------------

export async function createServer(): Promise<Server> {
  const auth = buildAuth();
  const plugins = buildPluginMap(auth);
  const registry = loadRegistry();

  const server = new Server(
    { name: "claude-m", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  // ListTools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: STATIC_TOOLS as unknown as Array<{
      name: string;
      description: string;
      inputSchema: { type: string; properties: Record<string, unknown>; required: string[] };
    }>,
  }));

  // CallTool
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name: toolName, arguments: toolArgs } = request.params;
    const args = (toolArgs ?? {}) as Record<string, unknown>;

    // ---- Marketplace tools -----------------------------------------------
    if (toolName === "marketplace_list_plugins") {
      return {
        content: [{ type: "text", text: JSON.stringify(registry, null, 2) }],
      };
    }

    if (toolName === "marketplace_get_plugin") {
      const { pluginId } = z.object({ pluginId: z.string() }).parse(args);
      const manifest = registry.find((p) => p.id === pluginId);
      if (!manifest) {
        return {
          content: [{ type: "text", text: `Plugin '${pluginId}' not found.` }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(manifest, null, 2) }],
      };
    }

    // ---- Delegate to product plugin --------------------------------------
    const plugin = resolvePlugin(toolName, plugins);
    if (!plugin) {
      return {
        content: [{ type: "text", text: `Unknown tool: ${toolName}` }],
        isError: true,
      };
    }

    const result = await plugin.callTool(toolName, args);
    return {
      content: [{ type: "text", text: JSON.stringify(result.data ?? result.error, null, 2) }],
      isError: !result.success,
    };
  });

  return server;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const server = await createServer();
const transport = new StdioServerTransport();
await server.connect(transport);
