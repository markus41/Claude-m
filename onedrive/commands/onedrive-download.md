---
name: onedrive-download
description: Download a file from OneDrive by path or item ID
argument-hint: "<onedrive-path-or-item-id> [--output <local-path>]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Download File from OneDrive

Download a file from the user's OneDrive to a local path.

## Instructions

1. If the argument looks like a GUID, use `GET /me/drive/items/{itemId}/content`.
2. If the argument is a path, use `GET /me/drive/root:/{path}:/content`.
3. Follow the redirect (302) to the download URL.
4. Save to the `--output` path if specified, otherwise save to the current directory with the original filename.
5. Report the downloaded file size and local path.
