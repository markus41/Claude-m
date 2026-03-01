# Microsoft SharePoint MCP Plugin

Connect Claude to Microsoft SharePoint via the Model Context Protocol (MCP).

## Features

- **List Sites**: Browse accessible SharePoint sites
- **List Files**: View files in document libraries
- **Upload Files**: Upload files to SharePoint
- **Download Files**: Get download URLs for SharePoint files

## Installation

### From Claude Code Marketplace

```bash
/plugin marketplace add markus41/Claude-m
/plugin install "Microsoft SharePoint MCP"
```

### Manual Configuration

Add to your `.claude/settings.json`:

```json
{
  "mcpServers": {
    "microsoft-sharepoint": {
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

- `Sites.ReadWrite.All` - Access SharePoint sites
- `Files.ReadWrite.All` - Read and write files

## Available Tools

### `sharepoint_list_sites`
Lists accessible SharePoint sites.

### `sharepoint_list_files`
Lists files in a SharePoint document library or folder.

**Arguments:**
- `siteId` (string): SharePoint site ID
- `driveId` (string, optional): Drive ID
- `folderId` (string, optional): Folder item ID (defaults to root)

### `sharepoint_upload_file`
Uploads a file to a SharePoint document library.

**Arguments:**
- `siteId` (string): SharePoint site ID
- `driveId` (string, optional): Drive ID
- `parentFolderId` (string, optional): Parent folder item ID
- `fileName` (string): Name for the uploaded file
- `content` (string): Base64-encoded file content
- `mimeType` (string, optional): MIME type of the file

### `sharepoint_download_file`
Gets the download URL for a file in SharePoint.

**Arguments:**
- `siteId` (string): SharePoint site ID
- `driveId` (string, optional): Drive ID
- `itemId` (string): Drive-item ID of the file

## Example Usage

```
List sites:
> Use sharepoint_list_sites to see all accessible SharePoint sites

Browse files:
> Use sharepoint_list_files to see files in site abc123
```

## License

ISC
