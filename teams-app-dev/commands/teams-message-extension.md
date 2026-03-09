---
name: teams-message-extension
description: "Scaffold a message extension handler (search, action, or link unfurling) with manifest fragment using Teams SDK v2"
argument-hint: "<search|action|link-unfurl> --name <command-name>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Scaffold a Message Extension

Generate a message extension handler and the corresponding manifest fragment using Teams SDK v2.

## Instructions

### 1. Validate Inputs

- `<type>` — One of: `search`, `action`, `link-unfurl`. Ask if not provided.
- `--name` — Command name/ID (e.g., `searchProducts`, `createTicket`). Ask if not provided.

### 2. Generate the Handler (Teams SDK v2)

**For `search` type**:
Generate a `messageExtension.query` handler that:
- Reads the search text from `query.parameters[0].value`
- Calls a service/API to fetch results
- Maps results to Adaptive Card attachments with both `content` and `preview` cards
- Returns a `MessagingExtensionResponse` with `type: "result"` and `attachmentLayout: "list"`

Ask the user what data source to search (describe the expected result fields).

```typescript
app.messageExtension.query("<command-name>", async (context, query) => {
  const searchText = query.parameters?.[0]?.value ?? "";
  const results = await searchService(searchText);
  return {
    composeExtension: {
      type: "result",
      attachmentLayout: "list",
      attachments: results.map((item) => ({
        content: buildCard(item),
        contentType: "application/vnd.microsoft.card.adaptive",
        preview: CardFactory.thumbnailCard(item.title, item.subtitle),
      })),
    },
  };
});
```

**For `action` type**:
Generate two handlers:
1. `messageExtension.fetchTask` — Returns a dialog with an Adaptive Card form
2. `messageExtension.submitAction` — Processes the submitted form data and returns a result card

Ask the user what form fields to include and what happens on submit.

**For `link-unfurl` type**:
Generate a `messageExtension.linkQuery` handler that:
- Extracts the URL from `query.url`
- Fetches metadata for the URL
- Returns a thumbnail or hero card with title, description, and image

Ask the user which domains to unfurl.

### 3. Generate the Manifest Fragment

Produce the `composeExtensions` JSON to merge into `manifest.json`:

**Search**:
```json
{
  "composeExtensions": [{
    "botId": "{{BOT_ID}}",
    "commands": [{
      "id": "<command-name>",
      "type": "query",
      "title": "<Title>",
      "description": "<Description>",
      "initialRun": true,
      "parameters": [{ "name": "query", "title": "Search", "description": "<what to search>" }]
    }]
  }]
}
```

**Action**:
```json
{
  "composeExtensions": [{
    "botId": "{{BOT_ID}}",
    "commands": [{
      "id": "<command-name>",
      "type": "action",
      "title": "<Title>",
      "description": "<Description>",
      "context": ["message", "compose"],
      "fetchTask": true
    }]
  }]
}
```

**Link unfurl**:
```json
{
  "composeExtensions": [{
    "botId": "{{BOT_ID}}",
    "messageHandlers": [{
      "type": "link",
      "value": { "domains": ["<domain1>", "<domain2>"] }
    }]
  }]
}
```

### 4. Update Manifest

If `appPackage/manifest.json` exists, merge the `composeExtensions` section into it. If `composeExtensions` already exists, append the new command to the existing array.

Also add any new domains to `validDomains`.

### 5. Display Summary

Show the user:
- Generated handler file path and key methods
- Manifest fragment that was added
- How to test the extension in Teams
- Reminder to register the bot if not already done (`/setup`)
- Note: Message extensions share the bot endpoint (`/api/messages`)
