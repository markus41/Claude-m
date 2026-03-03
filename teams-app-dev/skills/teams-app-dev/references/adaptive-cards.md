# Adaptive Cards Reference — Microsoft Teams

## Overview

Adaptive Cards are a cross-host JSON card format used throughout Teams for bots, message extensions, notifications, and meeting extensions. Schema version 1.6 is the current maximum supported by Teams. This reference covers the full card schema, actions, data binding templates, Universal Actions, Teams-specific rendering quirks, and error handling.

---

## Schema Version Support

| Teams Client | Max Schema Version | Notes |
|---|---|---|
| Teams Desktop (Windows) | 1.6 | Full feature set |
| Teams Desktop (macOS) | 1.6 | Full feature set |
| Teams Mobile (iOS) | 1.5 | Some 1.6 elements fall back |
| Teams Mobile (Android) | 1.5 | Some 1.6 elements fall back |
| Teams Web | 1.6 | Feature parity with desktop |
| Outlook (via connector) | 1.4 | Older schema; avoid 1.5+ elements |

Always declare the schema version you use:
```json
{
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "type": "AdaptiveCard",
  "version": "1.6"
}
```

---

## Card Layout Elements

### Container and Column Layout

```json
{
  "type": "AdaptiveCard",
  "version": "1.6",
  "body": [
    {
      "type": "Container",
      "style": "emphasis",
      "bleed": true,
      "items": [
        {
          "type": "ColumnSet",
          "columns": [
            {
              "type": "Column",
              "width": "auto",
              "items": [
                {
                  "type": "Image",
                  "url": "https://example.com/logo.png",
                  "size": "Small",
                  "style": "Person"
                }
              ]
            },
            {
              "type": "Column",
              "width": "stretch",
              "items": [
                { "type": "TextBlock", "text": "John Smith", "weight": "Bolder" },
                { "type": "TextBlock", "text": "Engineering", "isSubtle": true, "spacing": "None" }
              ]
            }
          ]
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "**Status:** {{status}}",
      "wrap": true,
      "markdown": true
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "Priority", "value": "{{priority}}" },
        { "title": "Due Date", "value": "{{dueDate}}" },
        { "title": "Assigned To", "value": "{{assignedTo}}" }
      ]
    },
    {
      "type": "Image",
      "url": "https://example.com/chart.png",
      "altText": "Weekly trend chart",
      "size": "Stretch"
    }
  ]
}
```

### TextBlock Properties

```json
{
  "type": "TextBlock",
  "text": "Alert: **Service degraded** on {{serviceName}}",
  "color": "Attention",
  "size": "Large",
  "weight": "Bolder",
  "wrap": true,
  "maxLines": 3,
  "fontType": "Monospace",
  "horizontalAlignment": "Left",
  "isSubtle": false,
  "markdown": true
}
```

| Property | Values |
|----------|--------|
| `color` | `Default`, `Dark`, `Light`, `Accent`, `Good`, `Warning`, `Attention` |
| `size` | `Small`, `Default`, `Medium`, `Large`, `ExtraLarge` |
| `weight` | `Lighter`, `Default`, `Bolder` |
| `fontType` | `Default`, `Monospace` |
| `horizontalAlignment` | `Left`, `Center`, `Right` |

### Input Elements

```json
{
  "type": "Input.Text",
  "id": "userComment",
  "label": "Comment",
  "placeholder": "Enter your comment...",
  "isMultiline": true,
  "maxLength": 500,
  "isRequired": true,
  "errorMessage": "Comment is required"
},
{
  "type": "Input.ChoiceSet",
  "id": "priority",
  "label": "Priority",
  "style": "compact",
  "isRequired": true,
  "value": "medium",
  "choices": [
    { "title": "High", "value": "high" },
    { "title": "Medium", "value": "medium" },
    { "title": "Low", "value": "low" }
  ]
},
{
  "type": "Input.Date",
  "id": "dueDate",
  "label": "Due Date",
  "min": "2026-01-01",
  "max": "2026-12-31"
},
{
  "type": "Input.Toggle",
  "id": "sendNotification",
  "label": "Notify team",
  "title": "Send a notification to the team",
  "value": "true",
  "valueOn": "true",
  "valueOff": "false"
}
```

---

## Card Actions

### Action.Submit (Bot Framework)

Sends card data to the bot as a message activity. Used with Bot Framework bots.

```json
{
  "type": "Action.Submit",
  "title": "Approve",
  "data": {
    "action": "approve",
    "itemId": "{{itemId}}",
    "additionalData": "context"
  },
  "style": "positive"
}
```

**Handling in bot (TypeScript):**
```typescript
this.onMessage(async (context, next) => {
  if (context.activity.value) {
    // Card submit
    const data = context.activity.value as { action: string; itemId: string };
    if (data.action === "approve") {
      await this.handleApproval(context, data.itemId);
    }
  }
  await next();
});
```

### Action.OpenUrl

```json
{
  "type": "Action.OpenUrl",
  "title": "View in Azure DevOps",
  "url": "https://dev.azure.com/org/project/_workitems/edit/{{id}}"
}
```

### Action.ShowCard

Reveals an embedded card (inline form or details). No round-trip to the bot.

```json
{
  "type": "Action.ShowCard",
  "title": "Add Comment",
  "card": {
    "type": "AdaptiveCard",
    "body": [
      {
        "type": "Input.Text",
        "id": "comment",
        "label": "Your comment",
        "isMultiline": true
      }
    ],
    "actions": [
      {
        "type": "Action.Submit",
        "title": "Submit",
        "data": { "action": "addComment" }
      }
    ]
  }
}
```

### Action.Execute (Universal Actions — Teams Only)

Sends an `adaptiveCard/action` invoke to the bot and refreshes the card in-place. Requires Bot Framework SDK v4.14+ and TeamsActivityHandler.

```json
{
  "type": "Action.Execute",
  "title": "Approve",
  "verb": "approve",
  "data": {
    "itemId": "{{itemId}}"
  },
  "associatedInputs": "auto"
}
```

**Handling invoke in bot:**
```typescript
protected async onAdaptiveCardInvoke(
  context: TurnContext,
  invokeValue: AdaptiveCardInvokeValue
): Promise<AdaptiveCardInvokeResponse> {
  const { verb, data } = invokeValue.action;

  if (verb === "approve") {
    await this.approveItem(data.itemId);

    // Return updated card
    return {
      statusCode: 200,
      type: "application/vnd.microsoft.card.adaptive",
      value: this.buildApprovedCard(data.itemId),
    };
  }

  return { statusCode: 400, type: "application/vnd.microsoft.error", value: {} };
}
```

---

## Card Templates (Data Binding)

Use the Adaptive Cards Templating SDK to separate card structure from data.

```typescript
import { AdaptiveCardTemplate } from "adaptivecards-templating";

const templateJson = {
  type: "AdaptiveCard",
  version: "1.6",
  body: [
    {
      type: "TextBlock",
      text: "Incident: ${title}",
      weight: "Bolder",
      size: "Large"
    },
    {
      type: "FactSet",
      facts: [
        { title: "Severity", value: "${severity}" },
        { title: "Owner", value: "${owner.displayName}" },
        { title: "Created", value: "${formatDateTime(createdAt, 'ddd MMM d')}" }
      ]
    },
    {
      type: "Container",
      $when: "${severity == 'Critical'}",
      style: "attention",
      items: [
        { type: "TextBlock", text: "CRITICAL — Immediate action required", color: "Attention" }
      ]
    }
  ]
};

const template = new AdaptiveCardTemplate(templateJson);

const card = template.expand({
  $root: {
    title: "Database connection pool exhausted",
    severity: "Critical",
    owner: { displayName: "On-Call Engineer" },
    createdAt: new Date().toISOString(),
  }
});

// card is a plain object — serialize to JSON and attach to bot message
```

---

## Universal Actions — Refresh Pattern

Auto-refresh a card on open (e.g., for real-time status):

```json
{
  "type": "AdaptiveCard",
  "version": "1.6",
  "refresh": {
    "action": {
      "type": "Action.Execute",
      "verb": "refresh",
      "data": { "taskId": "{{taskId}}" }
    },
    "userIds": ["<user-aad-object-id>"]
  },
  "body": [...]
}
```

`userIds` limits which users trigger an automatic refresh invoke. Use `[]` (empty) to refresh for all users (not recommended for high-traffic channels).

---

## Sending Cards from a Bot

```typescript
import { CardFactory, MessageFactory } from "botbuilder";

const card = CardFactory.adaptiveCard({
  type: "AdaptiveCard",
  version: "1.6",
  body: [
    { type: "TextBlock", text: "Hello from bot!", weight: "Bolder" }
  ],
  actions: [
    { type: "Action.Submit", title: "Acknowledge", data: { action: "ack" } }
  ]
});

await context.sendActivity(MessageFactory.attachment(card));

// Update an existing card (for Universal Actions)
const activity = MessageFactory.attachment(CardFactory.adaptiveCard(updatedCard));
activity.id = context.activity.replyToId;
await context.updateActivity(activity);
```

---

## Teams-Specific Rendering Quirks

| Behavior | Details |
|---|---|
| Markdown in TextBlock | `markdown: true` is Teams default; set `markdown: false` to disable |
| `Action.Submit` with empty data | Teams sends the full input values as `value`; no explicit `data` needed |
| `Input.*` labels | Teams renders labels above inputs; use `label` property (not a TextBlock before the input) |
| `Container.bleed` | Bleed only works when container is inside another container with a non-default style |
| `ImageSet` max images | Teams renders max 5 images in an ImageSet; extras are cropped |
| Card width | Fixed to channel/chat width; do not rely on pixel widths |
| `Action.Execute` requires Universal Actions manifest entry | App manifest must include `"supportsFiles": false` and `"composeExtensions"` or bot configuration |
| Theming (light/dark) | Cards adapt to Teams theme; `color` properties respect theme — avoid hard-coded hex |
| `RichTextBlock` | Supported in Teams 1.6; use `Inline` for mixed styling within a paragraph |
| Card size limit | Cards are truncated at ~28 KB in Teams; break large cards into multiple messages |

---

## Error Codes

| Code | Meaning | Remediation |
|------|---------|-------------|
| `BadRequest` (invoke) | `adaptiveCard/action` payload malformed | Check `verb` and `data` match bot handler expectations |
| `NotSupported` | Action type not supported in client version | Check schema version; use feature detection |
| `400` on card send | Card JSON schema validation failed | Validate against `http://adaptivecards.io/schemas/adaptive-card.json` |
| Card not rendering | Unsupported element for schema version | Downgrade schema or use fallback element |
| `409` on card update | Activity ID mismatch | Use the original message's `id` for updates, not the reply ID |
| Input values not received | Bot reads `context.activity.text` not `value` | Adaptive Card submits arrive with no text; always check `value` |

---

## Limits

| Resource | Limit | Notes |
|---|---|---|
| Card JSON size | 28 KB | Larger cards are truncated without error |
| Actions per card | 6 (visible); unlimited with `ShowCard` nesting | Teams shows first 6 action buttons |
| Nested containers | 5 levels | Deeper nesting causes rendering issues |
| Input.ChoiceSet options | 100 | Practical UX limit is much lower |
| Card version | 1.6 max | Teams does not support 2.x features |
| Image URL | HTTPS required | HTTP image URLs are blocked in Teams |
| Image size (linked) | No hard limit; recommend < 1 MB | Large images slow card rendering |
| Refresh userIds | 60 users | Use empty array to refresh for all |
