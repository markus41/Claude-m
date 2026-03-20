# Office Add-in Development with Fluent UI

## Overview

Office Add-ins extend Excel, Word, Outlook, PowerPoint, and OneNote with custom task panes, content areas, and dialog boxes. Fluent UI React v9 is the recommended component library for building add-in UIs that look and feel native to Office. The add-in runs in a web view (Edge WebView2 on Windows, Safari WKWebView on macOS, browser on Office for the web) and communicates with the host application through the Office.js API.

## Yo Office Generator Setup

The Yo Office generator is the official scaffolding tool for Office Add-ins.

### Installation

```bash
npm install -g yo generator-office
```

### Scaffolding a New Add-in

```bash
# React + TypeScript task pane add-in for Excel
yo office --projectType taskpane --framework react --host excel --name my-excel-addin --ts true

# React + TypeScript for Word
yo office --projectType taskpane --framework react --host word --name my-word-addin --ts true

# React + TypeScript for Outlook
yo office --projectType taskpane --framework react --host outlook --name my-outlook-addin --ts true

# React + TypeScript for PowerPoint
yo office --projectType taskpane --framework react --host powerpoint --name my-ppt-addin --ts true
```

### Generator Options

| Flag | Values | Description |
|---|---|---|
| `--projectType` | `taskpane`, `content`, `manifest` | Add-in type |
| `--framework` | `react`, `angular`, `jquery`, `none` | UI framework |
| `--host` | `excel`, `word`, `outlook`, `powerpoint`, `onenote` | Target Office application |
| `--ts` | `true`, `false` | TypeScript (default: true for React) |
| `--name` | string | Project name |

### Generated Project Structure

```
my-excel-addin/
  manifest.xml              # Add-in manifest
  webpack.config.js         # Webpack configuration
  src/
    taskpane/
      index.tsx             # Entry point
      taskpane.html         # HTML host page
      components/
        App.tsx             # Root component
    commands/
      commands.ts           # Ribbon command handlers
  assets/
    icon-16.png             # Ribbon icons (16, 32, 80px)
    icon-32.png
    icon-80.png
```

### Adding Fluent UI v9

The generator may scaffold with Fluent UI v8. To upgrade or add v9:

```bash
# Remove v8 if present
npm uninstall @fluentui/react

# Install v9
npm install @fluentui/react-components @fluentui/react-icons
```

## Task Pane Dimensions and Constraints

Task panes have strict dimension constraints that vary by host and platform.

### Dimension Table

| Host | Platform | Min width | Default width | Max width | Min height |
|---|---|---|---|---|---|
| Excel | Desktop | 320px | 350px | 50% of window | 150px |
| Excel | Web | 320px | 350px | 50% of viewport | 150px |
| Word | Desktop | 320px | 350px | 50% of window | 150px |
| Word | Web | 320px | 350px | 50% of viewport | 150px |
| Outlook (read) | Desktop | 320px | 350px | 50% of window | 150px |
| Outlook (compose) | Desktop | 320px | 396px | 50% of window | 150px |
| Outlook | Web | 320px | 350px | 50% of viewport | 250px |
| PowerPoint | Desktop | 320px | 350px | 50% of window | 150px |

### Design Guidelines for Constrained Space

1. **Single-column layout** — Always design for 320px width as the baseline
2. **Compact component sizes** — Use `size="small"` on Input, Button, Select, Dropdown
3. **No horizontal scrolling** — Content must reflow within the available width
4. **Vertical stacking** — Stack form fields, actions, and content vertically
5. **Progressive disclosure** — Use Accordion, Dialog, or Drawer for secondary content
6. **Sticky headers/footers** — Pin key actions so they remain visible during scrolling
7. **Responsive padding** — Use 12-16px horizontal padding, not more

### CSS for Task Pane Root

```css
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

#container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.taskpane-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.taskpane-footer {
  padding: 8px 16px;
  border-top: 1px solid var(--colorNeutralStroke2);
  background: var(--colorNeutralBackground1);
}
```

## FluentProvider Setup in Add-in Context

### Basic Setup

```tsx
// src/taskpane/index.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { FluentProvider, webLightTheme, webDarkTheme } from "@fluentui/react-components";
import { App } from "./components/App";

Office.onReady(() => {
  const container = document.getElementById("container");
  if (!container) return;

  const root = createRoot(container);
  root.render(
    <FluentProvider theme={webLightTheme} style={{ height: "100vh" }}>
      <App />
    </FluentProvider>
  );
});
```

### Theme Detection from Office Host

```tsx
import { webLightTheme, webDarkTheme, teamsHighContrastTheme } from "@fluentui/react-components";
import type { Theme } from "@fluentui/react-components";

function detectOfficeTheme(): Theme {
  // Office.context.officeTheme available in Excel, Word, PowerPoint
  if (Office.context?.officeTheme) {
    const bgColor = Office.context.officeTheme.bodyBackgroundColor;
    // Parse hex color to determine luminance
    const hex = bgColor.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    if (luminance < 0.2) return teamsHighContrastTheme; // Very dark = high contrast
    if (luminance < 0.5) return webDarkTheme;
    return webLightTheme;
  }
  return webLightTheme;
}

// Listen for theme changes (supported in some hosts)
function onThemeChanged(handler: (theme: Theme) => void) {
  if (Office.context?.officeTheme) {
    Office.context.officeTheme.onChanged = () => {
      handler(detectOfficeTheme());
    };
  }
}
```

### Theme-Aware Root Component

```tsx
import { useState, useEffect } from "react";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import type { Theme } from "@fluentui/react-components";

export function ThemeRoot({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(webLightTheme);

  useEffect(() => {
    setTheme(detectOfficeTheme());
    onThemeChanged(setTheme);
  }, []);

  return (
    <FluentProvider theme={theme} style={{ height: "100vh" }}>
      {children}
    </FluentProvider>
  );
}
```

## Office.js API Interaction with Fluent Components

### Excel: Reading and Writing Data

```tsx
import { Button, Table, TableHeader, TableRow, TableHeaderCell, TableBody, TableCell, Spinner } from "@fluentui/react-components";
import { useState, useCallback } from "react";

export function DataReader() {
  const [data, setData] = useState<string[][]>([]);
  const [loading, setLoading] = useState(false);

  const readSelection = useCallback(async () => {
    setLoading(true);
    try {
      await Excel.run(async (context) => {
        const range = context.workbook.getSelectedRange();
        range.load("values");
        await context.sync();
        setData(range.values.map(row => row.map(cell => String(cell))));
      });
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div style={{ padding: "12px 16px" }}>
      <Button appearance="primary" size="small" onClick={readSelection} disabled={loading}>
        {loading ? <Spinner size="tiny" /> : "Read Selection"}
      </Button>
      {data.length > 0 && (
        <Table size="small" style={{ marginTop: 12 }}>
          <TableHeader>
            <TableRow>
              {data[0].map((_, i) => <TableHeaderCell key={i}>Col {i + 1}</TableHeaderCell>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.slice(1).map((row, ri) => (
              <TableRow key={ri}>
                {row.map((cell, ci) => <TableCell key={ci}>{cell}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
```

### Word: Inserting Content

```tsx
import { Button, Textarea, Field } from "@fluentui/react-components";
import { useState } from "react";

export function WordInserter() {
  const [text, setText] = useState("");

  const insertText = async () => {
    await Word.run(async (context) => {
      const body = context.document.body;
      body.insertParagraph(text, Word.InsertLocation.end);
      await context.sync();
    });
  };

  const insertTable = async () => {
    await Word.run(async (context) => {
      const body = context.document.body;
      const table = body.insertTable(3, 3, Word.InsertLocation.end, [
        ["Header 1", "Header 2", "Header 3"],
        ["Row 1", "Data", "Data"],
        ["Row 2", "Data", "Data"],
      ]);
      table.styleBuiltIn = Word.BuiltInStyleName.gridTable5Dark_Accent1;
      await context.sync();
    });
  };

  return (
    <div style={{ padding: "12px 16px" }}>
      <Field label="Text to insert" size="small">
        <Textarea value={text} onChange={(_, d) => setText(d.value)} resize="vertical" size="small" />
      </Field>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <Button appearance="primary" size="small" onClick={insertText}>Insert Text</Button>
        <Button appearance="outline" size="small" onClick={insertTable}>Insert Table</Button>
      </div>
    </div>
  );
}
```

### Outlook: Composing Messages

```tsx
import { Button, Input, Field, Textarea } from "@fluentui/react-components";
import { useState } from "react";

export function OutlookComposer() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const setMailContent = async () => {
    const item = Office.context.mailbox.item;
    if (!item) return;

    if (item.subject?.setAsync) {
      item.subject.setAsync(subject);
    }
    if (item.body?.setAsync) {
      item.body.setAsync(body, { coercionType: Office.CoercionType.Text });
    }
  };

  return (
    <div style={{ padding: "12px 16px" }}>
      <Field label="Subject" size="small">
        <Input value={subject} onChange={(_, d) => setSubject(d.value)} size="small" />
      </Field>
      <Field label="Body" size="small" style={{ marginTop: 8 }}>
        <Textarea value={body} onChange={(_, d) => setBody(d.value)} resize="vertical" size="small" />
      </Field>
      <Button appearance="primary" size="small" onClick={setMailContent} style={{ marginTop: 8 }}>
        Apply
      </Button>
    </div>
  );
}
```

## Ribbon and Function Commands

Add-ins can register ribbon buttons that trigger JavaScript functions without opening a task pane.

### Manifest Configuration

```xml
<ExtensionPoint xsi:type="PrimaryCommandSurface">
  <OfficeTab id="TabHome">
    <Group id="CommandGroup">
      <Label resid="GroupLabel" />
      <Icon>
        <bt:Image size="16" resid="Icon.16x16" />
        <bt:Image size="32" resid="Icon.32x32" />
        <bt:Image size="80" resid="Icon.80x80" />
      </Icon>
      <!-- Task pane button -->
      <Control xsi:type="Button" id="ShowTaskpane">
        <Label resid="TaskpaneButton.Label" />
        <Supertip>
          <Title resid="TaskpaneButton.Label" />
          <Description resid="TaskpaneButton.Tooltip" />
        </Supertip>
        <Icon>
          <bt:Image size="16" resid="Icon.16x16" />
          <bt:Image size="32" resid="Icon.32x32" />
          <bt:Image size="80" resid="Icon.80x80" />
        </Icon>
        <Action xsi:type="ShowTaskpane">
          <TaskpaneId>ButtonId1</TaskpaneId>
          <SourceLocation resid="Taskpane.Url" />
        </Action>
      </Control>
      <!-- Function command button (no UI) -->
      <Control xsi:type="Button" id="RunFunction">
        <Label resid="FunctionButton.Label" />
        <Supertip>
          <Title resid="FunctionButton.Label" />
          <Description resid="FunctionButton.Tooltip" />
        </Supertip>
        <Icon>
          <bt:Image size="16" resid="Icon.16x16" />
          <bt:Image size="32" resid="Icon.32x32" />
          <bt:Image size="80" resid="Icon.80x80" />
        </Icon>
        <Action xsi:type="ExecuteFunction">
          <FunctionName>formatSelection</FunctionName>
        </Action>
      </Control>
    </Group>
  </OfficeTab>
</ExtensionPoint>
```

### Function Command Handler

```typescript
// src/commands/commands.ts

Office.onReady(() => {
  // Register function commands
});

async function formatSelection(event: Office.AddinCommands.Event) {
  try {
    await Excel.run(async (context) => {
      const range = context.workbook.getSelectedRange();
      range.format.fill.color = "#0F6CBD"; // Fluent brand blue
      range.format.font.color = "#FFFFFF";
      range.format.font.bold = true;
      await context.sync();
    });
  } finally {
    event.completed();
  }
}

// Register with Office
(globalThis as any).formatSelection = formatSelection;
```

## Shared Runtime Patterns

A shared runtime allows the task pane, function commands, and custom functions to share state and run in the same JavaScript runtime.

### Enable Shared Runtime

In `manifest.xml`:

```xml
<Runtimes>
  <Runtime resid="Taskpane.Url" lifetime="long" />
</Runtimes>
```

### Shared State Between Task Pane and Commands

```typescript
// src/shared/state.ts
interface AppState {
  lastAction: string;
  settings: Record<string, string>;
}

const state: AppState = {
  lastAction: "",
  settings: {},
};

export function getState(): AppState {
  return state;
}

export function updateState(partial: Partial<AppState>) {
  Object.assign(state, partial);
}
```

Both the task pane component and the function command can import from the same module:

```tsx
// In task pane component
import { getState } from "../../shared/state";

export function StatusBar() {
  const state = getState();
  return <Text size={200}>Last action: {state.lastAction}</Text>;
}
```

```typescript
// In function command
import { updateState } from "../../shared/state";

async function formatSelection(event: Office.AddinCommands.Event) {
  // ... perform action ...
  updateState({ lastAction: "Format applied at " + new Date().toLocaleTimeString() });
  event.completed();
}
```

## Dialog API with Fluent UI

For scenarios that need more screen space than a task pane, use the Dialog API:

```tsx
function openDialog() {
  Office.context.ui.displayDialogAsync(
    "https://localhost:3000/dialog.html",
    { height: 60, width: 40 }, // percentage of screen
    (result) => {
      if (result.status === Office.AsyncResultStatus.Succeeded) {
        const dialog = result.value;
        dialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg: any) => {
          const message = JSON.parse(arg.message);
          // Handle message from dialog
          dialog.close();
        });
      }
    }
  );
}
```

The dialog page (`dialog.html`) is a separate HTML page that can also use FluentProvider:

```tsx
// src/dialog/index.tsx
import { FluentProvider, webLightTheme, Button } from "@fluentui/react-components";
import { createRoot } from "react-dom/client";

function DialogContent() {
  const sendMessage = () => {
    Office.context.ui.messageParent(JSON.stringify({ action: "confirm", data: "selected-item" }));
  };

  return (
    <FluentProvider theme={webLightTheme}>
      <div style={{ padding: 24 }}>
        <h2>Select an option</h2>
        <Button appearance="primary" onClick={sendMessage}>Confirm</Button>
      </div>
    </FluentProvider>
  );
}

Office.onReady(() => {
  createRoot(document.getElementById("dialog-container")!).render(<DialogContent />);
});
```

## References

- Fluent React quickstart for Office Add-ins: https://learn.microsoft.com/en-us/office/dev/add-ins/quickstarts/fluent-react-quickstart
- Task pane design guidelines: https://learn.microsoft.com/en-us/office/dev/add-ins/design/task-pane-add-ins
- Office.js API reference: https://learn.microsoft.com/en-us/javascript/api/overview
- Yo Office generator: https://learn.microsoft.com/en-us/office/dev/add-ins/develop/yeoman-generator-overview
- Shared runtime: https://learn.microsoft.com/en-us/office/dev/add-ins/develop/configure-your-add-in-to-use-a-shared-runtime
- Dialog API: https://learn.microsoft.com/en-us/office/dev/add-ins/develop/dialog-api-in-office-add-ins
