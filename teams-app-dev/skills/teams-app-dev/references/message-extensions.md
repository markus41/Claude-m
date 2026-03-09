# Message Extensions Reference — Microsoft Teams

## Overview

Message extensions allow users to interact with your app from the Teams compose box, command bar, and message action menu. Three types: search-based, action-based, and link unfurling. All are implemented as bot-based handlers sharing the `/api/messages` endpoint, using Teams SDK v2.

---

## Manifest Structure (v1.25)

```json
{
  "composeExtensions": [
    {
      "botId": "{{BOT_ID}}",
      "commands": [
        {
          "id": "searchItems",
          "type": "query",
          "title": "Search Work Items",
          "description": "Find items",
          "initialRun": true,
          "context": ["compose", "commandBox"],
          "parameters": [
            {
              "name": "searchQuery",
              "title": "Search",
              "description": "Enter search term",
              "inputType": "text"
            }
          ]
        },
        {
          "id": "createItem",
          "type": "action",
          "title": "Create Work Item",
          "description": "Create from message",
          "fetchTask": true,
          "context": ["message", "compose", "commandBox"]
        }
      ],
      "messageHandlers": [
        {
          "type": "link",
          "value": {
            "domains": ["myapp.com", "*.myapp.com"]
          }
        }
      ]
    }
  ]
}
```

---

## Search-Based Message Extension (Teams SDK v2)

```typescript
import { Application, CardFactory } from "@microsoft/teams-sdk";

app.messageExtension.query("searchItems", async (context, query) => {
  const searchQuery = query.parameters?.[0]?.value ?? "";
  const results = await searchWorkItems(searchQuery);

  return {
    composeExtension: {
      type: "result",
      attachmentLayout: "list",
      attachments: results.map((item) => ({
        content: {
          type: "AdaptiveCard",
          version: "1.5",
          body: [
            { type: "TextBlock", text: `#${item.id}: ${item.title}`, weight: "Bolder" },
            { type: "TextBlock", text: `State: ${item.state}`, isSubtle: true },
          ],
          actions: [
            { type: "Action.OpenUrl", title: "View", url: item.url },
          ],
        },
        contentType: "application/vnd.microsoft.card.adaptive",
        preview: CardFactory.thumbnailCard(
          `#${item.id}: ${item.title}`,
          `${item.state} | P${item.priority}`
        ),
      })),
    },
  };
});
```

---

## Action-Based Message Extension (Teams SDK v2)

```typescript
app.messageExtension.fetchTask("createItem", async (context, action) => {
  const prefilledTitle = action.messagePayload?.body?.content?.substring(0, 100) ?? "";

  return {
    task: {
      type: "continue",
      value: {
        title: "Create Work Item",
        height: 450,
        width: 500,
        card: CardFactory.adaptiveCard({
          type: "AdaptiveCard",
          version: "1.5",
          body: [
            { type: "TextBlock", text: "Create Work Item", size: "Large", weight: "Bolder" },
            { type: "Input.Text", id: "title", label: "Title", value: prefilledTitle, isRequired: true },
            {
              type: "Input.ChoiceSet", id: "type", label: "Type", style: "compact", value: "Task",
              choices: [
                { title: "User Story", value: "User Story" },
                { title: "Task", value: "Task" },
                { title: "Bug", value: "Bug" },
              ],
            },
            { type: "Input.Text", id: "description", label: "Description", isMultiline: true },
          ],
          actions: [
            { type: "Action.Submit", title: "Create", data: { commandId: "createItem" } },
          ],
        }),
      },
    },
  };
});

app.messageExtension.submitAction("createItem", async (context, action) => {
  const { title, type, description } = action.data;
  const created = await createWorkItem({ title, type, description });

  return {
    composeExtension: {
      type: "result",
      attachmentLayout: "list",
      attachments: [{
        content: {
          type: "AdaptiveCard",
          version: "1.5",
          body: [
            { type: "TextBlock", text: `Created: #${created.id} — ${title}`, weight: "Bolder" },
            { type: "TextBlock", text: `Type: ${type}`, isSubtle: true },
          ],
        },
        contentType: "application/vnd.microsoft.card.adaptive",
        preview: CardFactory.thumbnailCard(`#${created.id}: ${title}`, type),
      }],
    },
  };
});
```

---

## Link Unfurling (Teams SDK v2)

```typescript
app.messageExtension.linkQuery(async (context, query) => {
  const url = query.url;
  const itemMatch = url.match(/items\/(\d+)/);

  if (itemMatch) {
    const id = parseInt(itemMatch[1], 10);
    const item = await getItem(id);

    return {
      composeExtension: {
        type: "result",
        attachmentLayout: "list",
        attachments: [{
          content: {
            type: "AdaptiveCard",
            version: "1.5",
            body: [
              { type: "TextBlock", text: `#${id}: ${item.title}`, weight: "Bolder", size: "Large" },
              {
                type: "FactSet",
                facts: [
                  { title: "Type", value: item.type },
                  { title: "State", value: item.state },
                  { title: "Assigned To", value: item.assignedTo },
                ],
              },
            ],
            actions: [{ type: "Action.OpenUrl", title: "Open", url }],
          },
          contentType: "application/vnd.microsoft.card.adaptive",
          preview: CardFactory.thumbnailCard(`#${id}: ${item.title}`, item.state),
        }],
      },
    };
  }

  return {};
});
```

---

## Result Types

| Layout | Use Case |
|--------|----------|
| `list` | List of items with thumbnail preview |
| `grid` | Grid of image tiles (requires image in preview) |
| `message` | Plain message (action extension only) |
| `auth` | Redirect to auth page |
| `config` | Redirect to config page |
| `botMessagePreview` | Preview before sending (action) |

---

## API-Based Message Extensions

ATK can auto-generate message extensions from OpenAPI description documents, making them available as Copilot plugins.

---

## Error Codes

| Error | Meaning | Remediation |
|-------|---------|-------------|
| `400` on query | Handler threw exception | Wrap in try/catch; return empty results |
| Unfurling not triggered | Domain not in `messageHandlers.value.domains` | Add all domains including subdomains |
| `fetchTask: true` but no handler | Handler not implemented | Implement `fetchTask` handler |
| Action extension not visible | `context` array missing value | Add `"message"` for message actions |
| `401` on Graph data | Token not available | Implement SSO OBO flow |

---

## Limits

| Resource | Limit |
|---|---|
| Commands per extension | 10 |
| Parameters per command | 5 |
| Search results returned | 25 per query |
| Query response timeout | 5 seconds |
| Link unfurl domains | 10 |
| Dialog dimensions | 16–720px height, 16–1000px width |
| Preview card title length | 255 characters |
| Attachment content size | 28 KB |
