---
name: Fluent UI Charting
description: >
  Data visualization with @fluentui/react-charting — LineChart, BarChart, PieChart, DonutChart,
  AreaChart, HeatMapChart, SankeyChart, TreeChart, GaugeChart, theming integration, responsive
  patterns, and accessibility in charts.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - fluent chart
  - fluent charting
  - data visualization fluent
  - react charting fluent
  - fluent line chart
  - fluent bar chart
  - fluent pie chart
  - fluent donut chart
  - fluent area chart
  - fluent heatmap
  - fluent gauge chart
---

# Fluent UI Charting — Data Visualization Knowledge Base

## Overview

`@fluentui/react-charting` is Microsoft's official charting library for Fluent UI React applications.
Built on top of D3.js, it provides a comprehensive set of chart components that integrate seamlessly
with the Fluent design system, including automatic theming, accessibility support, and responsive
behavior out of the box.

The library is designed for dashboards, reports, and data-rich applications within the Microsoft 365
ecosystem and beyond. Every chart component respects Fluent design tokens, supports light/dark/high-contrast
themes, and provides keyboard navigation and screen reader announcements.

**Key characteristics:**
- Built on D3.js for powerful SVG-based rendering
- Fluent-themed by default — inherits colors, typography, and spacing from FluentProvider
- Accessible — WCAG 2.1 AA compliant with ARIA labels, keyboard nav, and high-contrast support
- Responsive — charts resize to fit their container
- TypeScript-first — full type definitions for all props and data structures

**Package:** `@fluentui/react-charting`
**Peer dependencies:** `react`, `react-dom`, `@fluentui/react` (v8) or `@fluentui/react-components` (v9)
**Demo:** https://fluentuipr.z22.web.core.windows.net/heads/master/react-charting/demo/index.html
**Accessibility docs:** https://microsoft.github.io/fluentui-charting-contrib/docs/Accessibility

---

## Installation

```bash
# Install the charting package
npm install @fluentui/react-charting

# Peer dependencies (if not already installed)
npm install react react-dom @fluentui/react
```

For projects using Fluent UI React v9 (`@fluentui/react-components`), the charting library still
depends on the v8 theme provider internally but renders correctly inside a v9 `FluentProvider`.
Wrap your app in both providers if needed:

```tsx
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { ThemeProvider, createTheme } from '@fluentui/react';

const v8Theme = createTheme({ /* optional overrides */ });

function App() {
  return (
    <FluentProvider theme={webLightTheme}>
      <ThemeProvider theme={v8Theme}>
        {/* Chart components render here */}
      </ThemeProvider>
    </FluentProvider>
  );
}
```

---

## Chart Types

### LineChart

Renders single or multi-series line data with optional event annotations and custom point markers.

```tsx
import { LineChart, ILineChartProps, IChartDataPoint } from '@fluentui/react-charting';

const data = {
  chartTitle: 'Monthly Revenue',
  lineChartData: [
    {
      legend: 'Product A',
      data: [
        { x: new Date('2025-01-01'), y: 12000 },
        { x: new Date('2025-02-01'), y: 18000 },
        { x: new Date('2025-03-01'), y: 15000 },
        { x: new Date('2025-04-01'), y: 22000 },
        { x: new Date('2025-05-01'), y: 28000 },
        { x: new Date('2025-06-01'), y: 25000 },
      ],
      color: '#0078D4',
    },
    {
      legend: 'Product B',
      data: [
        { x: new Date('2025-01-01'), y: 8000 },
        { x: new Date('2025-02-01'), y: 11000 },
        { x: new Date('2025-03-01'), y: 14000 },
        { x: new Date('2025-04-01'), y: 13000 },
        { x: new Date('2025-05-01'), y: 19000 },
        { x: new Date('2025-06-01'), y: 21000 },
      ],
      color: '#00BCF2',
    },
  ],
};

function RevenueChart() {
  return (
    <LineChart
      data={data}
      height={300}
      width={600}
      yAxisTitle="Revenue ($)"
      enablePerfOptimization
    />
  );
}
```

**Event annotations** allow marking specific dates on the chart:

```tsx
const eventAnnotations = [
  {
    event: 'Product Launch',
    date: new Date('2025-03-15'),
    onRenderCard: () => <div>Product A v2.0 launched</div>,
  },
];

<LineChart data={data} eventAnnotationProps={{ events: eventAnnotations }} />
```

### BarChart / VerticalBarChart

Standard vertical bar charts for category comparisons.

```tsx
import { VerticalBarChart, IVerticalBarChartDataPoint } from '@fluentui/react-charting';

const barData: IVerticalBarChartDataPoint[] = [
  { x: 'Jan', y: 12000, color: '#0078D4' },
  { x: 'Feb', y: 18000, color: '#0078D4' },
  { x: 'Mar', y: 15000, color: '#0078D4' },
  { x: 'Apr', y: 22000, color: '#0078D4' },
  { x: 'May', y: 28000, color: '#0078D4' },
  { x: 'Jun', y: 25000, color: '#00BCF2' },
];

function MonthlyBarChart() {
  return (
    <VerticalBarChart
      data={barData}
      height={300}
      width={600}
      yAxisTitle="Revenue ($)"
      chartLabel="Monthly Revenue"
      barWidth={40}
    />
  );
}
```

### GroupedVerticalBarChart

Compare multiple series side by side within each category.

```tsx
import {
  GroupedVerticalBarChart,
  IGroupedVerticalBarChartData,
} from '@fluentui/react-charting';

const groupedData: IGroupedVerticalBarChartData[] = [
  {
    name: 'Q1',
    series: [
      { key: 'sales', data: 45000, color: '#0078D4', legend: 'Sales' },
      { key: 'costs', data: 32000, color: '#D13438', legend: 'Costs' },
      { key: 'profit', data: 13000, color: '#107C10', legend: 'Profit' },
    ],
  },
  {
    name: 'Q2',
    series: [
      { key: 'sales', data: 52000, color: '#0078D4', legend: 'Sales' },
      { key: 'costs', data: 35000, color: '#D13438', legend: 'Costs' },
      { key: 'profit', data: 17000, color: '#107C10', legend: 'Profit' },
    ],
  },
  {
    name: 'Q3',
    series: [
      { key: 'sales', data: 61000, color: '#0078D4', legend: 'Sales' },
      { key: 'costs', data: 38000, color: '#D13438', legend: 'Costs' },
      { key: 'profit', data: 23000, color: '#107C10', legend: 'Profit' },
    ],
  },
];

function QuarterlyComparison() {
  return (
    <GroupedVerticalBarChart
      data={groupedData}
      height={350}
      width={700}
      yAxisTitle="Amount ($)"
      barwidth={24}
    />
  );
}
```

### HorizontalBarChart

Best for ranking-style data or long category labels.

```tsx
import {
  HorizontalBarChart,
  IChartProps,
  IChartDataPoint,
} from '@fluentui/react-charting';

const horizontalData: IChartProps[] = [
  {
    chartTitle: 'Storage Usage',
    chartData: [
      { legend: 'Used', horizontalBarChartdata: { x: 75, y: 100 }, color: '#0078D4' },
    ],
  },
  {
    chartTitle: 'Memory Usage',
    chartData: [
      { legend: 'Used', horizontalBarChartdata: { x: 42, y: 100 }, color: '#107C10' },
    ],
  },
  {
    chartTitle: 'CPU Usage',
    chartData: [
      { legend: 'Used', horizontalBarChartdata: { x: 88, y: 100 }, color: '#D13438' },
    ],
  },
];

function ResourceUsageChart() {
  return <HorizontalBarChart data={horizontalData} />;
}
```

### HorizontalBarChartWithAxis

A horizontal bar chart with a numeric x-axis, suitable for comparing absolute values.

```tsx
import {
  HorizontalBarChartWithAxis,
  IHorizontalBarChartWithAxisDataPoint,
} from '@fluentui/react-charting';

const axisData: IHorizontalBarChartWithAxisDataPoint[] = [
  { x: 12000, y: 'Engineering' },
  { x: 9500, y: 'Marketing' },
  { x: 8200, y: 'Sales' },
  { x: 6700, y: 'Support' },
  { x: 4300, y: 'HR' },
];

function DepartmentBudget() {
  return (
    <HorizontalBarChartWithAxis
      data={axisData}
      height={300}
      width={500}
      yAxisTitle="Department"
      showYAxisLables
    />
  );
}
```

### StackedBarChart

Show composition of a whole — either single stacked bar or multi-stacked series.

**Single stacked bar:**

```tsx
import { StackedBarChart, IChartProps, IChartDataPoint } from '@fluentui/react-charting';

const singleStackedData: IChartProps = {
  chartTitle: 'Project Allocation',
  chartData: [
    { legend: 'Development', data: 60, color: '#0078D4' },
    { legend: 'Testing', data: 20, color: '#107C10' },
    { legend: 'Design', data: 15, color: '#FFB900' },
    { legend: 'PM', data: 5, color: '#D13438' },
  ],
};

function AllocationBar() {
  return <StackedBarChart data={singleStackedData} />;
}
```

**Multi-stacked bar:**

```tsx
import {
  MultiStackedBarChart,
  IChartProps,
} from '@fluentui/react-charting';

const multiStackedData: IChartProps[] = [
  {
    chartTitle: 'Sprint 1',
    chartData: [
      { legend: 'Completed', data: 35, color: '#107C10' },
      { legend: 'In Progress', data: 12, color: '#FFB900' },
      { legend: 'Not Started', data: 8, color: '#D13438' },
    ],
  },
  {
    chartTitle: 'Sprint 2',
    chartData: [
      { legend: 'Completed', data: 42, color: '#107C10' },
      { legend: 'In Progress', data: 8, color: '#FFB900' },
      { legend: 'Not Started', data: 5, color: '#D13438' },
    ],
  },
];

function SprintProgress() {
  return <MultiStackedBarChart data={multiStackedData} />;
}
```

### PieChart

```tsx
import { PieChart, IChartProps, IChartDataPoint } from '@fluentui/react-charting';

const pieData: IChartProps = {
  chartTitle: 'Browser Market Share',
  chartData: [
    { legend: 'Edge', data: 32, color: '#0078D4' },
    { legend: 'Chrome', data: 45, color: '#107C10' },
    { legend: 'Firefox', data: 12, color: '#FFB900' },
    { legend: 'Safari', data: 8, color: '#D13438' },
    { legend: 'Other', data: 3, color: '#8764B8' },
  ],
};

function BrowserShare() {
  return (
    <PieChart
      data={pieData}
      height={300}
      width={300}
    />
  );
}
```

### DonutChart

Similar to PieChart but with a hollow center, ideal for displaying a summary metric.

```tsx
import { DonutChart, IChartProps } from '@fluentui/react-charting';

const donutData: IChartProps = {
  chartTitle: 'License Utilization',
  chartData: [
    { legend: 'Assigned', data: 320, color: '#0078D4' },
    { legend: 'Available', data: 80, color: '#E1DFDD' },
  ],
};

function LicenseDonut() {
  return (
    <DonutChart
      data={donutData}
      innerRadius={55}
      height={250}
      width={250}
      valueInsideDonut="80%"
    />
  );
}
```

### AreaChart / StackedAreaChart

Area charts fill the region below a line, useful for showing volume or cumulative values.

```tsx
import { AreaChart, IChartProps } from '@fluentui/react-charting';

const areaData: IChartProps = {
  chartTitle: 'Network Traffic',
  lineChartData: [
    {
      legend: 'Inbound',
      data: [
        { x: new Date('2025-01-01'), y: 120 },
        { x: new Date('2025-02-01'), y: 180 },
        { x: new Date('2025-03-01'), y: 150 },
        { x: new Date('2025-04-01'), y: 220 },
        { x: new Date('2025-05-01'), y: 280 },
      ],
      color: '#0078D4',
    },
    {
      legend: 'Outbound',
      data: [
        { x: new Date('2025-01-01'), y: 80 },
        { x: new Date('2025-02-01'), y: 110 },
        { x: new Date('2025-03-01'), y: 95 },
        { x: new Date('2025-04-01'), y: 140 },
        { x: new Date('2025-05-01'), y: 170 },
      ],
      color: '#00BCF2',
    },
  ],
};

function TrafficAreaChart() {
  return (
    <AreaChart
      data={areaData}
      height={300}
      width={600}
      yAxisTitle="Mbps"
      enablePerfOptimization
    />
  );
}
```

### HeatMapChart

Displays a matrix of values with color intensity encoding magnitude.

```tsx
import { HeatMapChart, IHeatMapChartData, IHeatMapChartDataPoint } from '@fluentui/react-charting';

const heatMapData: IHeatMapChartData[] = [
  {
    value: 'Mon',
    data: [
      { x: '9AM', y: 5, rectText: '5', legend: 'Meetings' },
      { x: '10AM', y: 12, rectText: '12', legend: 'Meetings' },
      { x: '11AM', y: 8, rectText: '8', legend: 'Meetings' },
      { x: '12PM', y: 3, rectText: '3', legend: 'Meetings' },
      { x: '1PM', y: 7, rectText: '7', legend: 'Meetings' },
    ],
  },
  {
    value: 'Tue',
    data: [
      { x: '9AM', y: 2, rectText: '2', legend: 'Meetings' },
      { x: '10AM', y: 9, rectText: '9', legend: 'Meetings' },
      { x: '11AM', y: 15, rectText: '15', legend: 'Meetings' },
      { x: '12PM', y: 6, rectText: '6', legend: 'Meetings' },
      { x: '1PM', y: 4, rectText: '4', legend: 'Meetings' },
    ],
  },
  {
    value: 'Wed',
    data: [
      { x: '9AM', y: 10, rectText: '10', legend: 'Meetings' },
      { x: '10AM', y: 7, rectText: '7', legend: 'Meetings' },
      { x: '11AM', y: 11, rectText: '11', legend: 'Meetings' },
      { x: '12PM', y: 4, rectText: '4', legend: 'Meetings' },
      { x: '1PM', y: 9, rectText: '9', legend: 'Meetings' },
    ],
  },
];

function MeetingHeatMap() {
  return (
    <HeatMapChart
      data={heatMapData}
      xAxisStringLabels={['9AM', '10AM', '11AM', '12PM', '1PM']}
      yAxisStringLabels={['Mon', 'Tue', 'Wed']}
      domainValuesForColorScale={[0, 15]}
      rangeValuesForColorScale={['#E1DFDD', '#0078D4']}
      height={200}
      width={500}
    />
  );
}
```

### SankeyChart

Visualizes flow between nodes — useful for pipeline, funnel, or migration analysis.

```tsx
import { SankeyChart, ISankeyChartData } from '@fluentui/react-charting';

const sankeyData: ISankeyChartData = {
  nodes: [
    { nodeId: 0, name: 'Visitors', color: '#0078D4' },
    { nodeId: 1, name: 'Leads', color: '#00BCF2' },
    { nodeId: 2, name: 'Qualified', color: '#107C10' },
    { nodeId: 3, name: 'Customers', color: '#FFB900' },
    { nodeId: 4, name: 'Dropped', color: '#D13438' },
  ],
  links: [
    { source: 0, target: 1, value: 500 },
    { source: 0, target: 4, value: 200 },
    { source: 1, target: 2, value: 350 },
    { source: 1, target: 4, value: 150 },
    { source: 2, target: 3, value: 280 },
    { source: 2, target: 4, value: 70 },
  ],
};

function ConversionFunnel() {
  return (
    <SankeyChart
      data={sankeyData}
      height={400}
      width={700}
    />
  );
}
```

### TreeChart

Displays hierarchical data in a tree layout. Useful for org charts or category breakdowns.

```tsx
import { TreeChart, ITreeProps, ITreeChartDataPoint } from '@fluentui/react-charting';

const treeData: ITreeChartDataPoint = {
  name: 'CEO',
  subname: 'Executive',
  fill: '#0078D4',
  children: [
    {
      name: 'VP Engineering',
      subname: '120 reports',
      fill: '#00BCF2',
      children: [
        { name: 'Frontend', subname: '45 engineers', fill: '#107C10' },
        { name: 'Backend', subname: '55 engineers', fill: '#107C10' },
        { name: 'Platform', subname: '20 engineers', fill: '#107C10' },
      ],
    },
    {
      name: 'VP Product',
      subname: '35 reports',
      fill: '#FFB900',
      children: [
        { name: 'Consumer', subname: '20 PMs', fill: '#D83B01' },
        { name: 'Enterprise', subname: '15 PMs', fill: '#D83B01' },
      ],
    },
  ],
};

function OrgTreeChart() {
  return (
    <TreeChart
      treeData={treeData}
      composition={2} // 2 = long layout, 1 = compact
      height={400}
      width={800}
    />
  );
}
```

### GaugeChart

Displays a single value against a range — ideal for KPIs, health scores, or progress indicators.

```tsx
import { GaugeChart, IGaugeChartProps, IGaugeChartSegment } from '@fluentui/react-charting';

const gaugeSegments: IGaugeChartSegment[] = [
  { size: 33, color: '#D13438', legend: 'Critical' },
  { size: 34, color: '#FFB900', legend: 'Warning' },
  { size: 33, color: '#107C10', legend: 'Healthy' },
];

function HealthGauge() {
  return (
    <GaugeChart
      segments={gaugeSegments}
      chartValue={72}
      chartTitle="System Health"
      sublabel="Score"
      minValue={0}
      maxValue={100}
      height={250}
      width={300}
    />
  );
}
```

### SparklineChart

Inline micro-charts for use in tables, cards, or dense layouts.

```tsx
import { Sparkline, ISparklineProps } from '@fluentui/react-charting';

const sparklineData = [
  { x: 1, y: 10 },
  { x: 2, y: 18 },
  { x: 3, y: 14 },
  { x: 4, y: 22 },
  { x: 5, y: 19 },
  { x: 6, y: 27 },
];

function InlineSparkline() {
  return (
    <Sparkline
      data={sparklineData}
      valueTextWidth={40}
      height={30}
      width={120}
    />
  );
}
```

---

## Theming Integration

### How Charts Use Fluent Tokens

All `@fluentui/react-charting` components inherit theming from the Fluent `ThemeProvider` (v8)
or `FluentProvider` (v9). Charts automatically pick up:

- **Background colors** from the theme's neutral palette
- **Text colors** for axis labels, legends, and tooltips
- **Font family and sizes** from the theme typography scale

### Customizing Chart Colors

You can override colors at three levels:

**1. Per data point** — Set `color` on each data item:

```tsx
{ legend: 'Revenue', data: 50000, color: '#0078D4' }
```

**2. Custom color palette** — Pass a `colors` prop (where supported):

```tsx
const palette = ['#0078D4', '#00BCF2', '#107C10', '#FFB900', '#D13438', '#8764B8'];
<PieChart data={pieData} colors={palette} />
```

**3. Theme-level** — Override the theme's color slots used by charts:

```tsx
import { createTheme } from '@fluentui/react';

const chartTheme = createTheme({
  palette: {
    themePrimary: '#0078D4',
    themeDark: '#005A9E',
    neutralPrimary: '#323130',
    neutralSecondary: '#605E5C',
  },
});
```

### Dark Theme Support

Charts automatically adapt to dark themes. When using Fluent v9:

```tsx
import { FluentProvider, webDarkTheme } from '@fluentui/react-components';

<FluentProvider theme={webDarkTheme}>
  <LineChart data={data} />
</FluentProvider>
```

Axis lines, grid lines, labels, tooltips, and legends all inherit the dark palette automatically.

---

## Responsive Charts

### Container-Based Sizing

The recommended pattern is to let charts fill their container rather than setting fixed dimensions:

```tsx
import { useRef, useState, useEffect } from 'react';

function ResponsiveChartContainer({ children }: { children: (width: number, height: number) => React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      {children(dimensions.width, dimensions.height)}
    </div>
  );
}

// Usage
function Dashboard() {
  return (
    <ResponsiveChartContainer>
      {(width, height) => (
        <LineChart data={data} width={width} height={height} />
      )}
    </ResponsiveChartContainer>
  );
}
```

### Responsive Breakpoints

For dashboard layouts, switch chart types or configurations at breakpoints:

```tsx
function AdaptiveChart({ data }: { data: IChartProps }) {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  if (width < 480) {
    // Mobile: show sparkline instead of full chart
    return <Sparkline data={data.lineChartData[0].data} width={width - 32} height={40} />;
  }

  if (width < 768) {
    // Tablet: compact chart
    return <LineChart data={data} width={width - 32} height={200} />;
  }

  // Desktop: full chart
  return <LineChart data={data} width={width - 64} height={350} />;
}
```

---

## Accessibility

`@fluentui/react-charting` follows WCAG 2.1 AA guidelines. Key accessibility features include:

### ARIA Labels

Every chart component accepts `chartTitle` which is rendered as an `aria-label` on the SVG container.
Screen readers announce the chart title when focus enters the chart region.

```tsx
<LineChart
  data={data}
  chartTitle="Monthly revenue for Product A and Product B, January through June 2025"
/>
```

### Keyboard Navigation

- **Tab** — Move focus into the chart region
- **Arrow keys** — Navigate between data points or chart segments
- **Enter / Space** — Activate a data point (trigger onClick callback)
- **Escape** — Move focus out of the chart back to the parent container

### High Contrast Mode

Charts detect Windows High Contrast mode and automatically switch to high-contrast colors.
Borders become visible, fill colors map to system colors, and text contrast meets AAA ratios.

To test high-contrast rendering in development:

```tsx
import { ThemeProvider } from '@fluentui/react';
import { HighContrastTheme } from '@fluentui/react-charting';

<ThemeProvider theme={HighContrastTheme}>
  <LineChart data={data} />
</ThemeProvider>
```

### Screen Reader Support

Data tables are generated behind the scenes so assistive technology can read chart data:
- Each data point is announced with its x-value, y-value, and series name
- Legends are announced with their associated value or percentage
- Tooltip content is accessible via `aria-live` regions

### Best Practices

1. Always provide a descriptive `chartTitle` — do not use generic labels like "Chart"
2. Use the `ariaLabel` prop on individual data points for complex visualizations
3. Provide text alternatives for color-encoded information (e.g., include values in legend labels)
4. Test with screen readers: NVDA on Windows, VoiceOver on macOS
5. Ensure sufficient color contrast between adjacent chart segments (4.5:1 minimum)

**Reference:** https://microsoft.github.io/fluentui-charting-contrib/docs/Accessibility

---

## Common Patterns

### Dashboard Card with Chart

A typical pattern is wrapping a chart in a Fluent `Card` component for dashboard layouts:

```tsx
import { Card, CardHeader, Text, makeStyles, tokens } from '@fluentui/react-components';
import { LineChart } from '@fluentui/react-charting';

const useStyles = makeStyles({
  card: {
    width: '100%',
    maxWidth: '600px',
    padding: tokens.spacingVerticalM,
  },
  chartContainer: {
    marginTop: tokens.spacingVerticalS,
    width: '100%',
    height: '250px',
  },
});

function ChartCard({ title, data }: { title: string; data: any }) {
  const styles = useStyles();

  return (
    <Card className={styles.card}>
      <CardHeader
        header={<Text weight="semibold" size={400}>{title}</Text>}
        description={<Text size={200}>Last 6 months</Text>}
      />
      <div className={styles.chartContainer}>
        <LineChart data={data} height={250} />
      </div>
    </Card>
  );
}
```

### Chart + DataGrid Combo

Display a chart alongside a data table for accessibility and detailed inspection:

```tsx
import { DataGrid, DataGridHeader, DataGridBody, DataGridRow, DataGridCell, DataGridHeaderCell } from '@fluentui/react-components';
import { VerticalBarChart } from '@fluentui/react-charting';
import { makeStyles, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
});

function ChartWithTable({ chartData, tableColumns, tableRows }) {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      <VerticalBarChart data={chartData} height={300} />
      <DataGrid items={tableRows} columns={tableColumns}>
        <DataGridHeader>
          <DataGridRow>
            {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
          </DataGridRow>
        </DataGridHeader>
        <DataGridBody>
          {({ item, rowId }) => (
            <DataGridRow key={rowId}>
              {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
            </DataGridRow>
          )}
        </DataGridBody>
      </DataGrid>
    </div>
  );
}
```

### KPI Dashboard Layout

A multi-chart dashboard combining Gauge, DonutChart, and SparklineChart:

```tsx
import { makeStyles, tokens } from '@fluentui/react-components';
import { GaugeChart, DonutChart, Sparkline } from '@fluentui/react-charting';

const useStyles = makeStyles({
  dashboard: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: tokens.spacingHorizontalL,
    padding: tokens.spacingVerticalL,
  },
  kpiCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow4,
  },
});

function KPIDashboard() {
  const styles = useStyles();

  return (
    <div className={styles.dashboard}>
      <div className={styles.kpiCard}>
        <GaugeChart segments={gaugeSegments} chartValue={72} chartTitle="Health Score" />
      </div>
      <div className={styles.kpiCard}>
        <DonutChart data={donutData} innerRadius={50} valueInsideDonut="80%" />
      </div>
      <div className={styles.kpiCard}>
        <Sparkline data={sparkData} width={200} height={40} />
      </div>
    </div>
  );
}
```

---

## External Resources

- **Interactive Demo:** https://fluentuipr.z22.web.core.windows.net/heads/master/react-charting/demo/index.html
- **Accessibility Documentation:** https://microsoft.github.io/fluentui-charting-contrib/docs/Accessibility
- **GitHub Repository:** https://github.com/microsoft/fluentui/tree/master/packages/react-charting
- **Charting Contribution Guide:** https://microsoft.github.io/fluentui-charting-contrib
- **NPM Package:** https://www.npmjs.com/package/@fluentui/react-charting
- **Storybook:** https://fluentuipr.z22.web.core.windows.net/heads/master/react-charting/storybook/index.html
