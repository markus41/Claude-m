---
name: teams-dialog
description: "Generate dialog orchestration code replacing deprecated task modules — uses dialog.url.open() and dialog.adaptiveCard.open()"
argument-hint: "<url|adaptive-card> --name <dialog-name> [--bot-handler]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Dialog Orchestration (Replaces Task Modules)

Generate dialog code using the `dialog` namespace from Teams JS SDK v2, replacing the deprecated `tasks` namespace.

## Instructions

### 1. Validate Inputs

- `<type>` — One of: `url`, `adaptive-card`. Ask if not provided.
- `--name` — Dialog identifier (e.g., `feedbackDialog`, `createItemDialog`). Ask if not provided.
- `--bot-handler` — When set, also generate the bot-side `handleTeamsTaskModuleFetch` and `handleTeamsTaskModuleSubmit` handlers.

### 2. Explain the Migration

Inform the user:
- The `tasks` namespace (`tasks.startTask()`, `tasks.submitTask()`) is **deprecated**
- The replacement is the `dialog` namespace:
  - `dialog.url.open()` replaces `tasks.startTask()` with a URL
  - `dialog.adaptiveCard.open()` replaces `tasks.startTask()` with a card
  - `dialog.url.submit()` replaces `tasks.submitTask()` from inside a dialog iframe
- The bot-side handlers remain `handleTeamsTaskModuleFetch` / `handleTeamsTaskModuleSubmit` (method names unchanged)

### 3. Generate Client-Side Code

**For `url` type**:
Create a TypeScript module that:
- Imports `dialog` and `app` from `@microsoft/teams-js`
- Calls `app.initialize()` before any SDK use
- Opens the dialog with `dialog.url.open()` specifying `url`, `title`, `size`, and `fallbackUrl`
- Handles the callback result (parse JSON string from `result.result`)
- Creates the dialog content page with a form and `dialog.url.submit()` to close

**For `adaptive-card` type**:
Create a TypeScript module that:
- Imports `dialog` and `app` from `@microsoft/teams-js`
- Calls `app.initialize()`
- Builds an Adaptive Card JSON with input fields based on user requirements
- Opens with `dialog.adaptiveCard.open()` specifying `card` (stringified), `title`, `size`
- Handles the callback result

Ask the user what form fields to include in the dialog.

### 4. Generate Bot-Side Handlers (when --bot-handler)

Create or update the bot class with:

```typescript
protected async handleTeamsTaskModuleFetch(
  context: TurnContext,
  taskModuleRequest: { data: Record<string, string> }
) {
  return {
    task: {
      type: "continue",
      value: {
        title: "<dialog-name>",
        height: 450,
        width: 500,
        card: CardFactory.adaptiveCard({...}),
      },
    },
  };
}

protected async handleTeamsTaskModuleSubmit(
  context: TurnContext,
  taskModuleRequest: { data: Record<string, string> }
) {
  // Process submitted data
  return { task: { type: "message", value: "Success" } };
}
```

### 5. Update Manifest (if applicable)

If the dialog is triggered from a bot card action:
- Ensure the bot section exists in `manifest.json`
- If triggered from `Action.Submit` with `{ "type": "task/fetch" }`, the bot handler chain activates automatically

### 6. Display Summary

Show the user:
- Generated files and key functions
- The deprecated → new API mapping:
  | Deprecated | New |
  |-----------|-----|
  | `tasks.startTask(taskInfo)` | `dialog.url.open(urlDialogInfo)` or `dialog.adaptiveCard.open(cardDialogInfo)` |
  | `tasks.submitTask(result)` | `dialog.url.submit(result)` |
  | `tasks.updateTask(taskInfo)` | Not yet available — use card refresh pattern |
- How to test the dialog in Teams
- Bot handler method names remain unchanged (`handleTeamsTaskModuleFetch` / `handleTeamsTaskModuleSubmit`)
