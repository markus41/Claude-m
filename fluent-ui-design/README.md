# fluent-ui-design

Microsoft Fluent 2 design system mastery for Claude Code — design tokens, component library, Teams theming, Griffel styling, Next.js SSR, Web Components, charting, cross-platform, forms, Office Add-ins, accessibility auditing, v8→v9 migration, and Figma design kits.

## Install

```bash
/plugin install fluent-ui-design@claude-m-microsoft-marketplace
```

## What's new in v2.0.0

- **9 focused skills** (was 1 monolith) — faster activation, better coverage
- **5 agents** (+Accessibility Auditor, +Migration Assistant)
- **14 commands** (+8 new for Next.js, Griffel, migration, charts, forms, testing, Office Add-ins, Web Components)
- **~20 reference files** with 80+ external URLs
- **New content areas**: Next.js SSR, Griffel AOT, Web Components, charting, iOS/Android, B2C UI, form orchestration, slots/extensibility, Office Add-ins, testing

## Skills

| Skill | Topics |
|---|---|
| **Fluent 2 Design System** (core) | Design tokens, color system, typography, layout, component library, theming, accessibility, icons |
| **Fluent UI Next.js** | App Router + Pages Router setup, SSR, `use client` boundaries, Griffel AOT with webpack |
| **Fluent UI Griffel** | makeStyles, makeResetStyles, shorthands, AOT compilation, selectors, RTL, DevTools |
| **Fluent UI Extensibility** | Slots (4 levels), custom variants, customStyleHooks, headless patterns, v8→v9 migration |
| **Fluent UI Web Components** | `@fluentui/web-components`, framework-agnostic (Angular, Vue, Svelte) |
| **Fluent UI Charting** | `@fluentui/react-charting` — line, bar, pie, donut, area, heatmap, sankey, gauge |
| **Fluent UI Cross-Platform** | iOS (Swift/UIKit), Android (Kotlin), token parity, Figma kits |
| **Fluent UI Forms** | Field validation, Formik + Yup, React Hook Form + Zod, multi-step wizards |
| **Fluent UI Integration** | Azure AD B2C UI, Office Add-ins, SharePoint, Nav/Drawer patterns |

## Agents

| Agent | Purpose |
|---|---|
| **Fluent UI Designer** | Architects UI layouts with proper token usage, theming, and component selection |
| **Fluent Component Builder** | Builds custom React components with Fluent UI v9 best practices |
| **Fluent Theme Engineer** | Creates custom themes with brand ramps and multi-theme support |
| **Fluent Accessibility Auditor** | WCAG 2.1 AA compliance scanning, ARIA validation, contrast checking |
| **Fluent Migration Assistant** | Scans v8 imports, maps to v9, plans incremental migration |

## Commands

| Command | Description |
|---|---|
| `fluent-ui-design:setup` | Set up a project with Fluent UI React v9 |
| `fluent-ui-design:component` | Scaffold a new Fluent component |
| `fluent-ui-design:theme` | Generate a custom theme from a brand color |
| `fluent-ui-design:tokens` | Look up design token values and usage |
| `fluent-ui-design:layout` | Generate responsive layout patterns |
| `fluent-ui-design:audit` | Audit a project for Fluent 2 compliance |
| `fluent-ui-design:nextjs-setup` | Set up Fluent UI in Next.js with SSR |
| `fluent-ui-design:griffel-optimize` | Analyze and optimize Griffel styling |
| `fluent-ui-design:migrate-v8` | Scan v8 usage and plan v9 migration |
| `fluent-ui-design:web-component` | Scaffold Web Component integration |
| `fluent-ui-design:chart` | Generate a Fluent-themed chart component |
| `fluent-ui-design:form` | Generate a form with validation (Formik/RHF) |
| `fluent-ui-design:office-addin` | Set up Fluent UI in an Office Add-in |
| `fluent-ui-design:test` | Generate tests for Fluent components |

## Prompt examples

- "Build a Teams tab dashboard with Fluent UI"
- "Create a custom Fluent theme with brand color #5B5FC7"
- "Set up Fluent UI in my Next.js App Router project"
- "Optimize Griffel styling with AOT compilation"
- "Migrate my DetailsList from Fluent v8 to DataGrid v9"
- "Build a form with Formik + Yup validation using Fluent components"
- "Add a line chart to my dashboard with @fluentui/react-charting"
- "Scaffold Fluent Web Components for my Angular app"
- "Set up Fluent UI in my Excel add-in task pane"
- "Audit my app for WCAG 2.1 AA accessibility compliance"
- "Design a responsive master-detail layout using Fluent"
- "Customize Azure AD B2C sign-in page with Fluent tokens"

## Opinionated flows

1. **Next.js + Fluent full stack**
   Triggers: `fluent-nextjs`, `fluent-griffel`
   Prompt: "Set up Fluent UI in my Next.js App Router project with Griffel AOT and dark mode toggle"

2. **v8 → v9 migration**
   Triggers: `fluent-extensibility`, `fluent-griffel`
   Prompt: "Scan my project for Fluent v8 usage, create a migration plan, and migrate the Button components first"

3. **Accessible form design**
   Triggers: `fluent-forms`, core skill
   Prompt: "Build an accessible multi-step registration form with Formik validation and error announcements"

4. **Cross-platform design system**
   Triggers: `fluent-cross-platform`, core skill
   Prompt: "Compare Fluent token availability across Web, iOS, and Android for our design system"

5. **Office Add-in development**
   Triggers: `fluent-integration`, core skill
   Prompt: "Create an Excel add-in task pane with Fluent UI, including theme switching and responsive layout"
