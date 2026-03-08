# Fluent 2 + Microsoft Teams Integration — Complete Reference

## Architectural Position

The Fluent UI + Teams integration is not "Fluent in Teams." It is:

**A Teams-native application framework where Fluent UI v9 is the semantic shell, Teams capabilities are the surface map, and advanced runtimes plug in only where they create real leverage.**

### What Teams Is Good For

- Full embedded web UI in **tabs** (personal, team, channel, group chat, meeting)
- Rich contextual UI in **meeting side panel** / **meeting stage**
- Lightweight workflow launchers in **dialogs**
- Search/share/action entry points via **message extensions**
- Chat-native interaction via **bots + Adaptive Cards**

### What Teams Is NOT Good For

- Anything depending on native plugins or unrestricted browser/container behavior (tabs run in sandboxed iframes)
- Using the same "full React app shell" in message extensions or cards (those surfaces return cards and bot-driven interactions, not arbitrary React DOM)
- Assuming meeting side panels or stage apps can auto-open without user action (not the supported model)

---

## Surface Tiers

### Tier 1 — Primary UI Surfaces (Full Fluent React v9)

Use full React + Fluent UI v9 in these surfaces. This is where your advanced slots/composition, Griffel styling, tokenized theming, responsive shells, command bars, overflow, custom variants, and motion work pays off.

| Surface | Description | Full Fluent UI? |
|---------|-------------|-----------------|
| Personal tabs | User-specific app views | Yes |
| Team/channel tabs | Shared team content | Yes |
| Group chat tabs | Chat-embedded apps | Yes |
| Meeting chat tabs | Pre/post-meeting content | Yes |
| Meeting details tabs | Meeting configuration | Yes |
| Meeting side panel | Live controls during meeting | Yes |
| Meeting stage | Shared collaborative canvas | Yes |

**Applicable advanced patterns in Tier 1:**
- Slots, composition, custom components
- CommandBar patterns
- Griffel styling and token pipeline
- Wrapper components / product-level design system
- Shell and layout patterns
- Overflow API
- Motion system (Fluent native + Framer Motion)
- Virtualization
- Accessibility patterns
- Positioning API
- Drawer / Nav components

### Tier 2 — Secondary Activation Surfaces

Use Teams-native capability surfaces for discovery and quick actions. These should launch, summarize, route, notify, and collect intent — NOT reproduce the full Fluent app architecture.

| Surface | Purpose | Use For |
|---------|---------|---------|
| Message extensions | Search/share/action in compose box | Insert results, search entities, create from message, route to tab |
| Bots | Chat-native interaction | Notifications, approvals, summaries, escalation, reminders |
| Adaptive Cards | Actionable message fragments | Status cards, approval flows, launch points into tabs |
| Dialogs | Focused mini-experiences | Creation flows, confirmations, settings, short-form editors |

---

## Setup

```bash
npm install @fluentui/react-components @fluentui/react-icons @microsoft/teams-js
```

### Platform Tooling

Microsoft recommends **Microsoft 365 Agents SDK** and **Teams SDK** for new app development. **TeamsFx is deprecated** for modern scenarios.

- Standardize on: **Teams SDK** + **TeamsJS** + **Agents Toolkit** (VS Code)
- Treat the **app manifest** as a first-class, capability-driven artifact
- Remove dependency on TeamsFx-first scaffolding as long-term base

```bash
# Agents Toolkit (recommended for new projects)
# Install via VS Code Marketplace: "Teams Toolkit" extension

# Or manually scaffold
npm install @microsoft/teams-js
```

---

## Theme Integration

```tsx
import React, { useState, useEffect } from 'react';
import {
  FluentProvider,
  teamsLightTheme,
  teamsDarkTheme,
  teamsHighContrastTheme,
  Theme,
} from '@fluentui/react-components';
import { app } from '@microsoft/teams-js';

const themeMap: Record<string, Theme> = {
  default: teamsLightTheme,
  dark: teamsDarkTheme,
  contrast: teamsHighContrastTheme,
};

export function TeamsFluentApp({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(teamsLightTheme);

  useEffect(() => {
    app.initialize().then(() => {
      // Get initial theme
      app.getContext().then((context) => {
        setTheme(themeMap[context.app.theme] ?? teamsLightTheme);
      });

      // Listen for theme changes (user toggles dark mode)
      app.registerOnThemeChangeHandler((themeName: string) => {
        setTheme(themeMap[themeName] ?? teamsLightTheme);
      });
    });
  }, []);

  return (
    <FluentProvider theme={theme}>
      {children}
    </FluentProvider>
  );
}
```

### Teams Theme Token Differences

Teams themes diverge from standard web themes in these areas:

| Token | Web Light | Teams Light | Notes |
|---|---|---|---|
| `colorBrandBackground` | `#0F6CBD` | `#5B5FC7` | Teams uses purple/indigo brand |
| `colorNeutralBackground1` | `#FFFFFF` | `#FFFFFF` | Same |
| `colorNeutralBackground3` | `#F5F5F5` | `#F5F5F5` | Same |
| `borderRadiusMedium` | `4px` | `4px` | Same |

Teams Dark theme key values:
- `colorNeutralBackground1`: `#292929` (Teams dark surface)
- `colorBrandBackground`: `#5B5FC7` (Teams brand)
- `colorNeutralForeground1`: `#FFFFFF` (Primary text)

Teams High Contrast:
- Uses Windows system colors
- All borders become visible
- Focus indicators are emphasized
- Supports `forced-colors: active` media query

### Token Federation

Create one token contract that feeds:
- Fluent themes (React components)
- CSS variables (embedded widgets)
- Motion timings/easings
- Visualization color ramps
- Card styling semantics where possible

This is what keeps the full system coherent even though Teams surfaces differ.

---

## Surface-Aware Architecture

### Context-Aware Surface Router

TeamsJS exposes rendering context so your app can detect the surface and adapt UI:

```tsx
import { app, FrameContexts } from '@microsoft/teams-js';
import { useState, useEffect } from 'react';

type TeamsContext = {
  frameContext: string;
  meetingId?: string;
  chatId?: string;
  teamId?: string;
  channelId?: string;
  theme: string;
};

function useTeamsContext(): TeamsContext | null {
  const [context, setContext] = useState<TeamsContext | null>(null);

  useEffect(() => {
    app.initialize().then(() => {
      app.getContext().then((ctx) => {
        setContext({
          frameContext: ctx.page.frameContext ?? 'content',
          meetingId: ctx.meeting?.id,
          chatId: ctx.chat?.id,
          teamId: ctx.team?.internalId,
          channelId: ctx.channel?.id,
          theme: ctx.app.theme,
        });
      });
    });
  }, []);

  return context;
}

function SurfaceRouter() {
  const context = useTeamsContext();

  if (!context) return <Spinner label="Loading..." />;

  switch (context.frameContext) {
    case 'content':
      return <TabShell context={context} />;
    case 'sidePanel':
      return <MeetingSidePanelLayout context={context} />;
    case 'meetingStage':
      return <MeetingStageCanvas context={context} />;
    default:
      return <TabShell context={context} />;
  }
}
```

---

## Tier 1 Surfaces — Full Implementation

### 1. Tab App Shell (Primary Render Target)

Tabs are the place for your full advanced Fluent reference — shell, forms, nav, command surfaces, tables, motion, virtualization.

```tsx
import { makeStyles, tokens, TabList, Tab, Text, Button } from '@fluentui/react-components';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: tokens.colorNeutralBackground2,
  },
  header: {
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
  },
  content: {
    flex: 1,
    padding: tokens.spacingHorizontalXXL,
    overflowY: 'auto',
  },
});

export function TabShell({ context }: { context: TeamsContext }) {
  const styles = useStyles();
  const [selectedTab, setSelectedTab] = useState('overview');

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Text size={500} weight="semibold">My App</Text>
        <TabList
          selectedValue={selectedTab}
          onTabSelect={(_, data) => setSelectedTab(data.value as string)}
        >
          <Tab value="overview">Overview</Tab>
          <Tab value="data">Data</Tab>
          <Tab value="settings">Settings</Tab>
        </TabList>
      </div>
      <div className={styles.content}>
        {/* Tab content — use full advanced Fluent patterns here */}
      </div>
    </div>
  );
}
```

### 2. Meeting Side Panel (280-320px Constrained)

Best for: live controls, co-edit tools, contextual inspectors, task panels, guided workflows during meetings.

```tsx
const useStyles = makeStyles({
  panel: {
    width: '100%',
    maxWidth: '320px',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  header: {
    padding: tokens.spacingHorizontalM,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  body: {
    flex: 1,
    padding: tokens.spacingHorizontalM,
    overflowY: 'auto',
  },
  actions: {
    padding: tokens.spacingHorizontalM,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    gap: tokens.spacingHorizontalS,
  },
});

export function MeetingSidePanelLayout({ context }: { context: TeamsContext }) {
  const styles = useStyles();

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <Text size={400} weight="semibold">Meeting Controls</Text>
      </div>
      <div className={styles.body}>
        <Accordion collapsible>
          <AccordionItem value="agenda">
            <AccordionHeader>Agenda</AccordionHeader>
            <AccordionPanel>...</AccordionPanel>
          </AccordionItem>
          <AccordionItem value="notes">
            <AccordionHeader>Notes</AccordionHeader>
            <AccordionPanel>...</AccordionPanel>
          </AccordionItem>
          <AccordionItem value="actions">
            <AccordionHeader>Action Items</AccordionHeader>
            <AccordionPanel>...</AccordionPanel>
          </AccordionItem>
        </Accordion>
      </div>
      <div className={styles.actions}>
        <Button appearance="primary" style={{ flex: 1 }}>
          Share to Stage
        </Button>
      </div>
    </div>
  );
}
```

#### Side Panel Design Constraints

- **Width**: 280px iframe with 20px padding on each side
- **Layout**: Single-column strongly recommended
- **Scrolling**: Vertical only
- **Navigation**: Back button required for multi-layer navigation
- **Avoid**: Modals/dialogs within the narrow panel
- **Focus on dark theme** — meetings are optimized for dark theme to reduce visual noise

```tsx
const useSidePanelStyles = makeStyles({
  panel: {
    width: '100%',
    maxWidth: '280px',
    padding: tokens.spacingHorizontalL,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground1,
    overflowY: 'auto',
    overflowX: 'hidden',
  },
});
```

### 3. Meeting Stage (Shared Collaborative Canvas)

Best for: shared collaborative canvases, board/whiteboard experiences, synchronized review surfaces, collaborative playback/simulation UIs.

```tsx
import { meeting } from '@microsoft/teams-js';

const useStyles = makeStyles({
  stageView: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  toolbar: {
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  canvas: {
    flex: 1,
    padding: tokens.spacingHorizontalXXL,
    overflowY: 'auto',
  },
  sideDrawer: {
    width: '320px',
    borderLeft: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
  },
});

export function MeetingStageCanvas({ context }: { context: TeamsContext }) {
  const styles = useStyles();

  return (
    <div className={styles.stageView}>
      <div className={styles.toolbar}>
        <Text size={500} weight="semibold">Shared Canvas</Text>
        <div style={{ display: 'flex', gap: tokens.spacingHorizontalS }}>
          <Button appearance="subtle" icon={<PeopleRegular />}>Participants</Button>
          <Button appearance="primary">Save</Button>
        </div>
      </div>
      <div className={styles.mainContent}>
        <div className={styles.canvas}>
          {/* Collaborative canvas content — dashboards, boards, data views */}
        </div>
      </div>
    </div>
  );
}

// Share content from side panel to stage
function shareToStage(contentUrl: string) {
  meeting.shareAppContentToStage((err) => {
    if (err) console.error('Share to stage failed:', err);
  }, contentUrl);
}
```

#### Meeting Stage Dimensions

- **Without side panel**: 994x678px default, min 792x382px
- **With side panel**: 918x540px default, min 472x382px
- **Must be responsive** — content should not scroll horizontally

### Meeting Mode Compositions

Define separate compositions for meeting contexts:

```tsx
function MeetingApp({ context }: { context: TeamsContext }) {
  const meetingPhase = useMeetingPhase(context);

  switch (meetingPhase) {
    case 'prep':
      return <PrepModeLayout context={context} />;      // Agenda, notes setup
    case 'collaboration':
      return <CollabModeLayout context={context} />;    // Live controls, co-edit
    case 'presentation':
      return <PresentationModeLayout context={context} />; // Stage-shared canvas
    default:
      return <PrepModeLayout context={context} />;
  }
}
```

---

## Tier 2 Surfaces — Activation & Orchestration

### 4. Message Extensions

Entry points into the main React/Fluent experience. NOT for full Fluent architecture.

Use for:
- **"Insert result from app"** — search and share cards
- **"Search entity and share card"** — entity lookup
- **"Create ticket/task from message"** — action on message
- **"Open full tab for deep workflow"** — route to rich surface

Think of message extensions as entry points, not destinations.

### 5. Bots + Adaptive Cards

Orchestration surfaces — notifications, approvals, summaries. NOT substitutes for advanced Fluent React UI.

Use for:
- Notifications and alerts
- Approval flows (approve/reject inline)
- Quick summaries and status cards
- Escalation prompts
- Reminders and check-ins
- Launch-back-into-tab flows (deep links)

**Rule**: Keep cards intentionally thin. Summarize, alert, confirm, route — never overbuild card UX trying to mimic full Fluent React capabilities.

### 6. Dialogs (Task Modules)

Targeted mini-experiences for:
- Focused creation flows
- Confirmation flows
- Settings panels
- Short-form editors
- Contextual tools launched from a tab or card

```tsx
const useStyles = makeStyles({
  dialogContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
});

export function TeamsDialog() {
  const styles = useStyles();

  return (
    <Dialog open modalType="modal">
      <DialogSurface style={{ maxWidth: '600px' }}>
        <DialogBody>
          <DialogTitle>Create New Item</DialogTitle>
          <DialogContent className={styles.dialogContent}>
            <Field label="Title" required>
              <Input />
            </Field>
            <Field label="Description">
              <Textarea rows={3} />
            </Field>
            <Field label="Assign To">
              <Combobox placeholder="Search people...">
                <Option>Jane Doe</Option>
                <Option>John Smith</Option>
              </Combobox>
            </Field>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary">Cancel</Button>
            <Button appearance="primary">Create</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
```

#### In-Meeting Dialog Constraints

- **Width**: min 280px (248px iframe) to max 460px (428px iframe)
- **Height**: 300px iframe (scrollable if content exceeds)
- **Layout**: Single-column; right-align primary action
- **Usage**: Sparingly — for brief, task-oriented interactions

---

## Adaptive Cards + Fluent 2

### Aligning Adaptive Card Host Config with Fluent Tokens

```json
{
  "$schema": "http://adaptivecards.io/schemas/host-config.json",
  "spacing": {
    "small": 4,
    "default": 8,
    "medium": 12,
    "large": 16,
    "extraLarge": 24,
    "padding": 16
  },
  "separator": {
    "lineThickness": 1,
    "lineColor": "#D1D1D1"
  },
  "fontFamily": "Segoe UI Variable, Segoe UI, system-ui, sans-serif",
  "fontSizes": {
    "small": 12,
    "default": 14,
    "medium": 16,
    "large": 20,
    "extraLarge": 24
  },
  "fontWeights": {
    "lighter": 400,
    "default": 400,
    "bolder": 600
  },
  "containerStyles": {
    "default": {
      "backgroundColor": "#FFFFFF",
      "foregroundColors": {
        "default": { "default": "#242424", "subtle": "#616161" },
        "accent": { "default": "#5B5FC7", "subtle": "#7F83DB" },
        "attention": { "default": "#C4314B", "subtle": "#D13438" },
        "good": { "default": "#0E7A0D", "subtle": "#107C10" },
        "warning": { "default": "#C87C0A", "subtle": "#CA5010" }
      }
    },
    "emphasis": {
      "backgroundColor": "#F5F5F5"
    }
  },
  "actions": {
    "maxActions": 6,
    "spacing": "Default",
    "buttonSpacing": 8,
    "showCard": { "actionMode": "Inline", "inlineTopMargin": 8 },
    "actionsOrientation": "Horizontal",
    "actionAlignment": "Left"
  }
}
```

### Rendering Adaptive Cards with Fluent Styling

```tsx
import * as AdaptiveCards from 'adaptivecards';
import { tokens } from '@fluentui/react-components';

const adaptiveCard = new AdaptiveCards.AdaptiveCard();
adaptiveCard.hostConfig = new AdaptiveCards.HostConfig({
  fontFamily: tokens.fontFamilyBase,
  // ... host config matching Fluent tokens
});
adaptiveCard.parse(cardPayload);
const renderedCard = adaptiveCard.render();
```

### Adaptive Cards 2.0 + Fluent 2

New Fluent-aligned features:

1. **Fluent Icons** — `iconUrl: "icon:<icon-name>[,regular|filled]"` on action buttons
2. **Rounded Corners & Borders** — Fluent-aligned corner radius
3. **Charts** — Data visualization directly in cards
4. **Responsive Layout** — Container layouts that adapt to any device
5. **Star Ratings** — Read-only or interactive star ratings
6. **Scrollable Containers** — Container scroll bars for lengthy cards
7. **Conditionally-Enabled Actions** — Buttons activate only after required inputs
8. **Compound Buttons** — Prompt-starter look and feel
9. **Inline Video Playback** — YouTube, Vimeo, Dailymotion embedded
10. **Carousel** — Sliding page presentations

---

## Teams-Specific Fluent Component Layer

Build product-level Teams-aware primitives on top of Fluent v9:

### TeamsAppShell

```tsx
import { makeStyles, tokens, mergeClasses } from '@fluentui/react-components';

const useStyles = makeStyles({
  shell: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: tokens.colorNeutralBackground2,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    height: '48px',
  },
  body: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  nav: {
    width: '240px',
    backgroundColor: tokens.colorNeutralBackground3,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    overflowY: 'auto',
    '@media (max-width: 767px)': {
      display: 'none',
    },
  },
  main: {
    flex: 1,
    overflowY: 'auto',
    padding: tokens.spacingHorizontalXXL,
  },
  compact: {
    padding: tokens.spacingHorizontalM,
  },
});

interface TeamsAppShellProps {
  title: string;
  nav?: React.ReactNode;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  density?: 'normal' | 'compact';
}

export function TeamsAppShell({ title, nav, toolbar, children, density = 'normal' }: TeamsAppShellProps) {
  const styles = useStyles();

  return (
    <div className={styles.shell}>
      <div className={styles.header}>
        <Text size={500} weight="semibold">{title}</Text>
        {toolbar}
      </div>
      <div className={styles.body}>
        {nav && <div className={styles.nav}>{nav}</div>}
        <div className={mergeClasses(styles.main, density === 'compact' && styles.compact)}>
          {children}
        </div>
      </div>
    </div>
  );
}
```

### TeamsCommandBar

```tsx
import { Toolbar, ToolbarButton, Overflow, OverflowItem, makeStyles, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  commandBar: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalM}`,
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  primarySection: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    flex: 1,
  },
  secondarySection: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    marginLeft: 'auto',
  },
});

interface CommandAction {
  id: string;
  label: string;
  icon: React.ReactElement;
  onClick: () => void;
}

export function TeamsCommandBar({
  primaryActions,
  secondaryActions,
}: {
  primaryActions: CommandAction[];
  secondaryActions?: CommandAction[];
}) {
  const styles = useStyles();

  return (
    <Toolbar className={styles.commandBar}>
      <Overflow>
        <div className={styles.primarySection}>
          {primaryActions.map((action) => (
            <OverflowItem key={action.id} id={action.id}>
              <ToolbarButton icon={action.icon} onClick={action.onClick}>
                {action.label}
              </ToolbarButton>
            </OverflowItem>
          ))}
        </div>
      </Overflow>
      {secondaryActions && (
        <div className={styles.secondarySection}>
          {secondaryActions.map((action) => (
            <ToolbarButton key={action.id} icon={action.icon} onClick={action.onClick} />
          ))}
        </div>
      )}
    </Toolbar>
  );
}
```

### MeetingSidePanelLayout

```tsx
const useStyles = makeStyles({
  panel: {
    width: '100%',
    maxWidth: '320px',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  header: {
    padding: tokens.spacingHorizontalM,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: '44px',
  },
  body: {
    flex: 1,
    padding: tokens.spacingHorizontalM,
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  footer: {
    padding: tokens.spacingHorizontalM,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    gap: tokens.spacingHorizontalS,
  },
});

interface MeetingSidePanelProps {
  title: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function MeetingSidePanelLayout({ title, headerAction, children, footer }: MeetingSidePanelProps) {
  const styles = useStyles();
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <Text size={400} weight="semibold">{title}</Text>
        {headerAction}
      </div>
      <div className={styles.body}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  );
}
```

### MeetingStageCanvasFrame

```tsx
const useStyles = makeStyles({
  stage: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  stageToolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    minHeight: '48px',
  },
  stageCanvas: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  stageOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: tokens.spacingHorizontalM,
  },
});

interface MeetingStageProps {
  title: string;
  toolbar?: React.ReactNode;
  overlay?: React.ReactNode;
  children: React.ReactNode;
}

export function MeetingStageCanvasFrame({ title, toolbar, overlay, children }: MeetingStageProps) {
  const styles = useStyles();
  return (
    <div className={styles.stage}>
      <div className={styles.stageToolbar}>
        <Text size={500} weight="semibold">{title}</Text>
        {toolbar}
      </div>
      <div className={styles.stageCanvas}>
        {children}
        {overlay && <div className={styles.stageOverlay}>{overlay}</div>}
      </div>
    </div>
  );
}
```

---

## Motion in Teams

### Best Placement for Motion

Motion is the best immediate upgrade for Teams apps. Use it in tab and meeting surfaces only (not in cards or message extensions).

| Surface | Motion Usage | Examples |
|---------|-------------|----------|
| Tabs | Full support | Staged entrances, panel choreography, row reordering |
| Meeting side panel | Full support | Panel state changes, list animations |
| Meeting stage | Full support | Stage-share state changes, collaborative transitions |
| Adaptive Cards | None | Cards don't support custom animation |
| Message extensions | None | Results are card-based |

### Rule

- **Fluent owns semantics** (tokens, components, accessibility)
- **Motion owns choreography** (stagger, presence, layout transitions, spring physics)

```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { tokens } from '@fluentui/react-components';

// Meeting panel item animation
const panelItemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.2, ease: [0.1, 0.9, 0.2, 1] },
  },
  exit: { opacity: 0, x: 8, transition: { duration: 0.15 } },
};

// Stage share transition
const stageContentVariants = {
  initial: { opacity: 0, scale: 0.96 },
  enter: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.35, ease: [0.1, 0.9, 0.2, 1] },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: 0.2, ease: [0.7, 0, 1, 0.5] },
  },
};
```

---

## Advanced Widget Boundary

Create a formal `AdvancedSurface` boundary for specialized widgets that go beyond standard Fluent DOM.

### Supported Implementation Types

| Type | Use Case |
|------|----------|
| React + Canvas | Dense visualizations, timelines |
| React + WebGL/WebGPU | 3D views, graph explorers |
| Web Components | Framework-neutral widget islands |
| Wasm-backed compute | Heavy computation, document transforms |

### When to Use Advanced Widgets

Only for:
- Dense visualizations
- Graph explorers
- Multiplayer collaborative canvases
- Timeline/trace viewers
- High-frequency streaming UIs

### Web Components

Microsoft's Fluent UI Web Components work across Angular, ASP.NET, Aurelia, Blazor, React, and Vue. Useful for "widget islands" inside a larger React/Teams app.

### Wasm / Rust Modules

Use for heavy computation, graph layout, document transforms, or local collaborative engines that feed a React/Fluent shell. Viable in Teams tabs because the rendering surface is your web app.

### Iframe Constraints

Tabs are iframe-hosted. Design for this:
- Avoid assumptions about unrestricted browser/container APIs
- Test advanced rendering features in actual Teams desktop/web clients
- Keep "fallback to simpler DOM mode" for advanced widgets

---

## Collaborative Meeting Patterns

### What "Bleeding-Edge UI" Means in Teams

The most realistic advanced stack inside Teams:

1. **Fluent UI v9** for shell, forms, nav, command surfaces, tables
2. **TeamsJS** for host context, auth, meeting awareness, dialogs, deep links
3. **Motion** for high-end transitions inside tabs and meeting surfaces
4. **Live Share** / real-time collaboration patterns for shared meeting experiences
5. **Adaptive Cards + bots/message extensions** as the distribution and activation layer

### Meeting Side Panel — Advanced Patterns

Best place for next-level collaborative UI:
- Co-presence visualizations (who's viewing what)
- Live control panels (shared settings)
- Side-panel inspectors (drill into stage content)
- Synchronized data views
- Role-based meeting workflows

### Meeting Stage — Advanced Patterns

Best for ambitious shared experiences:
- Collaborative dashboards
- Board/whiteboard experiences
- Synchronized review surfaces
- Shared entity exploration
- Collaborative playback or simulation UIs

### Live Share Integration

```tsx
import { LiveShareClient, TestLiveShareHost } from '@microsoft/live-share';
import { LiveShareProvider, useLiveState } from '@microsoft/live-share-react';

function CollaborativeComponent() {
  const [sharedState, setSharedState] = useLiveState('shared-view', {
    selectedItem: null,
    zoom: 1,
    filters: [],
  });

  return (
    <div>
      {/* UI that stays in sync across meeting participants */}
    </div>
  );
}
```

---

## Conversation / Chat UI Pattern

```tsx
const useStyles = makeStyles({
  chatContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingHorizontalM,
  },
  message: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    maxWidth: '80%',
  },
  incoming: {
    alignSelf: 'flex-start',
  },
  outgoing: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  bubble: {
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  bubbleOutgoing: {
    backgroundColor: tokens.colorBrandBackground2,
  },
  timestamp: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    marginTop: tokens.spacingVerticalXXS,
  },
});

function ChatMessage({ message, isOutgoing }: { message: MessageType; isOutgoing: boolean }) {
  const styles = useStyles();
  return (
    <div className={mergeClasses(styles.message, isOutgoing ? styles.outgoing : styles.incoming)}>
      {!isOutgoing && (
        <Avatar name={message.sender} size={28} badge={{ status: 'available' }} />
      )}
      <div>
        <div className={mergeClasses(styles.bubble, isOutgoing && styles.bubbleOutgoing)}>
          <Text>{message.text}</Text>
        </div>
        <Text className={styles.timestamp}>{message.time}</Text>
      </div>
    </div>
  );
}
```

---

## App Manifest Configuration

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/teams/v1.16/MicrosoftTeams.schema.json",
  "manifestVersion": "1.16",
  "configurableTabs": [
    {
      "configurationUrl": "https://yourapp.com/config",
      "canUpdateConfiguration": true,
      "scopes": ["team", "groupChat"],
      "context": [
        "channelTab",
        "privateChatTab",
        "meetingChatTab",
        "meetingSidePanel",
        "meetingStage"
      ]
    }
  ],
  "staticTabs": [
    {
      "entityId": "personal-tab",
      "name": "My Tab",
      "contentUrl": "https://yourapp.com/tab",
      "scopes": ["personal"]
    }
  ],
  "composeExtensions": [
    {
      "botId": "your-bot-id",
      "commands": [
        {
          "id": "searchEntity",
          "title": "Search",
          "type": "query",
          "context": ["commandBox", "compose", "message"],
          "parameters": [{ "name": "query", "title": "Search", "inputType": "text" }]
        }
      ]
    }
  ],
  "bots": [
    {
      "botId": "your-bot-id",
      "scopes": ["personal", "team", "groupChat"],
      "supportsFiles": false
    }
  ]
}
```

---

## Host Constraints to Design Around

### 1. Sandboxed Iframe Hosting

Tabs are iframe-hosted in Teams. Native plugins are not available.

**Implications:**
- Avoid assumptions about unrestricted browser/container APIs
- Test all advanced rendering features in actual Teams desktop/web clients
- Keep "fallback to simpler DOM mode" for advanced widgets

### 2. No Passive Auto-Opening Meeting UI

Meeting side panels and stage surfaces are user-invoked, not auto-launch surfaces.

**Implications:**
- Use cards, message extensions, or prompts to drive users into richer surfaces
- Treat meeting side panel/stage as opt-in engagement layers

### 3. Keep Cards Thin

Adaptive Cards are orchestration surfaces, not full app replicas.

**Implications:**
- Summarize, alert, confirm, route
- Never overbuild card UX trying to mimic full Fluent React capabilities

---

## Teams Design Best Practices

### Layout Guidelines

1. **Consistent margins** — Use `spacingHorizontalL` (16px) for page margins
2. **Card-based layouts** — Use Fluent `Card` component for content sections
3. **Responsive within Teams** — Teams provides 280px (side panel) to full-width (stage view)
4. **Respect Teams chrome** — Don't replicate Teams navigation or headers
5. **Loading states** — Always show `Skeleton` or `Spinner` during data loading

### Color Usage in Teams

1. **Don't hardcode colors** — Always use tokens for theme compatibility
2. **Brand sparingly** — Use `colorBrandBackground` for primary actions only
3. **Semantic colors** — Use status tokens for feedback
4. **Neutral hierarchy** — Background1 → Background2 → Background3 for depth
5. **Test all three themes** — Light, dark, and high contrast

### Accessibility in Teams

1. **Keyboard navigation** — All interactive elements keyboard-accessible
2. **Focus management** — Use `useArrowNavigationGroup` for lists and grids
3. **Screen reader support** — Add `aria-label` to icon-only buttons
4. **High contrast** — Test with `teamsHighContrastTheme`
5. **Touch targets** — Minimum 44x44px for all interactive elements

### Typography in Teams

- **Page title**: `size={500} weight="semibold"` (20px)
- **Section header**: `size={400} weight="semibold"` (16px)
- **Body text**: `size={300}` (14px) — default
- **Caption/metadata**: `size={200}` (12px)
- **Fine print**: `size={100}` (10px)

### Common Anti-Patterns

1. **Don't use custom scrollbars** — Let Teams/OS handle scrolling
2. **Don't override focus styles** — Fluent focus indicators are accessibility-tested
3. **Don't use absolute positioning for layout** — Use flexbox/grid with tokens
4. **Don't mix Fluent v8 and v9** — Choose one version
5. **Don't ignore loading states** — Empty content creates confusion
6. **Don't use inline styles for theming** — Use `makeStyles` with tokens
7. **Don't put full Fluent shell in message extensions** — Those are card surfaces
8. **Don't assume auto-open for meeting panel/stage** — User must invoke

---

## Collaborative Stageview

- Opens app content in a new Teams window with accompanying side panel conversation
- Best for collaboration scenarios
- Fallback hierarchy: `popoutWithChat > popout > modal`

---

## Implementation Sequence

### Phase 1 — Foundation

- Migrate tooling away from TeamsFx-first assumptions
- Establish TeamsJS + Fluent v9 tab shell
- Build context-aware SurfaceRouter
- Support personal/team/chat tabs

### Phase 2 — Meeting Surfaces

- Add meeting details/chat/side-panel/stage support
- Create MeetingMode layouts (prep, collaboration, presentation)
- Add Motion-based transitions

### Phase 3 — Activation Layer

- Add message extension and bot/card entry points
- Wire cards to deep-link into tabs and meeting surfaces
- Add notification and approval flows

### Phase 4 — Advanced Widgets

- Introduce advanced widget boundary
- Add Web Components and optional Wasm-backed modules
- Add collaborative/high-density UI surfaces for stage and side panel

---

## Fluent UI MCP Servers

### mcp-fluent-ui (npm)

50+ tools for component generation, theming, layout, forms, data, and accessibility.

```json
{
  "mcpServers": {
    "fluentui": {
      "command": "npx",
      "args": ["-y", "mcp-fluent-ui"]
    }
  }
}
```

### fluentui-mcp-server (aminvishvam)

12 tools across 4 categories:

| Category | Tools |
|---|---|
| Component Knowledge | `get_component_info`, `search_components`, `get_component_props`, `get_component_examples` |
| Design System | `get_design_tokens`, `validate_design_tokens` |
| Code Generation | `generate_component`, `generate_component_hook`, `generate_component_styles` |
| Validation | `validate_component_design` (scores 0-100), `check_accessibility`, `analyze_component_patterns` |

```json
{
  "mcpServers": {
    "fluentui": {
      "command": "node",
      "args": ["/path/to/fluentui-mcp-server/dist/server.js"]
    }
  }
}
```

---

## Teams Figma Design Kits

| Kit | URL |
|---|---|
| **Teams UI Kit** | `figma.com/community/file/916836509871353159/microsoft-teams-ui-kit` |
| **Meeting Extensions Guidelines** | `figma.com/community/file/888593778835180533` |
| **Teams App Templates** | `figma.com/community/file/1090688705806625` |
| **Fluent 2 Web UI Kit** | `aka.ms/Fluent2Toolkits/Web/Figma` |
| **Fluent 2 iOS UI Kit** | `aka.ms/Fluent2Toolkits/iOS/Figma` |
| **Fluent 2 Android UI Kit** | `aka.ms/Fluent2Toolkits/Android/Figma` |

---

## Key Package References

| Package | Purpose |
|---|---|
| `@fluentui/react-components` | Primary Fluent UI React v9 (recommended for all new Teams apps) |
| `@fluentui/react-icons` | 20,000+ icons in Regular and Filled styles |
| `@fluentui/react-theme` | Theme definitions including Teams themes |
| `@microsoft/teams-js` | Teams JavaScript SDK for context, theming, deep links |
| `@microsoft/live-share` | Real-time collaboration in meeting apps |
| `@microsoft/live-share-react` | React hooks for Live Share |
| `@fluentui/react-northstar` | Legacy Teams library (superseded by react-components) |
