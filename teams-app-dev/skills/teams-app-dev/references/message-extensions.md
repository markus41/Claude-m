# Message Extensions Reference — Microsoft Teams

## Overview

Message extensions allow users to interact with your app from the Teams compose box, command bar, and message action menu. There are three types: search-based (find and share content), action-based (trigger workflows with a form), and link unfurling (enrich URLs pasted in chat). All are implemented as bots using the Bot Framework.

---

## Manifest Structure

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
          "description": "Find Azure DevOps work items",
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
          "context": ["message", "compose", "commandBox"],
          "parameters": [
            {
              "name": "title",
              "title": "Title",
              "description": "Work item title",
              "inputType": "text"
            }
          ]
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

---

## Search-Based Message Extension

```typescript
import {
  TeamsActivityHandler,
  TurnContext,
  MessagingExtensionQuery,
  MessagingExtensionResponse,
  CardFactory,
} from "botbuilder";

export class SearchExtensionBot extends TeamsActivityHandler {
  protected async handleTeamsMessagingExtensionQuery(
    context: TurnContext,
    query: MessagingExtensionQuery
  ): Promise<MessagingExtensionResponse> {
    const searchQuery = query.parameters?.[0]?.value as string ?? "";
    const initialRun = !searchQuery; // `initialRun: true` triggers with empty query

    // Fetch results from your backend
    const results = await this.searchWorkItems(searchQuery);

    // Build result cards
    const attachments = results.map((item) => {
      const card = {
        type: "AdaptiveCard",
        version: "1.6",
        body: [
          { type: "TextBlock", text: `#${item.id}: ${item.title}`, weight: "Bolder" },
          { type: "TextBlock", text: `State: ${item.state} | Priority: ${item.priority}`, isSubtle: true },
        ],
        actions: [
          {
            type: "Action.OpenUrl",
            title: "View",
            url: `https://dev.azure.com/org/project/_workitems/edit/${item.id}`,
          },
        ],
      };

      return {
        // Card shown in the results list (thumbnail)
        ...CardFactory.thumbnailCard(
          `#${item.id}: ${item.title}`,
          item.state,
          undefined,
          [{ type: "openUrl", title: "View", value: `https://dev.azure.com/org/project/_workitems/edit/${item.id}` }]
        ),
        // Card inserted into compose box when selected
        content: card,
        contentType: "application/vnd.microsoft.card.adaptive",
        preview: CardFactory.thumbnailCard(
          `#${item.id}: ${item.title}`,
          `${item.state} | P${item.priority}`,
          ["https://dev.azure.com/favicon.ico"]
        ),
      };
    });

    return {
      composeExtension: {
        type: "result",
        attachmentLayout: "list",  // "list" | "grid"
        attachments,
      },
    };
  }

  private async searchWorkItems(query: string) {
    // Replace with real API call
    return [
      { id: 1001, title: "Login page", state: "Active", priority: 1 },
      { id: 1002, title: "Dashboard", state: "New", priority: 2 },
    ].filter((i) => !query || i.title.toLowerCase().includes(query.toLowerCase()));
  }
}
```

---

## Action-Based Message Extension

```typescript
protected async handleTeamsMessagingExtensionFetchTask(
  context: TurnContext,
  action: { commandId: string; messagePayload?: { body?: { content?: string } } }
): Promise<{ task: { type: string; value: unknown } }> {
  const prefilledTitle = action.messagePayload?.body?.content?.substring(0, 100) ?? "";

  // Return a task module (Adaptive Card)
  return {
    task: {
      type: "continue",
      value: {
        title: "Create Work Item",
        height: 450,
        width: 500,
        card: CardFactory.adaptiveCard({
          type: "AdaptiveCard",
          version: "1.6",
          body: [
            { type: "TextBlock", text: "Create Work Item", size: "Large", weight: "Bolder" },
            {
              type: "Input.Text",
              id: "title",
              label: "Title",
              value: prefilledTitle,
              isRequired: true,
              errorMessage: "Title is required",
            },
            {
              type: "Input.ChoiceSet",
              id: "type",
              label: "Type",
              style: "compact",
              value: "Task",
              choices: [
                { title: "User Story", value: "User Story" },
                { title: "Task", value: "Task" },
                { title: "Bug", value: "Bug" },
              ],
            },
            {
              type: "Input.Text",
              id: "description",
              label: "Description",
              isMultiline: true,
            },
          ],
          actions: [
            {
              type: "Action.Submit",
              title: "Create",
              data: { commandId: action.commandId },
            },
          ],
        }),
      },
    },
  };
}

protected async handleTeamsMessagingExtensionSubmitAction(
  context: TurnContext,
  action: {
    commandId: string;
    data: { title: string; type: string; description: string; commandId: string };
    messagePayload?: unknown;
  }
): Promise<MessagingExtensionResponse> {
  const { title, type, description } = action.data;

  // Create the work item
  const created = await this.createWorkItem({ title, type, description });

  // Return a card to insert into the compose box
  const resultCard = CardFactory.adaptiveCard({
    type: "AdaptiveCard",
    version: "1.6",
    body: [
      { type: "TextBlock", text: `Created: #${created.id} — ${title}`, weight: "Bolder" },
      { type: "TextBlock", text: `Type: ${type}`, isSubtle: true },
    ],
    actions: [
      {
        type: "Action.OpenUrl",
        title: "View",
        url: `https://dev.azure.com/org/project/_workitems/edit/${created.id}`,
      },
    ],
  });

  return {
    composeExtension: {
      type: "result",
      attachmentLayout: "list",
      attachments: [
        {
          ...resultCard,
          preview: CardFactory.thumbnailCard(`#${created.id}: ${title}`, type),
        },
      ],
    },
  };
}

private async createWorkItem(data: { title: string; type: string; description: string }) {
  // Replace with real ADO API call
  return { id: Math.floor(Math.random() * 9999) };
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

  // Parse the URL to determine what to show
  const workItemMatch = url.match(/workitems\/edit\/(\d+)/);

  if (workItemMatch) {
    const id = parseInt(workItemMatch[1], 10);
    const item = await this.getWorkItem(id);

    const card = CardFactory.adaptiveCard({
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        { type: "TextBlock", text: `Work Item #${id}: ${item.title}`, weight: "Bolder", size: "Large" },
        {
          type: "FactSet",
          facts: [
            { title: "Type", value: item.type },
            { title: "State", value: item.state },
            { title: "Assigned To", value: item.assignedTo },
            { title: "Priority", value: String(item.priority) },
          ],
        },
      ],
      actions: [
        { type: "Action.OpenUrl", title: "Open in ADO", url },
      ],
    });

    return {
      composeExtension: {
        type: "result",
        attachmentLayout: "list",
        attachments: [
          {
            ...card,
            preview: CardFactory.thumbnailCard(
              `#${id}: ${item.title}`,
              item.state
            ),
          },
        ],
      },
    };
  }

  // Return empty/null to not unfurl this URL
  return {};
}

private async getWorkItem(id: number) {
  return { title: "Sample Item", type: "Task", state: "Active", assignedTo: "Dev", priority: 2 };
}
```

---

## Result Types

| Layout | Use Case | Card Types Supported |
|--------|----------|---------------------|
| `list` | List of items with thumbnail preview | Hero card, thumbnail card, Adaptive Card |
| `grid` | Grid of image tiles | Hero card (image required) |
| `message` | Plain message (action extension only) | Text or Adaptive Card |
| `auth` | Redirect to auth page | Auth URL |
| `config` | Redirect to config page | Config URL |
| `silentAuth` | Silent authentication | Token |
| `botMessagePreview` | Preview before sending (action) | Adaptive Card |

---

## Bot Message Preview Pattern (Action Extension)

```typescript
// Step 1: Return a preview for user to review before sending
protected async handleTeamsMessagingExtensionSubmitAction(
  context: TurnContext,
  action: { botActivityPreview?: Array<{ attachments: unknown[] }>; data: Record<string, string> }
): Promise<MessagingExtensionResponse | MessagingExtensionActionResponse> {
  if (!action.botActivityPreview) {
    // First submit — show preview
    const previewCard = this.buildResultCard(action.data);
    return {
      composeExtension: {
        type: "botMessagePreview",
        activityPreview: {
          type: "message",
          attachments: [previewCard],
        },
      },
    };
  }

  // User confirmed — send the card
  const card = action.botActivityPreview[0]?.attachments?.[0];
  await context.sendActivity({ type: "message", attachments: [card] });
  return {};
}

private buildResultCard(data: Record<string, string>) {
  return CardFactory.adaptiveCard({
    type: "AdaptiveCard",
    version: "1.6",
    body: [{ type: "TextBlock", text: data.title }],
  });
}
```

---

## Result Card with Graph Data

```typescript
// Fetch user info from Graph API and embed in search result
import { Client } from "@microsoft/microsoft-graph-client";

async function enrichResultWithGraph(
  graphClient: Client,
  searchQuery: string
): Promise<MessagingExtensionResponse> {
  const users = await graphClient
    .api("/users")
    .filter(`startsWith(displayName,'${searchQuery}')`)
    .select("id,displayName,mail,jobTitle,officeLocation")
    .top(5)
    .get();

  const attachments = users.value.map((user: {
    id: string;
    displayName: string;
    mail: string;
    jobTitle: string;
    officeLocation: string;
  }) => {
    const card = CardFactory.adaptiveCard({
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        { type: "TextBlock", text: user.displayName, weight: "Bolder" },
        { type: "TextBlock", text: user.jobTitle, isSubtle: true, spacing: "None" },
        { type: "TextBlock", text: user.officeLocation, isSubtle: true, spacing: "None" },
      ],
      actions: [
        { type: "Action.OpenUrl", title: "Email", url: `mailto:${user.mail}` },
      ],
    });

    return {
      ...card,
      preview: CardFactory.thumbnailCard(
        user.displayName,
        `${user.jobTitle} — ${user.officeLocation}`,
        [`https://graph.microsoft.com/v1.0/users/${user.id}/photo/$value`]
      ),
    };
  });

  return {
    composeExtension: {
      type: "result",
      attachmentLayout: "list",
      attachments,
    },
  };
}
```

---

## Error Codes

| Error | Meaning | Remediation |
|-------|---------|-------------|
| `composeExtension.type` missing | Response object malformed | Always wrap response in `composeExtension` |
| `400` on query | Query handler threw exception | Wrap in try/catch; return empty results on error |
| Unfurling not triggered | Domain not listed in `messageHandlers.value.domains` | Add all domains including subdomains |
| `fetchTask: true` but no `task/fetch` handler | Bot handler not implemented | Implement `handleTeamsMessagingExtensionFetchTask` |
| Action extension not visible | `context` array missing required value | Add `"message"` to `context` for message actions |
| Preview card not shown in grid | Card missing image URL | Grid layout requires `image` in preview |
| `401` on Graph data | Graph token not available | Implement SSO OBO flow for message extensions |
| Task module not opening | Height/width out of range | Use 16–720 px height, 16–1000 px width |

---

## Limits

| Resource | Limit | Notes |
|---|---|---|
| Commands per extension | 10 | Mix of query and action types |
| Parameters per command | 5 | First parameter is primary search field |
| Search results returned | 25 per query | More results are discarded |
| Query response timeout | 5 seconds | Return cached or fast results; background-load details |
| Domains in `messageHandlers` | 10 | Wildcards not supported in link unfurling domains |
| Task module height | 16–720 pixels | Teams clips to min/max |
| Task module width | 16–1000 pixels | Teams clips to min/max |
| Preview card title length | 255 characters | Truncated in UI |
| Attachment content size | 28 KB | Card JSON limit |
| `botActivityPreview` previews | 1 | Only one preview card supported |
