# Fluent UI React v9 + Next.js — Deep Integration Reference

## Table of Contents

1. [SSR Hydration Mechanics](#ssr-hydration-mechanics)
2. [App Router Migration from CRA/Vite](#app-router-migration-from-cravite)
3. [Pages Router Setup from Scratch](#pages-router-setup-from-scratch)
4. [Performance Optimization](#performance-optimization)
5. [Turbopack Status and Workarounds](#turbopack-status-and-workarounds)
6. [App Router vs Pages Router Comparison](#app-router-vs-pages-router-comparison)
7. [Troubleshooting](#troubleshooting)
8. [Dark Mode with next-themes](#dark-mode-with-next-themes)
9. [Advanced Patterns](#advanced-patterns)

---

## SSR Hydration Mechanics

Understanding how Griffel styles travel from server to client is essential for debugging
SSR issues in Next.js. This section explains the full lifecycle.

### How Griffel Generates Styles

Griffel is an atomic CSS-in-JS engine. When you write:

```tsx
const useStyles = makeStyles({
  root: {
    display: 'flex',
    backgroundColor: tokens.colorNeutralBackground1,
    padding: '16px',
  },
});
```

Griffel compiles this into atomic CSS classes at runtime:

```css
.f22iagw { display: flex; }
.f1sbtcvk { background-color: var(--colorNeutralBackground1); }
.frdkuqy { padding: 16px; }
```

Each CSS property-value pair gets its own class. The `useStyles()` hook returns an object
mapping slot names to concatenated class strings: `"f22iagw f1sbtcvk frdkuqy"`.

### Server-Side Style Collection

During SSR, Griffel collects styles via the renderer instance:

```
1. React renders component tree on the server
2. Each makeStyles() call registers its atomic CSS rules with the GriffelRenderer
3. The renderer stores rules in an internal StyleBucketEntry map
4. After rendering completes, renderToStyleElements() extracts all collected rules
5. Rules are serialized into <style> elements with data-make-styles-* attributes
```

The renderer organizes styles into **buckets** by specificity:

| Bucket | Content | Priority |
|--------|---------|----------|
| `d` | Default styles | Lowest |
| `l` | `:link` pseudo | |
| `v` | `:visited` pseudo | |
| `w` | `:focus-within` pseudo | |
| `f` | `:focus` pseudo | |
| `i` | `:focus-visible` pseudo | |
| `h` | `:hover` pseudo | |
| `a` | `:active` pseudo | |
| `k` | `@keyframes` | |
| `t` | `@at-rules` (media, supports) | Highest |

Each bucket becomes a separate `<style>` element with a `data-make-styles-bucket` attribute:

```html
<style data-make-styles-bucket="d">
  .f22iagw { display: flex; }
  .f1sbtcvk { background-color: var(--colorNeutralBackground1); }
</style>
<style data-make-styles-bucket="h">
  .fhwpy7c:hover { background-color: var(--colorNeutralBackground1Hover); }
</style>
```

### Client-Side Rehydration

When the client loads:

```
1. React hydrates the server-rendered HTML
2. Griffel's createDOMRenderer() scans for existing <style data-make-styles-*> elements
3. It populates its internal cache with already-inserted rules
4. Subsequent makeStyles() calls check the cache before inserting
5. If a rule already exists (from SSR), it skips insertion — no duplication
```

**Critical requirement:** The same renderer instance must be used for both SSR extraction and
client hydration. In the App Router, `useServerInsertedHTML` ensures styles are streamed into
the response. In the Pages Router, `_document.tsx`'s `getInitialProps` handles this.

### The Role of SSRProvider

`SSRProvider` generates deterministic IDs for components that need unique identifiers (tooltips,
dropdowns, dialogs). Without it:

- Server generates `id="fluent-id-1"`
- Client generates `id="fluent-id-7"` (different counter state)
- React detects mismatch and logs a hydration error

`SSRProvider` resets the ID counter at the tree boundary, ensuring server and client produce
identical IDs.

### Style Injection in App Router vs Pages Router

**App Router — Streaming SSR:**

```tsx
// useServerInsertedHTML runs during React's streaming render
useServerInsertedHTML(() => {
  // Called potentially multiple times as Suspense boundaries resolve
  return <>{renderToStyleElements(renderer)}</>;
});
```

The App Router uses React's streaming SSR. `useServerInsertedHTML` is called each time a
Suspense boundary resolves, allowing styles to be injected incrementally as the page streams.

**Pages Router — Blocking SSR:**

```tsx
// getInitialProps runs once, after the entire page is rendered
static async getInitialProps(ctx) {
  const initialProps = await Document.getInitialProps(ctx);
  const styles = renderToStyleElements(renderer);
  return { ...initialProps, styles: <>{initialProps.styles}{styles}</> };
}
```

The Pages Router uses blocking SSR. The entire page renders first, then all styles are
extracted at once and injected into `<head>`.

---

## App Router Migration from CRA/Vite

Migrating a Create React App or Vite project with Fluent UI to Next.js App Router requires
restructuring provider setup and adding SSR support.

### Step 1: Create Next.js Project

```bash
npx create-next-app@latest my-fluent-app --typescript --app --src-dir
cd my-fluent-app
```

### Step 2: Install Fluent Dependencies

```bash
npm install @fluentui/react-components @fluentui/react-icons
# Optional: auto-add 'use client' to Fluent packages
npm install --save-dev fluentui-nextjs-appdir-plugin
```

### Step 3: Move Theme Configuration

If your CRA/Vite project has a theme file:

```tsx
// CRA/Vite: src/theme.ts — keep as-is
// Next.js: move to src/theme.ts or app/theme.ts

import {
  createLightTheme,
  createDarkTheme,
  type BrandVariants,
} from '@fluentui/react-components';

const brand: BrandVariants = {
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

export const lightTheme = createLightTheme(brand);
export const darkTheme = createDarkTheme(brand);
```

### Step 4: Create Providers (Replaces CRA/Vite Root)

In CRA/Vite, you likely have:

```tsx
// CRA: src/index.tsx or Vite: src/main.tsx
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <FluentProvider theme={webLightTheme}>
    <App />
  </FluentProvider>
);
```

Replace with the Next.js provider pattern:

```tsx
// app/providers.tsx
'use client';

import { useState } from 'react';
import {
  FluentProvider,
  RendererProvider,
  createDOMRenderer,
  SSRProvider,
} from '@fluentui/react-components';
import type { GriffelRenderer } from '@griffel/react';
import { useServerInsertedHTML } from 'next/navigation';
import { renderToStyleElements } from '@griffel/core';
import { lightTheme } from './theme';

export function Providers({ children }: { children: React.ReactNode }) {
  const [renderer] = useState<GriffelRenderer>(() => createDOMRenderer());

  useServerInsertedHTML(() => {
    return <>{renderToStyleElements(renderer)}</>;
  });

  return (
    <RendererProvider renderer={renderer}>
      <SSRProvider>
        <FluentProvider theme={lightTheme}>
          {children}
        </FluentProvider>
      </SSRProvider>
    </RendererProvider>
  );
}
```

### Step 5: Create Root Layout

```tsx
// app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### Step 6: Migrate Components

Each component file that imports from `@fluentui/react-components` must be marked `'use client'`
or be imported by a `'use client'` file.

**Before (CRA/Vite):**

```tsx
// src/components/Dashboard.tsx
import { Card, Text, Button } from '@fluentui/react-components';

export function Dashboard() {
  return (
    <Card>
      <Text>Hello</Text>
      <Button>Click</Button>
    </Card>
  );
}
```

**After (Next.js App Router):**

```tsx
// app/components/Dashboard.tsx
'use client';  // <-- Add this

import { Card, Text, Button } from '@fluentui/react-components';

export function Dashboard() {
  return (
    <Card>
      <Text>Hello</Text>
      <Button>Click</Button>
    </Card>
  );
}
```

### Step 7: Separate Data Fetching from UI

CRA/Vite apps typically fetch data in components. In Next.js, move data fetching to
server components:

**Before (CRA/Vite):**

```tsx
// src/components/UserList.tsx
import { useEffect, useState } from 'react';
import { DataGrid, DataGridBody, DataGridRow, DataGridCell } from '@fluentui/react-components';

export function UserList() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(setUsers);
  }, []);

  return <DataGrid items={users}>...</DataGrid>;
}
```

**After (Next.js):**

```tsx
// app/users/page.tsx (server component — fetches data)
import { UserGrid } from './UserGrid';

async function getUsers() {
  const res = await fetch('https://api.example.com/users', { cache: 'no-store' });
  return res.json();
}

export default async function UsersPage() {
  const users = await getUsers();
  return <UserGrid users={users} />;
}
```

```tsx
// app/users/UserGrid.tsx (client component — renders Fluent)
'use client';

import {
  DataGrid,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridBody,
  DataGridRow,
  DataGridCell,
  TableColumnDefinition,
  createTableColumn,
} from '@fluentui/react-components';

interface User {
  id: string;
  name: string;
  email: string;
}

const columns: TableColumnDefinition<User>[] = [
  createTableColumn({ columnId: 'name', renderHeaderCell: () => 'Name', renderCell: (item) => item.name }),
  createTableColumn({ columnId: 'email', renderHeaderCell: () => 'Email', renderCell: (item) => item.email }),
];

export function UserGrid({ users }: { users: User[] }) {
  return (
    <DataGrid items={users} columns={columns} getRowId={(item) => item.id}>
      <DataGridHeader>
        <DataGridRow>
          {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
        </DataGridRow>
      </DataGridHeader>
      <DataGridBody<User>>
        {({ item, rowId }) => (
          <DataGridRow<User> key={rowId}>
            {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
          </DataGridRow>
        )}
      </DataGridBody>
    </DataGrid>
  );
}
```

### Step 8: Update next.config.js (Optional)

If using `fluentui-nextjs-appdir-plugin`:

```js
// next.config.js
const { withFluentUI } = require('fluentui-nextjs-appdir-plugin');

module.exports = withFluentUI({
  reactStrictMode: true,
});
```

### Step 9: Update tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  }
}
```

The `"moduleResolution": "bundler"` setting is critical for proper tree shaking of Fluent packages.

---

## Pages Router Setup from Scratch

Complete step-by-step setup for a new Next.js project with the Pages Router.

### Step 1: Create Project

```bash
npx create-next-app@latest my-fluent-pages-app --typescript --no-app --src-dir
cd my-fluent-pages-app
npm install @fluentui/react-components @fluentui/react-icons
```

### Step 2: Create Theme

```tsx
// src/theme.ts
import {
  webLightTheme,
  webDarkTheme,
  type Theme,
} from '@fluentui/react-components';

export { webLightTheme as lightTheme, webDarkTheme as darkTheme };
export type { Theme };
```

### Step 3: Create `_app.tsx`

```tsx
// src/pages/_app.tsx
import type { AppProps } from 'next/app';
import {
  FluentProvider,
  RendererProvider,
  SSRProvider,
  createDOMRenderer,
} from '@fluentui/react-components';
import type { GriffelRenderer } from '@griffel/react';
import { lightTheme } from '../theme';

// Default renderer for client-side navigation
const defaultRenderer: GriffelRenderer = createDOMRenderer();

interface FluentAppProps extends AppProps {
  renderer?: GriffelRenderer;
}

export default function App({ Component, pageProps, renderer }: FluentAppProps) {
  return (
    <RendererProvider renderer={renderer ?? defaultRenderer}>
      <SSRProvider>
        <FluentProvider theme={lightTheme}>
          <Component {...pageProps} />
        </FluentProvider>
      </SSRProvider>
    </RendererProvider>
  );
}
```

### Step 4: Create `_document.tsx`

```tsx
// src/pages/_document.tsx
import Document, {
  Html,
  Head,
  Main,
  NextScript,
  type DocumentContext,
  type DocumentInitialProps,
} from 'next/document';
import {
  createDOMRenderer,
  renderToStyleElements,
} from '@fluentui/react-components';

class FluentDocument extends Document {
  static async getInitialProps(ctx: DocumentContext): Promise<DocumentInitialProps> {
    const renderer = createDOMRenderer();
    const originalRenderPage = ctx.renderPage;

    ctx.renderPage = () =>
      originalRenderPage({
        enhanceApp: (App) => {
          const EnhancedApp = (props: Record<string, unknown>) => (
            <App {...props} renderer={renderer} />
          );
          EnhancedApp.displayName = 'EnhancedApp';
          return EnhancedApp;
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

export default FluentDocument;
```

### Step 5: Create a Page

```tsx
// src/pages/index.tsx
import {
  Title1,
  Body1,
  Button,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { RocketRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: tokens.spacingVerticalXXL,
  },
  hero: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacingVerticalL,
    textAlign: 'center',
  },
});

export default function Home() {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <Title1>Fluent UI + Next.js Pages Router</Title1>
        <Body1>Server-side rendered with Griffel style extraction.</Body1>
        <Button appearance="primary" icon={<RocketRegular />} size="large">
          Get Started
        </Button>
      </div>
    </div>
  );
}
```

### Step 6: Verify SSR

```bash
npm run build && npm start
```

View page source in the browser. You should see `<style data-make-styles-bucket="d">` tags
in the `<head>` containing Griffel's atomic CSS rules. This confirms SSR style extraction
is working.

---

## Performance Optimization

### AOT Compilation

Griffel AOT eliminates runtime style generation. See the SKILL.md for webpack configuration.

**Impact measurement:**

```bash
# Before AOT
npm run build
# Check .next/static/chunks total size

# After AOT
# Add @griffel/webpack-extraction-plugin config
npm run build
# Compare .next/static/chunks total size
# Expect 5-15 KB reduction in JS, styles move to CSS files
```

### Dynamic Imports for Fluent Components

Heavy Fluent components (DataGrid, DatePicker, Editor) can be lazy-loaded:

```tsx
// app/components/LazyDataGrid.tsx
'use client';

import dynamic from 'next/dynamic';
import { Skeleton, SkeletonItem, makeStyles, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  skeleton: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingVerticalL,
  },
});

function DataGridSkeleton() {
  const styles = useStyles();
  return (
    <div className={styles.skeleton}>
      <Skeleton>
        <SkeletonItem size={16} />
        <SkeletonItem size={16} />
        <SkeletonItem size={16} />
        <SkeletonItem size={16} />
      </Skeleton>
    </div>
  );
}

export const LazyDataGrid = dynamic(
  () => import('./HeavyDataGrid').then((mod) => mod.HeavyDataGrid),
  {
    loading: () => <DataGridSkeleton />,
    ssr: false, // Skip SSR for heavy components
  }
);
```

### React.lazy for Client Components

Within client component boundaries, use React.lazy for code splitting:

```tsx
// app/components/Dashboard.tsx
'use client';

import { lazy, Suspense } from 'react';
import { Spinner } from '@fluentui/react-components';

const ChartPanel = lazy(() => import('./ChartPanel'));
const ActivityFeed = lazy(() => import('./ActivityFeed'));

export function Dashboard() {
  return (
    <div>
      <Suspense fallback={<Spinner label="Loading charts..." />}>
        <ChartPanel />
      </Suspense>
      <Suspense fallback={<Spinner label="Loading feed..." />}>
        <ActivityFeed />
      </Suspense>
    </div>
  );
}
```

### Direct Sub-Package Imports

For maximum tree shaking, import from sub-packages instead of the barrel:

```tsx
// Barrel import — less tree-shakeable
import { Button, Input, Dialog } from '@fluentui/react-components';

// Direct sub-package imports — maximum tree shaking
import { Button } from '@fluentui/react-button';
import { Input } from '@fluentui/react-input';
import { Dialog, DialogSurface, DialogBody, DialogTitle } from '@fluentui/react-dialog';
```

**Bundle size comparison (approximate):**

| Import Strategy | Initial JS Bundle |
|----------------|-------------------|
| Full barrel import | ~250-350 KB |
| Direct sub-packages | ~80-150 KB |
| Direct + AOT | ~65-130 KB |

### Image Optimization with Fluent Avatars

Use Next.js `<Image>` with Fluent's Avatar for optimized images:

```tsx
'use client';

import { Avatar } from '@fluentui/react-components';
import Image from 'next/image';

export function UserAvatar({ src, name }: { src: string; name: string }) {
  return (
    <Avatar
      name={name}
      image={{
        // Use Next.js Image optimization
        as: Image,
        src,
        width: 48,
        height: 48,
        alt: name,
      } as any}
    />
  );
}
```

---

## Turbopack Status and Workarounds

Next.js Turbopack (`next dev --turbo`) is the Rust-based bundler replacement for webpack.
Its compatibility with Fluent UI evolves with each Next.js release.

### What Works with Turbopack

- Basic Fluent UI component rendering
- FluentProvider with themes
- Griffel runtime styles (non-AOT)
- `'use client'` boundaries
- SSRProvider and RendererProvider
- useServerInsertedHTML for style injection

### What Does NOT Work with Turbopack

- **Griffel AOT extraction** — `@griffel/webpack-extraction-plugin` is webpack-only.
  Turbopack does not support webpack plugins or loaders.
- **fluentui-nextjs-appdir-plugin** — Uses webpack configuration, incompatible with Turbopack.
- **Custom webpack loaders** — Any webpack-based Griffel transformation.

### Recommended Strategy

```js
// next.config.js
const { withFluentUI } = require('fluentui-nextjs-appdir-plugin');

const baseConfig = {
  reactStrictMode: true,
  // Add any non-webpack config here
};

// Use withFluentUI only when NOT using Turbopack
// Turbopack ignores webpack config anyway, but this avoids warnings
module.exports = process.env.TURBOPACK
  ? baseConfig
  : withFluentUI(baseConfig);
```

**Development:** Use Turbopack for fast HMR during development (styles generate at runtime).

**Production:** Always use `next build` (webpack) where AOT and plugins work.

```json
// package.json
{
  "scripts": {
    "dev": "next dev --turbo",
    "dev:webpack": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

### Future Outlook

The Fluent UI and Griffel teams are tracking Turbopack plugin API development. When Turbopack
stabilizes its plugin API, expect:
- Native Griffel AOT support via Turbopack plugins
- Built-in `'use client'` injection for known client packages

---

## App Router vs Pages Router Comparison

| Feature | App Router | Pages Router |
|---------|-----------|--------------|
| **Default component model** | Server Components | Client Components |
| **Provider location** | `app/providers.tsx` (`'use client'`) | `pages/_app.tsx` |
| **SSR style extraction** | `useServerInsertedHTML` hook | `_document.tsx` `getInitialProps` |
| **SSR rendering model** | Streaming (React 18) | Blocking |
| **`'use client'` needed?** | Yes, for all Fluent imports | No (all client by default) |
| **Data fetching** | `async` server components, `fetch()` | `getServerSideProps` / `getStaticProps` |
| **Streaming Suspense** | Full support | Limited |
| **Layout persistence** | Built-in nested layouts | Manual via `getLayout` pattern |
| **Setup complexity** | Higher (client boundaries) | Lower (everything client) |
| **Bundle optimization** | Better (server code excluded) | All code sent to client |
| **Griffel AOT** | Supported (webpack) | Supported (webpack) |
| **fluentui-nextjs-appdir-plugin** | Recommended | Not needed |
| **SSRProvider** | Required | Required |
| **RendererProvider** | Required | Required |
| **Turbopack dev** | Supported | Supported |

### When to Use Each

**Choose App Router when:**
- Starting a new project (Next.js recommended default)
- You need streaming SSR and Suspense boundaries
- You want server-side data fetching without API routes
- You prioritize minimal client JS bundle

**Choose Pages Router when:**
- Migrating an existing Pages Router project
- You want simpler Fluent integration (no `'use client'` management)
- Your team is more familiar with the Pages Router model
- You rely on `getServerSideProps` / `getStaticProps` patterns

---

## Troubleshooting

### Hydration Mismatch Errors

**Symptom:** Console warning: "Text content did not match" or "Hydration failed because
the initial UI does not match what was rendered on the server."

**Common causes and fixes:**

1. **Missing SSRProvider:**

```tsx
// WRONG — no SSRProvider
<FluentProvider theme={theme}>{children}</FluentProvider>

// CORRECT
<SSRProvider>
  <FluentProvider theme={theme}>{children}</FluentProvider>
</SSRProvider>
```

2. **Browser-only code in initial render:**

```tsx
// WRONG — window check causes mismatch
function MyComponent() {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  return isMobile ? <MobileView /> : <DesktopView />;
}

// CORRECT — use useEffect for browser-only logic
function MyComponent() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return isMobile ? <MobileView /> : <DesktopView />;
}
```

3. **Date/time rendering:**

```tsx
// WRONG — different on server vs client
<Text>{new Date().toLocaleString()}</Text>

// CORRECT — render on client only
function TimeDisplay() {
  const [time, setTime] = useState<string>('');
  useEffect(() => { setTime(new Date().toLocaleString()); }, []);
  return <Text>{time}</Text>;
}
```

### Missing Styles / FOUC

**Symptom:** Components appear unstyled for a moment before styles apply.

**Diagnosis checklist:**

1. Is `RendererProvider` wrapping `FluentProvider`?
2. Is `useServerInsertedHTML` (App Router) or `renderToStyleElements` (Pages Router) configured?
3. View page source — do you see `<style data-make-styles-bucket="...">` tags?
4. Is `createDOMRenderer()` called with `useState` (not re-created each render)?

**Fix for App Router:**

```tsx
// Verify this pattern in providers.tsx
const [renderer] = useState<GriffelRenderer>(() => createDOMRenderer());

useServerInsertedHTML(() => {
  return <>{renderToStyleElements(renderer)}</>;
});
```

**Fix for Pages Router:**

```tsx
// Verify _document.tsx creates renderer and extracts styles
static async getInitialProps(ctx) {
  const renderer = createDOMRenderer();
  // ... must pass renderer to App and extract styles after render
}
```

### "Cannot read properties of null" in SSR

**Symptom:** Server crash with null reference error from Fluent components.

**Cause:** Fluent components accessing DOM APIs during SSR.

**Fix:** Ensure the component is in a `'use client'` file and wrapped by FluentProvider.
If a component truly needs DOM access during render, wrap it with `dynamic()`:

```tsx
const ClientOnlyComponent = dynamic(() => import('./ClientOnly'), {
  ssr: false,
});
```

### Module Not Found: '@griffel/core'

**Symptom:** Build error when using `renderToStyleElements`.

**Fix:** `@griffel/core` is a peer dependency of `@fluentui/react-components`. It should
be installed automatically, but if not:

```bash
npm install @griffel/core @griffel/react
```

### Styles Duplicated After Navigation

**Symptom:** Navigating between pages causes duplicate `<style>` tags.

**Cause:** The renderer is being recreated on each navigation.

**Fix:** Use `useState` to create the renderer once:

```tsx
// WRONG — new renderer each render
const renderer = createDOMRenderer();

// CORRECT — stable renderer across re-renders
const [renderer] = useState(() => createDOMRenderer());
```

### Icons Not Rendering

**Symptom:** `@fluentui/react-icons` show as empty or missing.

**Cause:** Icons are SVG components that need client-side React rendering.

**Fix:** Ensure the component importing icons has `'use client'` directive:

```tsx
'use client';
import { HomeRegular } from '@fluentui/react-icons';
// Icons now render correctly
```

### Large Bundle Size Warning

**Symptom:** Next.js build warns about large first-load JS.

**Diagnosis:**

```bash
ANALYZE=true npm run build
```

**Fixes (in order of impact):**

1. Switch to direct sub-package imports
2. Set `moduleResolution: "bundler"` in tsconfig.json
3. Enable Griffel AOT to move styles from JS to CSS
4. Use `dynamic()` for heavy components
5. Audit for unused Fluent component imports

---

## Dark Mode with next-themes

`next-themes` is a popular library for theme switching in Next.js. It can be integrated
with Fluent UI's theming system.

### Installation

```bash
npm install next-themes
```

### App Router Integration

```tsx
// app/providers.tsx
'use client';

import { useState, useMemo } from 'react';
import {
  FluentProvider,
  RendererProvider,
  createDOMRenderer,
  SSRProvider,
  webLightTheme,
  webDarkTheme,
} from '@fluentui/react-components';
import type { GriffelRenderer } from '@griffel/react';
import { useServerInsertedHTML } from 'next/navigation';
import { renderToStyleElements } from '@griffel/core';
import { ThemeProvider, useTheme } from 'next-themes';

function FluentWrapper({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [renderer] = useState<GriffelRenderer>(() => createDOMRenderer());

  useServerInsertedHTML(() => {
    return <>{renderToStyleElements(renderer)}</>;
  });

  const theme = useMemo(
    () => (resolvedTheme === 'dark' ? webDarkTheme : webLightTheme),
    [resolvedTheme]
  );

  return (
    <RendererProvider renderer={renderer}>
      <SSRProvider>
        <FluentProvider theme={theme}>
          {children}
        </FluentProvider>
      </SSRProvider>
    </RendererProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <FluentWrapper>{children}</FluentWrapper>
    </ThemeProvider>
  );
}
```

### Theme Toggle Component

```tsx
// app/components/ThemeToggle.tsx
'use client';

import { Button, Tooltip } from '@fluentui/react-components';
import { WeatherSunnyRegular, WeatherMoonRegular } from '@fluentui/react-icons';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — next-themes reads from localStorage
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <Button appearance="subtle" icon={<WeatherSunnyRegular />} disabled />;
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <Tooltip
      content={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      relationship="label"
    >
      <Button
        appearance="subtle"
        icon={isDark ? <WeatherSunnyRegular /> : <WeatherMoonRegular />}
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      />
    </Tooltip>
  );
}
```

### Preventing FOUC with next-themes

`next-themes` injects a small script to set `class="dark"` before React hydrates. Fluent's
theming is CSS-variable-based via `FluentProvider`, so the theme switch happens after hydration.
To minimize the flash:

```tsx
// app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

The `suppressHydrationWarning` on `<html>` prevents React from warning about the `class`
attribute that `next-themes` injects before hydration.

---

## Advanced Patterns

### Multiple FluentProviders (Nested Themes)

Use nested FluentProviders for sections with different themes:

```tsx
'use client';

import { FluentProvider, webLightTheme, webDarkTheme, Card, Text } from '@fluentui/react-components';

export function ContrastPanel({ children }: { children: React.ReactNode }) {
  return (
    <FluentProvider theme={webDarkTheme}>
      <Card>
        <Text>This section uses dark theme</Text>
        {children}
      </Card>
    </FluentProvider>
  );
}
```

**Note:** Nested FluentProviders inherit the renderer from the parent via context.
Only the outermost provider needs `RendererProvider`.

### Route-Based Theming

Different themes for different route segments:

```tsx
// app/(marketing)/layout.tsx
import { MarketingProviders } from './providers';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <MarketingProviders>{children}</MarketingProviders>;
}
```

```tsx
// app/(marketing)/providers.tsx
'use client';

import { FluentProvider } from '@fluentui/react-components';
import { marketingTheme } from '@/themes/marketing';

export function MarketingProviders({ children }: { children: React.ReactNode }) {
  return (
    <FluentProvider theme={marketingTheme}>
      {children}
    </FluentProvider>
  );
}
```

### Server Component Data + Client Fluent Rendering Pattern

The canonical pattern for combining server data fetching with Fluent rendering:

```tsx
// app/projects/page.tsx (server component)
import { ProjectList } from './ProjectList';
import { db } from '@/lib/db';

export default async function ProjectsPage() {
  const projects = await db.project.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });

  // Serialize dates for client component
  const serialized = projects.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return <ProjectList projects={serialized} />;
}
```

```tsx
// app/projects/ProjectList.tsx (client component)
'use client';

import {
  DataGrid,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridBody,
  DataGridRow,
  DataGridCell,
  createTableColumn,
  Badge,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';

interface Project {
  id: string;
  name: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

const useStyles = makeStyles({
  container: {
    padding: tokens.spacingVerticalXXL,
  },
});

const columns = [
  createTableColumn<Project>({
    columnId: 'name',
    renderHeaderCell: () => 'Project',
    renderCell: (item) => <Text weight="semibold">{item.name}</Text>,
  }),
  createTableColumn<Project>({
    columnId: 'status',
    renderHeaderCell: () => 'Status',
    renderCell: (item) => (
      <Badge
        appearance="filled"
        color={item.status === 'active' ? 'success' : 'informative'}
      >
        {item.status}
      </Badge>
    ),
  }),
  createTableColumn<Project>({
    columnId: 'updated',
    renderHeaderCell: () => 'Last Updated',
    renderCell: (item) => <Text>{new Date(item.updatedAt).toLocaleDateString()}</Text>,
  }),
];

export function ProjectList({ projects }: { projects: Project[] }) {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      <DataGrid items={projects} columns={columns} getRowId={(item) => item.id}>
        <DataGridHeader>
          <DataGridRow>
            {({ renderHeaderCell }) => (
              <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
            )}
          </DataGridRow>
        </DataGridHeader>
        <DataGridBody<Project>>
          {({ item, rowId }) => (
            <DataGridRow<Project> key={rowId}>
              {({ renderCell }) => (
                <DataGridCell>{renderCell(item)}</DataGridCell>
              )}
            </DataGridRow>
          )}
        </DataGridBody>
      </DataGrid>
    </div>
  );
}
```

### Middleware-Based Theme Detection

Set theme based on user preference cookie in middleware:

```tsx
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const theme = request.cookies.get('fluent-theme')?.value ?? 'light';
  const response = NextResponse.next();

  // Pass theme preference as a header for server components
  response.headers.set('x-theme', theme);

  return response;
}
```

```tsx
// app/layout.tsx
import { headers } from 'next/headers';
import { Providers } from './providers';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const theme = headersList.get('x-theme') ?? 'light';

  return (
    <html lang="en" data-theme={theme}>
      <body>
        <Providers initialTheme={theme as 'light' | 'dark'}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

### Internationalization with Fluent

Fluent UI's `dir` prop on FluentProvider handles RTL layouts:

```tsx
// app/[locale]/providers.tsx
'use client';

import { FluentProvider, webLightTheme } from '@fluentui/react-components';

const RTL_LOCALES = ['ar', 'he', 'fa', 'ur'];

export function LocaleProviders({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: string;
}) {
  const dir = RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr';

  return (
    <FluentProvider theme={webLightTheme} dir={dir}>
      {children}
    </FluentProvider>
  );
}
```

### Testing Fluent Components in Next.js

```tsx
// __tests__/components/MyButton.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  FluentProvider,
  webLightTheme,
  SSRProvider,
} from '@fluentui/react-components';
import { MyButton } from '@/app/components/MyButton';

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SSRProvider>
      <FluentProvider theme={webLightTheme}>
        {children}
      </FluentProvider>
    </SSRProvider>
  );
}

describe('MyButton', () => {
  it('renders with correct label', () => {
    render(<MyButton label="Click me" />, { wrapper: TestWrapper });
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('calls onClick handler', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(<MyButton label="Click" onClick={onClick} />, { wrapper: TestWrapper });

    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

**Note:** RendererProvider is optional in tests since there is no SSR extraction needed.
SSRProvider is still recommended to avoid ID-related warnings.
