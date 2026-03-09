# Adaptive Cards Reference — Microsoft Teams

## Overview

Adaptive Cards are a cross-host JSON card format used throughout Teams for bots, message extensions, notifications, and meeting extensions.

## Schema Version Support by Client

| Teams Client | Max Schema | Notes |
|---|---|---|
| Teams Desktop (Windows/Mac) | 1.6 | Full feature set |
| Teams Web | 1.6 | Full feature set |
| **Teams Mobile (iOS)** | **1.2** | Cards >1.2 may not render correctly |
| **Teams Mobile (Android)** | **1.2** | Cards >1.2 may not render correctly |
| Outlook (connector) | 1.4 | Avoid 1.5+ elements |

> **Critical mobile limitation**: Teams mobile supports Adaptive Cards up to v1.2 only. Features unsupported on mobile: `Table`, `Icon`, `isEnabled` on `Action.Submit`, file/image uploads, positive/destructive action styling.

Always declare the schema version:
```json
{
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "type": "AdaptiveCard",
  "version": "1.5"
}
```

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
      "bleed": true,
      "items": [
        {
          "type": "ColumnSet",
          "columns": [
            {
              "type": "Column", "width": "auto",
              "items": [{ "type": "Image", "url": "https://example.com/logo.png", "size": "Small", "style": "Person" }]
            },
            {
              "type": "Column", "width": "stretch",
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
        { "title": "Priority", "value": "High" },
        { "title": "Due Date", "value": "2026-03-15" }
      ]
    }
  ]
}
```

---

## Card Actions

### Action.Execute (Universal Actions — Teams Preferred)

```json
{
  "type": "Action.Execute",
  "title": "Approve",
  "verb": "approve",
  "data": { "itemId": "123" },
  "associatedInputs": "auto"
}
```

### Action.Submit (Bot Framework)

```json
{
  "type": "Action.Submit",
  "title": "Submit",
  "data": { "action": "submit" },
  "style": "positive"
}
```

> Note: `style: "positive"` / `"destructive"` is **not supported** on Teams mobile.

### Action.OpenUrl

```json
{ "type": "Action.OpenUrl", "title": "View", "url": "https://example.com" }
```

---

## Card Templates (Data Binding)

```typescript
import { Template } from "adaptivecards-templating";

const template = new Template(cardPayload);
const card = template.expand({
  $root: {
    title: "Incident",
    severity: "Critical",
    owner: { displayName: "On-Call Engineer" },
  }
});
```

---

## Universal Actions — Refresh Pattern

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

---

## Meeting Content Bubble Card

Cards in content bubbles should be compact:

```json
{
  "type": "AdaptiveCard",
  "version": "1.5",
  "body": [
    { "type": "TextBlock", "text": "Vote Required", "weight": "Bolder" },
    { "type": "TextBlock", "text": "Approve the budget?", "wrap": true }
  ],
  "actions": [
    { "type": "Action.Execute", "title": "Yes", "verb": "vote", "data": { "vote": "yes" } },
    { "type": "Action.Execute", "title": "No", "verb": "vote", "data": { "vote": "no" } }
  ]
}
```

Send as content bubble:
```typescript
await context.sendActivity({
  type: "message",
  attachments: [CardFactory.adaptiveCard(card)],
  channelData: { notification: { alertInMeeting: true } },
});
```

---

## Mobile Compatibility Checklist

When generating cards, check these rules for mobile compatibility:
- [ ] Schema version ≤ 1.2 for cards that must work on mobile
- [ ] No `Table` element (use `FactSet` or `ColumnSet` instead)
- [ ] No `Icon` element (use `Image` instead)
- [ ] No `isEnabled` on `Action.Submit`
- [ ] No `style: "positive"` or `"destructive"` on actions
- [ ] No file/image upload inputs
- [ ] Include `fallbackText` for all cards with v1.3+ elements
- [ ] Test with both desktop and mobile Teams clients

---

## Teams-Specific Rendering Quirks

| Behavior | Details |
|---|---|
| Markdown in TextBlock | `markdown: true` is Teams default |
| `Input.*` labels | Teams renders labels above inputs; use `label` property |
| `Container.bleed` | Only works inside another container with non-default style |
| `ImageSet` max images | 5 rendered; extras cropped |
| Card width | Fixed to channel/chat width |
| Theming | Cards adapt to theme; avoid hard-coded hex colors |
| Card size limit | Truncated at ~28 KB |

---

## Error Codes

| Code | Meaning | Remediation |
|------|---------|-------------|
| `BadRequest` (invoke) | Malformed Action.Execute payload | Check `verb` and `data` |
| `400` on card send | Schema validation failed | Validate JSON schema |
| Card not rendering | Unsupported element for client version | Downgrade or add fallback |
| `409` on card update | Activity ID mismatch | Use original message ID |
| Input values missing | Bot reads `text` not `value` | Check `context.activity.value` |

---

## Limits

| Resource | Limit | Notes |
|---|---|---|
| Card JSON size | 28 KB | Larger cards truncated |
| Actions per card | 6 visible | Unlimited with `ShowCard` nesting |
| Nested containers | 5 levels | Deeper nesting causes issues |
| Input.ChoiceSet options | 100 | Practical UX limit lower |
| Card version | 1.6 max (desktop/web), 1.2 max (mobile) | |
| Image URL | HTTPS required | |
| Refresh userIds | 60 users | |
