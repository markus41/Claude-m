import { z } from "zod";
import { BasePlugin } from "./base.js";
const GRAPH = "https://graph.microsoft.com/v1.0";
/** Argument schemas for each SharePoint tool. */
const SiteArgs = z.object({
    siteId: z.string().describe("SharePoint site ID"),
});
const ListFilesArgs = SiteArgs.extend({
    driveId: z.string().optional().describe("Drive ID (defaults to the default drive)"),
    folderId: z.string().optional().describe("Folder item ID (defaults to root)"),
});
const UploadFileArgs = SiteArgs.extend({
    driveId: z.string().optional().describe("Drive ID"),
    parentFolderId: z
        .string()
        .optional()
        .describe("Parent folder item ID (defaults to root)"),
    fileName: z.string().describe("Name to give the uploaded file"),
    content: z.string().describe("Base64-encoded file content"),
    mimeType: z
        .string()
        .default("application/octet-stream")
        .describe("MIME type of the file"),
});
const DownloadFileArgs = SiteArgs.extend({
    driveId: z.string().optional().describe("Drive ID"),
    itemId: z.string().describe("Drive-item ID of the file to download"),
});
/**
 * Microsoft SharePoint plugin.
 *
 * Exposes tools:
 *  - sharepoint_list_sites     – List accessible SharePoint sites
 *  - sharepoint_list_files     – List files in a drive or folder
 *  - sharepoint_upload_file    – Upload a file to a SharePoint library
 *  - sharepoint_download_file  – Get the download URL for a file
 */
export class SharePointPlugin extends BasePlugin {
    constructor(auth) {
        super(auth);
    }
    async callTool(toolName, args) {
        try {
            switch (toolName) {
                case "sharepoint_list_sites": {
                    const url = `${GRAPH}/sites?search=*`;
                    const data = await this.graphGet(url);
                    return this.ok(data);
                }
                case "sharepoint_list_files": {
                    const { siteId, driveId, folderId } = ListFilesArgs.parse(args);
                    const driveSegment = driveId
                        ? `drives/${driveId}`
                        : "drive";
                    const folderSegment = folderId
                        ? `items/${folderId}`
                        : "root";
                    const url = `${GRAPH}/sites/${siteId}/${driveSegment}/${folderSegment}/children`;
                    const data = await this.graphGet(url);
                    return this.ok(data);
                }
                case "sharepoint_upload_file": {
                    const { siteId, driveId, parentFolderId, fileName, content, mimeType } = UploadFileArgs.parse(args);
                    const driveSegment = driveId ? `drives/${driveId}` : "drive";
                    const folderSegment = parentFolderId
                        ? `items/${parentFolderId}`
                        : "root";
                    const url = `${GRAPH}/sites/${siteId}/${driveSegment}/${folderSegment}:/${encodeURIComponent(fileName)}:/content`;
                    const binary = Buffer.from(content, "base64");
                    const response = await fetch(url, {
                        method: "PUT",
                        headers: {
                            Authorization: `Bearer ${this.accessToken}`,
                            "Content-Type": mimeType,
                        },
                        body: binary,
                    });
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
                    }
                    const data = await response.json();
                    return this.ok(data);
                }
                case "sharepoint_download_file": {
                    const { siteId, driveId, itemId } = DownloadFileArgs.parse(args);
                    const driveSegment = driveId ? `drives/${driveId}` : "drive";
                    const url = `${GRAPH}/sites/${siteId}/${driveSegment}/items/${itemId}`;
                    const data = await this.graphGet(url);
                    return this.ok({
                        downloadUrl: data["@microsoft.graph.downloadUrl"],
                    });
                }
                default:
                    return this.fail(`Unknown tool: ${toolName}`);
            }
        }
        catch (err) {
            return this.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
//# sourceMappingURL=sharepoint.js.map