---
name: fluent-ui-design:chart
description: Generate a Fluent-themed chart component with proper data binding, theming, and accessibility.
argument-hint: "<chart-type> [--data=<json-path>] [--responsive] [--accessible]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

# Generate a Fluent UI Chart Component

Create a production-ready chart component using `@fluentui/react-charting` with Fluent theming,
accessibility attributes, and optional responsive container.

## Arguments

- `<chart-type>` — One of: `line`, `bar`, `vertical-bar`, `grouped-bar`, `horizontal-bar`,
  `stacked-bar`, `pie`, `donut`, `area`, `heatmap`, `sankey`, `tree`, `gauge`, `sparkline`
- `--data=<json-path>` — Path to a JSON file containing chart data (optional; generates sample data if omitted)
- `--responsive` — Wrap chart in a ResizeObserver-based responsive container
- `--accessible` — Add enhanced accessibility: descriptive `aria-label`, keyboard hints, data table fallback

## Workflow

### Step 1: Determine Chart Type

Parse the `<chart-type>` argument and map it to the corresponding `@fluentui/react-charting` component:

| Argument | Component Import |
|----------|-----------------|
| `line` | `LineChart` |
| `bar` or `vertical-bar` | `VerticalBarChart` |
| `grouped-bar` | `GroupedVerticalBarChart` |
| `horizontal-bar` | `HorizontalBarChart` or `HorizontalBarChartWithAxis` |
| `stacked-bar` | `StackedBarChart` or `MultiStackedBarChart` |
| `pie` | `PieChart` |
| `donut` | `DonutChart` |
| `area` | `AreaChart` |
| `heatmap` | `HeatMapChart` |
| `sankey` | `SankeyChart` |
| `tree` | `TreeChart` |
| `gauge` | `GaugeChart` |
| `sparkline` | `Sparkline` |

### Step 2: Check and Install Dependencies

Search the project for `@fluentui/react-charting` in `package.json`:

```bash
grep -r "react-charting" package.json
```

If not found, install it:

```bash
npm install @fluentui/react-charting
```

Also verify that `@fluentui/react` (v8) is installed as a peer dependency. If the project uses
only `@fluentui/react-components` (v9), add `@fluentui/react` as well:

```bash
npm install @fluentui/react
```

### Step 3: Generate Chart Component

Read the charting reference for the selected chart type:

```
${CLAUDE_PLUGIN_ROOT}/skills/fluent-charting/references/charting-reference.md
```

Create the component file `<ComponentName>Chart.tsx` with:

1. **Imports** — Chart component and its type interfaces from `@fluentui/react-charting`
2. **Props interface** — TypeScript interface extending the chart's native props with any custom props
3. **Sample data** — If `--data` is not provided, generate realistic sample data matching the chart type
4. **Data loading** — If `--data=<path>` is provided, read and parse the JSON file, mapping fields to the chart's expected data format
5. **Styles** — Use `makeStyles` from `@fluentui/react-components` for the container and wrapper
6. **Component body** — Render the chart with all required props

#### Component Template

```tsx
import React from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import { <ChartComponent>, <IChartProps> } from '@fluentui/react-charting';

export interface <Name>ChartProps {
  /** Chart title for accessibility */
  title?: string;
  /** Chart width in pixels (ignored when responsive) */
  width?: number;
  /** Chart height in pixels */
  height?: number;
  /** Custom data override */
  data?: <IChartDataType>;
}

const useStyles = makeStyles({
  container: {
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow4,
  },
});

const sampleData: <IChartDataType> = {
  // ... realistic sample data
};

export const <Name>Chart: React.FC<<Name>ChartProps> = ({
  title = '<Default Title>',
  width = 600,
  height = 350,
  data = sampleData,
}) => {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      <<ChartComponent>
        data={data}
        width={width}
        height={height}
        chartTitle={title}
        enablePerfOptimization
      />
    </div>
  );
};
```

### Step 4: Add Theme Token Integration

Ensure the chart component respects the current Fluent theme:

- Use `tokens.colorNeutralBackground1` for the chart container background
- Use `tokens.colorNeutralForeground1` for text elements
- Map chart segment colors to Fluent brand/status tokens where semantically appropriate:
  - Success metrics: `tokens.colorStatusSuccessForeground1`
  - Warning metrics: `tokens.colorStatusWarningForeground1`
  - Error metrics: `tokens.colorStatusDangerForeground1`
  - Primary/brand: `tokens.colorBrandForeground1`

Add a dark theme note in the component JSDoc:

```tsx
/**
 * This chart automatically adapts to light/dark/high-contrast themes
 * when rendered inside a FluentProvider.
 */
```

### Step 5: Add Responsive Container (if `--responsive`)

Wrap the chart in a `ResizeObserver`-based container:

```tsx
import { useRef, useState, useEffect } from 'react';

const useContainerDimensions = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 350 });

  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width: Math.floor(width), height: Math.floor(height) });
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, ...dimensions };
};
```

Then use it in the component:

```tsx
export const <Name>Chart: React.FC<<Name>ChartProps> = ({ title, data = sampleData }) => {
  const styles = useStyles();
  const { ref, width, height } = useContainerDimensions();

  return (
    <div ref={ref} className={styles.container} style={{ width: '100%', height: '100%' }}>
      <<ChartComponent>
        data={data}
        width={width}
        height={height}
        chartTitle={title}
        enablePerfOptimization
      />
    </div>
  );
};
```

### Step 6: Add Accessibility Attributes (if `--accessible`)

Enhance accessibility beyond the chart's built-in support:

1. **Descriptive `aria-label`** on the container `div`:

```tsx
<div
  role="img"
  aria-label={`${title}. Use arrow keys to navigate data points. Press Enter for details.`}
>
```

2. **Hidden data table fallback** for screen readers:

```tsx
<table className={styles.srOnly} aria-label={`Data table for ${title}`}>
  <thead>
    <tr>
      <th>Category</th>
      <th>Value</th>
    </tr>
  </thead>
  <tbody>
    {data.map((point, i) => (
      <tr key={i}>
        <td>{point.x}</td>
        <td>{point.y}</td>
      </tr>
    ))}
  </tbody>
</table>
```

3. **Screen-reader-only styles**:

```tsx
const useStyles = makeStyles({
  srOnly: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    borderWidth: '0',
  },
});
```

## Quality Checklist

After generating the component, verify:

- [ ] All color values use Fluent tokens or explicit accessible colors (not arbitrary hex without reasoning)
- [ ] Props interface is exported and fully typed
- [ ] `chartTitle` is set for screen reader announcement
- [ ] Component renders correctly in light, dark, and high-contrast themes
- [ ] If `--responsive`: chart resizes on container change without layout thrashing
- [ ] If `--accessible`: hidden data table is present, `aria-label` is descriptive
- [ ] `enablePerfOptimization` is enabled for line and area charts
- [ ] Sample data is realistic and demonstrates the chart's capabilities
- [ ] Imports are specific (not barrel imports) for optimal tree-shaking

## Example Invocations

```
/fluent-chart line --responsive --accessible
/fluent-chart donut --data=./data/license-usage.json
/fluent-chart gauge
/fluent-chart grouped-bar --responsive
/fluent-chart heatmap --data=./data/activity-matrix.json --accessible
```
