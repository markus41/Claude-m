# Fluent 2 Theme Creation Examples

## Example 1: Custom Corporate Theme (Blue Brand)

```tsx
import {
  createLightTheme,
  createDarkTheme,
  BrandVariants,
  Theme,
  FluentProvider,
} from '@fluentui/react-components';

// Generate a blue brand ramp
const contosoBrand: BrandVariants = {
  10: '#061724',
  20: '#0B2E4A',
  30: '#0C3E63',
  40: '#0E4F7E',
  50: '#0F6099',
  60: '#1172B4',
  70: '#1484CF',
  80: '#2196E8', // Primary brand color
  90: '#4AA8EC',
  100: '#6DBBF0',
  110: '#8DCDF4',
  120: '#AADDF7',
  130: '#C5EAFA',
  140: '#DCF2FC',
  150: '#EEF8FE',
  160: '#F8FCFF',
};

const contosoLightTheme: Theme = createLightTheme(contosoBrand);
const contosoDarkTheme: Theme = {
  ...createDarkTheme(contosoBrand),
  // In dark mode, brand foreground needs lighter shades for readability
  colorBrandForeground1: contosoBrand[110],
  colorBrandForeground2: contosoBrand[120],
};

// Usage
function App() {
  const [isDark, setIsDark] = useState(false);

  return (
    <FluentProvider theme={isDark ? contosoDarkTheme : contosoLightTheme}>
      <Switch
        label="Dark Mode"
        checked={isDark}
        onChange={(_, data) => setIsDark(data.checked)}
      />
      <Button appearance="primary">Contoso Brand Button</Button>
    </FluentProvider>
  );
}
```

---

## Example 2: Green / Sustainability Theme

```tsx
const ecoBrand: BrandVariants = {
  10: '#021D05',
  20: '#053B10',
  30: '#085A1A',
  40: '#0A7824',
  50: '#0D962E',
  60: '#10B438',
  70: '#17C843',
  80: '#2DD850', // Primary green
  90: '#52E26F',
  100: '#78EB8E',
  110: '#9DF3AC',
  120: '#BEF8C8',
  130: '#D7FBE0',
  140: '#E8FDE9',
  150: '#F4FEF5',
  160: '#FBFFFC',
};

const ecoLightTheme = createLightTheme(ecoBrand);
const ecoDarkTheme = {
  ...createDarkTheme(ecoBrand),
  colorBrandForeground1: ecoBrand[110],
  colorBrandForeground2: ecoBrand[120],
};
```

---

## Example 3: Partial Theme Override

Override specific tokens without creating a full brand ramp:

```tsx
import { webLightTheme, FluentProvider, Theme } from '@fluentui/react-components';

// Merge custom tokens onto existing theme
const customTheme: Theme = {
  ...webLightTheme,
  // Override specific tokens
  borderRadiusMedium: '8px',           // Rounder cards
  borderRadiusLarge: '12px',           // Rounder dialogs
  fontFamilyBase: "'Inter', 'Segoe UI', system-ui, sans-serif", // Custom font
  colorNeutralBackground2: '#F8F9FA',  // Slightly different surface
  spacingHorizontalL: '20px',          // Wider horizontal spacing
};

<FluentProvider theme={customTheme}>
  <App />
</FluentProvider>
```

---

## Example 4: Teams App with Theme Switching

```tsx
import {
  FluentProvider,
  teamsLightTheme,
  teamsDarkTheme,
  teamsHighContrastTheme,
  createLightTheme,
  createDarkTheme,
  BrandVariants,
  Theme,
  Switch,
  RadioGroup,
  Radio,
  Card,
  CardHeader,
  Text,
  Button,
  makeStyles,
  tokens,
} from '@fluentui/react-components';

// Custom Teams-compatible brand (purple)
const teamsBrand: BrandVariants = {
  10: '#0D0E24',
  20: '#1A1C40',
  30: '#262A5C',
  40: '#2F2F6B',
  50: '#393D80',
  60: '#444791',
  70: '#4F52B2',
  80: '#5B5FC7', // Teams primary
  90: '#7579EB',
  100: '#7F83DB',
  110: '#9EA2FF',
  120: '#AAB1F0',
  130: '#B8BFF8',
  140: '#CFD9F9',
  150: '#DEE3FC',
  160: '#EBF0FF',
};

const useStyles = makeStyles({
  container: {
    padding: tokens.spacingHorizontalXXL,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  themeSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
  },
  demoCard: {
    maxWidth: '400px',
  },
});

function ThemeDemo() {
  const styles = useStyles();
  const [themeName, setThemeName] = useState('light');

  const themes: Record<string, Theme> = {
    light: teamsLightTheme,
    dark: teamsDarkTheme,
    contrast: teamsHighContrastTheme,
    'custom-light': createLightTheme(teamsBrand),
    'custom-dark': createDarkTheme(teamsBrand),
  };

  return (
    <FluentProvider theme={themes[themeName]}>
      <div className={styles.container}>
        <div className={styles.themeSelector}>
          <Text weight="semibold">Theme:</Text>
          <RadioGroup
            layout="horizontal"
            value={themeName}
            onChange={(_, data) => setThemeName(data.value)}
          >
            <Radio value="light" label="Light" />
            <Radio value="dark" label="Dark" />
            <Radio value="contrast" label="High Contrast" />
            <Radio value="custom-light" label="Custom Light" />
            <Radio value="custom-dark" label="Custom Dark" />
          </RadioGroup>
        </div>

        <Card className={styles.demoCard}>
          <CardHeader
            header={<Text weight="semibold">Theme Preview</Text>}
            description={<Text size={200}>Current: {themeName}</Text>}
          />
          <p>This card automatically adapts to the selected theme.</p>
          <Button appearance="primary">Primary Action</Button>
        </Card>
      </div>
    </FluentProvider>
  );
}
```

---

## Example 5: Nested Theme Sections

```tsx
import {
  FluentProvider,
  webLightTheme,
  webDarkTheme,
  makeStyles,
  tokens,
  Card,
  Text,
  Button,
} from '@fluentui/react-components';

const useStyles = makeStyles({
  page: {
    padding: tokens.spacingHorizontalXXL,
    backgroundColor: tokens.colorNeutralBackground1,
    minHeight: '100vh',
  },
  sidebar: {
    padding: tokens.spacingHorizontalL,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '1fr 300px',
    gap: tokens.spacingHorizontalXXL,
  },
});

function NestedThemeExample() {
  const styles = useStyles();

  return (
    <FluentProvider theme={webLightTheme}>
      <div className={styles.page}>
        <div className={styles.layout}>
          {/* Main content in light theme */}
          <div>
            <Text as="h1" size={800} weight="semibold">Main Content</Text>
            <Text block>This area uses the light theme.</Text>
            <Button appearance="primary">Light Theme Button</Button>
          </div>

          {/* Sidebar in dark theme */}
          <FluentProvider theme={webDarkTheme}>
            <div className={styles.sidebar}>
              <Text as="h2" size={500} weight="semibold">Sidebar</Text>
              <Text block>This area uses the dark theme.</Text>
              <Button appearance="primary">Dark Theme Button</Button>
            </div>
          </FluentProvider>
        </div>
      </div>
    </FluentProvider>
  );
}
```

---

## Example 6: Theme with Custom Font

```tsx
import { webLightTheme, FluentProvider, Theme } from '@fluentui/react-components';

// Load custom font via CSS
// @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

const interTheme: Theme = {
  ...webLightTheme,
  fontFamilyBase: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontFamilyMonospace: "'JetBrains Mono', 'Cascadia Code', Consolas, monospace",
  // Adjust line heights if needed for the font
  lineHeightBase300: '22px', // Inter may need slightly more line height
};

<FluentProvider theme={interTheme}>
  <App />
</FluentProvider>
```

---

## Brand Ramp Generation Tips

1. **Start with your primary brand color** — This becomes shade `80` (the anchor)
2. **Shades 10-70** are darker (for dark theme backgrounds, pressed states)
3. **Shades 90-160** are lighter (for light theme backgrounds, subtle states)
4. **Use the Fluent 2 Theme Designer** — Microsoft provides a tool to generate ramps
5. **Test contrast ratios** — Ensure text on brand backgrounds meets WCAG 4.5:1
6. **Dark theme adjustments** — Override `colorBrandForeground1/2` to use lighter shades (100-120)
7. **Keep neutral tokens** — Custom themes only need to override brand tokens; neutrals adapt automatically
