import { PluginAuth, PluginResult } from "../types.js";
import { BasePlugin } from "./base.js";
/**
 * Microsoft Outlook plugin.
 *
 * Exposes tools:
 *  - outlook_send_email   – Send an email via the current user's mailbox
 *  - outlook_list_emails  – List recent messages in the inbox
 *  - outlook_create_event – Create a calendar event
 *  - outlook_list_events  – List upcoming calendar events
 */
export declare class OutlookPlugin extends BasePlugin {
    constructor(auth: PluginAuth);
    callTool(toolName: string, args: Record<string, unknown>): Promise<PluginResult>;
}
//# sourceMappingURL=outlook.d.ts.map