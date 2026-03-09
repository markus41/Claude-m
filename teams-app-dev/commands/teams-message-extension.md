---
name: teams-message-extension
description: "Scaffold a message extension handler (search, action, link unfurling, or meeting-aware) with manifest v1.25 fragment"
argument-hint: "<search|action|link-unfurl|meeting> --name <command-name>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Scaffold a Message Extension

Generate a message extension handler and the corresponding manifest v1.25 fragment.

## Instructions

### 1. Validate Inputs

- `<type>` — One of: `search`, `action`, `link-unfurl`, `meeting`. Ask if not provided.
- `--name` — Command name/ID (e.g., `searchProducts`, `createTicket`, `meetingAgenda`). Ask if not provided.

### 2. Generate the Handler

**For `search` type**:
Create a `handleTeamsMessagingExtensionQuery` method that:
- Reads the search text from `query.parameters[0].value`
- Calls a service/API to fetch results
- Maps results to Adaptive Card attachments with both `content` and `preview` cards
- Returns a `MessagingExtensionResponse` with `type: "result"` and `attachmentLayout: "list"`

**For `action` type**:
Create two methods:
1. `handleTeamsMessagingExtensionFetchTask` — Returns a dialog with an Adaptive Card form
2. `handleTeamsMessagingExtensionSubmitAction` — Processes the submitted form data

**For `link-unfurl` type**:
Create a `handleTeamsAppBasedLinkQuery` method that:
- Extracts the URL from `query.url`
- Fetches metadata for the URL
- Returns a thumbnail or hero card

**For `meeting` type**:
Create a meeting-aware message extension that:
- Detects meeting context from `context.activity.channelData?.meeting?.id`
- Adapts search results based on meeting context
- Creates action items linked to the meeting
- Uses both `handleTeamsMessagingExtensionQuery` and submit/fetch handlers

### 3. Generate the Manifest v1.25 Fragment

Produce the `composeExtensions` JSON to merge into `manifest.json` (v1.25).

**Meeting** type generates both search + action commands for agenda search and action item creation.

### 4. Update Manifest

If `appPackage/manifest.json` exists:
- Verify it uses v1.25 schema (warn if older)
- Merge the `composeExtensions` section
- Add any new domains to `validDomains`
- For meeting extensions, ensure `configurableTabs` include meeting context scopes

### 5. Display Summary

Show the user:
- Generated handler file path and key methods
- Manifest fragment that was added
- How to test the extension in Teams or Agents Playground
- For meeting extensions: how to test in a scheduled meeting
- Reminder to register the bot if not already done (`/setup`)
