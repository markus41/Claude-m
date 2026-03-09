# Adaptive Cards Reference — Microsoft Teams

## Overview

Adaptive Cards are a cross-host JSON card format used throughout Teams for bots, message extensions, notifications, dialogs, and meeting extensions. Schema version 1.5 is the maximum supported on Teams desktop/web. This reference covers the card schema, actions, data binding templates, Universal Actions, Teams-specific rendering quirks, and the new documentation hub.

---

## Schema Version Support

| Teams Client | Max Schema Version |
|---|---|
| Teams Desktop (Windows/macOS) | 1.5 |
| Teams Web | 1.5 |
| Teams Mobile (iOS/Android) | 1.2 |
| Incoming Webhooks | 1.5 (except Action.Submit — use Action.Execute) |

Always declare the schema version:
```json
{
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "type": "AdaptiveCard",
  "version": "1.5"
}
```

---

## Teams-Specific Gotchas

| Behavior | Details |
|---|---|
| `Action.Submit` `isEnabled` | NOT supported in Teams |
| File/image uploads | NOT supported in Adaptive Cards |
| Positive/destructive action styling | NOT supported |
| Markdown in TextBlock | `markdown: true` is Teams default |
| `Input.*` labels | Teams renders labels above inputs; use `label` property |
| Card width | Fixed to channel/chat width; do not rely on pixel widths |
| Theming | Cards adapt to Teams theme; avoid hard-coded hex colors |
| Card size limit | Truncated at ~28 KB |
| Mobile max version | v1.2 — include `fallbackText` for v1.5 elements |

**Design for narrow screens first** (mobile, meeting side panels).

---

## Card Layout Elements

### Container and Column Layout

```json
{
  "type": "AdaptiveCard",
  "version": "1.5",
  "body": [
    {
      "type": "Container",
      "style": "emphasis",
      "items": [
        {
          "type": "ColumnSet",
          "columns": [
            {
              "type": "Column",
              "width": "auto",
              "items": [
                { "type": "Image", "url": "https://example.com/logo.png", "size": "Small", "style": "Person" }
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
      "type": "FactSet",
      "facts": [
        { "title": "Priority", "value": "${priority}" },
        { "title": "Due Date", "value": "${dueDate}" }
      ]
    }
  ]
}
```

### TextBlock Properties

| Property | Values |
|----------|--------|
| `color` | `Default`, `Dark`, `Light`, `Accent`, `Good`, `Warning`, `Attention` |
| `size` | `Small`, `Default`, `Medium`, `Large`, `ExtraLarge` |
| `weight` | `Lighter`, `Default`, `Bolder` |
| `fontType` | `Default`, `Monospace` |

---

## Input Elements

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
  "label": "Due Date"
},
{
  "type": "Input.Toggle",
  "id": "sendNotification",
  "label": "Notify team",
  "title": "Send notification",
  "value": "true",
  "valueOn": "true",
  "valueOff": "false"
}
```

---

## Card Actions

### Action.Execute (Universal Actions — Preferred for Teams)

```json
{
  "type": "Action.Execute",
  "title": "Approve",
  "verb": "approve",
  "data": { "itemId": "${itemId}" },
  "associatedInputs": "auto"
}
```

Handling in bot (Teams SDK v2):
```typescript
app.adaptiveCardAction("approve", async (context, data) => {
  await approveItem(data.itemId);
  return {
    statusCode: 200,
    type: "application/vnd.microsoft.card.adaptive",
    value: buildApprovedCard(data.itemId),
  };
});
```

### Action.Submit

```json
{
  "type": "Action.Submit",
  "title": "Submit",
  "data": { "action": "submit", "itemId": "${itemId}" }
}
```

### Action.OpenUrl

```json
{
  "type": "Action.OpenUrl",
  "title": "View",
  "url": "https://example.com/items/${id}"
}
```

### Action.ShowCard

Reveals an inline card (no server round-trip).

---

## Card Templates (Data Binding)

```typescript
import { AdaptiveCardTemplate } from "adaptivecards-templating";

const template = new AdaptiveCardTemplate(templateJson);
const card = template.expand({
  $root: {
    title: "Incident Report",
    severity: "Critical",
    owner: { displayName: "On-Call Engineer" },
    createdAt: new Date().toISOString(),
  },
});
```

Template syntax:
- Simple binding: `"text": "${name}"`
- Array iteration: `"$data": "${items}"`
- Conditional: `"$when": "${severity == 'Critical'}"`
- Formatting: `"${formatDateTime(createdAt, 'ddd MMM d')}"`

---

## Universal Actions — Refresh Pattern

Auto-refresh a card on open:

```json
{
  "type": "AdaptiveCard",
  "version": "1.5",
  "refresh": {
    "action": {
      "type": "Action.Execute",
      "verb": "refresh",
      "data": { "taskId": "123" }
    },
    "userIds": ["<user-aad-object-id>"]
  },
  "body": [...]
}
```

`userIds` limits which users trigger refresh. Empty array refreshes for all (not recommended for busy channels).

---

## Sending Cards from a Bot

```typescript
import { CardFactory, MessageFactory } from "@microsoft/teams-sdk";

const card = CardFactory.adaptiveCard(cardPayload);
await context.sendActivity(MessageFactory.attachment(card));

// Update an existing card
const activity = MessageFactory.attachment(CardFactory.adaptiveCard(updatedCard));
activity.id = context.activity.replyToId;
await context.updateActivity(activity);
```

---

## New Documentation Hub

Microsoft launched a dedicated Adaptive Cards documentation hub for Teams/Copilot/Outlook scenarios covering:
- Responsive layout
- Icons and Badges
- Carousel
- Charts
- Component model (e.g., people cards)
- Conditional inputs (dependent dropdowns)

---

## Error Codes

| Code | Meaning | Remediation |
|------|---------|-------------|
| `BadRequest` on invoke | Payload malformed | Check `verb` and `data` |
| `400` on card send | Schema validation failed | Validate against schema |
| Card not rendering | Unsupported element | Downgrade schema or use fallback |
| `409` on card update | Activity ID mismatch | Use original message `id` |
| Inputs not received | Reading `text` not `value` | Check `context.activity.value` |

---

## Limits

| Resource | Limit |
|---|---|
| Card JSON size | 28 KB |
| Actions per card | 6 visible |
| Nested containers | 5 levels |
| Input.ChoiceSet options | 100 |
| Max schema version | 1.5 (Teams) |
| Image URLs | HTTPS required |
| Refresh userIds | 60 users |
