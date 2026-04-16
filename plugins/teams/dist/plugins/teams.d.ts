import { PluginAuth, PluginResult } from "../types.js";
import { BasePlugin } from "./base.js";
/**
 * Microsoft Teams plugin.
 *
 * Exposes tools:
 *  - teams_send_message    – Post a message to a channel
 *  - teams_create_meeting  – Create an online meeting
 *  - teams_list_channels   – List channels in a team
 *  - teams_list_teams      – List joined teams for the current user
 */
export declare class TeamsPlugin extends BasePlugin {
    constructor(auth: PluginAuth);
    callTool(toolName: string, args: Record<string, unknown>): Promise<PluginResult>;
}
//# sourceMappingURL=teams.d.ts.map