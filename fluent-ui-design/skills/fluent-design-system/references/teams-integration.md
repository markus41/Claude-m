# Fluent 2 + Microsoft Teams Integration — Complete Reference

## Teams App Architecture with Fluent UI

### Setup

```bash
npm install @fluentui/react-components @fluentui/react-icons @microsoft/teams-js
```

### Theme Integration

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

---

## Teams App Design Patterns

### Tab App Layout

```tsx
import { makeStyles, tokens, TabList, Tab, Text } from '@fluentui/react-components';

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

export function TeamsTabLayout() {
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
          <Tab value="settings">Settings</Tab>
        </TabList>
      </div>
      <div className={styles.content}>
        {/* Tab content */}
      </div>
    </div>
  );
}
```

### Meeting Side Panel (280-320px constrained)

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

export function MeetingSidePanel() {
  const styles = useStyles();

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <Text size={400} weight="semibold">Meeting Notes</Text>
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
        <Button appearance="primary" style={{ flex: 1 }}>Save</Button>
      </div>
    </div>
  );
}
```

### Task Module / Dialog Pattern

```tsx
const useStyles = makeStyles({
  dialogContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
});

export function TeamsTaskModule() {
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

### Conversation / Chat UI Pattern

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

### Stage View / Full-Width Content

```tsx
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
  contentArea: {
    flex: 1,
    padding: tokens.spacingHorizontalXXL,
    overflowY: 'auto',
  },
  sideDrawer: {
    width: '320px',
    borderLeft: `1px solid ${tokens.colorNeutralStroke2}`,
  },
});
```

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

---

## Teams Toolkit + Fluent UI Integration

### Project Setup with Teams Toolkit

```bash
# Install Teams Toolkit CLI
npm install -g @microsoft/teamsapp-cli

# Create new Teams app with React + Fluent UI
teamsapp new --template tab-react-fluent

# Or manually add Fluent to existing Teams project
npm install @fluentui/react-components @fluentui/react-icons
```

### teams-app-manifest.json — UI Configuration

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/teams/v1.16/MicrosoftTeams.schema.json",
  "manifestVersion": "1.16",
  "configurableTabs": [
    {
      "configurationUrl": "https://yourapp.com/config",
      "canUpdateConfiguration": true,
      "scopes": ["team", "groupChat"],
      "context": ["channelTab", "privateChatTab", "meetingChatTab", "meetingSidePanel", "meetingStage"]
    }
  ],
  "staticTabs": [
    {
      "entityId": "personal-tab",
      "name": "My Tab",
      "contentUrl": "https://yourapp.com/tab",
      "scopes": ["personal"]
    }
  ]
}
```

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
3. **Semantic colors** — Use status tokens (`colorStatusSuccess*`, `colorStatusDanger*`) for feedback
4. **Neutral hierarchy** — Use Background1 → Background2 → Background3 for visual depth
5. **Test all three themes** — Light, dark, and high contrast

### Accessibility in Teams

1. **Keyboard navigation** — All interactive elements must be keyboard-accessible
2. **Focus management** — Use `useArrowNavigationGroup` for lists and grids
3. **Screen reader support** — Add `aria-label` to icon-only buttons
4. **High contrast** — Test with `teamsHighContrastTheme`
5. **Touch targets** — Minimum 44×44px for all interactive elements

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
