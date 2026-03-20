# SharePoint and M365 Integration with Fluent UI

## Overview

SharePoint Framework (SPFx) is the extensibility model for SharePoint Online and Microsoft 365. SPFx web parts and extensions run inside the SharePoint page context and can use Fluent UI React v9 for a consistent M365 experience. This reference covers setting up Fluent v9 in SPFx, bridging SharePoint themes to Fluent themes, handling layout modes, building property panes, and embedding Fluent apps in M365 surfaces.

## SPFx Web Part Setup with Fluent v9

### Prerequisites

- Node.js 18.x (LTS)
- SPFx 1.18+ (ships with React 17, compatible with Fluent v9)
- SharePoint Online tenant

### Scaffolding

```bash
# Install SPFx generator
npm install -g @microsoft/generator-sharepoint

# Scaffold a new web part
yo @microsoft/sharepoint \
  --solution-name my-fluent-webpart \
  --framework react \
  --component-type webpart \
  --component-name FluentDashboard \
  --is-domain-isolated false
```

### Installing Fluent v9

```bash
cd my-fluent-webpart
npm install @fluentui/react-components @fluentui/react-icons
```

### Web Part Entry Point

The SPFx web part class renders a React component and passes the SharePoint theme context:

```tsx
// src/webparts/fluentDashboard/FluentDashboardWebPart.ts
import * as React from "react";
import * as ReactDom from "react-dom";
import { BaseClientSideWebPart } from "@microsoft/sp-webpart-base";
import type { IReadonlyTheme } from "@microsoft/sp-component-base";
import { FluentDashboard, type IFluentDashboardProps } from "./components/FluentDashboard";

export default class FluentDashboardWebPart extends BaseClientSideWebPart<{}> {
  private _currentTheme: IReadonlyTheme | undefined;

  protected onThemeChanged(currentTheme: IReadonlyTheme | undefined): void {
    this._currentTheme = currentTheme;
    this.render(); // Re-render when theme changes (e.g., section background color)
  }

  public render(): void {
    const element = React.createElement(FluentDashboard, {
      spTheme: this._currentTheme,
      context: this.context,
    });
    ReactDom.render(element, this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }
}
```

### React Component with FluentProvider

```tsx
// src/webparts/fluentDashboard/components/FluentDashboard.tsx
import * as React from "react";
import { FluentProvider, Title1, Body1, Card, CardHeader, tokens } from "@fluentui/react-components";
import type { Theme } from "@fluentui/react-components";
import type { IReadonlyTheme } from "@microsoft/sp-component-base";
import type { WebPartContext } from "@microsoft/sp-webpart-base";
import { mapSharePointTheme } from "../utils/themeMapping";

export interface IFluentDashboardProps {
  spTheme: IReadonlyTheme | undefined;
  context: WebPartContext;
}

export function FluentDashboard({ spTheme, context }: IFluentDashboardProps) {
  const fluentTheme = React.useMemo(() => mapSharePointTheme(spTheme), [spTheme]);

  return (
    <FluentProvider theme={fluentTheme}>
      <div style={{ padding: tokens.spacingVerticalL }}>
        <Title1 block>Dashboard</Title1>
        <Body1 block style={{ marginTop: tokens.spacingVerticalS }}>
          Welcome, {context.pageContext.user.displayName}
        </Body1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: tokens.spacingHorizontalL, marginTop: tokens.spacingVerticalL }}>
          <Card>
            <CardHeader header={<Body1><b>Active Tasks</b></Body1>} description="12 pending" />
          </Card>
          <Card>
            <CardHeader header={<Body1><b>Documents</b></Body1>} description="47 files" />
          </Card>
          <Card>
            <CardHeader header={<Body1><b>Team Members</b></Body1>} description="8 online" />
          </Card>
        </div>
      </div>
    </FluentProvider>
  );
}
```

## SharePoint Theme to Fluent Theme Mapping

SharePoint provides theme colors through `IReadonlyTheme` which includes `palette` and `semanticColors`. These must be mapped to Fluent's `BrandVariants` and `Theme` objects.

### Theme Mapping Utility

```tsx
// src/webparts/fluentDashboard/utils/themeMapping.ts
import {
  createLightTheme,
  createDarkTheme,
  webLightTheme,
} from "@fluentui/react-components";
import type { BrandVariants, Theme } from "@fluentui/react-components";
import type { IReadonlyTheme } from "@microsoft/sp-component-base";

/**
 * Convert a hex color to HSL components.
 */
function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return [0, 0, l];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return [h * 360, s, l];
}

/**
 * Generate a brand ramp from a primary color.
 */
function generateBrandRamp(primaryHex: string): BrandVariants {
  const [h, s] = hexToHsl(primaryHex);

  function hslToHex(h: number, s: number, l: number): string {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const r = Math.round(hue2rgb(p, q, h / 360 + 1 / 3) * 255);
    const g = Math.round(hue2rgb(p, q, h / 360) * 255);
    const b = Math.round(hue2rgb(p, q, h / 360 - 1 / 3) * 255);

    return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
  }

  // 16-step ramp from very dark (10) to very light (160)
  const lightnesses = [0.03, 0.07, 0.12, 0.17, 0.22, 0.28, 0.34, 0.42, 0.50, 0.57, 0.64, 0.71, 0.78, 0.85, 0.91, 0.97];

  return {
    10: hslToHex(h, s, lightnesses[0]),
    20: hslToHex(h, s, lightnesses[1]),
    30: hslToHex(h, s, lightnesses[2]),
    40: hslToHex(h, s, lightnesses[3]),
    50: hslToHex(h, s, lightnesses[4]),
    60: hslToHex(h, s, lightnesses[5]),
    70: hslToHex(h, s, lightnesses[6]),
    80: hslToHex(h, s, lightnesses[7]),
    90: hslToHex(h, s, lightnesses[8]),
    100: hslToHex(h, s, lightnesses[9]),
    110: hslToHex(h, s, lightnesses[10]),
    120: hslToHex(h, s, lightnesses[11]),
    130: hslToHex(h, s, lightnesses[12]),
    140: hslToHex(h, s, lightnesses[13]),
    150: hslToHex(h, s, lightnesses[14]),
    160: hslToHex(h, s, lightnesses[15]),
  };
}

/**
 * Map a SharePoint IReadonlyTheme to a Fluent v9 Theme.
 */
export function mapSharePointTheme(spTheme: IReadonlyTheme | undefined): Theme {
  if (!spTheme?.palette) return webLightTheme;

  const primaryColor = spTheme.palette.themePrimary || "#0078d4";
  const brand = generateBrandRamp(primaryColor);
  const isDark = spTheme.isInverted ?? false;
  const baseTheme = isDark ? createDarkTheme(brand) : createLightTheme(brand);

  // Override specific tokens from SharePoint semantic colors for precision
  if (spTheme.semanticColors) {
    const sc = spTheme.semanticColors;
    return {
      ...baseTheme,
      colorNeutralForeground1: sc.bodyText || baseTheme.colorNeutralForeground1,
      colorNeutralBackground1: sc.bodyBackground || baseTheme.colorNeutralBackground1,
      colorBrandForegroundLink: sc.link || baseTheme.colorBrandForegroundLink,
      colorBrandForegroundLinkHover: sc.linkHovered || baseTheme.colorBrandForegroundLinkHover,
      colorPaletteRedForeground1: sc.errorText || baseTheme.colorPaletteRedForeground1,
    };
  }

  return baseTheme;
}
```

### Token Mapping Reference

| SharePoint palette token | Fluent v9 token | Notes |
|---|---|---|
| `palette.themePrimary` | `colorBrandBackground` | Primary brand color; drives entire brand ramp |
| `palette.themeDarker` | `colorBrandBackgroundPressed` | Pressed state |
| `palette.themeDark` | `colorBrandBackgroundHover` | Hover state |
| `palette.themeLighter` | `colorBrandBackground2` | Subtle brand backgrounds |
| `palette.neutralPrimary` | `colorNeutralForeground1` | Default text |
| `palette.neutralSecondary` | `colorNeutralForeground2` | Secondary text |
| `palette.neutralTertiary` | `colorNeutralForeground3` | Disabled / placeholder |
| `palette.neutralLight` | `colorNeutralBackground3` | Subtle backgrounds |
| `palette.neutralLighter` | `colorNeutralBackground2` | Surface backgrounds |
| `palette.white` | `colorNeutralBackground1` | Page background |
| `semanticColors.bodyText` | `colorNeutralForeground1` | Body text |
| `semanticColors.link` | `colorBrandForegroundLink` | Links |
| `semanticColors.errorText` | `colorPaletteRedForeground1` | Validation errors |
| `semanticColors.inputBorder` | `colorNeutralStroke1` | Form field borders |

## Full-Width vs Fixed-Width Web Parts

### Full-Width (Full-Bleed)

Enable full-width rendering in the web part manifest:

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/spfx/client-side-web-part-manifest.schema.json",
  "id": "...",
  "componentType": "WebPart",
  "version": "1.0.0",
  "manifestVersion": 2,
  "supportsFullBleed": true,
  "preconfiguredEntries": [...]
}
```

Full-bleed web parts span the entire page width. They are ideal for dashboard-style Fluent apps that need their own app shell with NavDrawer navigation.

### Fixed-Width Considerations

Standard web parts render within SharePoint's column grid (1-3 columns). Design components to be responsive:

```tsx
import { tokens, makeStyles } from "@fluentui/react-components";

const useStyles = makeStyles({
  grid: {
    display: "grid",
    gap: tokens.spacingHorizontalM,
    // 1 column at small, 2 at medium, 3 at large
    gridTemplateColumns: "1fr",
    "@media (min-width: 480px)": {
      gridTemplateColumns: "repeat(2, 1fr)",
    },
    "@media (min-width: 768px)": {
      gridTemplateColumns: "repeat(3, 1fr)",
    },
  },
});
```

## Property Pane with Fluent Components

SPFx property panes use their own control system, but you can render custom Fluent components inside property pane fields.

### Custom Property Pane Field

```tsx
// src/webparts/fluentDashboard/propertyPane/FluentColorPicker.ts
import * as React from "react";
import * as ReactDom from "react-dom";
import { type IPropertyPaneField, PropertyPaneFieldType } from "@microsoft/sp-property-pane";
import { FluentProvider, webLightTheme, SwatchPicker, renderSwatchPickerGrid } from "@fluentui/react-components";

interface IFluentColorPickerProps {
  label: string;
  value: string;
  onChanged: (value: string) => void;
}

function FluentColorPickerControl({ label, value, onChanged }: IFluentColorPickerProps) {
  const colors = ["#0f6cbd", "#e74c3c", "#2ecc71", "#9b59b6", "#f39c12", "#1abc9c"];
  return (
    <FluentProvider theme={webLightTheme}>
      <div style={{ padding: "8px 0" }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>{label}</label>
        <SwatchPicker
          selectedValue={value}
          onSelectionChange={(_, data) => onChanged(data.selectedValue)}
        >
          {renderSwatchPickerGrid({
            items: colors.map(c => ({ color: c, value: c, "aria-label": c })),
            columnCount: 3,
          })}
        </SwatchPicker>
      </div>
    </FluentProvider>
  );
}

export function PropertyPaneFluentColorPicker(
  targetProperty: string,
  properties: { label: string; value: string; onChanged: (value: string) => void }
): IPropertyPaneField<any> {
  return {
    type: PropertyPaneFieldType.Custom,
    targetProperty,
    properties: {
      key: targetProperty,
      onRender: (elem: HTMLElement) => {
        ReactDom.render(
          React.createElement(FluentColorPickerControl, properties),
          elem
        );
      },
      onDispose: (elem: HTMLElement) => {
        ReactDom.unmountComponentAtNode(elem);
      },
    },
  };
}
```

## M365 Embedded App Patterns

### Single-Part App Pages

SharePoint supports single-part app pages where a single full-bleed web part takes over the entire page. This is ideal for full Fluent applications.

```typescript
// In web part manifest
{
  "supportsFullBleed": true
}
```

Users add the web part to a single-part app page layout, removing all SharePoint page chrome except the suite bar.

### Teams Tab as SharePoint-Hosted App

A SharePoint web part can be surfaced as a Teams tab:

```json
// In the web part manifest
{
  "supportedHosts": ["SharePointWebPart", "TeamsTab", "TeamsPersonalApp"]
}
```

When running in Teams, detect the host and adjust:

```tsx
import { useEffect, useState } from "react";
import { teamsLightTheme, webLightTheme } from "@fluentui/react-components";

function useHostTheme(context: WebPartContext) {
  const [theme, setTheme] = useState(webLightTheme);

  useEffect(() => {
    // Check if running inside Teams
    if (context.sdks?.microsoftTeams) {
      setTheme(teamsLightTheme);
      // Could also listen for Teams theme changes via microsoftTeams.app.registerOnThemeChangeHandler
    }
  }, [context]);

  return theme;
}
```

### Embedding in Viva Connections

Adaptive Card Extensions (ACEs) appear on the Viva Connections dashboard. While ACEs use Adaptive Cards (not React), the linked experience (quick view or full page) can be a Fluent UI web part:

```typescript
// In the ACE, link to a full Fluent web part page
public get cardButtons(): [ICardButton] {
  return [{
    title: "Open Dashboard",
    action: {
      type: "ExternalLink",
      parameters: {
        target: "https://contoso.sharepoint.com/sites/intranet/SitePages/Dashboard.aspx",
      },
    },
  }];
}
```

## Performance Considerations

### Tree Shaking

Fluent v9 supports tree shaking. Import only the components you use:

```tsx
// Good — only Button is bundled
import { Button } from "@fluentui/react-components";

// Avoid — imports everything
import * as Fluent from "@fluentui/react-components";
```

### Bundle Size in SPFx

SPFx bundles are loaded per web part. Keep bundles small:

- Use `@fluentui/react-components` (not the full `@fluentui/react` v8 package)
- Lazy-load heavy components with `React.lazy()`
- Use SPFx dynamic loading for optional features

```tsx
const HeavyChart = React.lazy(() => import("./HeavyChart"));

function Dashboard() {
  return (
    <React.Suspense fallback={<Spinner size="medium" />}>
      <HeavyChart />
    </React.Suspense>
  );
}
```

### Avoiding Style Conflicts

SharePoint pages include their own CSS. Fluent v9 uses Griffel (atomic CSS) which minimizes conflicts, but some global styles may still interfere:

```css
/* Reset SharePoint styles within your web part */
.fluentDashboard a {
  /* Override SharePoint's global link styles */
  text-decoration: none;
}

.fluentDashboard * {
  box-sizing: border-box;
}
```

## References

- SPFx overview: https://learn.microsoft.com/en-us/sharepoint/dev/spfx/sharepoint-framework-overview
- SPFx with Fluent UI: https://learn.microsoft.com/en-us/sharepoint/dev/spfx/versionv1.18-release-notes
- SharePoint themes: https://learn.microsoft.com/en-us/sharepoint/dev/declarative-customization/site-theming/sharepoint-site-theming-overview
- Single-part app pages: https://learn.microsoft.com/en-us/sharepoint/dev/spfx/web-parts/single-part-app-pages
- SPFx in Teams: https://learn.microsoft.com/en-us/sharepoint/dev/spfx/build-for-teams-overview
