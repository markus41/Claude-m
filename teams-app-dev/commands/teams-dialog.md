---
name: teams-dialog
description: "Generate dialog orchestration code (replacing task module patterns) for tabs, bots, and extensions"
argument-hint: "--surface <tab|bot|extension> --type <url|adaptive-card> --name <dialog-name>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Generate Dialog Orchestration

Create dialog (formerly task module) code for focused modal interactions in Teams. Uses the TeamsJS v2 `dialog` namespace (replaces the deprecated `tasks` namespace).

## Instructions

### 1. Validate Inputs

- `--surface` — Where the dialog is launched from: `tab`, `bot`, `extension`. Ask if not provided.
- `--type` — Dialog content type: `url` (HTML page) or `adaptive-card`. Ask if not provided.
- `--name` — Dialog name/identifier (e.g., `createItem`, `editSettings`). Ask if not provided.

### 2. Generate Tab-Invoked Dialog (--surface tab)

**For URL dialog (--type url)**:

Generate the launcher code in the tab:
```typescript
import * as microsoftTeams from "@microsoft/teams-js";

await microsoftTeams.app.initialize();

microsoftTeams.dialog.url.open(
  {
    title: "<Dialog Title>",
    url: `${window.location.origin}/dialog/<name>`,
    size: { height: 450, width: 600 },
  },
  (result) => {
    if (result.err) {
      console.error("Dialog error:", result.err);
    } else {
      console.log("Dialog result:", result.result);
    }
  }
);
```

Generate the dialog page (React component) that calls `microsoftTeams.dialog.url.submit(resultData)` on completion.

**For Adaptive Card dialog (--type adaptive-card)**:

Generate the launcher code:
```typescript
microsoftTeams.dialog.adaptiveCard.open(
  {
    title: "<Dialog Title>",
    card: cardJson,
    size: { height: 400, width: 500 },
  },
  (result) => {
    console.log("Card result:", result.result);
  }
);
```

Generate the Adaptive Card JSON with input fields and an `Action.Submit`.

### 3. Generate Bot-Invoked Dialog (--surface bot)

Generate Teams SDK v2 dialog handlers:

```typescript
// Dialog fetch — return the dialog content
app.dialogFetch(async (context, request) => {
  return {
    task: {
      type: "continue",
      value: {
        title: "<Dialog Title>",
        height: 450,
        width: 600,
        card: CardFactory.adaptiveCard(formCard),
      },
    },
  };
});

// Dialog submit — process the result
app.dialogSubmit(async (context, request) => {
  const data = request.data;
  await processSubmission(data);
  return { task: { type: "message", value: "Completed successfully!" } };
});
```

### 4. Generate Extension-Invoked Dialog (--surface extension)

For action message extensions with `fetchTask: true`, generate the `fetchTask` and `submitAction` handlers that return dialog content.

### 5. Ask About Dialog Content

Ask the user:
- What fields/inputs should the dialog contain?
- What happens when the user submits?
- Should the dialog chain to another dialog?
- What size (small: 300x300, medium: 450x600, large: 720x1000)?

### 6. Display Summary

Show the user:
- Generated files (launcher code, dialog page/card, handlers)
- How dialogs replace the deprecated `tasks` / task module patterns
- How to test the dialog flow
- Note: `dialog.url.submit()` replaced the removed `dialog.submit()` in TeamsJS v2.18.0+
