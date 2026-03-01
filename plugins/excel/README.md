# Microsoft Excel MCP Plugin

Connect Claude to Microsoft Excel via the Model Context Protocol (MCP).

## Features

- **List Worksheets**: View all worksheets in an Excel workbook
- **Read Ranges**: Extract data from specific cell ranges
- **Write Ranges**: Update cell values in workbooks
- **Create Tables**: Generate named tables in worksheets

## Installation

### From Claude Code Marketplace

```bash
/plugin marketplace add markus41/Claude-m
/plugin install "Microsoft Excel MCP"
```

### Manual Configuration

Add to your `.claude/settings.json`:

```json
{
  "mcpServers": {
    "microsoft-excel": {
      "command": "node",
      "args": ["/path/to/Claude-m/dist/index.js"],
      "env": {
        "MICROSOFT_CLIENT_ID": "your-client-id",
        "MICROSOFT_CLIENT_SECRET": "your-client-secret",
        "MICROSOFT_TENANT_ID": "your-tenant-id",
        "MICROSOFT_ACCESS_TOKEN": "your-access-token"
      }
    }
  }
}
```

## Required Microsoft Graph Permissions

- `Files.ReadWrite` - Read and write files
- `Sites.ReadWrite.All` - Access SharePoint sites (Excel files in OneDrive/SharePoint)

## Available Tools

### `excel_list_worksheets`
Lists all worksheets in an Excel workbook stored in OneDrive.

**Arguments:**
- `driveItemId` (string): OneDrive drive-item ID of the workbook

### `excel_read_range`
Reads a cell range from an Excel workbook.

**Arguments:**
- `driveItemId` (string): OneDrive drive-item ID
- `worksheet` (string): Worksheet name
- `range` (string): A1 notation range, e.g. A1:D10

### `excel_write_range`
Writes values to a cell range in an Excel workbook.

**Arguments:**
- `driveItemId` (string): OneDrive drive-item ID
- `worksheet` (string): Worksheet name
- `range` (string): A1 notation range
- `values` (array): 2-D array of values to write

### `excel_create_table`
Creates a named table in an Excel workbook.

**Arguments:**
- `driveItemId` (string): OneDrive drive-item ID
- `worksheet` (string): Worksheet name
- `range` (string): A1 notation range
- `hasHeaders` (boolean, optional): Whether the first row contains headers

## Example Usage

```
List worksheets:
> Use excel_list_worksheets to see all sheets in the workbook

Read data:
> Use excel_read_range to get data from cells A1:B10 in Sheet1
```

## License

ISC
