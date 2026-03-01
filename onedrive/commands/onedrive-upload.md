---
name: onedrive-upload
description: Upload a file to OneDrive. Automatically uses resumable upload for files over 4 MB.
argument-hint: "<local-file-path> [--dest <onedrive-path>] [--conflict rename|replace|fail]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
---

# Upload File to OneDrive

Upload a local file to the user's OneDrive. Automatically selects the appropriate upload method based on file size.

## Instructions

1. Determine the local file path and size.
2. If `--dest` is provided, use it as the OneDrive destination path. Otherwise, upload to the root.
3. If file size <= 4 MB, use simple upload: `PUT /me/drive/root:/{path}:/content`.
4. If file size > 4 MB, use resumable upload:
   a. Create upload session: `POST /me/drive/root:/{path}:/createUploadSession`
   b. Upload in 5 MB chunks with `Content-Range` headers.
   c. Handle chunk failures with retry.
5. Set `@microsoft.graph.conflictBehavior` based on `--conflict` flag (default: `rename`).
6. Report the uploaded file's web URL and ID on success.
