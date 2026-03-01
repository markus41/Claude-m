# PCF Control Development

## Overview

PowerApps Component Framework (PCF) enables developers to build custom UI controls for model-driven apps, canvas apps, and Power Pages. PCF controls are built with TypeScript, can use any JavaScript framework (React, Angular, Vue), and package into solutions for ALM transport.

## Control Types

| Type | Binding | Use Case |
|------|---------|----------|
| **Field** | Single column value | Custom input (rating, color picker, rich text, slider) |
| **Dataset** | View/collection of records | Custom grid, gallery, chart, kanban board |
| **React** | Field or Dataset | Complex UI using React virtual DOM + Fluent UI |

## Scaffolding

### Field Control

```bash
pac pcf init --namespace Contoso --name StarRating --template field
cd StarRating
npm install
```

### Dataset Control

```bash
pac pcf init --namespace Contoso --name CardGallery --template dataset
cd CardGallery
npm install
```

### React Field Control

```bash
pac pcf init --namespace Contoso --name RichTextEditor --template field --framework react
cd RichTextEditor
npm install
npm install @fluentui/react-components
```

## Project Structure

After scaffolding, the project contains:

```
MyControl/
├── ControlManifest.Input.xml     # Manifest: properties, resources, feature-usage
├── index.ts                       # Main component (standard) or entry point (React)
├── HelloWorld.tsx                  # React component (only with --framework react)
├── css/
│   └── MyControl.css              # Stylesheets
├── generated/
│   └── ManifestTypes.d.ts         # Auto-generated TypeScript type definitions
├── node_modules/                   # Dependencies
├── package.json                    # NPM package config
├── tsconfig.json                   # TypeScript configuration
├── .eslintrc.json                  # Linting rules
└── pcfconfig.json                  # PCF build configuration
```

## Manifest (ControlManifest.Input.xml)

The manifest defines the control's interface — its properties, resources, and platform feature requirements.

### Basic Structure

```xml
<?xml version="1.0" encoding="utf-8" ?>
<manifest>
  <control
    namespace="Contoso"
    constructor="StarRating"
    version="1.0.0"
    display-name-key="StarRating"
    description-key="A star rating input control"
    control-type="standard"
    >
    <!-- api-version determines platform capabilities available -->
    <external-service-usage enabled="false">
    </external-service-usage>

    <!-- Properties -->
    <property
      name="ratingValue"
      display-name-key="Rating Value"
      description-key="The current rating value"
      of-type="Whole.None"
      usage="bound"
      required="true"
    />
    <property
      name="maxStars"
      display-name-key="Maximum Stars"
      description-key="Maximum number of stars to display"
      of-type="Whole.None"
      usage="input"
      required="false"
      default-value="5"
    />
    <property
      name="starColor"
      display-name-key="Star Color"
      description-key="Color of filled stars"
      of-type="SingleLine.Text"
      usage="input"
      required="false"
      default-value="#FFD700"
    />

    <!-- Resources -->
    <resources>
      <code path="index.ts" order="1" />
      <css path="css/StarRating.css" order="1" />
      <resx path="strings/StarRating.1033.resx" version="1.0.0" />
    </resources>

    <!-- Feature usage -->
    <feature-usage>
      <uses-feature name="utility" required="true" />
      <uses-feature name="WebAPI" required="false" />
    </feature-usage>
  </control>
</manifest>
```

### Property Types

| `of-type` Value | Description | TypeScript Type |
|-----------------|-------------|----------------|
| `SingleLine.Text` | Single-line text | `string` |
| `Multiple` | Multi-line text | `string` |
| `Whole.None` | Integer | `number` |
| `Decimal` | Decimal number | `number` |
| `FP` | Floating point | `number` |
| `Currency` | Currency value | `number` |
| `DateAndTime.DateOnly` | Date only | `Date` |
| `DateAndTime.DateAndTime` | Date and time | `Date` |
| `TwoOptions` | Boolean | `boolean` |
| `OptionSet` | Choice/option set | `number` |
| `MultiSelectOptionSet` | Multi-select choices | `number[]` |
| `Lookup.Simple` | Lookup reference | `LookupValue[]` |
| `Enum` | Enumeration | `number` |

### Property Usage

| `usage` Value | Description |
|--------------|-------------|
| `bound` | Two-way binding — control reads and writes the value back to the platform |
| `input` | One-way — configuration property set by the maker, read-only at runtime |

### Dataset Manifest

For dataset controls, use `<data-set>` instead of `<property>`:

```xml
<control namespace="Contoso" constructor="CardGallery" version="1.0.0"
         display-name-key="CardGallery" description-key="Card gallery view"
         control-type="standard">

  <data-set name="records" display-name-key="Records" cds-data-set-options="displayCommandBar:true;displayViewSelector:true;displayQuickFind:true">
    <property-set name="title" display-name-key="Title" description-key="Title column" of-type="SingleLine.Text" usage="bound" required="true" />
    <property-set name="description" display-name-key="Description" description-key="Description column" of-type="Multiple" usage="bound" required="false" />
    <property-set name="image" display-name-key="Image" description-key="Image column" of-type="SingleLine.URL" usage="bound" required="false" />
  </data-set>

  <resources>
    <code path="index.ts" order="1" />
    <css path="css/CardGallery.css" order="1" />
  </resources>
</control>
```

### Feature Usage

| Feature | Description |
|---------|-------------|
| `utility` | Access to `context.utils` — formatting, resource strings, lookup dialogs |
| `WebAPI` | Access to `context.webAPI` — CRUD operations on Dataverse records |
| `Device.captureAudio` | Audio capture |
| `Device.captureImage` | Camera/image capture |
| `Device.captureVideo` | Video capture |
| `Device.getBarcodeValue` | Barcode scanner |
| `Device.getCurrentPosition` | Geolocation |
| `Device.pickFile` | File picker |

## Lifecycle Methods

### Standard Control (index.ts)

```typescript
import { IInputs, IOutputs } from "./generated/ManifestTypes";

export class MyControl implements ComponentFramework.StandardControl<IInputs, IOutputs> {
  private container: HTMLDivElement;
  private notifyOutputChanged: () => void;
  private currentValue: number;

  /**
   * Called once when the control is initialized.
   * Set up DOM, attach event listeners, initialize state.
   */
  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {
    this.container = container;
    this.notifyOutputChanged = notifyOutputChanged;
    this.currentValue = context.parameters.ratingValue.raw ?? 0;

    // Build initial DOM
    this.renderControl(context);
  }

  /**
   * Called whenever the platform detects a change in inputs.
   * Re-render the control to reflect new data.
   */
  public updateView(context: ComponentFramework.Context<IInputs>): void {
    this.currentValue = context.parameters.ratingValue.raw ?? 0;
    this.renderControl(context);
  }

  /**
   * Called by the platform to retrieve changed output values.
   * Return only the properties that have changed.
   */
  public getOutputs(): IOutputs {
    return {
      ratingValue: this.currentValue,
    };
  }

  /**
   * Called when the control is removed from the DOM.
   * Clean up event listeners, timers, subscriptions.
   */
  public destroy(): void {
    // Remove event listeners, clear intervals, etc.
  }

  private renderControl(context: ComponentFramework.Context<IInputs>): void {
    // Render logic here
    this.container.innerHTML = "";
    // ... build DOM elements
  }
}
```

### React Control (index.ts + Component.tsx)

**index.ts (entry point):**

```typescript
import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { HelloWorld, IHelloWorldProps } from "./HelloWorld";
import * as React from "react";

export class MyReactControl implements ComponentFramework.ReactControl<IInputs, IOutputs> {
  private notifyOutputChanged: () => void;
  private currentValue: string;

  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    state: ComponentFramework.Dictionary
  ): void {
    this.notifyOutputChanged = notifyOutputChanged;
  }

  public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
    const props: IHelloWorldProps = {
      value: context.parameters.sampleProperty.raw ?? "",
      onChange: this.onValueChanged.bind(this),
    };
    return React.createElement(HelloWorld, props);
  }

  private onValueChanged(newValue: string): void {
    this.currentValue = newValue;
    this.notifyOutputChanged();
  }

  public getOutputs(): IOutputs {
    return {
      sampleProperty: this.currentValue,
    };
  }

  public destroy(): void {}
}
```

**HelloWorld.tsx (React component):**

```tsx
import * as React from "react";
import {
  FluentProvider,
  webLightTheme,
  Input,
  Label,
  makeStyles,
} from "@fluentui/react-components";

export interface IHelloWorldProps {
  value: string;
  onChange: (newValue: string) => void;
}

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "8px",
  },
});

export const HelloWorld: React.FC<IHelloWorldProps> = ({ value, onChange }) => {
  const styles = useStyles();

  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange(event.target.value);
    },
    [onChange]
  );

  return (
    <FluentProvider theme={webLightTheme}>
      <div className={styles.root}>
        <Label htmlFor="myInput">Value:</Label>
        <Input id="myInput" value={value} onChange={handleChange} />
      </div>
    </FluentProvider>
  );
};
```

## Dataset Controls — IDataSet Interface

Dataset controls receive a `DataSet` object with records, columns, sorting, and filtering:

```typescript
public updateView(context: ComponentFramework.Context<IInputs>): void {
  const dataset = context.parameters.records;

  // Check if data is available
  if (dataset.loading) {
    this.showLoadingSpinner();
    return;
  }

  // Get column metadata
  const columns = dataset.columns.filter((col) => col.order >= 0);
  columns.sort((a, b) => a.order - b.order);

  // Get sorted record IDs
  const sortedRecordIds = dataset.sortedRecordIds;

  // Iterate records
  for (const recordId of sortedRecordIds) {
    const record = dataset.records[recordId];

    // Get formatted value (display string)
    const titleFormatted = record.getFormattedValue("title");

    // Get raw value (typed)
    const titleRaw = record.getValue("title") as string;

    // Get record reference (for navigation)
    const entityRef = record.getNamedReference();
  }

  // Pagination
  const paging = dataset.paging;
  const totalCount = paging.totalResultCount;
  const hasNextPage = paging.hasNextPage;
  const hasPreviousPage = paging.hasPreviousPage;
  const pageSize = paging.pageSize;

  // Navigate pages
  if (hasNextPage) {
    paging.loadNextPage();
  }
  if (hasPreviousPage) {
    paging.loadPreviousPage();
  }

  // Set page size
  paging.setPageSize(25);

  // Sorting
  const currentSorting = dataset.sorting;
  dataset.refresh(); // Reload after sort/filter changes

  // Filtering
  const filtering = dataset.filtering;
  filtering.clearFilter();
  filtering.setFilter({
    conditions: [
      {
        attributeName: "statuscode",
        conditionOperator: 0, // Equal
        value: "1",
      },
    ],
  });
  dataset.refresh();

  // Open a record
  const recordToOpen = dataset.records[sortedRecordIds[0]];
  if (recordToOpen) {
    const ref = recordToOpen.getNamedReference();
    context.navigation.openForm({
      entityName: ref.etn!,
      entityId: ref.id.guid,
    });
  }
}
```

## Build, Test, and Deploy

### Build

```bash
# Compile TypeScript and bundle
npm run build

# Build in production mode
npm run build -- --mode production
```

### Test in Browser Harness

```bash
# Start the test harness — opens browser with mock data
npm start

# Start on a specific port
npm start -- --port 8181
```

The test harness provides:
- Mock data for properties
- Property panel to change input values
- Container resizing
- Dark/light theme toggle

### Push to Development Environment

```bash
# Push directly to connected dev environment (bypasses solution packaging)
pac pcf push --publisher-prefix cr
```

This creates a temporary unmanaged solution in the dev environment. Useful for quick iteration but not for formal deployment.

### Package in a Solution

For ALM transport, PCF controls must be packaged in a Dataverse solution:

```bash
# 1. Create a solution project (one-time setup)
mkdir MySolutionProject && cd MySolutionProject
pac solution init --publisher-name Contoso --publisher-prefix cr

# 2. Add PCF control reference
pac solution add-reference --path ../StarRating

# 3. Build the solution zip (requires .NET SDK / MSBuild)
dotnet build

# The output is in bin/Debug/MySolutionProject.zip
```

The built solution zip can then be imported using `pac solution import` or through CI/CD pipelines.

### Solution Project Structure

```
MySolutionProject/
├── src/
│   └── Other/
│       ├── Customizations.xml
│       ├── Solution.xml
│       └── Relationships.xml
├── cdsproj                        # MSBuild project file for Dataverse solution
├── MySolutionProject.cdsproj
└── pcfproj references             # Added by pac solution add-reference
```

## Common Patterns

### Loading Spinner

```typescript
private showLoading(container: HTMLDivElement): void {
  const spinner = document.createElement("div");
  spinner.className = "pcf-loading-spinner";
  spinner.innerHTML = `
    <div class="spinner">
      <div class="bounce1"></div>
      <div class="bounce2"></div>
      <div class="bounce3"></div>
    </div>
  `;
  container.appendChild(spinner);
}
```

### Error State

```typescript
private showError(container: HTMLDivElement, message: string): void {
  const errorDiv = document.createElement("div");
  errorDiv.className = "pcf-error-state";
  errorDiv.setAttribute("role", "alert");
  errorDiv.textContent = message;
  container.appendChild(errorDiv);
}
```

### Responsive Layout

```typescript
public updateView(context: ComponentFramework.Context<IInputs>): void {
  const width = context.mode.allocatedWidth;
  const height = context.mode.allocatedHeight;

  if (width < 480) {
    this.container.classList.add("compact");
    this.container.classList.remove("wide");
  } else {
    this.container.classList.add("wide");
    this.container.classList.remove("compact");
  }
}
```

### Theming (Fluent UI v9)

```tsx
import {
  FluentProvider,
  webLightTheme,
  webDarkTheme,
  Theme,
} from "@fluentui/react-components";

const MyComponent: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  const theme: Theme = isDarkMode ? webDarkTheme : webLightTheme;

  return (
    <FluentProvider theme={theme}>
      {/* Component content */}
    </FluentProvider>
  );
};
```

### Localization

Add resource strings in `.resx` files:

```xml
<!-- strings/StarRating.1033.resx (English) -->
<root>
  <data name="StarRating_Display_Key" xml:space="preserve">
    <value>Star Rating</value>
  </data>
  <data name="StarRating_Desc_Key" xml:space="preserve">
    <value>A star rating input control</value>
  </data>
  <data name="Rating_Label" xml:space="preserve">
    <value>Rating</value>
  </data>
</root>
```

Access in code:

```typescript
const label = context.resources.getString("Rating_Label");
```

### WebAPI Access

```typescript
// Requires <uses-feature name="WebAPI" required="true" /> in manifest
public async fetchRecords(
  context: ComponentFramework.Context<IInputs>
): Promise<void> {
  const result = await context.webAPI.retrieveMultipleRecords(
    "account",
    "?$select=name,revenue&$top=10&$orderby=revenue desc"
  );

  for (const record of result.entities) {
    console.log(`${record.name}: ${record.revenue}`);
  }
}

// Create a record
public async createRecord(
  context: ComponentFramework.Context<IInputs>
): Promise<void> {
  const newRecord: ComponentFramework.WebApi.Entity = {
    name: "New Account",
    revenue: 1000000,
  };

  const result = await context.webAPI.createRecord("account", newRecord);
  console.log(`Created: ${result.id.guid}`);
}
```

## Best Practices

1. **Use React for complex controls** — virtual DOM is more efficient than manual DOM manipulation
2. **Use Fluent UI v9** — consistent with Power Platform design language
3. **Minimize DOM manipulation** — batch updates, use document fragments
4. **Handle loading states** — always show a spinner while data loads
5. **Handle error states** — graceful degradation with clear error messages
6. **Support accessibility** — ARIA labels, keyboard navigation, screen reader support
7. **Use `notifyOutputChanged` sparingly** — only call when the user changes a value, not on every render
8. **Clean up in `destroy`** — remove event listeners, cancel timers, abort fetch requests
9. **Test in the harness first** — iterate quickly before pushing to an environment
10. **Package in a solution for transport** — never rely on `pac pcf push` for production deployment
11. **Keep controls focused** — one control per concern, compose in the form designer
12. **Version your manifest** — increment version on every change for proper update detection
