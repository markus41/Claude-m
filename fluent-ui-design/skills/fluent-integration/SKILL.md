---
name: Fluent UI Integration Patterns
description: >
  Integrating Fluent UI with Azure AD B2C custom UI, Office Add-ins (Excel, Word, Outlook task panes),
  SharePoint/M365 web apps, and navigation patterns (Nav, Drawer components).
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - b2c fluent
  - b2c ui customization
  - office addin fluent
  - word addin
  - excel addin
  - outlook addin
  - sharepoint fluent
  - fluent office
  - fluent b2c
  - azure ad b2c ui
  - office add-in fluent
  - fluent task pane
  - fluent addin
---

# Fluent UI Integration Patterns

## Overview

Fluent UI extends far beyond standalone React applications. Microsoft's design system is engineered to provide a consistent experience across the entire M365 ecosystem: from Azure AD B2C authentication pages that users encounter before entering an app, through Office Add-in task panes embedded in Excel, Word, and Outlook, to SharePoint Framework web parts running inside SharePoint Online. This skill covers the patterns, constraints, and best practices for integrating Fluent UI into each of these contexts.

Key integration surfaces covered:

- **Azure AD B2C** — Custom HTML templates with Fluent design tokens for branded sign-in, sign-up, and password reset flows
- **Office Add-ins** — Fluent React components inside task panes, content panes, and dialog boxes within Excel, Word, Outlook, and PowerPoint
- **SharePoint / M365** — SPFx web parts using Fluent v9, theme token bridging from SharePoint themes, and embedded Fluent apps
- **Navigation patterns** — Nav, Drawer, and NavDrawer patterns for building app shells with responsive sidebar navigation

---

## Azure AD B2C UI Customization

Azure AD B2C user flows and custom policies render HTML pages for authentication steps: sign-in, sign-up, profile editing, and password reset. You can fully customize the HTML/CSS of these pages to match your Fluent-based application, providing users with a seamless visual transition from authentication into the app.

### Custom HTML Templates

B2C pages load a custom HTML template from a CORS-enabled endpoint (Azure Blob Storage or a CDN). The template contains a `<div id="api">` element where B2C injects its form controls.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sign In — Contoso</title>
  <link rel="stylesheet" href="https://your-cdn.com/b2c-fluent.css" />
</head>
<body>
  <div class="b2c-page-container">
    <div class="b2c-branding-panel">
      <img src="https://your-cdn.com/logo.svg" alt="Contoso" class="b2c-logo" />
      <h1 class="b2c-heading">Welcome to Contoso</h1>
      <p class="b2c-subheading">Sign in to continue</p>
    </div>
    <div class="b2c-form-panel">
      <!-- B2C injects its controls here -->
      <div id="api"></div>
    </div>
  </div>
</body>
</html>
```

### Applying Fluent Design Tokens to B2C Pages

Since B2C pages run outside your React app, you cannot use FluentProvider. Instead, map Fluent design token values to CSS custom properties and apply them to B2C-injected elements.

```css
:root {
  /* Fluent token values applied as CSS custom properties */
  --b2c-brand-primary: #0f6cbd;          /* colorBrandBackground */
  --b2c-brand-hover: #115ea3;            /* colorBrandBackgroundHover */
  --b2c-brand-pressed: #0c3b5e;          /* colorBrandBackgroundPressed */
  --b2c-text-primary: #242424;           /* colorNeutralForeground1 */
  --b2c-text-secondary: #616161;         /* colorNeutralForeground2 */
  --b2c-bg-page: #fafafa;               /* colorNeutralBackground2 */
  --b2c-bg-card: #ffffff;               /* colorNeutralBackground1 */
  --b2c-border-default: #d1d1d1;        /* colorNeutralStroke1 */
  --b2c-border-focus: #0f6cbd;          /* colorBrandStroke1 */
  --b2c-border-radius: 4px;             /* borderRadiusMedium */
  --b2c-font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
  --b2c-font-size-base: 14px;           /* fontSizeBase300 */
  --b2c-font-size-heading: 24px;        /* fontSizeBase600 */
  --b2c-font-weight-semibold: 600;      /* fontWeightSemibold */
  --b2c-shadow-card: 0 2px 4px rgba(0,0,0,0.14), 0 0 2px rgba(0,0,0,0.12);
}
```

### Styling B2C-Injected Elements

B2C injects elements with specific class names. Target them to apply Fluent styling:

```css
/* Text inputs */
#api .entry .entry-item input[type="email"],
#api .entry .entry-item input[type="password"],
#api .entry .entry-item input[type="text"] {
  font-family: var(--b2c-font-family);
  font-size: var(--b2c-font-size-base);
  color: var(--b2c-text-primary);
  border: 1px solid var(--b2c-border-default);
  border-radius: var(--b2c-border-radius);
  padding: 5px 12px;
  height: 32px;
  outline: none;
  transition: border-color 0.1s ease;
}

#api .entry .entry-item input:focus {
  border-color: var(--b2c-border-focus);
  border-width: 2px;
  padding: 4px 11px; /* compensate for thicker border */
}

/* Primary button (Sign in) */
#api .buttons button#next {
  background-color: var(--b2c-brand-primary);
  color: #ffffff;
  border: none;
  border-radius: var(--b2c-border-radius);
  padding: 5px 20px;
  min-height: 32px;
  font-family: var(--b2c-font-family);
  font-size: var(--b2c-font-size-base);
  font-weight: var(--b2c-font-weight-semibold);
  cursor: pointer;
  transition: background-color 0.1s ease;
}

#api .buttons button#next:hover {
  background-color: var(--b2c-brand-hover);
}

#api .buttons button#next:active {
  background-color: var(--b2c-brand-pressed);
}
```

### Page Layout Templates

B2C supports several page layout templates. The most commonly customized:

| Page type | Template ID | Use case |
|---|---|---|
| Unified sign-in/sign-up | `selfAsserted` | Combined sign-in and sign-up |
| Sign-in only | `signIn` | Traditional sign-in page |
| Sign-up only | `localAccountSignUp` | Registration page |
| Password reset | `selfAsserted` | Forgot password flow |
| MFA | `multiFactor` | Second-factor verification |
| Error | `exception` | Error display page |

### Custom Policy Integration

For advanced scenarios, custom policies (Identity Experience Framework) allow full control:

```xml
<ContentDefinition Id="api.signuporsignin">
  <LoadUri>https://your-cdn.com/b2c-templates/unified.html</LoadUri>
  <RecoveryUri>~/common/default_page_error.html</RecoveryUri>
  <DataUri>urn:com:microsoft:aad:b2c:elements:contract:unifiedssp:2.1.7</DataUri>
</ContentDefinition>
```

### References

- Customize the user interface: https://learn.microsoft.com/en-us/azure/active-directory-b2c/customize-ui
- Customize with HTML: https://learn.microsoft.com/en-us/azure/active-directory-b2c/customize-ui-with-html
- Custom policy overview: https://learn.microsoft.com/en-us/azure/active-directory-b2c/custom-policy-overview

---

## Office Add-ins with Fluent UI

Office Add-ins run inside a web container (task pane, content area, or dialog) within Excel, Word, Outlook, and PowerPoint. Fluent UI React v9 is the recommended component library for building add-in UIs that feel native to Office.

### Yo Office Generator Setup

The Yo Office generator scaffolds an Office Add-in project with Fluent UI pre-configured:

```bash
# Install the generator
npm install -g yo generator-office

# Scaffold a new add-in with React + Fluent UI
yo office --projectType taskpane --framework react --host excel --name my-excel-addin
```

Available `--host` values: `excel`, `word`, `outlook`, `powerpoint`, `onenote`.

### Task Pane Constraints

Task panes have strict dimension constraints that vary by host application:

| Host | Min width | Default width | Max width | Min height |
|---|---|---|---|---|
| Excel | 320px | 350px | ~50% of window | 150px |
| Word | 320px | 350px | ~50% of window | 150px |
| Outlook (read) | 320px | 350px | ~50% of window | 150px |
| Outlook (compose) | 320px | 396px | ~50% of window | 150px |
| PowerPoint | 320px | 350px | ~50% of window | 150px |

Design implications:
- Use single-column layouts at 320px
- Use compact component sizes (`size="small"`)
- Avoid horizontal scrolling
- Stack form fields vertically
- Use Drawer or Dialog for secondary content rather than side-by-side panels

### FluentProvider in Add-in Context

Set up FluentProvider as the root wrapper in the task pane entry point:

```tsx
// src/taskpane/index.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { FluentProvider, webLightTheme, webDarkTheme } from "@fluentui/react-components";
import { App } from "./App";

// Detect Office theme
function getOfficeTheme(): "light" | "dark" {
  if (Office.context?.officeTheme) {
    const bg = Office.context.officeTheme.bodyBackgroundColor;
    // Dark theme backgrounds have low luminance
    const r = parseInt(bg.slice(1, 3), 16);
    const g = parseInt(bg.slice(3, 5), 16);
    const b = parseInt(bg.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5 ? "dark" : "light";
  }
  return "light";
}

Office.onReady(() => {
  const root = createRoot(document.getElementById("container")!);
  const theme = getOfficeTheme() === "dark" ? webDarkTheme : webLightTheme;

  root.render(
    <FluentProvider theme={theme} style={{ height: "100vh" }}>
      <App />
    </FluentProvider>
  );
});
```

### Office.js + Fluent Component Interaction

Fluent components trigger Office.js API calls through event handlers:

```tsx
import { Button, Input, Field, Spinner } from "@fluentui/react-components";
import { useCallback, useState } from "react";

export function ExcelWriter() {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  const writeToCell = useCallback(async () => {
    setLoading(true);
    try {
      await Excel.run(async (context) => {
        const range = context.workbook.getSelectedRange();
        range.values = [[value]];
        await context.sync();
      });
    } finally {
      setLoading(false);
    }
  }, [value]);

  return (
    <div style={{ padding: "16px" }}>
      <Field label="Value to write">
        <Input value={value} onChange={(_, d) => setValue(d.value)} size="small" />
      </Field>
      <Button
        appearance="primary"
        size="small"
        onClick={writeToCell}
        disabled={loading}
        icon={loading ? <Spinner size="tiny" /> : undefined}
        style={{ marginTop: "8px" }}
      >
        Write to Selected Cell
      </Button>
    </div>
  );
}
```

### References

- Fluent React quickstart for Office Add-ins: https://learn.microsoft.com/en-us/office/dev/add-ins/quickstarts/fluent-react-quickstart
- Office Add-in task pane: https://learn.microsoft.com/en-us/office/dev/add-ins/design/task-pane-add-ins
- Office.js API reference: https://learn.microsoft.com/en-us/javascript/api/overview

---

## SharePoint / M365 Integration

### SPFx Web Parts with Fluent v9

SharePoint Framework (SPFx) web parts can use Fluent UI React v9. SPFx 1.18+ ships with React 17 and supports Fluent v9 components.

```bash
# Install Fluent v9 in an SPFx project
npm install @fluentui/react-components @fluentui/react-icons
```

#### FluentProvider in SPFx

SPFx web parts render inside a shadow-free DOM container. Wrap the web part root in FluentProvider and map the SharePoint theme:

```tsx
// src/webparts/myWebPart/components/MyWebPart.tsx
import { FluentProvider, createLightTheme, createDarkTheme } from "@fluentui/react-components";
import type { BrandVariants } from "@fluentui/react-components";
import type { IReadonlyTheme } from "@microsoft/sp-component-base";

interface IMyWebPartProps {
  spTheme: IReadonlyTheme | undefined;
}

function mapSharePointTheme(spTheme: IReadonlyTheme | undefined) {
  if (!spTheme) return undefined;

  const primaryColor = spTheme.palette?.themePrimary || "#0078d4";

  // Build brand ramp from SharePoint primary color
  const brand: BrandVariants = {
    10: "#020305", 20: "#111723", 30: "#16263d", 40: "#193253",
    50: "#1b3f6a", 60: "#1b4c82", 70: "#18599b", 80: primaryColor,
    90: "#3a96dd", 100: "#5ca5e4", 110: "#7ab3ea", 120: "#96c2f0",
    130: "#b0d1f5", 140: "#c9e0f9", 150: "#e0effc", 160: "#f5f9fe",
  };

  const isDark = spTheme.isInverted;
  return isDark ? createDarkTheme(brand) : createLightTheme(brand);
}

export function MyWebPart({ spTheme }: IMyWebPartProps) {
  const fluentTheme = mapSharePointTheme(spTheme);

  return (
    <FluentProvider theme={fluentTheme}>
      {/* Web part content */}
    </FluentProvider>
  );
}
```

### SharePoint Theme Token Mapping

SharePoint exposes theme colors through `IReadonlyTheme`. Key mappings to Fluent tokens:

| SharePoint token | Fluent token | Usage |
|---|---|---|
| `palette.themePrimary` | `colorBrandBackground` | Primary actions |
| `palette.neutralPrimary` | `colorNeutralForeground1` | Body text |
| `palette.neutralLight` | `colorNeutralBackground3` | Subtle backgrounds |
| `palette.white` | `colorNeutralBackground1` | Page background |
| `palette.neutralDark` | `colorNeutralForeground1` | Headings |
| `semanticColors.bodyText` | `colorNeutralForeground1` | Default text |
| `semanticColors.link` | `colorBrandForegroundLink` | Hyperlinks |
| `semanticColors.errorText` | `colorPaletteRedForeground1` | Error messages |

### Embedded Fluent Apps in SharePoint

For full-page Fluent applications embedded in SharePoint, use the single-part app page layout:

```typescript
// In the web part manifest
{
  "supportsFullBleed": true  // Enables full-width rendering
}
```

This removes the SharePoint chrome around the web part, allowing a full Fluent app shell experience with its own navigation.

---

## Navigation Patterns

Fluent UI provides Nav, Drawer, and combined NavDrawer patterns for building application navigation.

### Nav Component

The Nav component renders a vertical navigation list with hierarchical items, selection tracking, and category grouping.

```tsx
import { Nav, NavItem, NavCategory, NavCategoryItem, NavSubItemGroup, NavSubItem } from "@fluentui/react-nav-preview";
import { Home24Regular, Settings24Regular, Document24Regular } from "@fluentui/react-icons";

export function AppNav() {
  return (
    <Nav defaultSelectedValue="home">
      <NavItem value="home" icon={<Home24Regular />}>
        Home
      </NavItem>
      <NavCategory value="documents">
        <NavCategoryItem icon={<Document24Regular />}>Documents</NavCategoryItem>
        <NavSubItemGroup>
          <NavSubItem value="recent">Recent</NavSubItem>
          <NavSubItem value="shared">Shared with me</NavSubItem>
        </NavSubItemGroup>
      </NavCategory>
      <NavItem value="settings" icon={<Settings24Regular />}>
        Settings
      </NavItem>
    </Nav>
  );
}
```

Reference: https://fluent2.microsoft.design/components/web/react/core/nav/usage

### Drawer Component

The Drawer provides a panel that slides in from the edge of the screen. It supports `inline` (pushes content) and `overlay` (covers content) modes.

```tsx
import { Drawer, DrawerBody, DrawerHeader, DrawerHeaderTitle } from "@fluentui/react-drawer";
import { Button } from "@fluentui/react-components";
import { Dismiss24Regular } from "@fluentui/react-icons";

export function SidePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Drawer open={open} type="overlay" position="start" onOpenChange={(_, { open }) => !open && onClose()}>
      <DrawerHeader>
        <DrawerHeaderTitle
          action={<Button appearance="subtle" icon={<Dismiss24Regular />} onClick={onClose} />}
        >
          Navigation
        </DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody>
        {/* Navigation content */}
      </DrawerBody>
    </Drawer>
  );
}
```

Reference: https://fluent2.microsoft.design/components/web/react/core/drawer/usage

### NavDrawer Pattern

The NavDrawer combines Nav inside a Drawer for a complete sidebar navigation experience. This is the recommended pattern for M365-style app shells.

```tsx
import { NavDrawer, NavDrawerBody, NavDrawerHeader, NavItem, NavCategory, NavCategoryItem, NavSubItemGroup, NavSubItem } from "@fluentui/react-nav-preview";
import { Hamburger24Regular } from "@fluentui/react-icons";

export function AppShell() {
  const [open, setOpen] = useState(true);

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <NavDrawer open={open} type="inline" size="medium">
        <NavDrawerHeader>
          <Button
            appearance="subtle"
            icon={<Hamburger24Regular />}
            onClick={() => setOpen(!open)}
          />
        </NavDrawerHeader>
        <NavDrawerBody>
          <Nav defaultSelectedValue="home">
            <NavItem value="home">Home</NavItem>
            <NavItem value="tasks">Tasks</NavItem>
            <NavCategory value="reports">
              <NavCategoryItem>Reports</NavCategoryItem>
              <NavSubItemGroup>
                <NavSubItem value="weekly">Weekly</NavSubItem>
                <NavSubItem value="monthly">Monthly</NavSubItem>
              </NavSubItemGroup>
            </NavCategory>
          </Nav>
        </NavDrawerBody>
      </NavDrawer>
      <main style={{ flex: 1, overflow: "auto" }}>
        {/* Page content */}
      </main>
    </div>
  );
}
```

### Responsive Navigation

A common pattern is to switch between inline Nav (desktop) and overlay Drawer (mobile):

```tsx
import { useMediaQuery } from "./hooks/useMediaQuery";

export function ResponsiveNav() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {isMobile && (
        <Button
          appearance="subtle"
          icon={<Navigation24Regular />}
          onClick={() => setDrawerOpen(true)}
          style={{ position: "fixed", top: 8, left: 8, zIndex: 1000 }}
        />
      )}
      <NavDrawer
        open={drawerOpen}
        type={isMobile ? "overlay" : "inline"}
        size="medium"
        onOpenChange={(_, { open }) => {
          if (isMobile) setDrawerOpen(open);
        }}
      >
        <NavDrawerBody>
          <Nav>
            <NavItem value="home">Home</NavItem>
            <NavItem value="dashboard">Dashboard</NavItem>
            <NavItem value="settings">Settings</NavItem>
          </Nav>
        </NavDrawerBody>
      </NavDrawer>
      <main style={{ flex: 1, overflow: "auto", padding: isMobile ? "48px 16px 16px" : "16px 24px" }}>
        {/* Content */}
      </main>
    </div>
  );
}
```

The useMediaQuery hook:

```tsx
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}
```

---

## Cross-References

| Topic | Skill |
|---|---|
| Core design tokens, color, typography, components | `fluent-design-system` |
| Next.js integration (SSR, App Router) | `fluent-nextjs` |
| Custom components and theme extensibility | `fluent-extensibility` |
| Griffel styling engine (makeStyles, mergeClasses) | `fluent-griffel` |
| Form components and validation | `fluent-forms` |
| Web Components (non-React) | `fluent-web-components` |
| Charting and data visualization | `fluent-charting` |
| Cross-platform (React Native, MAUI) | `fluent-cross-platform` |

---

## Quick Decision Guide

| Scenario | Approach |
|---|---|
| B2C sign-in pages | Custom HTML + CSS with Fluent token values; no React |
| Office Add-in task pane | Full Fluent React v9 with FluentProvider; small/compact sizes |
| SPFx web part | Fluent React v9 with SharePoint theme mapping |
| Full-page SharePoint app | SPFx full-bleed web part with NavDrawer app shell |
| Embedded iframe in M365 | Fluent React v9 with postMessage theme sync |
| Teams tab (personal/channel) | See `fluent-design-system` Teams theming section |
