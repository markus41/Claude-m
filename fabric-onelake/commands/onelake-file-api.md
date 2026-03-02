---
name: onelake-file-api
description: "Generate OneLake REST API or SDK code for file and directory operations"
argument-hint: "<operation> [--lang <typescript|python|curl>] [--workspace <name>] [--item <name>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Generate OneLake File API Code

Generate ready-to-use code for OneLake file and directory operations using the DFS REST API or Azure SDK.

## Instructions

### 1. Parse Arguments

- `<operation>` — One of: `list`, `read`, `create`, `delete`, `rename`, `acl`, `properties`. Ask if not provided.
- `--lang` — Output language: `typescript`, `python`, `curl`. Default: `typescript`.
- `--workspace` — Workspace name or GUID. Ask if not provided.
- `--item` — Item name (lakehouse/warehouse). Ask if not provided.
- `--path` — File or directory path within the item. Ask if relevant.

### 2. Generate Code by Operation

**`list` — List files and directories**:

TypeScript:
```typescript
import { DataLakeServiceClient } from "@azure/storage-file-datalake";
import { DefaultAzureCredential } from "@azure/identity";

const serviceClient = new DataLakeServiceClient(
  "https://onelake.dfs.fabric.microsoft.com",
  new DefaultAzureCredential()
);
const fsClient = serviceClient.getFileSystemClient("<workspace>");
const dirClient = fsClient.getDirectoryClient("<item>.Lakehouse/<path>");

for await (const item of dirClient.listPaths()) {
  console.log(`${item.isDirectory ? "DIR " : "FILE"} ${item.name} (${item.contentLength ?? 0} bytes)`);
}
```

Python:
```python
from azure.storage.filedatalake import DataLakeServiceClient
from azure.identity import DefaultAzureCredential

service_client = DataLakeServiceClient(
    account_url="https://onelake.dfs.fabric.microsoft.com",
    credential=DefaultAzureCredential()
)
fs_client = service_client.get_file_system_client("<workspace>")
paths = fs_client.get_paths(path="<item>.Lakehouse/<path>")
for path in paths:
    print(f"{'DIR ' if path.is_directory else 'FILE'} {path.name} ({path.content_length or 0} bytes)")
```

curl:
```bash
TOKEN=$(az account get-access-token --resource https://storage.azure.com/ --query accessToken -o tsv)
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://onelake.dfs.fabric.microsoft.com/<workspace>/<item>.Lakehouse/<path>?resource=filesystem&recursive=false"
```

**`read` — Read / download a file**:

TypeScript:
```typescript
const fileClient = fsClient.getFileClient("<item>.Lakehouse/<path>/<filename>");
const downloadResponse = await fileClient.read();
const content = await streamToString(downloadResponse.readableStreamBody!);
```

Python:
```python
file_client = fs_client.get_file_client("<item>.Lakehouse/<path>/<filename>")
download = file_client.download_file()
content = download.readall()
```

curl:
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://onelake.dfs.fabric.microsoft.com/<workspace>/<item>.Lakehouse/<path>/<filename>"
```

**`create` — Create a file or directory**:

TypeScript (directory):
```typescript
const dirClient = fsClient.getDirectoryClient("<item>.Lakehouse/Files/<new-dir>");
await dirClient.create();
```

TypeScript (file with content):
```typescript
const fileClient = fsClient.getFileClient("<item>.Lakehouse/Files/<filename>");
await fileClient.create();
const content = Buffer.from("file contents here");
await fileClient.append(content, 0, content.length);
await fileClient.flush(content.length);
```

**`delete` — Delete a file or directory**:

TypeScript:
```typescript
// File
const fileClient = fsClient.getFileClient("<item>.Lakehouse/Files/<filename>");
await fileClient.delete();

// Directory (recursive)
const dirClient = fsClient.getDirectoryClient("<item>.Lakehouse/Files/<dir>");
await dirClient.delete(true); // recursive = true
```

**`rename` — Rename or move a file/directory**:

TypeScript:
```typescript
const fileClient = fsClient.getFileClient("<item>.Lakehouse/Files/<old-name>");
await fileClient.move("<item>.Lakehouse/Files/<new-name>");
```

**`acl` — Get or set access control**:

TypeScript:
```typescript
// Get ACL
const acl = await fileClient.getAccessControl();
console.log(`Owner: ${acl.owner}, Group: ${acl.group}, ACL: ${acl.acl}`);

// Set ACL
await fileClient.setAccessControl({ acl: "user::rwx,group::r-x,other::---" });
```

**`properties` — Get file/directory properties**:

TypeScript:
```typescript
const properties = await fileClient.getProperties();
console.log(`Size: ${properties.contentLength}`);
console.log(`Modified: ${properties.lastModified}`);
console.log(`Content-Type: ${properties.contentType}`);
```

### 3. Add Authentication Boilerplate

Always include the authentication setup at the top of generated code:
- TypeScript: `DefaultAzureCredential` from `@azure/identity`
- Python: `DefaultAzureCredential` from `azure.identity`
- curl: `az account get-access-token` for bearer token

### 4. Output

Write the generated code to a file or display inline. Include:
- Required package imports
- Authentication setup
- The requested operation
- Error handling (try/catch or try/except)
- Comments explaining each step
- Reminder to install dependencies (`npm install` or `pip install`)
