---
name: teams-adaptive-card
description: "Generate an Adaptive Card JSON payload from a description, with optional data templating"
argument-hint: "<description> [--template] [--version <1.4|1.5|1.6>] [--meeting]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
---

# Generate an Adaptive Card

Create an Adaptive Card JSON payload based on a natural-language description.

## Instructions

### 1. Parse the Request

- `<description>` — What the card should display.
- `--template` — Use Adaptive Card Templating syntax (`${field}`, `$data`, `$when`).
- `--version` — Target schema version: `1.4` (Outlook), `1.5` (Teams mobile + desktop), or `1.6` (Teams desktop/web). Default: `1.5`.
- `--meeting` — Optimize for meeting surfaces (content bubble, side panel). Uses compact layout.

### 2. Design the Card

**Layout selection**:
- Key-value data → `FactSet`
- Side-by-side content → `ColumnSet` with `Column`s
- Tabular data → `Table` (v1.5+) with `fallback` for older clients
- Lists of items → `Container` with repeated elements (or `$data` loop if `--template`)

**Action selection**:
- Submit data to a bot → `Action.Execute` with a `verb` (preferred for Teams)
- Open a URL → `Action.OpenUrl`
- Show additional content → `Action.ShowCard`

**Meeting card optimizations** (when `--meeting`):
- Use compact layout for content bubbles
- Include `Action.Execute` for in-meeting voting or acknowledgment
- Avoid large images or complex tables in content bubbles

### 3. Apply Templating (when --template)

- Simple binding: `"text": "Hello, ${name}!"`
- Array iteration: `"$data": "${items}"`
- Conditional rendering: `"$when": "${status == 'active'}"`

### 4. Validate the Card

- `type` is `"AdaptiveCard"` at root level
- `version` matches the requested version
- Every `Input.*` has a unique `id`
- Every `Action.Execute` has a `verb`
- Card JSON is under 28 KB
- All image URLs use HTTPS
- Include `fallbackText` when using v1.5+ elements

### 5. Output

Write the card JSON to a file or display inline. Show usage:
- In a bot: `CardFactory.adaptiveCard(cardPayload)`
- With templating: `new Template(cardPayload).expand({ $root: data })`
- In a meeting content bubble: include `channelData.notification.alertInMeeting: true`
- Testing: Paste into the Adaptive Cards Designer with Host App set to "Microsoft Teams"
