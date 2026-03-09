---
name: teams-adaptive-card
description: "Generate an Adaptive Card JSON payload from a description, with optional data templating"
argument-hint: "<description> [--template] [--version <1.4|1.5>]"
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

- `<description>` — What the card should display (e.g., "approval form with requester name, amount, and approve/reject buttons").
- `--template` — When set, use Adaptive Card Templating syntax (`${field}`, `$data`, `$when`) so the card can be bound to dynamic data.
- `--version` — Target schema version: `1.4` (broader compatibility) or `1.5` (Teams desktop/web default, supports `Table`). Default: `1.5`.

### 2. Design the Card

Based on the description, select appropriate elements:

**Layout selection**:
- Key-value data → `FactSet`
- Side-by-side content → `ColumnSet` with `Column`s
- Tabular data → `Table` (v1.5) with `fallback` for older clients
- Lists of items → `Container` with repeated elements (or `$data` loop if `--template`)
- Images → `Image` or `ImageSet`

**Input selection** (when the card collects data):
- Free text → `Input.Text` (set `isMultiline` for long text)
- Choices → `Input.ChoiceSet` (dropdown or radio)
- Date/time → `Input.Date` / `Input.Time`
- Yes/no → `Input.Toggle`
- Numbers → `Input.Number`

**Action selection**:
- Submit data to a bot → `Action.Execute` with a `verb` (preferred for Teams)
- Open a URL → `Action.OpenUrl`
- Show additional content → `Action.ShowCard`

**Teams-specific gotchas to follow**:
- `Action.Submit` `isEnabled` property is NOT supported in Teams
- File/image uploads are NOT supported in Adaptive Cards in Teams
- Positive/destructive action styling is NOT supported in Teams
- Always design for narrow screens first (mobile, meeting side panels)
- Mobile supports max v1.2 — include `fallbackText` for v1.5 elements
- Cards are truncated at ~28 KB

### 3. Apply Templating (when --template)

Wrap dynamic values in `${expression}` syntax:
- Simple binding: `"text": "Hello, ${name}!"`
- Array iteration: `"$data": "${items}"` on a `Container`
- Conditional rendering: `"$when": "${status == 'active'}"`

Generate a matching data schema that shows the expected shape of the `$root` object.

### 4. Validate the Card

Check the generated card against these rules:
- `type` is `"AdaptiveCard"` at root level.
- `version` matches the requested version.
- Every `Input.*` has a unique `id`.
- Every `Action.Execute` has a `verb`.
- Card JSON is under 28 KB.
- All image URLs use HTTPS or are template placeholders.
- Include `fallbackText` when using v1.5 elements.

### 5. Output

Write the card JSON to a file (e.g., `cards/<name>.json`) or display it inline. If `--template` was used, also output an example data object and the rendered result.

Show the user how to use the card:
- In a bot (Teams SDK v2): `CardFactory.adaptiveCard(cardPayload)`
- With templating: `new AdaptiveCardTemplate(cardPayload).expand({ $root: data })`
- Testing: Paste into the Microsoft Adaptive Cards documentation hub or the Adaptive Cards Designer with Host App set to "Microsoft Teams"
