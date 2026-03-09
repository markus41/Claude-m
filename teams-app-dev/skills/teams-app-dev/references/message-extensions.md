# Message Extensions Reference — Microsoft Teams

## Overview

Message extensions allow users to interact with your app from the Teams compose box, command bar, and message action menu. There are three types: search-based, action-based, and link unfurling.

**Two implementation tracks**:
| Track | Description | Bot Required | Registration |
|-------|------------|-------------|-------------|
| **Bot-based** | Uses Bot Framework messaging protocol | Yes | Azure Bot (single-tenant) |
| **API-based** | Uses OpenAPI description, no bot | No | OpenAPI spec only |

API-based message extensions can be created from an OpenAPI description and do not require bot registration, making them ideal for simple search/action scenarios backed by REST APIs.

---

## Bot-Based Message Extension Manifest (v1.25)

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
          "description": "Find work items",
          "initialRun": true,
          "fetchTask": false,
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
          "description": "Create a new work item from this message",
          "fetchTask": true,
          "context": ["message", "compose", "commandBox"]
        }
      ],
      "messageHandlers": [
        {
          "type": "link",
          "value": {
            "domains": ["dev.azure.com", "*.visualstudio.com"]
          }
        }
      ]
    }
  ]
}
```

## API-Based Message Extension Manifest (v1.25)

```json
{
  "composeExtensions": [
    {
      "composeExtensionType": "apiBased",
      "apiSpecificationFile": "apiSpecificationFile/openapi.json",
      "commands": [
        {
          "id": "searchProducts",
          "type": "query",
          "title": "Search Products",
          "description": "Find products from the catalog",
          "parameters": [
            {
              "name": "query",
              "title": "Search",
              "description": "Product name or SKU",
              "inputType": "text"
            }
          ]
        }
      ]
    }
  ]
}
```

No `botId` needed — the extension is backed by an HTTP API described in the OpenAPI spec.

---

## Search-Based (Bot)

```typescript
import { TeamsActivityHandler, TurnContext, MessagingExtensionQuery, MessagingExtensionResponse, CardFactory } from "botbuilder";

export class SearchExtensionBot extends TeamsActivityHandler {
  protected async handleTeamsMessagingExtensionQuery(
    context: TurnContext,
    query: MessagingExtensionQuery
  ): Promise<MessagingExtensionResponse> {
    const searchQuery = query.parameters?.[0]?.value as string ?? "";
    const results = await this.searchItems(searchQuery);

    const attachments = results.map((item) => ({
      ...CardFactory.thumbnailCard(
        `#${item.id}: ${item.title}`,
        item.state
      ),
      content: {
        type: "AdaptiveCard",
        version: "1.5",
        body: [
          { type: "TextBlock", text: `#${item.id}: ${item.title}`, weight: "Bolder" },
          { type: "TextBlock", text: `State: ${item.state}`, isSubtle: true },
        ],
      },
      contentType: "application/vnd.microsoft.card.adaptive",
      preview: CardFactory.thumbnailCard(`#${item.id}: ${item.title}`, item.state),
    }));

    return {
      composeExtension: {
        type: "result",
        attachmentLayout: "list",
        attachments,
      },
    };
  }
}
```

---

## Action-Based (Bot) — Uses Dialog Pattern

```typescript
// Fetch task returns a dialog (replaces task module)
protected async handleTeamsMessagingExtensionFetchTask(
  context: TurnContext,
  action: { commandId: string; messagePayload?: { body?: { content?: string } } }
): Promise<{ task: { type: string; value: unknown } }> {
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
            { type: "Input.Text", id: "title", label: "Title", value: prefilledTitle, isRequired: true },
            { type: "Input.ChoiceSet", id: "type", label: "Type", style: "compact", value: "Task",
              choices: [
                { title: "User Story", value: "User Story" },
                { title: "Task", value: "Task" },
                { title: "Bug", value: "Bug" },
              ],
            },
            { type: "Input.Text", id: "description", label: "Description", isMultiline: true },
          ],
          actions: [{ type: "Action.Submit", title: "Create" }],
        }),
      },
    },
  };
}

protected async handleTeamsMessagingExtensionSubmitAction(
  context: TurnContext,
  action: { data: { title: string; type: string; description: string } }
): Promise<MessagingExtensionResponse> {
  const { title, type, description } = action.data;
  const created = await this.createItem({ title, type, description });

  return {
    composeExtension: {
      type: "result",
      attachmentLayout: "list",
      attachments: [{
        ...CardFactory.adaptiveCard({
          type: "AdaptiveCard",
          version: "1.5",
          body: [
            { type: "TextBlock", text: `Created: #${created.id} — ${title}`, weight: "Bolder" },
            { type: "TextBlock", text: `Type: ${type}`, isSubtle: true },
          ],
        }),
        preview: CardFactory.thumbnailCard(`#${created.id}: ${title}`, type),
      }],
    },
  };
}
```

---

## Meeting-Aware Message Extension

```typescript
async handleTeamsMessagingExtensionQuery(
  context: TurnContext,
  query: MessagingExtensionQuery
): Promise<MessagingExtensionResponse> {
  const searchText = query.parameters?.[0]?.value || "";
  const meetingId = context.activity.channelData?.meeting?.id;

  const results = meetingId
    ? await this.searchMeetingItems(meetingId, searchText)
    : await this.searchAllItems(searchText);

  const attachments = results.map((item) => ({
    contentType: "application/vnd.microsoft.card.adaptive",
    content: {
      type: "AdaptiveCard",
      version: "1.5",
      body: [
        { type: "TextBlock", text: item.title, weight: "Bolder" },
        { type: "TextBlock", text: item.description, wrap: true },
      ],
    },
    preview: CardFactory.heroCard(item.title, item.description),
  }));

  return { composeExtension: { type: "result", attachmentLayout: "list", attachments } };
}
```

---

## Link Unfurling

```typescript
protected async handleTeamsAppBasedLinkQuery(
  context: TurnContext,
  query: { url: string }
): Promise<MessagingExtensionResponse> {
  const url = query.url;
  const match = url.match(/workitems\/edit\/(\d+)/);
  if (!match) return {};

  const item = await this.getItem(parseInt(match[1], 10));
  const card = CardFactory.adaptiveCard({
    type: "AdaptiveCard",
    version: "1.5",
    body: [
      { type: "TextBlock", text: `#${item.id}: ${item.title}`, weight: "Bolder" },
      { type: "FactSet", facts: [
        { title: "State", value: item.state },
        { title: "Assigned To", value: item.assignedTo },
      ]},
    ],
    actions: [{ type: "Action.OpenUrl", title: "Open", url }],
  });

  return {
    composeExtension: {
      type: "result",
      attachmentLayout: "list",
      attachments: [{
        ...card,
        preview: CardFactory.thumbnailCard(`#${item.id}: ${item.title}`, item.state),
      }],
    },
  };
}
```

---

## Limits

| Resource | Limit | Notes |
|---|---|---|
| Commands per extension | 10 | Mix of query and action types |
| Parameters per command | 5 | First parameter is primary search field |
| Search results returned | 25 per query | More results discarded |
| Query response timeout | 5 seconds | Return fast results |
| Domains in `messageHandlers` | 10 | Wildcards not supported in link unfurling |
| Task module / dialog height | 16–720 pixels | Teams clips to min/max |
| Task module / dialog width | 16–1000 pixels | Teams clips to min/max |
| Attachment content size | 28 KB | Card JSON limit |
