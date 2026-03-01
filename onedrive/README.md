# Microsoft OneDrive Plugin

A Claude Code knowledge plugin for OneDrive file management via Microsoft Graph API — upload, download, share, search, and delta sync for personal and business drives.

## What This Plugin Provides

This is a **knowledge plugin** -- it gives Claude deep expertise in OneDrive file operations so it can generate correct Graph API code, manage sharing permissions, implement delta sync patterns, and handle large file uploads. It does not contain runtime code, MCP servers, or executable scripts.

## Setup

Run `/setup` to configure authentication and verify OneDrive access:

```
/setup              # Full guided setup
/setup --minimal    # Node.js dependencies only
```

## Capabilities

| Area | What Claude Can Do |
|------|-------------------|
| **File Operations** | Upload, download, move, copy, and delete files and folders via Graph API |
| **Sharing** | Create sharing links, manage permissions, invite collaborators with scoped access |
| **Search** | Full-text search across file names and content with relevance scoring |
| **Delta Sync** | Track file changes over time with delta queries for efficient sync clients |
| **Large Files** | Resumable upload sessions for files up to 250 GB with chunked transfer |
| **Review** | Analyze OneDrive integration code for correct API usage, upload patterns, and security |

## Commands

| Command | Description |
|---------|-------------|
| `/onedrive-upload` | Upload a file to OneDrive (auto-selects simple or resumable upload) |
| `/onedrive-download` | Download a file by path or item ID |
| `/onedrive-share` | Create a sharing link for a file or folder |
| `/onedrive-search` | Search for files by name or content |
| `/onedrive-sync-status` | Check recent file changes using delta queries |
| `/setup` | Configure Azure auth and verify OneDrive access |

## Agent

| Agent | Description |
|-------|-------------|
| **OneDrive Integration Reviewer** | Reviews Graph API usage, upload patterns, sharing security, and delta sync implementation |

## Plugin Structure

```
onedrive/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── onedrive-files/
│       └── SKILL.md
├── commands/
│   ├── onedrive-upload.md
│   ├── onedrive-download.md
│   ├── onedrive-share.md
│   ├── onedrive-search.md
│   ├── onedrive-sync-status.md
│   └── setup.md
├── agents/
│   └── onedrive-reviewer.md
└── README.md
```

## Trigger Keywords

The skill activates automatically when conversations mention: `onedrive`, `file upload`, `file download`, `sharing link`, `file search`, `drive item`, `delta query`, `onedrive sync`, `file permissions`, `large file upload`, `resumable upload`.

## Author

Markus Ahling
