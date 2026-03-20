---
name: fluent-ui-design:griffel-optimize
description: Analyze and optimize Griffel styling in a project — identify performance issues, add AOT compilation, fix anti-patterns.
argument-hint: "[--aot] [--audit] [--fix]"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Edit
  - Bash
---

# Griffel Styling Optimizer

Scan a React project for Griffel CSS-in-JS anti-patterns, performance issues, and optimization
opportunities. Optionally configure AOT compilation and apply automatic fixes.

## Arguments

- `--audit` — Scan and report all Griffel anti-patterns (default if no flag specified)
- `--aot` — Detect the project bundler and configure Griffel AOT compilation
- `--fix` — Automatically fix identified anti-patterns where safe

## Workflow

### Step 1: Discover Griffel Usage

Scan the project to understand current Griffel usage patterns:

```
Search for:
- import { makeStyles } from '@fluentui/react-components'
- import { makeStyles } from '@griffel/react'
- import { makeResetStyles } from ...
- import { mergeClasses } from ...
- import { shorthands } from ...
```

Use Glob to find all `.tsx`, `.ts`, `.jsx`, `.js` files, then Grep for Griffel imports.
Count total makeStyles calls, mergeClasses calls, and shorthands usage.

### Step 2: Identify Anti-Patterns

Scan all files with Griffel imports for the following issues. Categorize by severity.

#### Critical Anti-Patterns

##### 2a. String concatenation instead of mergeClasses

Search for patterns where Griffel class names are concatenated as strings:

```
Patterns to detect:
- `${styles.xxx} ${styles.yyy}`        (template literal concatenation)
- styles.xxx + ' ' + styles.yyy         (string addition)
- [styles.xxx, styles.yyy].join(' ')     (array join)
- className={styles.xxx + className}     (appending external class)
```

**Why critical:** Breaks atomic CSS deduplication. Two classes targeting the same CSS property
both remain active, and the browser resolves the conflict via stylesheet insertion order, which
is non-deterministic. Results in flickering styles and inconsistent rendering.

**Fix:** Replace with `mergeClasses(styles.xxx, styles.yyy)`.

##### 2b. !important usage

Search for `!important` within makeStyles objects.

```
Pattern: '!important' inside makeStyles({ ... })
```

**Why critical:** Defeats the entire atomic CSS specificity model. Prevents parent components from
overriding child styles via mergeClasses. Makes component composition impossible.

**Fix:** Remove `!important` and use mergeClasses argument ordering to control precedence (later
arguments win).

##### 2c. CSS shorthands in makeStyles

Search for CSS shorthand properties used directly in makeStyles (not makeResetStyles):

```
Properties to flag:
- padding: '...' (with space-separated values like '8px 16px')
- margin: '...' (with space-separated values)
- border: '...' (with space-separated values like '1px solid #ccc')
- borderRadius: '...' (with space-separated values)
- flex: '...' (with space-separated values like '1 0 auto')
- gap: '...' (with space-separated values)
- overflow: '...' (with space-separated values)
- outline: '...' (with space-separated values)
- inset: '...' (with space-separated values)
- transition: '...' (with space-separated values)
- textDecoration: '...' (with space-separated values)
```

Note: Single-value properties are OK (e.g., `padding: '8px'` is fine for uniform padding,
though `...shorthands.padding('8px')` is preferred).

**Why critical:** CSS shorthands set multiple properties at once and cannot be decomposed into
atomic classes. Griffel may silently produce incorrect output or fail to apply the style.

**Fix:** Replace with the corresponding `shorthands.*` function.

#### High Severity Anti-Patterns

##### 2d. Hardcoded color values

Search for hex colors, rgb/rgba/hsl/hsla values, and named colors in makeStyles:

```
Patterns:
- color: '#...'
- color: 'rgb(...)'
- color: 'rgba(...)'
- color: 'hsl(...)'
- backgroundColor: '#...'
- borderColor: '#...'
- Named colors: 'white', 'black', 'red', 'blue', 'gray', 'grey', etc.
```

Exclude CSS variable references (`var(--...)`), `transparent`, `currentColor`, `inherit`, `initial`,
and `unset`.

**Why high:** Hardcoded colors break dark mode, high contrast mode, and custom theming.

**Fix:** Replace with appropriate Fluent design token (`tokens.colorNeutral*`, `tokens.colorBrand*`,
`tokens.colorPalette*`).

##### 2e. Tag selectors in style objects

Search for child/descendant selectors using tag names:

```
Patterns:
- '> div'
- '> span'
- '> svg'
- '> img'
- '> a'
- '> button'
- '> input'
- '> p'
- '> h1' through '> h6'
- '> ul', '> ol', '> li'
```

**Why high:** Tag selectors are slower than class selectors and break when component internals
change their DOM structure.

**Fix:** Apply className directly to child elements instead of using tag selectors.

##### 2f. Nested mergeClasses calls

Search for mergeClasses calls that contain other mergeClasses calls:

```
Pattern: mergeClasses(mergeClasses(
```

**Why high:** Wasteful — performs deduplication twice. Functionally correct but adds unnecessary
overhead.

**Fix:** Flatten into a single mergeClasses call.

#### Medium Severity Anti-Patterns

##### 2g. Missing className prop forwarding

Check components that use makeStyles but do not accept and forward a `className` prop:

```
Pattern: Component function that calls useStyles() but does not include
className in its props or does not pass it to mergeClasses
```

**Why medium:** Prevents parent components from overriding styles, breaking component composition.

##### 2h. Styling icons with fill instead of color

Search for `fill:` property targeting icon elements:

```
Pattern: fill: '...' in style objects (not inside ::before/::after pseudo-elements)
```

**Why medium:** Fluent icons use `fill="currentColor"` in SVG. Setting `fill` via CSS has no
effect. The correct property is `color`.

**Fix:** Change `fill` to `color`.

##### 2i. Inline styles for theme-dependent values

Search for `style={{ ... }}` with hardcoded theme-dependent values:

```
Pattern: style={{ color: '#...', backgroundColor: '...' }}
```

**Why medium:** Inline styles bypass Griffel's atomic caching and cannot be overridden by
mergeClasses.

**Fix:** Move theme-dependent values to makeStyles with tokens. Use inline `style` only for
truly dynamic values (CSS variables pattern).

##### 2j. Duplicate style rules across slots

Identify cases where the same property/value pair appears in multiple slots of the same
makeStyles call:

```
Pattern: Multiple slots with identical property/value pairs
```

**Why medium:** Not a correctness issue (Griffel deduplicates at the atomic class level), but
clutters code and makes maintenance harder.

**Fix:** Extract shared properties into a common slot and compose with mergeClasses.

### Step 3: AOT Configuration (--aot flag)

If `--aot` is specified, detect the project bundler and configure Griffel ahead-of-time compilation.

#### 3a. Detect Bundler

Check for:
- `webpack.config.js` or `webpack.config.ts` — webpack
- `vite.config.ts` or `vite.config.js` — Vite
- `next.config.js` or `next.config.ts` or `next.config.mjs` — Next.js (see fluent-nextjs skill)
- `craco.config.js` — Create React App with CRACO
- `config-overrides.js` — Create React App with react-app-rewired

#### 3b. Install Dependencies

For webpack:
```bash
npm install --save-dev @griffel/webpack-extraction-plugin mini-css-extract-plugin css-loader
```

For Vite:
```bash
npm install --save-dev @griffel/vite-plugin
```

For Next.js:
```bash
npm install --save-dev @griffel/next-extraction-plugin
```

#### 3c. Configure Bundler

**Webpack** — Add to `webpack.config.js`:

```js
const { GriffelCSSExtractionPlugin } = require('@griffel/webpack-extraction-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  module: {
    rules: [
      {
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: '@griffel/webpack-extraction-plugin/loader',
        },
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
    ],
  },
  plugins: [
    new GriffelCSSExtractionPlugin(),
    new MiniCssExtractPlugin(),
  ],
};
```

**Vite** — Add to `vite.config.ts`:

```ts
import griffel from '@griffel/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    griffel(),  // Must come BEFORE react()
    react(),
  ],
});
```

**Next.js** — Defer to the `fluent-nextjs` skill for Next.js-specific AOT configuration
(`withGriffelCSSExtraction`).

#### 3d. Verify AOT

After configuration, instruct the user to:
1. Run a production build
2. Check that `<style data-make-styles>` tags are absent from the HTML
3. Check that `.css` files contain the atomic class rules
4. Verify that the JS bundle no longer contains style objects (search for `makeStyles({` in the
   built output — it should be replaced with `__styles({`)

### Step 4: Apply Fixes (--fix flag)

If `--fix` is specified, apply safe automatic fixes using the Edit tool:

#### Safe to auto-fix:
- String concatenation to mergeClasses (2a)
- Nested mergeClasses to flat mergeClasses (2f)
- `fill` to `color` for icon styling (2h)

#### Require manual review (report but do not auto-fix):
- !important removal (2b) — may change visual behavior
- CSS shorthands to shorthands.* (2c) — complex syntax transformation
- Hardcoded colors to tokens (2d) — requires semantic mapping
- Tag selectors to className props (2e) — requires structural changes
- Missing className forwarding (2g) — requires component interface change
- Inline styles to makeStyles (2i) — requires context analysis
- Duplicate rule extraction (2j) — requires design decision

### Step 5: Generate Report

Produce a summary report with:

1. **Project overview**
   - Total files scanned
   - Total makeStyles calls found
   - Total mergeClasses calls found
   - AOT compilation status (configured / not configured)

2. **Anti-pattern summary table**

   | Category | Severity | Count | Auto-fixable |
   |---|---|---|---|
   | String concatenation | Critical | N | Yes |
   | !important usage | Critical | N | No |
   | CSS shorthands in makeStyles | Critical | N | No |
   | Hardcoded colors | High | N | No |
   | Tag selectors | High | N | No |
   | Nested mergeClasses | High | N | Yes |
   | Missing className forwarding | Medium | N | No |
   | Icon fill instead of color | Medium | N | Yes |
   | Inline theme styles | Medium | N | No |
   | Duplicate style rules | Medium | N | No |

3. **Detailed findings** — List each violation with file path, line number, and the offending code.

4. **Optimization recommendations** — Ranked by impact:
   - Configure AOT compilation (if not configured)
   - Fix critical anti-patterns
   - Fix high severity anti-patterns
   - Consider shared style libraries for repeated patterns

5. **Estimated impact**
   - Bundle size reduction from AOT (approximate)
   - Render performance improvement from fixing string concatenation
   - Maintainability improvement from fixing code patterns

## Examples

### Audit only (default)
```
/fluent-griffel-optimize
/fluent-griffel-optimize --audit
```

### Configure AOT compilation
```
/fluent-griffel-optimize --aot
```

### Full scan with automatic fixes
```
/fluent-griffel-optimize --audit --fix
```

### AOT + audit + fix
```
/fluent-griffel-optimize --aot --audit --fix
```

## Cross-References

- **fluent-nextjs** — Next.js-specific AOT configuration with `withGriffelCSSExtraction`
- **fluent-griffel** — Full Griffel knowledge base (SKILL.md and references)
- **fluent-audit** — General Fluent UI compliance audit (broader than Griffel-specific)
- **fluent-design-system** — Token reference for replacing hardcoded colors
