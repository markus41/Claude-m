---
name: onelake-upload
description: "Upload local files or directories to a OneLake lakehouse via DFS API"
argument-hint: "<local-path> --workspace <name> --item <name> [--dest <remote-path>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Upload Files to OneLake

Upload local files or entire directories to a Fabric OneLake lakehouse using the ADLS Gen2 DFS API.

## Instructions

### 1. Validate Inputs

- `<local-path>` — Path to a local file or directory. Ask if not provided.
- `--workspace` — Target workspace name or GUID. Ask if not provided.
- `--item` — Target lakehouse name. Ask if not provided.
- `--dest` — Destination path within the item (default: `Files/`). Must start with `Files/` for unmanaged files.

### 2. Acquire Access Token

```bash
TOKEN=$(az account get-access-token --resource https://storage.azure.com/ --query accessToken -o tsv)
```

### 3. Validate Destination

Check that the destination path is valid:
- Unmanaged files should go under `Files/` (e.g., `Files/raw/`, `Files/uploads/`)
- Do NOT upload directly to `Tables/` — that folder is managed by Spark/Delta operations
- Warn the user if they try to upload to `Tables/`

### 4. Create Destination Directory (if needed)

```bash
curl -X PUT \
  "https://onelake.dfs.fabric.microsoft.com/<workspace>/<item>.Lakehouse/<dest-path>?resource=directory" \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Upload Files

**Single file upload**:

Step 1 — Create the file:
```bash
curl -X PUT \
  "https://onelake.dfs.fabric.microsoft.com/<workspace>/<item>.Lakehouse/<dest-path>/<filename>?resource=file" \
  -H "Authorization: Bearer $TOKEN"
```

Step 2 — Append data:
```bash
curl -X PATCH \
  "https://onelake.dfs.fabric.microsoft.com/<workspace>/<item>.Lakehouse/<dest-path>/<filename>?action=append&position=0" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @<local-file>
```

Step 3 — Flush (commit):
```bash
curl -X PATCH \
  "https://onelake.dfs.fabric.microsoft.com/<workspace>/<item>.Lakehouse/<dest-path>/<filename>?action=flush&position=<file-size>" \
  -H "Authorization: Bearer $TOKEN"
```

**Directory upload**:

For each file in the directory tree:
1. Create parent directories as needed
2. Upload each file using the three-step process above
3. Show progress: `Uploaded 3/15 files...`

**Large file upload (> 100 MB)**:

For large files, upload in chunks:
1. Create the file resource
2. Append in 4 MB chunks with incrementing `position`
3. Flush after all chunks are appended

### 6. Verify Upload

List the uploaded files to confirm:

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://onelake.dfs.fabric.microsoft.com/<workspace>/<item>.Lakehouse/<dest-path>?resource=filesystem&recursive=true" \
  | python -m json.tool
```

### 7. Display Summary

Show the user:
- Number of files uploaded
- Total size uploaded
- Destination path in OneLake
- How to access from Spark: `abfss://<workspace>@onelake.dfs.fabric.microsoft.com/<item>.Lakehouse/<dest-path>/`
- Reminder: files under `Files/` are unmanaged — use Spark to convert to Delta tables if needed
