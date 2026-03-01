import { z } from "zod";
import { PluginAuth, PluginResult } from "../types.js";
import { BasePlugin } from "./base.js";

const GRAPH = "https://graph.microsoft.com/v1.0";

/** Argument schemas for each Excel tool. */
const WorkbookArgs = z.object({
  driveItemId: z.string().describe("OneDrive drive-item ID of the workbook"),
});

const ReadRangeArgs = WorkbookArgs.extend({
  worksheet: z.string().describe("Worksheet name"),
  range: z.string().describe("A1-notation range, e.g. A1:D10"),
});

const WriteRangeArgs = ReadRangeArgs.extend({
  values: z
    .array(z.array(z.unknown()))
    .describe("2-D array of values to write"),
});

const CreateTableArgs = WorkbookArgs.extend({
  worksheet: z.string().describe("Worksheet name"),
  range: z.string().describe("A1-notation range that defines the table"),
  hasHeaders: z.boolean().default(true).describe("Whether the range has headers"),
});

/**
 * Microsoft Excel plugin.
 *
 * Exposes tools:
 *  - excel_read_range       – Read a cell range from a workbook
 *  - excel_write_range      – Write values to a cell range
 *  - excel_list_worksheets  – List worksheets in a workbook
 *  - excel_create_table     – Create a named table in a workbook
 */
export class ExcelPlugin extends BasePlugin {
  constructor(auth: PluginAuth) {
    super(auth);
  }

  async callTool(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<PluginResult> {
    try {
      switch (toolName) {
        case "excel_read_range": {
          const { driveItemId, worksheet, range } = ReadRangeArgs.parse(args);
          const url = `${GRAPH}/me/drive/items/${driveItemId}/workbook/worksheets/${worksheet}/range(address='${range}')`;
          const data = await this.graphGet(url);
          return this.ok(data);
        }

        case "excel_write_range": {
          const { driveItemId, worksheet, range, values } =
            WriteRangeArgs.parse(args);
          const url = `${GRAPH}/me/drive/items/${driveItemId}/workbook/worksheets/${worksheet}/range(address='${range}')`;
          const data = await this.graphPatch(url, { values });
          return this.ok(data);
        }

        case "excel_list_worksheets": {
          const { driveItemId } = WorkbookArgs.parse(args);
          const url = `${GRAPH}/me/drive/items/${driveItemId}/workbook/worksheets`;
          const data = await this.graphGet(url);
          return this.ok(data);
        }

        case "excel_create_table": {
          const { driveItemId, worksheet, range, hasHeaders } =
            CreateTableArgs.parse(args);
          const url = `${GRAPH}/me/drive/items/${driveItemId}/workbook/worksheets/${worksheet}/tables/add`;
          const data = await this.graphPost(url, { address: range, hasHeaders });
          return this.ok(data);
        }

        default:
          return this.fail(`Unknown tool: ${toolName}`);
      }
    } catch (err) {
      return this.fail(err instanceof Error ? err.message : String(err));
    }
  }

  /** PATCH wrapper used by excel_write_range. */
  private async graphPatch(url: string, body: unknown): Promise<unknown> {
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    return response.json() as Promise<unknown>;
  }
}
