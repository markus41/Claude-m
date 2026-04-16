import { PluginAuth, PluginResult } from "../types.js";
import { BasePlugin } from "./base.js";
/**
 * Microsoft SharePoint plugin.
 *
 * Exposes tools:
 *  - sharepoint_list_sites     – List accessible SharePoint sites
 *  - sharepoint_list_files     – List files in a drive or folder
 *  - sharepoint_upload_file    – Upload a file to a SharePoint library
 *  - sharepoint_download_file  – Get the download URL for a file
 */
export declare class SharePointPlugin extends BasePlugin {
    constructor(auth: PluginAuth);
    callTool(toolName: string, args: Record<string, unknown>): Promise<PluginResult>;
}
//# sourceMappingURL=sharepoint.d.ts.map