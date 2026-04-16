import { PluginAuth, PluginResult } from "../types.js";
import { BasePlugin } from "./base.js";
/**
 * Microsoft Excel plugin.
 *
 * Exposes tools:
 *  - excel_read_range       – Read a cell range from a workbook
 *  - excel_write_range      – Write values to a cell range
 *  - excel_list_worksheets  – List worksheets in a workbook
 *  - excel_create_table     – Create a named table in a workbook
 */
export declare class ExcelPlugin extends BasePlugin {
    constructor(auth: PluginAuth);
    callTool(toolName: string, args: Record<string, unknown>): Promise<PluginResult>;
}
//# sourceMappingURL=excel.d.ts.map