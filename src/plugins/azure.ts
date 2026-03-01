import { z } from "zod";
import { PluginAuth, PluginResult } from "../types.js";
import { BasePlugin } from "./base.js";

const ARM = "https://management.azure.com";
const API = "2022-12-01";

/** Argument schemas for each Azure tool. */
const SubscriptionArgs = z.object({
  subscriptionId: z.string().describe("Azure subscription ID"),
});

const ResourceGroupArgs = SubscriptionArgs.extend({
  resourceGroup: z.string().describe("Resource group name"),
});

const GetResourceArgs = ResourceGroupArgs.extend({
  provider: z.string().describe("Resource provider namespace, e.g. Microsoft.Compute"),
  resourceType: z.string().describe("Resource type, e.g. virtualMachines"),
  resourceName: z.string().describe("Resource name"),
  apiVersion: z
    .string()
    .optional()
    .describe("API version override (defaults to 2022-12-01)"),
});

/**
 * Microsoft Azure plugin.
 *
 * Exposes tools:
 *  - azure_list_subscriptions    – List all accessible subscriptions
 *  - azure_list_resource_groups  – List resource groups in a subscription
 *  - azure_list_resources        – List resources in a resource group
 *  - azure_get_resource          – Get details of a specific resource
 */
export class AzurePlugin extends BasePlugin {
  constructor(auth: PluginAuth) {
    super(auth);
  }

  async callTool(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<PluginResult> {
    try {
      switch (toolName) {
        case "azure_list_subscriptions": {
          const url = `${ARM}/subscriptions?api-version=${API}`;
          const data = await this.graphGet(url);
          return this.ok(data);
        }

        case "azure_list_resource_groups": {
          const { subscriptionId } = SubscriptionArgs.parse(args);
          const url = `${ARM}/subscriptions/${subscriptionId}/resourcegroups?api-version=${API}`;
          const data = await this.graphGet(url);
          return this.ok(data);
        }

        case "azure_list_resources": {
          const { subscriptionId, resourceGroup } =
            ResourceGroupArgs.parse(args);
          const url = `${ARM}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/resources?api-version=${API}`;
          const data = await this.graphGet(url);
          return this.ok(data);
        }

        case "azure_get_resource": {
          const { subscriptionId, resourceGroup, provider, resourceType, resourceName, apiVersion } =
            GetResourceArgs.parse(args);
          const ver = apiVersion ?? API;
          const url = `${ARM}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/${provider}/${resourceType}/${resourceName}?api-version=${ver}`;
          const data = await this.graphGet(url);
          return this.ok(data);
        }

        default:
          return this.fail(`Unknown tool: ${toolName}`);
      }
    } catch (err) {
      return this.fail(err instanceof Error ? err.message : String(err));
    }
  }
}
