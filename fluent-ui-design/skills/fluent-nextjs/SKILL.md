---
name: Fluent UI Next.js Integration
description: >
  Next.js integration for Fluent UI React v9 — App Router setup with 'use client' boundaries,
  Pages Router setup, SSRProvider and RendererProvider configuration, Griffel AOT with webpack,
  fluentui-nextjs-appdir-plugin, and known SSR bundle size workarounds.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - nextjs fluent
  - fluent ssr
  - fluent app router
  - fluent pages router
  - fluent server components
  - ssr griffel
  - fluent next
  - next.js fluent ui
  - fluent nextjs
  - nextjs fluent ui
  - fluent server side rendering
  - next fluent provider
---

# Fluent UI React v9 + Next.js Integration

## Overview

Next.js introduces server-side rendering (SSR) and React Server Components (RSC) that create
specific challenges for Fluent UI React v9. Fluent uses Griffel for CSS-in-JS styling, which
generates styles at runtime by default. In a server-rendered environment, styles must be collected
during server rendering and injected into the HTML before the client hydrates — otherwise users
experience a flash of unstyled content (FOUC) or hydration mismatches.

**Why special handling is required:**

1. **CSS-in-JS hydration** — Griffel generates atomic CSS classes at runtime. On the server, these
   styles must be captured and serialized into `<style>` tags so the client can rehydrate without
   regenerating them.

2. **React Server Components** — Next.js App Router defaults all components to RSC. Fluent UI
   components use React context, state, and effects — all client-only APIs. Every Fluent component
   must be rendered inside a `'use client'` boundary.

3. **FluentProvider is client-only** — `FluentProvider` uses React context to distribute theme tokens
   and the Griffel renderer. It cannot run as a server component.

4. **Bundle size** — Fluent UI's barrel exports in `@fluentui/react-components` can cause large
   bundles when tree shaking is not configured correctly. Next.js webpack and Turbopack handle
   this differently.

**Two router strategies exist:**

| Aspect | App Router (Next.js 13+) | Pages Router |
|--------|--------------------------|--------------|
| Default component type | Server Component | Client Component |
| Style injection | `useServerInsertedHTML` | `_document.tsx` `renderToStyleElements` |
| Provider location | `app/providers.tsx` (`'use client'`) | `_app.tsx` |
| SSR style extraction | Automatic via hook | Manual in `getInitialProps` |

**Official documentation:**
- App Router: https://storybooks.fluentui.dev/react/?path=/docs/concepts-developer-server-side-rendering-next-js-appdir-setup--docs
- Pages Router: https://react.fluentui.dev/?path=/docs/concepts-developer-server-side-rendering-next-js-pages-setup--docs

---

## App Router Setup

The App Router (Next.js 13.4+) uses React Server Components by default. Fluent UI components are
client components, so every Fluent import must live inside a `'use client'` boundary.

### Step 1: Install Dependencies

```bash
npm install @fluentui/react-components @fluentui/react-icons
```

### Step 2: Create the Providers Component

Create `app/providers.tsx` — this is the client boundary that wraps your entire app with
`FluentProvider` and handles SSR style injection.

```tsx
// app/providers.tsx
'use client';

import { useState } from 'react';
import {
  FluentProvider,
  webLightTheme,
  webDarkTheme,
  RendererProvider,
  createDOMRenderer,
  SSRProvider,
} from '@fluentui/react-components';
import type { GriffelRenderer } from '@griffel/react';
import { useServerInsertedHTML } from 'next/navigation';
import { renderToStyleElements } from '@griffel/core';

export function Providers({ children }: { children: React.ReactNode }) {
  const [renderer] = useState<GriffelRenderer>(() => createDOMRenderer());

  useServerInsertedHTML(() => {
    const styles = renderToStyleElements(renderer);
    // Clear the insertion cache after extracting so styles are not duplicated
    // on subsequent server renders within the same request.
    return <>{styles}</>;
  });

  return (
    <RendererProvider renderer={renderer}>
      <SSRProvider>
        <FluentProvider theme={webLightTheme}>
          {children}
        </FluentProvider>
      </SSRProvider>
    </RendererProvider>
  );
}
```

**Key points:**
- `'use client'` at the top is mandatory — `FluentProvider` uses React context.
- `useServerInsertedHTML` is a Next.js hook that injects HTML into the server stream during
  rendering. Griffel's `renderToStyleElements` converts the collected styles into `<style>` elements.
- `createDOMRenderer()` creates an isolated Griffel renderer instance. Using `useState` ensures
  one renderer per React tree (important for concurrent features).
- `SSRProvider` generates deterministic IDs for SSR/client hydration matching.

### Step 3: Wire Into Root Layout

```tsx
// app/layout.tsx
import type { Metadata } from 'next';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'My Fluent App',
  description: 'Next.js + Fluent UI React v9',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

**Note:** `layout.tsx` itself remains a server component. Only the `<Providers>` wrapper is a
client component. Children passed into a client component boundary can still be server components.

### Step 4: Use Fluent Components in Pages

Any page that uses Fluent components directly needs the `'use client'` directive, or you can
isolate Fluent usage into client component files:

```tsx
// app/page.tsx
import { HeroSection } from './components/HeroSection';

export default function Home() {
  return (
    <main>
      <h1>Welcome</h1>
      <HeroSection />
    </main>
  );
}
```

```tsx
// app/components/HeroSection.tsx
'use client';

import { Button, Title1, tokens } from '@fluentui/react-components';
import { RocketRegular } from '@fluentui/react-icons';

export function HeroSection() {
  return (
    <div style={{ padding: tokens.spacingVerticalXXL }}>
      <Title1>Build with Fluent</Title1>
      <Button appearance="primary" icon={<RocketRegular />}>
        Get Started
      </Button>
    </div>
  );
}
```

### Understanding `'use client'` Boundaries

The `'use client'` directive marks the boundary where code transitions from server to client.
Everything imported by a `'use client'` file is bundled into the client JavaScript.

**Rules for Fluent in App Router:**

1. `FluentProvider`, `RendererProvider`, `SSRProvider` must be in a `'use client'` file.
2. Any component that imports from `@fluentui/react-components` must be `'use client'` or
   imported by a `'use client'` file.
3. You can pass server component children through the client boundary — they render on the server.
4. Data fetching should happen in server components, then pass data as props to client Fluent components.

```tsx
// Server component fetches data
// app/dashboard/page.tsx
import { DashboardCards } from './DashboardCards';

async function getData() {
  const res = await fetch('https://api.example.com/stats');
  return res.json();
}

export default async function DashboardPage() {
  const stats = await getData();
  return <DashboardCards stats={stats} />;
}
```

```tsx
// Client component renders Fluent UI
// app/dashboard/DashboardCards.tsx
'use client';

import { Card, CardHeader, Text, tokens } from '@fluentui/react-components';

export function DashboardCards({ stats }: { stats: { label: string; value: number }[] }) {
  return (
    <div style={{ display: 'flex', gap: tokens.spacingHorizontalL }}>
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardHeader header={<Text weight="semibold">{stat.label}</Text>} />
          <Text size={600}>{stat.value}</Text>
        </Card>
      ))}
    </div>
  );
}
```

---

## Pages Router Setup

The Pages Router (Next.js 12 and earlier convention) treats all components as client components
by default, making Fluent integration more straightforward.

### Step 1: Install Dependencies

```bash
npm install @fluentui/react-components @fluentui/react-icons
```

### Step 2: Configure `_app.tsx`

```tsx
// pages/_app.tsx
import type { AppProps } from 'next/app';
import {
  FluentProvider,
  webLightTheme,
  RendererProvider,
  createDOMRenderer,
  SSRProvider,
} from '@fluentui/react-components';
import type { GriffelRenderer } from '@griffel/react';

const renderer: GriffelRenderer = createDOMRenderer();

export default function App({ Component, pageProps }: AppProps) {
  return (
    <RendererProvider renderer={renderer}>
      <SSRProvider>
        <FluentProvider theme={webLightTheme}>
          <Component {...pageProps} />
        </FluentProvider>
      </SSRProvider>
    </RendererProvider>
  );
}
```

### Step 3: Configure `_document.tsx` for SSR Style Extraction

```tsx
// pages/_document.tsx
import Document, {
  Html,
  Head,
  Main,
  NextScript,
  DocumentContext,
  DocumentInitialProps,
} from 'next/document';
import { createDOMRenderer, renderToStyleElements } from '@fluentui/react-components';

class MyDocument extends Document {
  static async getInitialProps(
    ctx: DocumentContext
  ): Promise<DocumentInitialProps> {
    // Create a fresh renderer for each SSR request
    const renderer = createDOMRenderer();
    const originalRenderPage = ctx.renderPage;

    ctx.renderPage = () =>
      originalRenderPage({
        enhanceApp: (App) =>
          function EnhancedApp(props) {
            const EnhancedAppComponent = App as React.ComponentType<
              typeof props & { renderer: typeof renderer }
            >;
            return <EnhancedAppComponent {...props} renderer={renderer} />;
          },
      });

    const initialProps = await Document.getInitialProps(ctx);

    const styles = renderToStyleElements(renderer);

    return {
      ...initialProps,
      styles: (
        <>
          {initialProps.styles}
          {styles}
        </>
      ),
    };
  }

  render() {
    return (
      <Html lang="en">
        <Head />
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
```

**How it works:**

1. `getInitialProps` runs on the server for every page request.
2. A fresh `createDOMRenderer()` is created per request to avoid style leaks between requests.
3. `renderPage` is enhanced to pass the renderer through the component tree.
4. After rendering, `renderToStyleElements` extracts all Griffel styles into `<style>` elements.
5. These are injected into the document `<head>` alongside Next.js's own styles.

### Step 4: Accept Renderer in `_app.tsx` (Optional Enhancement)

To use the per-request renderer from `_document.tsx`:

```tsx
// pages/_app.tsx
import type { AppProps } from 'next/app';
import {
  FluentProvider,
  webLightTheme,
  RendererProvider,
  createDOMRenderer,
  SSRProvider,
} from '@fluentui/react-components';
import type { GriffelRenderer } from '@griffel/react';

// Fallback renderer for client-side navigation
const defaultRenderer: GriffelRenderer = createDOMRenderer();

type ExtendedAppProps = AppProps & {
  renderer?: GriffelRenderer;
};

export default function App({ Component, pageProps, renderer }: ExtendedAppProps) {
  return (
    <RendererProvider renderer={renderer ?? defaultRenderer}>
      <SSRProvider>
        <FluentProvider theme={webLightTheme}>
          <Component {...pageProps} />
        </FluentProvider>
      </SSRProvider>
    </RendererProvider>
  );
}
```

---

## fluentui-nextjs-appdir-plugin

When using the App Router, every Fluent UI package file needs a `'use client'` directive because
Fluent components use React hooks and context. Manually adding `'use client'` to every file that
imports Fluent would be tedious. The `fluentui-nextjs-appdir-plugin` automatically adds this
directive to Fluent UI package entries during webpack compilation.

**GitHub:** https://github.com/sopranopillow/fluentui-nextjs-appdir-plugin

### Installation

```bash
npm install --save-dev fluentui-nextjs-appdir-plugin
```

### Configuration

```js
// next.config.js
const { withFluentUI } = require('fluentui-nextjs-appdir-plugin');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... your other config
};

module.exports = withFluentUI(nextConfig);
```

Or with `next.config.mjs`:

```js
// next.config.mjs
import { withFluentUI } from 'fluentui-nextjs-appdir-plugin';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... your other config
};

export default withFluentUI(nextConfig);
```

### What It Does

The plugin modifies the webpack configuration to:

1. Add a custom loader that prepends `'use client';` to Fluent UI package entry files.
2. Target packages matching `@fluentui/*` and `@griffel/*`.
3. Ensure these packages are treated as client modules by the Next.js App Router bundler.

**When to use it:**
- You want to import Fluent components directly in page files without wrapping every import
  in a client component.
- You have many components scattered across files and want to avoid `'use client'` boilerplate.

**When NOT to use it:**
- You want fine-grained control over the client/server boundary.
- You are optimizing bundle size by keeping most code server-side.

**Note:** Even with this plugin, `FluentProvider` must still be in a client component wrapper
because it needs `useServerInsertedHTML` for SSR style injection.

---

## Griffel AOT with Next.js

Griffel supports ahead-of-time (AOT) compilation that extracts CSS at build time instead of
generating it at runtime. This eliminates the runtime cost of style generation and produces
standard CSS files that Next.js can optimize.

**Reference:** https://griffel.js.org/react/ahead-of-time-compilation/with-webpack/

### Installation

```bash
npm install --save-dev @griffel/webpack-extraction-plugin @griffel/babel-preset
```

### Webpack Configuration

```js
// next.config.js
const { GriffelCSSExtractionPlugin } = require('@griffel/webpack-extraction-plugin');

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config, { isServer }) {
    // Add the Griffel extraction plugin
    config.plugins.push(new GriffelCSSExtractionPlugin());

    // Add the Griffel webpack loader
    config.module.rules.push({
      test: /\.(ts|tsx|js|jsx)$/,
      exclude: /node_modules/,
      use: {
        loader: '@griffel/webpack-extraction-plugin/loader',
        options: {
          // Evaluate styles at build time
          evaluateStylesAtBuild: true,
        },
      },
    });

    return config;
  },
};

module.exports = nextConfig;
```

### Babel Configuration

If using Babel (not SWC), add the Griffel preset:

```json
// .babelrc
{
  "presets": [
    "next/babel",
    "@griffel/babel-preset"
  ]
}
```

**Note:** When using `@griffel/babel-preset`, Next.js will fall back from SWC to Babel, which
is slower. For SWC-based setups, use only the webpack loader without the Babel preset.

### How AOT Compilation Works

1. **Build time:** The webpack loader finds `makeStyles()` and `makeResetStyles()` calls.
2. **Extraction:** It evaluates the style objects and generates atomic CSS classes.
3. **Output:** CSS is extracted into `.css` files that Next.js handles as regular stylesheets.
4. **Runtime:** Components reference pre-generated class names — no runtime style computation.

**Benefits:**
- Eliminates Griffel runtime overhead (~5-15 KB reduction in client JS)
- CSS is cached by the browser as static files
- Enables standard CSS optimization (minification, deduplication)
- Improves Lighthouse performance scores

**Cross-reference:** See the `fluent-griffel` skill for comprehensive Griffel AOT patterns,
`makeStyles` authoring, and style composition techniques.

---

## Known Issues & Workarounds

### Bundle Size (GitHub #33850)

**Issue:** https://github.com/microsoft/fluentui/issues/33850

Importing from `@fluentui/react-components` can pull in the entire package due to barrel exports,
even when tree shaking is enabled. This can add 200+ KB to the client bundle.

**Workarounds:**

1. **Use direct imports** instead of barrel exports:

```tsx
// Instead of this (pulls entire package):
import { Button, Input } from '@fluentui/react-components';

// Use direct imports (tree-shakeable):
import { Button } from '@fluentui/react-components/unstable';
// OR import from the specific sub-package:
import { Button } from '@fluentui/react-button';
import { Input } from '@fluentui/react-input';
```

2. **Set `moduleResolution: "bundler"` in tsconfig.json:**

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler"
  }
}
```

This enables TypeScript to follow `exports` field conditions in `package.json`, which Fluent
packages use to expose tree-shakeable entry points.

3. **Analyze your bundle:**

```bash
npm install --save-dev @next/bundle-analyzer

# next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);

# Run analysis
ANALYZE=true npm run build
```

### Turbopack Compatibility

Next.js Turbopack (enabled with `next dev --turbo`) has limited compatibility with some
Griffel features:

- **Griffel AOT extraction** does not work with Turbopack (Turbopack uses its own bundler, not webpack).
- **fluentui-nextjs-appdir-plugin** may not work with Turbopack since it modifies webpack config.
- **Basic Fluent UI usage** (without AOT) works with Turbopack in development mode.

**Recommendation:** Use webpack for production builds (`next build` always uses webpack) and
Turbopack only for development if you do not rely on AOT or the appdir plugin.

### Hydration Mismatch Errors

Common causes of hydration mismatches with Fluent:

1. **Missing SSRProvider** — Without `SSRProvider`, server and client generate different IDs for
   components like `Dropdown`, `Combobox`, and `Tooltip`.
2. **Missing style injection** — Without `useServerInsertedHTML` (App Router) or `renderToStyleElements`
   (Pages Router), styles exist only on the client.
3. **Conditional rendering based on window** — Components that check `typeof window` render
   differently on server vs client.

**Fix:** Always include the full provider stack (`RendererProvider` > `SSRProvider` > `FluentProvider`)
and ensure style injection is configured.

### Flash of Unstyled Content (FOUC)

If you see unstyled Fluent components briefly on page load:

1. Verify `useServerInsertedHTML` is calling `renderToStyleElements`.
2. Check that the `RendererProvider` wraps `FluentProvider`.
3. Consider Griffel AOT to eliminate runtime style generation entirely.

---

## Starter Resources

### StackBlitz Template

Live, editable starter template with Fluent UI + Next.js App Router:
https://stackblitz.com/edit/stackblitz-starters-wmbhn4

### Starter Repository

Full-featured starter with authentication, theming, and layout patterns:
https://github.com/CaravelLabs/nextjs-fluentui-starter

### Blog Guide

Step-by-step walkthrough with screenshots:
https://www.tarascodes.com/nextjs-fluentui-setup

### Official Storybook Docs

- App Router setup: https://storybooks.fluentui.dev/react/?path=/docs/concepts-developer-server-side-rendering-next-js-appdir-setup--docs
- Pages Router setup: https://react.fluentui.dev/?path=/docs/concepts-developer-server-side-rendering-next-js-pages-setup--docs

---

## Complete Example: App Router with Theme Switching

A full working example with light/dark theme toggle, proper SSR style injection, and
responsive layout.

### Project Structure

```
app/
  layout.tsx          # Root layout (server component)
  providers.tsx       # FluentProvider + SSR styles (client component)
  page.tsx            # Home page (server component)
  theme.ts            # Theme configuration
  components/
    ThemeToggle.tsx   # Dark mode toggle (client component)
    AppShell.tsx      # App shell with navigation (client component)
    NavRail.tsx       # Navigation rail (client component)
```

### `app/theme.ts`

```tsx
// app/theme.ts
import {
  webLightTheme,
  webDarkTheme,
  createLightTheme,
  createDarkTheme,
  type BrandVariants,
  type Theme,
} from '@fluentui/react-components';

// Custom brand ramp (optional — use webLightTheme/webDarkTheme for defaults)
const brandRamp: BrandVariants = {
  10: '#020305',
  20: '#111723',
  30: '#16263D',
  40: '#193253',
  50: '#1B3F6A',
  60: '#1B4C82',
  70: '#18599B',
  80: '#1267B4',
  90: '#3174C2',
  100: '#4F82C8',
  110: '#6790CF',
  120: '#7D9ED5',
  130: '#92ACDC',
  140: '#A6BAE2',
  150: '#BAC9E9',
  160: '#CDD8EF',
};

export const lightTheme: Theme = createLightTheme(brandRamp);
export const darkTheme: Theme = createDarkTheme(brandRamp);

// Override specific tokens if needed
darkTheme.colorBrandForeground1 = brandRamp[110];
darkTheme.colorBrandForeground2 = brandRamp[120];
```

### `app/providers.tsx`

```tsx
// app/providers.tsx
'use client';

import { useState, useCallback, createContext, useContext } from 'react';
import {
  FluentProvider,
  RendererProvider,
  createDOMRenderer,
  SSRProvider,
} from '@fluentui/react-components';
import type { GriffelRenderer } from '@griffel/react';
import { useServerInsertedHTML } from 'next/navigation';
import { renderToStyleElements } from '@griffel/core';
import { lightTheme, darkTheme } from './theme';

type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  toggle: () => {},
});

export const useThemeMode = () => useContext(ThemeContext);

export function Providers({ children }: { children: React.ReactNode }) {
  const [renderer] = useState<GriffelRenderer>(() => createDOMRenderer());
  const [mode, setMode] = useState<ThemeMode>('light');

  useServerInsertedHTML(() => {
    return <>{renderToStyleElements(renderer)}</>;
  });

  const toggle = useCallback(() => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const theme = mode === 'light' ? lightTheme : darkTheme;

  return (
    <ThemeContext.Provider value={{ mode, toggle }}>
      <RendererProvider renderer={renderer}>
        <SSRProvider>
          <FluentProvider theme={theme}>
            {children}
          </FluentProvider>
        </SSRProvider>
      </RendererProvider>
    </ThemeContext.Provider>
  );
}
```

### `app/layout.tsx`

```tsx
// app/layout.tsx
import type { Metadata } from 'next';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Fluent Next.js App',
  description: 'Built with Fluent UI React v9 and Next.js App Router',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### `app/components/ThemeToggle.tsx`

```tsx
// app/components/ThemeToggle.tsx
'use client';

import { Button, Tooltip } from '@fluentui/react-components';
import { WeatherSunnyRegular, WeatherMoonRegular } from '@fluentui/react-icons';
import { useThemeMode } from '../providers';

export function ThemeToggle() {
  const { mode, toggle } = useThemeMode();
  const icon = mode === 'light' ? <WeatherMoonRegular /> : <WeatherSunnyRegular />;
  const label = mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode';

  return (
    <Tooltip content={label} relationship="label">
      <Button
        appearance="subtle"
        icon={icon}
        onClick={toggle}
        aria-label={label}
      />
    </Tooltip>
  );
}
```

### `app/components/AppShell.tsx`

```tsx
// app/components/AppShell.tsx
'use client';

import {
  makeStyles,
  tokens,
  Toolbar,
  ToolbarButton,
  Text,
  Divider,
} from '@fluentui/react-components';
import {
  HomeRegular,
  DocumentRegular,
  SettingsRegular,
  NavigationRegular,
} from '@fluentui/react-icons';
import { ThemeToggle } from './ThemeToggle';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
  },
  content: {
    flex: 1,
    display: 'flex',
  },
  nav: {
    width: '240px',
    borderRight: `1px solid ${tokens.colorNeutralStroke1}`,
    padding: tokens.spacingVerticalM,
  },
  main: {
    flex: 1,
    padding: tokens.spacingVerticalXXL,
  },
});

export function AppShell({ children }: { children: React.ReactNode }) {
  const styles = useStyles();

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <NavigationRegular fontSize={24} />
          <Text size={500} weight="semibold">
            Fluent App
          </Text>
        </div>
        <ThemeToggle />
      </header>
      <div className={styles.content}>
        <nav className={styles.nav}>
          <Toolbar vertical>
            <ToolbarButton icon={<HomeRegular />}>Home</ToolbarButton>
            <ToolbarButton icon={<DocumentRegular />}>Documents</ToolbarButton>
            <Divider />
            <ToolbarButton icon={<SettingsRegular />}>Settings</ToolbarButton>
          </Toolbar>
        </nav>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
```

### `app/page.tsx`

```tsx
// app/page.tsx
import { AppShell } from './components/AppShell';
import { WelcomeContent } from './components/WelcomeContent';

export default function Home() {
  return (
    <AppShell>
      <WelcomeContent />
    </AppShell>
  );
}
```

```tsx
// app/components/WelcomeContent.tsx
'use client';

import {
  Title1,
  Body1,
  Button,
  Card,
  CardHeader,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { OpenRegular, CodeRegular, PaintBrushRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  container: {
    maxWidth: '960px',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: tokens.spacingHorizontalL,
    marginTop: tokens.spacingVerticalXXL,
  },
});

export function WelcomeContent() {
  const styles = useStyles();

  const features = [
    { icon: <CodeRegular />, title: 'App Router', desc: 'Server Components with client boundaries' },
    { icon: <PaintBrushRegular />, title: 'Theme Switching', desc: 'Light and dark mode with Fluent tokens' },
    { icon: <OpenRegular />, title: 'SSR Styles', desc: 'Griffel styles injected during server render' },
  ];

  return (
    <div className={styles.container}>
      <Title1 as="h1">Welcome to Fluent + Next.js</Title1>
      <Body1>
        This starter demonstrates Fluent UI React v9 with the Next.js App Router,
        including SSR style injection, theme switching, and component composition.
      </Body1>
      <div className={styles.cardGrid}>
        {features.map((f) => (
          <Card key={f.title}>
            <CardHeader
              image={f.icon}
              header={<Text weight="semibold">{f.title}</Text>}
              description={<Text>{f.desc}</Text>}
            />
          </Card>
        ))}
      </div>
      <Button
        appearance="primary"
        style={{ marginTop: tokens.spacingVerticalXXL }}
      >
        Get Started
      </Button>
    </div>
  );
}
```

---

## Cross-References

- **`fluent-griffel`** — Deep Griffel knowledge: `makeStyles`, `mergeClasses`, style composition,
  AOT compilation, CSS extraction, and runtime performance. Consult this skill for anything
  beyond basic Griffel usage in Next.js.
- **`fluent-design-system`** — Core design tokens, theme creation, `BrandVariants`, color system,
  and FluentProvider configuration. Start here for theme customization.
- **`fluent-integration`** — Integration patterns for Fluent with other frameworks (Remix, Gatsby,
  Electron). Compare Next.js patterns with other SSR frameworks.
- **`fluent-setup` command** — The `fluent-ui-design:setup --next` command automates basic Next.js
  + Fluent setup. Use it for quick scaffolding, then customize from this skill's guidance.
