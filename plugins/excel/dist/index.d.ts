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
export declare function createServer(): Promise<McpServer>;
//# sourceMappingURL=index.d.ts.map