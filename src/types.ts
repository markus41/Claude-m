/**
 * Core type definitions for the Claude-m plugin marketplace.
 */

/** Supported Microsoft product categories. */
export type MicrosoftProduct =
  | "teams"
  | "excel"
  | "outlook"
  | "azure"
  | "sharepoint";

/** Authentication configuration for a plugin. */
export interface PluginAuth {
  /** OAuth 2.0 client ID (Microsoft Entra / Azure AD app registration). */
  clientId: string;
  /** OAuth 2.0 client secret. */
  clientSecret: string;
  /** OAuth 2.0 tenant ID. */
  tenantId: string;
  /** Pre-issued access token (optional; skips the OAuth flow). */
  accessToken?: string;
}

/** Metadata that describes a plugin in the registry. */
export interface PluginManifest {
  /** Unique plugin identifier (matches the registry filename). */
  id: string;
  /** Human-readable plugin name. */
  name: string;
  /** Short description shown in the marketplace. */
  description: string;
  /** Semver version string. */
  version: string;
  /** Microsoft product this plugin targets. */
  product: MicrosoftProduct;
  /** Microsoft Graph / REST API scopes required by the plugin. */
  requiredScopes: string[];
  /** Names of the MCP tools exposed by the plugin. */
  tools: string[];
  /** Plugin author. */
  author: string;
}

/** Result returned by every plugin tool invocation. */
export interface PluginResult {
  success: boolean;
  data?: unknown;
  error?: string;
}
