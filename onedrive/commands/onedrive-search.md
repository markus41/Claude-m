---
name: onedrive-search
description: Search for files in OneDrive by name or content
argument-hint: "<search-query> [--top <count>]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Search OneDrive

Search for files in the user's OneDrive by name or content keywords.

## Instructions

1. Call `GET /me/drive/root/search(q='{query}')`.
2. Limit results to `--top` count (default 25).
3. Display results as a table: Name, Path, Size, Last Modified, Web URL.
4. Sort by relevance score.
