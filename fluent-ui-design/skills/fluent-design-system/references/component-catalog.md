# Fluent UI React v9 — Complete Component Catalog

## Installation

```bash
npm install @fluentui/react-components @fluentui/react-icons
```

## Required Setup

```tsx
import { FluentProvider, webLightTheme } from '@fluentui/react-components';

const App = () => (
  <FluentProvider theme={webLightTheme}>
    <YourApp />
  </FluentProvider>
);
```

---

## Button Components

### Button

```tsx
import { Button } from '@fluentui/react-components';

// Appearances
<Button appearance="primary">Primary</Button>     // Filled brand color
<Button appearance="secondary">Secondary</Button> // Default, outlined
<Button appearance="outline">Outline</Button>     // Bordered
<Button appearance="subtle">Subtle</Button>       // Transparent bg, hover visible
<Button appearance="transparent">Transparent</Button>  // No visual chrome

// Sizes
<Button size="small">Small</Button>     // 24px height
<Button size="medium">Medium</Button>   // 32px height (default)
<Button size="large">Large</Button>     // 40px height

// With icon
import { CalendarRegular } from '@fluentui/react-icons';
<Button icon={<CalendarRegular />}>With Icon</Button>
<Button icon={<CalendarRegular />} iconPosition="after">Icon After</Button>
<Button icon={<CalendarRegular />} />  // Icon-only

// States
<Button disabled>Disabled</Button>
<Button disabledFocusable>Disabled but focusable (a11y)</Button>

// Shape
<Button shape="rounded">Rounded</Button>   // Default
<Button shape="circular">Circular</Button> // Pill shape
<Button shape="square">Square</Button>     // No border radius

// As link
<Button as="a" href="/page">Link Button</Button>
```

### CompoundButton

```tsx
import { CompoundButton } from '@fluentui/react-components';

<CompoundButton
  icon={<CalendarRegular />}
  secondaryContent="Secondary text below the label"
>
  Primary Label
</CompoundButton>
```

### SplitButton

```tsx
import { SplitButton, Menu, MenuItem, MenuList, MenuPopover, MenuTrigger } from '@fluentui/react-components';

<Menu positioning="below-end">
  <MenuTrigger disableButtonEnhancement>
    {(triggerProps) => (
      <SplitButton
        menuButton={triggerProps}
        primaryActionButton={{ onClick: handlePrimary }}
        appearance="primary"
      >
        Send
      </SplitButton>
    )}
  </MenuTrigger>
  <MenuPopover>
    <MenuList>
      <MenuItem>Send later</MenuItem>
      <MenuItem>Schedule</MenuItem>
    </MenuList>
  </MenuPopover>
</Menu>
```

### ToggleButton

```tsx
import { ToggleButton } from '@fluentui/react-components';

const [checked, setChecked] = useState(false);
<ToggleButton
  checked={checked}
  onClick={() => setChecked(!checked)}
  icon={checked ? <StarFilled /> : <StarRegular />}
>
  Favorite
</ToggleButton>
```

### MenuButton

```tsx
import { MenuButton, Menu, MenuItem, MenuList, MenuPopover, MenuTrigger } from '@fluentui/react-components';

<Menu>
  <MenuTrigger disableButtonEnhancement>
    <MenuButton>Options</MenuButton>
  </MenuTrigger>
  <MenuPopover>
    <MenuList>
      <MenuItem>Edit</MenuItem>
      <MenuItem>Delete</MenuItem>
    </MenuList>
  </MenuPopover>
</Menu>
```

---

## Input Components

### Input

```tsx
import { Input, Label } from '@fluentui/react-components';
import { SearchRegular, DismissRegular } from '@fluentui/react-icons';

<Label htmlFor="name">Name</Label>
<Input
  id="name"
  appearance="outline"         // outline (default), underline, filled-darker, filled-lighter
  size="medium"                // small, medium, large
  placeholder="Enter name..."
  contentBefore={<SearchRegular />}   // Leading slot
  contentAfter={<DismissRegular />}   // Trailing slot
  onChange={(e, data) => console.log(data.value)}
/>

// Types
<Input type="text" />
<Input type="password" />
<Input type="email" />
<Input type="number" />
<Input type="tel" />
<Input type="url" />
```

### Textarea

```tsx
import { Textarea } from '@fluentui/react-components';

<Textarea
  appearance="outline"
  resize="vertical"      // none, horizontal, vertical, both
  rows={4}
  placeholder="Enter description..."
  onChange={(e, data) => console.log(data.value)}
/>
```

### Select

```tsx
import { Select } from '@fluentui/react-components';

<Select appearance="outline" onChange={(e, data) => console.log(data.value)}>
  <option value="">Select an option</option>
  <option value="a">Option A</option>
  <option value="b">Option B</option>
</Select>
```

### Combobox

```tsx
import { Combobox, Option } from '@fluentui/react-components';

<Combobox
  placeholder="Select or type..."
  onOptionSelect={(e, data) => console.log(data.optionValue)}
  multiselect={false}
  freeform={true}
>
  <Option value="apple">Apple</Option>
  <Option value="banana">Banana</Option>
  <Option value="cherry">Cherry</Option>
</Combobox>
```

### Dropdown

```tsx
import { Dropdown, Option } from '@fluentui/react-components';

<Dropdown
  placeholder="Choose..."
  onOptionSelect={(e, data) => console.log(data.optionValue)}
  multiselect
>
  <Option value="red">Red</Option>
  <Option value="green">Green</Option>
  <Option value="blue">Blue</Option>
</Dropdown>
```

### Checkbox

```tsx
import { Checkbox } from '@fluentui/react-components';

<Checkbox label="Accept terms" />
<Checkbox label="Indeterminate" checked="mixed" />
<Checkbox label="Large" size="large" />
<Checkbox shape="circular" label="Circular" />
```

### RadioGroup

```tsx
import { RadioGroup, Radio } from '@fluentui/react-components';

<RadioGroup layout="horizontal" defaultValue="b">
  <Radio value="a" label="Option A" />
  <Radio value="b" label="Option B" />
  <Radio value="c" label="Option C" />
</RadioGroup>
```

### Switch

```tsx
import { Switch } from '@fluentui/react-components';

<Switch label="Dark mode" labelPosition="before" />
<Switch label="Notifications" checked={on} onChange={(e, data) => setOn(data.checked)} />
```

### Slider

```tsx
import { Slider } from '@fluentui/react-components';

<Slider
  min={0}
  max={100}
  step={5}
  defaultValue={50}
  size="medium"    // small, medium
  onChange={(e, data) => console.log(data.value)}
/>
```

### SpinButton

```tsx
import { SpinButton } from '@fluentui/react-components';

<SpinButton
  min={0}
  max={100}
  step={1}
  defaultValue={50}
  appearance="outline"
  onChange={(e, data) => console.log(data.value)}
/>
```

---

## Layout Components

### Card

```tsx
import { Card, CardHeader, CardPreview, CardFooter, Text, Button, Avatar } from '@fluentui/react-components';

<Card appearance="filled" size="medium" orientation="horizontal">
  <CardHeader
    image={<Avatar name="Jane Doe" size={32} />}
    header={<Text weight="semibold">Jane Doe</Text>}
    description={<Text size={200}>Software Engineer</Text>}
    action={<Button appearance="transparent" icon={<MoreHorizontalRegular />} />}
  />
  <CardPreview>
    <img src="preview.jpg" alt="Card preview" style={{ width: '100%' }} />
  </CardPreview>
  <p>Card body content goes here.</p>
  <CardFooter>
    <Button appearance="primary">Accept</Button>
    <Button appearance="outline">Decline</Button>
  </CardFooter>
</Card>

// Card appearances: filled (default), filled-alternative, outline, subtle
// Card sizes: small, medium (default), large
// Card orientations: vertical (default), horizontal
// Card interactive: <Card onClick={...}> makes it a clickable card
```

### Dialog

```tsx
import {
  Dialog, DialogTrigger, DialogSurface, DialogBody,
  DialogTitle, DialogContent, DialogActions, Button
} from '@fluentui/react-components';

<Dialog modalType="modal">  {/* modal, non-modal, alert */}
  <DialogTrigger disableButtonEnhancement>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogSurface>
    <DialogBody>
      <DialogTitle>Confirm Action</DialogTitle>
      <DialogContent>
        Are you sure you want to proceed?
      </DialogContent>
      <DialogActions>
        <DialogTrigger disableButtonEnhancement>
          <Button appearance="secondary">Cancel</Button>
        </DialogTrigger>
        <Button appearance="primary">Confirm</Button>
      </DialogActions>
    </DialogBody>
  </DialogSurface>
</Dialog>
```

### Drawer

```tsx
import { Drawer, DrawerHeader, DrawerHeaderTitle, DrawerBody, Button } from '@fluentui/react-components';

const [open, setOpen] = useState(false);

<Button onClick={() => setOpen(true)}>Open Drawer</Button>
<Drawer
  type="overlay"          // overlay, inline
  position="start"        // start (left), end (right)
  size="medium"           // small (320px), medium (592px), large (940px), full
  open={open}
  onOpenChange={(_, { open }) => setOpen(open)}
>
  <DrawerHeader>
    <DrawerHeaderTitle
      action={<Button appearance="subtle" icon={<DismissRegular />} onClick={() => setOpen(false)} />}
    >
      Panel Title
    </DrawerHeaderTitle>
  </DrawerHeader>
  <DrawerBody>
    <p>Drawer content here.</p>
  </DrawerBody>
</Drawer>
```

### Accordion

```tsx
import { Accordion, AccordionItem, AccordionHeader, AccordionPanel } from '@fluentui/react-components';

<Accordion collapsible multiple defaultOpenItems={['1']}>
  <AccordionItem value="1">
    <AccordionHeader>Section 1</AccordionHeader>
    <AccordionPanel>Content for section 1</AccordionPanel>
  </AccordionItem>
  <AccordionItem value="2">
    <AccordionHeader>Section 2</AccordionHeader>
    <AccordionPanel>Content for section 2</AccordionPanel>
  </AccordionItem>
</Accordion>
```

### TabList

```tsx
import { TabList, Tab } from '@fluentui/react-components';

<TabList
  appearance="subtle"       // subtle, transparent
  size="medium"             // small, medium, large
  vertical={false}
  selectedValue={selectedTab}
  onTabSelect={(_, data) => setSelectedTab(data.value)}
>
  <Tab value="overview" icon={<HomeRegular />}>Overview</Tab>
  <Tab value="settings" icon={<SettingsRegular />}>Settings</Tab>
  <Tab value="history" icon={<HistoryRegular />}>History</Tab>
</TabList>
```

### Divider

```tsx
import { Divider } from '@fluentui/react-components';

<Divider />                              // Horizontal line
<Divider vertical />                     // Vertical line
<Divider appearance="brand">OR</Divider> // With label + brand color
<Divider appearance="subtle" />          // Subtle appearance
<Divider appearance="strong" />          // Strong appearance
<Divider inset />                        // Inset from edges
```

### Toolbar

```tsx
import { Toolbar, ToolbarButton, ToolbarDivider, ToolbarToggleButton, ToolbarGroup } from '@fluentui/react-components';

<Toolbar size="small">
  <ToolbarButton icon={<TextBoldRegular />} />
  <ToolbarButton icon={<TextItalicRegular />} />
  <ToolbarButton icon={<TextUnderlineRegular />} />
  <ToolbarDivider />
  <ToolbarToggleButton icon={<TextAlignLeftRegular />} name="align" value="left" />
  <ToolbarToggleButton icon={<TextAlignCenterRegular />} name="align" value="center" />
  <ToolbarToggleButton icon={<TextAlignRightRegular />} name="align" value="right" />
</Toolbar>
```

---

## Data Display Components

### Avatar

```tsx
import { Avatar, AvatarGroup, AvatarGroupItem, AvatarGroupPopover } from '@fluentui/react-components';

// Single avatar
<Avatar name="John Doe" size={32} />                    // Initials
<Avatar image={{ src: '/photo.jpg' }} size={48} />       // Image
<Avatar icon={<GuestRegular />} size={24} />             // Icon
<Avatar name="Bot" color="brand" badge={{ status: 'available' }} />

// Sizes: 16, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 96, 120, 128

// Avatar group
<AvatarGroup size={32} layout="spread">
  <AvatarGroupItem name="Jane" />
  <AvatarGroupItem name="John" />
  <AvatarGroupItem name="Bob" />
  <AvatarGroupPopover>
    <AvatarGroupItem name="Alice" />
    <AvatarGroupItem name="Eve" />
  </AvatarGroupPopover>
</AvatarGroup>
```

### Badge

```tsx
import { Badge, CounterBadge, PresenceBadge } from '@fluentui/react-components';

<Badge appearance="filled" color="brand">New</Badge>
<Badge appearance="ghost" color="danger">Error</Badge>
<Badge appearance="outline" color="success">Active</Badge>
<Badge appearance="tint" color="warning">Review</Badge>

// Colors: brand, danger, important, informative, severe, subtle, success, warning

<CounterBadge count={42} appearance="filled" color="brand" />
<CounterBadge count={0} dot />  // Dot indicator when 0

<PresenceBadge status="available" />    // Green
<PresenceBadge status="busy" />          // Red
<PresenceBadge status="do-not-disturb" /> // Red with dash
<PresenceBadge status="away" />          // Yellow
<PresenceBadge status="offline" />       // Grey
<PresenceBadge status="out-of-office" /> // Purple
<PresenceBadge status="unknown" />       // Grey
<PresenceBadge status="blocked" />       // Red with X
```

### Tag

```tsx
import { Tag, TagGroup, InteractionTag, InteractionTagPrimary, InteractionTagSecondary } from '@fluentui/react-components';

<TagGroup onDismiss={(e, { value }) => removeTag(value)}>
  <Tag value="tag1" dismissible appearance="brand">React</Tag>
  <Tag value="tag2" dismissible appearance="outline">TypeScript</Tag>
</TagGroup>

// Interactive tags
<InteractionTag>
  <InteractionTagPrimary hasSecondaryAction>
    Filter: Active
  </InteractionTagPrimary>
  <InteractionTagSecondary />
</InteractionTag>
```

### DataGrid

```tsx
import {
  DataGrid, DataGridHeader, DataGridHeaderCell, DataGridBody,
  DataGridRow, DataGridCell, createTableColumn, TableColumnDefinition
} from '@fluentui/react-components';

type Item = { name: string; status: string; date: string };

const columns: TableColumnDefinition<Item>[] = [
  createTableColumn({
    columnId: 'name',
    compare: (a, b) => a.name.localeCompare(b.name),
    renderHeaderCell: () => 'Name',
    renderCell: (item) => <Text weight="semibold">{item.name}</Text>,
  }),
  createTableColumn({
    columnId: 'status',
    renderHeaderCell: () => 'Status',
    renderCell: (item) => <Badge color={item.status === 'Active' ? 'success' : 'warning'}>{item.status}</Badge>,
  }),
  createTableColumn({
    columnId: 'date',
    compare: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    renderHeaderCell: () => 'Date',
    renderCell: (item) => item.date,
  }),
];

<DataGrid
  items={items}
  columns={columns}
  sortable
  selectionMode="multiselect"
  getRowId={(item) => item.name}
  focusMode="composite"
  style={{ minWidth: '550px' }}
>
  <DataGridHeader>
    <DataGridRow selectionCell={{ checkboxIndicator: { 'aria-label': 'Select all' } }}>
      {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
    </DataGridRow>
  </DataGridHeader>
  <DataGridBody<Item>>
    {({ item, rowId }) => (
      <DataGridRow<Item> key={rowId} selectionCell={{ checkboxIndicator: { 'aria-label': 'Select row' } }}>
        {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
      </DataGridRow>
    )}
  </DataGridBody>
</DataGrid>
```

### Tree

```tsx
import { Tree, TreeItem, TreeItemLayout } from '@fluentui/react-components';

<Tree aria-label="File tree">
  <TreeItem itemType="branch">
    <TreeItemLayout>src</TreeItemLayout>
    <Tree>
      <TreeItem itemType="branch">
        <TreeItemLayout>components</TreeItemLayout>
        <Tree>
          <TreeItem itemType="leaf">
            <TreeItemLayout>Button.tsx</TreeItemLayout>
          </TreeItem>
        </Tree>
      </TreeItem>
      <TreeItem itemType="leaf">
        <TreeItemLayout>index.ts</TreeItemLayout>
      </TreeItem>
    </Tree>
  </TreeItem>
</Tree>
```

### Persona

```tsx
import { Persona } from '@fluentui/react-components';

<Persona
  name="Jane Doe"
  secondaryText="Software Engineer"
  tertiaryText="Available"
  quaternaryText="In a meeting"
  size="huge"          // extra-small, small, medium, large, extra-large, huge
  presence={{ status: 'available' }}
  avatar={{ image: { src: '/photo.jpg' } }}
  textPosition="after" // after, below
/>
```

---

## Feedback Components

### Toast

```tsx
import { useToastController, Toaster, Toast, ToastTitle, ToastBody, ToastFooter, Link, useId } from '@fluentui/react-components';

const toasterId = useId('toaster');
const { dispatchToast } = useToastController(toasterId);

const notify = () =>
  dispatchToast(
    <Toast>
      <ToastTitle action={<Link>Undo</Link>}>File saved</ToastTitle>
      <ToastBody>Your changes have been saved successfully.</ToastBody>
      <ToastFooter>
        <Link>View file</Link>
      </ToastFooter>
    </Toast>,
    { intent: 'success', position: 'bottom-end', timeout: 5000 }
  );

// intents: success, warning, error, info
// positions: top, top-start, top-end, bottom, bottom-start, bottom-end

<Toaster toasterId={toasterId} />
<Button onClick={notify}>Show Toast</Button>
```

### MessageBar

```tsx
import { MessageBar, MessageBarTitle, MessageBarBody, MessageBarActions, Button, Link } from '@fluentui/react-components';

<MessageBar intent="success" layout="multiline">
  <MessageBarBody>
    <MessageBarTitle>Success</MessageBarTitle>
    Your settings have been saved successfully.
  </MessageBarBody>
  <MessageBarActions containerAction={<Button appearance="transparent" icon={<DismissRegular />} />}>
    <Button>Undo</Button>
  </MessageBarActions>
</MessageBar>

// intents: info, success, warning, error
// layouts: singleline (default), multiline
```

### Spinner & ProgressBar

```tsx
import { Spinner, ProgressBar, Field } from '@fluentui/react-components';

<Spinner size="medium" label="Loading..." />
// sizes: extra-tiny, tiny, extra-small, small, medium, large, extra-large, huge

<Field validationMessage="Uploading..." validationState="none">
  <ProgressBar value={0.6} thickness="large" />     // Determinate
</Field>
<ProgressBar thickness="medium" />                    // Indeterminate (no value)
```

### Skeleton

```tsx
import { Skeleton, SkeletonItem } from '@fluentui/react-components';

<Skeleton>
  <SkeletonItem shape="circle" size={48} />                   // Avatar placeholder
  <SkeletonItem shape="rectangle" style={{ width: '200px' }} /> // Text line
  <SkeletonItem shape="rectangle" style={{ width: '150px' }} /> // Shorter text
  <SkeletonItem shape="square" size={100} />                    // Image placeholder
</Skeleton>
```

---

## Navigation Components

### Menu

```tsx
import {
  Menu, MenuTrigger, MenuPopover, MenuList, MenuItem,
  MenuGroup, MenuGroupHeader, MenuDivider,
  MenuItemCheckbox, MenuItemRadio
} from '@fluentui/react-components';

<Menu>
  <MenuTrigger disableButtonEnhancement>
    <Button>Actions</Button>
  </MenuTrigger>
  <MenuPopover>
    <MenuList>
      <MenuGroup>
        <MenuGroupHeader>Edit</MenuGroupHeader>
        <MenuItem icon={<CutRegular />} secondaryContent="Ctrl+X">Cut</MenuItem>
        <MenuItem icon={<CopyRegular />} secondaryContent="Ctrl+C">Copy</MenuItem>
        <MenuItem icon={<ClipboardPasteRegular />} secondaryContent="Ctrl+V">Paste</MenuItem>
      </MenuGroup>
      <MenuDivider />
      <MenuGroup>
        <MenuGroupHeader>View</MenuGroupHeader>
        <MenuItemCheckbox name="options" value="preview">Preview</MenuItemCheckbox>
        <MenuItemCheckbox name="options" value="sidebar">Sidebar</MenuItemCheckbox>
      </MenuGroup>
      <MenuDivider />
      <MenuItem icon={<DeleteRegular />} disabled>Delete</MenuItem>
    </MenuList>
  </MenuPopover>
</Menu>
```

### Breadcrumb

```tsx
import { Breadcrumb, BreadcrumbItem, BreadcrumbButton, BreadcrumbDivider } from '@fluentui/react-components';

<Breadcrumb size="medium">
  <BreadcrumbItem>
    <BreadcrumbButton onClick={() => navigate('/')}>Home</BreadcrumbButton>
  </BreadcrumbItem>
  <BreadcrumbDivider />
  <BreadcrumbItem>
    <BreadcrumbButton onClick={() => navigate('/products')}>Products</BreadcrumbButton>
  </BreadcrumbItem>
  <BreadcrumbDivider />
  <BreadcrumbItem>
    <BreadcrumbButton current>Widget Pro</BreadcrumbButton>
  </BreadcrumbItem>
</Breadcrumb>
```

---

## Overlay Components

### Popover

```tsx
import { Popover, PopoverTrigger, PopoverSurface } from '@fluentui/react-components';

<Popover withArrow positioning="above">
  <PopoverTrigger disableButtonEnhancement>
    <Button>Show Info</Button>
  </PopoverTrigger>
  <PopoverSurface>
    <h3>Popover Title</h3>
    <p>Popover content with interactive elements.</p>
    <Button>Action</Button>
  </PopoverSurface>
</Popover>

// positioning: above, below, before, after, above-start, above-end, etc.
```

### Tooltip

```tsx
import { Tooltip, Button } from '@fluentui/react-components';

<Tooltip content="Save changes" relationship="label">
  <Button icon={<SaveRegular />} />
</Tooltip>

<Tooltip content="This action cannot be undone" relationship="description" positioning="below">
  <Button>Delete</Button>
</Tooltip>

// relationship: label (replaces accessible name), description (adds description)
```

### TeachingPopover

```tsx
import {
  TeachingPopover, TeachingPopoverTrigger, TeachingPopoverSurface,
  TeachingPopoverHeader, TeachingPopoverBody, TeachingPopoverTitle,
  TeachingPopoverFooter, TeachingPopoverCarousel, TeachingPopoverCarouselCard
} from '@fluentui/react-components';

<TeachingPopover>
  <TeachingPopoverTrigger>
    <Button>Learn More</Button>
  </TeachingPopoverTrigger>
  <TeachingPopoverSurface>
    <TeachingPopoverHeader>Tip</TeachingPopoverHeader>
    <TeachingPopoverBody>
      <TeachingPopoverTitle>Did you know?</TeachingPopoverTitle>
      <p>You can use keyboard shortcuts to navigate faster.</p>
    </TeachingPopoverBody>
    <TeachingPopoverFooter primary={<Button>Got it</Button>} />
  </TeachingPopoverSurface>
</TeachingPopover>
```

---

## Utility Components

### Text

```tsx
import { Text } from '@fluentui/react-components';

<Text size={100}>Size 100 (10px)</Text>
<Text size={200}>Size 200 (12px)</Text>
<Text size={300}>Size 300 (14px — default body)</Text>
<Text size={400}>Size 400 (16px)</Text>
<Text size={500}>Size 500 (20px)</Text>
<Text size={600}>Size 600 (24px)</Text>
<Text size={700}>Size 700 (28px)</Text>
<Text size={800}>Size 800 (32px)</Text>
<Text size={900}>Size 900 (40px)</Text>
<Text size={1000}>Size 1000 (68px)</Text>

<Text weight="regular">Regular</Text>
<Text weight="medium">Medium</Text>
<Text weight="semibold">Semibold</Text>
<Text weight="bold">Bold</Text>

<Text font="base">Base font</Text>
<Text font="monospace">Monospace font</Text>
<Text font="numeric">Numeric font</Text>

<Text italic>Italic</Text>
<Text underline>Underline</Text>
<Text strikethrough>Strikethrough</Text>
<Text truncate wrap={false}>This text will be truncated with ellipsis...</Text>

<Text as="h1" size={800} weight="semibold">Page Title</Text>
<Text as="p" block>Block-level paragraph text</Text>
```

### Label & InfoLabel

```tsx
import { Label, InfoLabel } from '@fluentui/react-components';

<Label htmlFor="input" required size="medium" weight="semibold">
  Required Field
</Label>

<InfoLabel
  info="This field accepts alphanumeric characters only."
  htmlFor="code-input"
  required
>
  Access Code
</InfoLabel>
```

### Field

```tsx
import { Field, Input, Textarea } from '@fluentui/react-components';

<Field
  label="Email Address"
  validationState="error"             // none, success, warning, error
  validationMessage="Invalid email"
  validationMessageIcon={<ErrorCircleRegular />}
  hint="We'll never share your email"
  required
  size="medium"
>
  <Input type="email" />
</Field>
```

### Image

```tsx
import { Image } from '@fluentui/react-components';

<Image
  src="/photo.jpg"
  alt="Description"
  fit="cover"          // none, center, contain, cover, default
  shape="rounded"      // rounded, circular, square
  bordered
  shadow
  block               // Full width
  style={{ width: '300px', height: '200px' }}
/>
```

### Portal

```tsx
import { Portal } from '@fluentui/react-components';

// Renders children in document.body (outside React tree)
<Portal>
  <div className={overlayStyles}>
    Overlay rendered at document body level
  </div>
</Portal>

// Custom mount point
<Portal mountNode={customRef}>
  <div>Rendered in custom container</div>
</Portal>
```

---

## Form Patterns

### Complete Form Example

```tsx
import {
  makeStyles, tokens, Field, Input, Textarea, Select, Checkbox,
  RadioGroup, Radio, Switch, Button, Divider, Text
} from '@fluentui/react-components';

const useStyles = makeStyles({
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    maxWidth: '600px',
  },
  row: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalL,
  },
});

const ContactForm = () => {
  const styles = useStyles();
  return (
    <form className={styles.form}>
      <Text as="h2" size={600} weight="semibold">Contact Information</Text>
      <div className={styles.row}>
        <Field label="First Name" required style={{ flex: 1 }}>
          <Input />
        </Field>
        <Field label="Last Name" required style={{ flex: 1 }}>
          <Input />
        </Field>
      </div>
      <Field label="Email" required>
        <Input type="email" />
      </Field>
      <Field label="Message">
        <Textarea resize="vertical" rows={4} />
      </Field>
      <Field label="Priority">
        <RadioGroup layout="horizontal">
          <Radio value="low" label="Low" />
          <Radio value="medium" label="Medium" />
          <Radio value="high" label="High" />
        </RadioGroup>
      </Field>
      <Checkbox label="Subscribe to newsletter" />
      <Divider />
      <div className={styles.actions}>
        <Button appearance="secondary">Cancel</Button>
        <Button appearance="primary" type="submit">Submit</Button>
      </div>
    </form>
  );
};
```
