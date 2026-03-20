---
name: fluent-ui-design:office-addin
description: Set up Fluent UI in an Office Add-in project — task pane with FluentProvider, theme integration, and Office.js hooks.
argument-hint: "<host> [--yo-office] [--theme=<brand-color>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

# Set Up Fluent UI in an Office Add-in

Configure an existing or new Office Add-in project with Fluent UI React v9, including FluentProvider, Office host theme detection, and responsive task pane layout.

## Arguments

- `<host>` — Target Office application: `excel`, `word`, `outlook`, `powerpoint` (required)
- `--yo-office` — Scaffold a new project using the Yo Office generator before configuring Fluent
- `--theme=<hex>` — Generate a custom brand theme from a hex color (e.g., `--theme=#E74C3C`)

## Workflow

### Step 1: Detect or Scaffold the Office Add-in Project

1. Look for `manifest.xml` or `manifest.json` in the working directory to identify an existing Office Add-in project.
2. If `--yo-office` is specified or no manifest is found:
   - Check that `yo` and `generator-office` are installed globally. If not, install them:
     ```bash
     npm install -g yo generator-office
     ```
   - Scaffold a new project:
     ```bash
     yo office --projectType taskpane --framework react --host <host> --name fluent-addin --ts true
     ```
   - Change into the generated project directory.
3. Read `package.json` to understand existing dependencies and the project structure.

### Step 2: Install @fluentui/react-components

1. Check if `@fluentui/react-components` is already in `package.json` dependencies.
2. If not present, install Fluent UI v9:
   ```bash
   npm install @fluentui/react-components @fluentui/react-icons
   ```
3. If the project has `@fluentui/react` (v8), note it but do not remove it (some Yo Office templates depend on v8 components). The two versions can coexist.

### Step 3: Set Up FluentProvider in the Task Pane

1. Locate the task pane entry point. Common locations:
   - `src/taskpane/index.tsx`
   - `src/taskpane/taskpane.ts`
   - `src/index.tsx`

2. Create or update the theme configuration file at `src/taskpane/theme.ts`:

   **Without `--theme` flag:**
   ```tsx
   import { webLightTheme, webDarkTheme, teamsHighContrastTheme } from "@fluentui/react-components";
   import type { Theme } from "@fluentui/react-components";

   export function detectOfficeTheme(): Theme {
     if (Office.context?.officeTheme) {
       const bg = Office.context.officeTheme.bodyBackgroundColor;
       const hex = bg.replace("#", "");
       const r = parseInt(hex.substring(0, 2), 16);
       const g = parseInt(hex.substring(2, 4), 16);
       const b = parseInt(hex.substring(4, 6), 16);
       const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

       if (luminance < 0.2) return teamsHighContrastTheme;
       if (luminance < 0.5) return webDarkTheme;
     }
     return webLightTheme;
   }
   ```

   **With `--theme=<hex>` flag:**
   Also generate custom `BrandVariants` using `createLightTheme` and `createDarkTheme` from the provided hex color, following the pattern in the `fluent-design-system` skill's brand ramp generation.

3. Wrap the app root in FluentProvider:
   ```tsx
   import { FluentProvider } from "@fluentui/react-components";
   import { detectOfficeTheme } from "./theme";

   Office.onReady(() => {
     const theme = detectOfficeTheme();
     const root = createRoot(document.getElementById("container")!);
     root.render(
       <FluentProvider theme={theme} style={{ height: "100vh" }}>
         <App />
       </FluentProvider>
     );
   });
   ```

### Step 4: Configure Responsive Layout for Task Pane Constraints

1. Locate the HTML file for the task pane (`taskpane.html` or `index.html`).

2. Ensure the viewport meta tag is present:
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1.0" />
   ```

3. Create or update task pane CSS (`src/taskpane/taskpane.css`):
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

   .taskpane-header {
     padding: 12px 16px;
     border-bottom: 1px solid var(--colorNeutralStroke2);
   }

   .taskpane-body {
     flex: 1;
     overflow-y: auto;
     padding: 12px 16px;
   }

   .taskpane-footer {
     padding: 8px 16px;
     border-top: 1px solid var(--colorNeutralStroke2);
   }
   ```

4. Update the App component to use this layout structure:
   ```tsx
   export function App() {
     return (
       <>
         <div className="taskpane-header">
           <Title3>My Add-in</Title3>
         </div>
         <div className="taskpane-body">
           {/* Content */}
         </div>
         <div className="taskpane-footer">
           <Button appearance="primary" size="small">Action</Button>
         </div>
       </>
     );
   }
   ```

### Step 5: Generate a Sample Component

1. Create a sample component at `src/taskpane/components/SampleAction.tsx` that demonstrates Fluent UI + Office.js interaction for the specified host:

   - **Excel**: Read/write selected range
   - **Word**: Insert paragraph at cursor
   - **Outlook**: Read message subject or set compose fields
   - **PowerPoint**: Insert text box on current slide

2. The component should:
   - Use `size="small"` on interactive controls (Button, Input, Select)
   - Include a loading state with `<Spinner size="tiny" />`
   - Handle errors with `<MessageBar intent="error">`
   - Use proper padding for the 320px minimum width constraint

## Output

Report to the developer:
- Packages installed (with versions)
- Files created and modified (with paths)
- Theme configuration details
- Task pane dimensions for the target host
- Next steps:
  - Run `npm start` to sideload the add-in
  - Test theme detection by changing Office theme
  - Review the sample component for host-specific API patterns
