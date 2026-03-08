# Fluent 2 Layout Pattern Examples

## Example 1: Dashboard Layout

```tsx
import {
  makeStyles, tokens, Card, CardHeader, Text, Button,
  Badge, Avatar, Divider, TabList, Tab, ProgressBar
} from '@fluentui/react-components';

const useStyles = makeStyles({
  page: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: tokens.colorNeutralBackground2,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalXXL}`,
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  content: {
    flex: 1,
    padding: tokens.spacingHorizontalXXL,
    maxWidth: '1400px',
    marginLeft: 'auto',
    marginRight: 'auto',
    width: '100%',
    boxSizing: 'border-box',
  },
  metricsRow: {
    display: 'grid',
    gap: tokens.spacingHorizontalL,
    gridTemplateColumns: '1fr',
    '@media (min-width: 640px)': {
      gridTemplateColumns: 'repeat(2, 1fr)',
    },
    '@media (min-width: 1024px)': {
      gridTemplateColumns: 'repeat(4, 1fr)',
    },
  },
  metricCard: {
    padding: tokens.spacingHorizontalL,
  },
  metricValue: {
    fontSize: tokens.fontSizeHero700,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    lineHeight: tokens.lineHeightHero700,
  },
  metricLabel: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  mainGrid: {
    display: 'grid',
    gap: tokens.spacingHorizontalL,
    gridTemplateColumns: '1fr',
    marginTop: tokens.spacingVerticalL,
    '@media (min-width: 1024px)': {
      gridTemplateColumns: '2fr 1fr',
    },
  },
});

function Dashboard() {
  const styles = useStyles();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Text size={500} weight="semibold">Dashboard</Text>
        <Button appearance="primary">New Report</Button>
      </div>
      <div className={styles.content}>
        {/* Metric Cards */}
        <div className={styles.metricsRow}>
          <Card className={styles.metricCard}>
            <div className={styles.metricValue}>1,234</div>
            <div className={styles.metricLabel}>Active Users</div>
            <ProgressBar value={0.78} thickness="large" color="brand" />
          </Card>
          <Card className={styles.metricCard}>
            <div className={styles.metricValue}>567</div>
            <div className={styles.metricLabel}>New Signups</div>
            <ProgressBar value={0.56} thickness="large" color="success" />
          </Card>
          <Card className={styles.metricCard}>
            <div className={styles.metricValue}>89%</div>
            <div className={styles.metricLabel}>Satisfaction</div>
            <ProgressBar value={0.89} thickness="large" color="brand" />
          </Card>
          <Card className={styles.metricCard}>
            <div className={styles.metricValue}>$45K</div>
            <div className={styles.metricLabel}>Revenue</div>
            <ProgressBar value={0.65} thickness="large" color="warning" />
          </Card>
        </div>

        {/* Main content grid */}
        <div className={styles.mainGrid}>
          <Card>
            <CardHeader header={<Text weight="semibold">Recent Activity</Text>} />
            {/* Activity list */}
          </Card>
          <Card>
            <CardHeader header={<Text weight="semibold">Quick Actions</Text>} />
            {/* Action buttons */}
          </Card>
        </div>
      </div>
    </div>
  );
}
```

---

## Example 2: Master-Detail Layout

```tsx
const useStyles = makeStyles({
  container: {
    display: 'flex',
    height: '100vh',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  sidebar: {
    width: '320px',
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground2,
    // Mobile: full width
    '@media (max-width: 767px)': {
      width: '100%',
    },
  },
  sidebarHeader: {
    padding: tokens.spacingHorizontalL,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchBox: {
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
  },
  listContainer: {
    flex: 1,
    overflowY: 'auto',
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    cursor: 'pointer',
    ':hover': {
      backgroundColor: tokens.colorSubtleBackgroundHover,
    },
  },
  listItemSelected: {
    backgroundColor: tokens.colorSubtleBackgroundSelected,
    borderLeft: `3px solid ${tokens.colorBrandStroke1}`,
  },
  detail: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    // Mobile: hidden unless item selected
    '@media (max-width: 767px)': {
      display: 'none',
    },
  },
  detailHeader: {
    padding: tokens.spacingHorizontalXXL,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  detailContent: {
    flex: 1,
    padding: tokens.spacingHorizontalXXL,
    overflowY: 'auto',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: tokens.spacingVerticalM,
    color: tokens.colorNeutralForeground3,
  },
});
```

---

## Example 3: Form Layout with Sections

```tsx
const useStyles = makeStyles({
  form: {
    maxWidth: '720px',
    margin: '0 auto',
    padding: tokens.spacingHorizontalXXL,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    marginBottom: tokens.spacingVerticalXXL,
  },
  sectionTitle: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    marginBottom: tokens.spacingVerticalS,
  },
  sectionDescription: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground3,
    marginBottom: tokens.spacingVerticalM,
  },
  fieldRow: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    '@media (max-width: 639px)': {
      flexDirection: 'column',
    },
  },
  fieldRowItem: {
    flex: 1,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalXXL,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    marginTop: tokens.spacingVerticalXXL,
  },
});

function SettingsForm() {
  const styles = useStyles();

  return (
    <div className={styles.form}>
      <div className={styles.section}>
        <Text className={styles.sectionTitle}>Profile Information</Text>
        <Text className={styles.sectionDescription}>
          Update your personal details and preferences.
        </Text>
        <div className={styles.fieldRow}>
          <Field label="First Name" className={styles.fieldRowItem} required>
            <Input />
          </Field>
          <Field label="Last Name" className={styles.fieldRowItem} required>
            <Input />
          </Field>
        </div>
        <Field label="Email" required>
          <Input type="email" />
        </Field>
        <Field label="Bio">
          <Textarea resize="vertical" rows={3} />
        </Field>
      </div>

      <Divider />

      <div className={styles.section}>
        <Text className={styles.sectionTitle}>Notifications</Text>
        <Text className={styles.sectionDescription}>
          Choose how you want to be notified.
        </Text>
        <Switch label="Email notifications" defaultChecked />
        <Switch label="Push notifications" />
        <Switch label="Weekly digest" defaultChecked />
      </div>

      <div className={styles.actions}>
        <Button appearance="secondary">Cancel</Button>
        <Button appearance="primary">Save Changes</Button>
      </div>
    </div>
  );
}
```

---

## Example 4: Responsive Navigation with Drawer

```tsx
const useStyles = makeStyles({
  app: {
    display: 'flex',
    height: '100vh',
  },
  desktopNav: {
    width: '280px',
    display: 'none',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground3,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    '@media (min-width: 1024px)': {
      display: 'flex',
    },
  },
  navHeader: {
    padding: tokens.spacingHorizontalL,
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  navItems: {
    flex: 1,
    padding: tokens.spacingVerticalS,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusMedium,
    cursor: 'pointer',
    color: tokens.colorNeutralForeground2,
    ':hover': {
      backgroundColor: tokens.colorSubtleBackgroundHover,
      color: tokens.colorNeutralForeground1,
    },
  },
  navItemActive: {
    backgroundColor: tokens.colorSubtleBackgroundSelected,
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    gap: tokens.spacingHorizontalM,
  },
  mobileMenuButton: {
    '@media (min-width: 1024px)': {
      display: 'none',
    },
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  pageContent: {
    flex: 1,
    overflowY: 'auto',
    padding: tokens.spacingHorizontalXXL,
  },
});
```

---

## Example 5: Card-Based Content Grid

```tsx
const useStyles = makeStyles({
  container: {
    padding: tokens.spacingHorizontalXXL,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacingVerticalL,
  },
  filters: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    flexWrap: 'wrap',
    marginBottom: tokens.spacingVerticalL,
  },
  grid: {
    display: 'grid',
    gap: tokens.spacingHorizontalL,
    gridTemplateColumns: '1fr',

    '@media (min-width: 480px)': {
      gridTemplateColumns: 'repeat(2, 1fr)',
    },
    '@media (min-width: 768px)': {
      gridTemplateColumns: 'repeat(3, 1fr)',
    },
    '@media (min-width: 1200px)': {
      gridTemplateColumns: 'repeat(4, 1fr)',
    },
  },
  card: {
    cursor: 'pointer',
    transition: `box-shadow ${tokens.durationNormal} ${tokens.curveEasyEase}`,
    ':hover': {
      boxShadow: tokens.shadow8,
    },
  },
  cardImage: {
    height: '180px',
    objectFit: 'cover',
    width: '100%',
    borderRadius: `${tokens.borderRadiusMedium} ${tokens.borderRadiusMedium} 0 0`,
  },
  cardBody: {
    padding: tokens.spacingHorizontalM,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  cardMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

function ContentGrid() {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Text size={600} weight="semibold">Templates</Text>
        <Button appearance="primary">Create New</Button>
      </div>

      <div className={styles.filters}>
        <ToggleButton appearance="subtle" checked>All</ToggleButton>
        <ToggleButton appearance="subtle">Documents</ToggleButton>
        <ToggleButton appearance="subtle">Presentations</ToggleButton>
        <ToggleButton appearance="subtle">Spreadsheets</ToggleButton>
      </div>

      <div className={styles.grid}>
        {templates.map((template) => (
          <Card key={template.id} className={styles.card} onClick={() => select(template)}>
            <CardPreview>
              <img className={styles.cardImage} src={template.thumbnail} alt={template.name} />
            </CardPreview>
            <div className={styles.cardBody}>
              <Text weight="semibold">{template.name}</Text>
              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                {template.description}
              </Text>
              <div className={styles.cardMeta}>
                <Badge appearance="tint" color="informative">{template.category}</Badge>
                <Text size={100}>{template.lastUsed}</Text>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

---

## Spacing Quick Reference for Layouts

| Layout Element | Recommended Token | Value |
|---|---|---|
| Page margin (mobile) | `spacingHorizontalL` | 16px |
| Page margin (desktop) | `spacingHorizontalXXL` | 24px |
| Card padding | `spacingHorizontalL` | 16px |
| Section gap | `spacingVerticalXXL` | 24px |
| Card grid gap | `spacingHorizontalL` | 16px |
| Form field gap | `spacingVerticalM` | 12px |
| Button row gap | `spacingHorizontalS` | 8px |
| Icon-to-text gap | `spacingHorizontalS` | 8px |
| List item padding | `spacingVerticalS` + `spacingHorizontalM` | 8px 12px |
| Dialog content gap | `spacingVerticalM` | 12px |
| Toolbar item gap | `spacingHorizontalXS` | 4px |
