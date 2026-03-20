---
name: fluent-ui-design:nextjs-setup
description: Set up Fluent UI React v9 in a Next.js project with proper SSR configuration, FluentProvider, and optional Griffel AOT.
argument-hint: "[--app-router] [--pages-router] [--griffel-aot] [--theme=<brand-color>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

# Set Up Fluent UI React v9 in Next.js

Configure a Next.js project with Fluent UI React v9, including SSR style extraction,
FluentProvider, and optional Griffel AOT compilation.

## Arguments

- `--app-router` — Configure for Next.js App Router (default if detected)
- `--pages-router` — Configure for Next.js Pages Router
- `--griffel-aot` — Enable Griffel ahead-of-time CSS extraction via webpack
- `--theme=<hex>` — Generate custom BrandVariants from a hex color (e.g., `--theme=#0078D4`)

If neither `--app-router` nor `--pages-router` is specified, auto-detect from project structure.

## Workflow

### 1. Detect Next.js Version and Router Type

Examine the project to determine the setup target:

```
Check for:
  - package.json → "next" dependency version
  - app/ directory → App Router
  - pages/ directory → Pages Router
  - next.config.js or next.config.mjs → existing configuration
  - tsconfig.json → TypeScript configuration
```

If no Next.js project exists, report an error and suggest running `npx create-next-app@latest` first.

If both `app/` and `pages/` directories exist, prefer App Router unless `--pages-router` is explicitly passed.

Read `next.config.js` (or `.mjs`, `.ts`) to understand existing webpack customizations.

### 2. Install Dependencies

**Core dependencies (always):**

```bash
npm install @fluentui/react-components @fluentui/react-icons
```

**App Router — optional plugin for auto `'use client'` injection:**

```bash
npm install --save-dev fluentui-nextjs-appdir-plugin
```

**Griffel AOT (if `--griffel-aot`):**

```bash
npm install --save-dev @griffel/webpack-extraction-plugin @griffel/babel-preset
```

Verify installation succeeded by checking `node_modules/@fluentui/react-components/package.json` exists.

### 3A. App Router Configuration

If App Router is the target:

**Create `app/providers.tsx`:**

```tsx
'use client';

import { useState } from 'react';
import {
  FluentProvider,
  webLightTheme,
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
    return <>{renderToStyleElements(renderer)}</>;
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

If `--theme` is provided, import the generated theme instead of `webLightTheme`.

**Edit `app/layout.tsx`:**

Wrap the `{children}` in the body with `<Providers>{children}</Providers>`.
Add the import for `Providers` from `./providers`.

If `layout.tsx` does not exist, create it:

```tsx
import type { Metadata } from 'next';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Fluent App',
  description: 'Built with Fluent UI React v9',
};

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

**Configure next.config.js for fluentui-nextjs-appdir-plugin:**

If the plugin was installed, wrap the existing config:

```js
const { withFluentUI } = require('fluentui-nextjs-appdir-plugin');

module.exports = withFluentUI({
  // ... existing config
});
```

For `.mjs` configs, use `import { withFluentUI } from 'fluentui-nextjs-appdir-plugin';` and `export default withFluentUI(config);`.

### 3B. Pages Router Configuration

If Pages Router is the target:

**Create or edit `pages/_app.tsx`:**

```tsx
import type { AppProps } from 'next/app';
import {
  FluentProvider,
  webLightTheme,
  RendererProvider,
  createDOMRenderer,
  SSRProvider,
} from '@fluentui/react-components';
import type { GriffelRenderer } from '@griffel/react';

const defaultRenderer: GriffelRenderer = createDOMRenderer();

interface FluentAppProps extends AppProps {
  renderer?: GriffelRenderer;
}

export default function App({ Component, pageProps, renderer }: FluentAppProps) {
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

**Create or edit `pages/_document.tsx`:**

```tsx
import Document, { Html, Head, Main, NextScript, DocumentContext, DocumentInitialProps } from 'next/document';
import { createDOMRenderer, renderToStyleElements } from '@fluentui/react-components';

class FluentDocument extends Document {
  static async getInitialProps(ctx: DocumentContext): Promise<DocumentInitialProps> {
    const renderer = createDOMRenderer();
    const originalRenderPage = ctx.renderPage;

    ctx.renderPage = () =>
      originalRenderPage({
        enhanceApp: (App) => (props) => <App {...props} renderer={renderer} />,
      });

    const initialProps = await Document.getInitialProps(ctx);
    const styles = renderToStyleElements(renderer);

    return {
      ...initialProps,
      styles: <>{initialProps.styles}{styles}</>,
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

### 4. Griffel AOT Setup (if `--griffel-aot`)

Add the Griffel webpack extraction plugin to `next.config.js`:

```js
const { GriffelCSSExtractionPlugin } = require('@griffel/webpack-extraction-plugin');

// Inside the config:
module.exports = {
  webpack(config) {
    config.plugins.push(new GriffelCSSExtractionPlugin());
    config.module.rules.push({
      test: /\.(ts|tsx|js|jsx)$/,
      exclude: /node_modules/,
      use: {
        loader: '@griffel/webpack-extraction-plugin/loader',
        options: { evaluateStylesAtBuild: true },
      },
    });
    return config;
  },
};
```

Merge this with any existing `webpack` function in the config. If `withFluentUI` is also used, chain them:

```js
const { withFluentUI } = require('fluentui-nextjs-appdir-plugin');
const { GriffelCSSExtractionPlugin } = require('@griffel/webpack-extraction-plugin');

module.exports = withFluentUI({
  webpack(config) {
    config.plugins.push(new GriffelCSSExtractionPlugin());
    config.module.rules.push({
      test: /\.(ts|tsx|js|jsx)$/,
      exclude: /node_modules/,
      use: {
        loader: '@griffel/webpack-extraction-plugin/loader',
        options: { evaluateStylesAtBuild: true },
      },
    });
    return config;
  },
});
```

### 5. Theme File (if `--theme` provided)

Generate a custom theme file from the provided hex color.

Create `app/theme.ts` (App Router) or `src/theme.ts` (Pages Router):

```tsx
import {
  createLightTheme,
  createDarkTheme,
  type BrandVariants,
  type Theme,
} from '@fluentui/react-components';

// Brand ramp generated from <hex-color>
const brand: BrandVariants = {
  10: '<shade-10>',
  20: '<shade-20>',
  30: '<shade-30>',
  40: '<shade-40>',
  50: '<shade-50>',
  60: '<shade-60>',
  70: '<shade-70>',
  80: '<primary-hex>',
  90: '<tint-90>',
  100: '<tint-100>',
  110: '<tint-110>',
  120: '<tint-120>',
  130: '<tint-130>',
  140: '<tint-140>',
  150: '<tint-150>',
  160: '<tint-160>',
};

export const lightTheme: Theme = createLightTheme(brand);
export const darkTheme: Theme = createDarkTheme(brand);

// Ensure brand foreground is readable on dark backgrounds
darkTheme.colorBrandForeground1 = brand[110];
darkTheme.colorBrandForeground2 = brand[120];
```

Generate the 16-stop brand ramp by:
1. Using the provided hex as shade 80 (the primary brand color)
2. Computing darker shades (10-70) by reducing lightness
3. Computing lighter tints (90-160) by increasing lightness
4. Maintaining hue consistency across the ramp

Use the Fluent UI Theme Designer algorithm:
- https://react.fluentui.dev/?path=/docs/theme-theme-designer--docs

Update `providers.tsx` or `_app.tsx` to import `{ lightTheme }` from the theme file instead of `webLightTheme`.

### 6. Update tsconfig.json

Ensure `moduleResolution` is set to `"bundler"` for proper tree shaking:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler"
  }
}
```

Read the existing `tsconfig.json` and only update `moduleResolution` if it is not already `"bundler"`.

### 7. Verify Setup

Create a simple test page to confirm everything works:

**App Router — `app/fluent-test/page.tsx`:**

```tsx
import { FluentTest } from './FluentTest';

export default function TestPage() {
  return <FluentTest />;
}
```

```tsx
// app/fluent-test/FluentTest.tsx
'use client';

import { Button, Title1, Text, tokens } from '@fluentui/react-components';
import { CheckmarkCircleRegular } from '@fluentui/react-icons';

export function FluentTest() {
  return (
    <div style={{ padding: tokens.spacingVerticalXXL }}>
      <Title1>Fluent UI Setup Complete</Title1>
      <Text block>
        If you see styled text and a button below, SSR is working correctly.
      </Text>
      <Button
        appearance="primary"
        icon={<CheckmarkCircleRegular />}
        style={{ marginTop: tokens.spacingVerticalL }}
      >
        It works!
      </Button>
    </div>
  );
}
```

**Pages Router — `pages/fluent-test.tsx`:**

```tsx
import { Button, Title1, Text, tokens } from '@fluentui/react-components';
import { CheckmarkCircleRegular } from '@fluentui/react-icons';

export default function FluentTest() {
  return (
    <div style={{ padding: tokens.spacingVerticalXXL }}>
      <Title1>Fluent UI Setup Complete</Title1>
      <Text block>
        If you see styled text and a button below, SSR is working correctly.
      </Text>
      <Button
        appearance="primary"
        icon={<CheckmarkCircleRegular />}
        style={{ marginTop: tokens.spacingVerticalL }}
      >
        It works!
      </Button>
    </div>
  );
}
```

Run `npm run dev` and visit `/fluent-test`. Verify:
1. Components render with Fluent styling (rounded button, correct colors)
2. No console errors about hydration mismatches
3. View page source shows `<style data-make-styles-bucket="...">` tags in the HTML

## Output

Report:
- Next.js version and router type detected
- Packages installed (with versions)
- Files created or modified (list each with path)
- Theme configuration (if `--theme` was used)
- Griffel AOT status (if `--griffel-aot` was used)
- Verification URL: `http://localhost:3000/fluent-test`
- Next steps:
  - Remove the test page when satisfied
  - Review the `fluent-nextjs` skill for advanced patterns (theme switching, nested providers, performance)
  - Consider Griffel AOT for production if not already enabled
