import { PluginAuth, PluginResult } from "../types.js";
import { BasePlugin } from "./base.js";
/**
 * Microsoft Azure plugin.
 *
 * Exposes tools for subscription, resource group, resource, RBAC, tags,
 * locks, deployments, VMs, discovery, policy, metrics, and service health.
 */
export declare class AzurePlugin extends BasePlugin {
    constructor(auth: PluginAuth);
    callTool(toolName: string, args: Record<string, unknown>): Promise<PluginResult>;
}
//# sourceMappingURL=azure.d.ts.map