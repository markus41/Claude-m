# Fluent UI Charting — Complete API & Data Reference

## Table of Contents

1. [LineChart API](#linechart-api)
2. [VerticalBarChart API](#verticalbarchart-api)
3. [GroupedVerticalBarChart API](#groupedverticalbarchart-api)
4. [HorizontalBarChart API](#horizontalbarchart-api)
5. [HorizontalBarChartWithAxis API](#horizontalbarchartswithaxis-api)
6. [StackedBarChart API](#stackedbarchart-api)
7. [MultiStackedBarChart API](#multistackedbarchart-api)
8. [PieChart API](#piechart-api)
9. [DonutChart API](#donutchart-api)
10. [AreaChart API](#areachart-api)
11. [HeatMapChart API](#heatmapchart-api)
12. [SankeyChart API](#sankeychart-api)
13. [TreeChart API](#treechart-api)
14. [GaugeChart API](#gaugechart-api)
15. [SparklineChart API](#sparklinechart-api)
16. [Color Customization](#color-customization)
17. [Legend Component](#legend-component)
18. [Tooltip Customization](#tooltip-customization)
19. [Event Handling](#event-handling)
20. [Performance & Large Datasets](#performance--large-datasets)

---

## LineChart API

### Props (`ILineChartProps`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `IChartProps` | required | Chart data containing `lineChartData` array |
| `width` | `number` | `600` | Width of the chart in pixels |
| `height` | `number` | `350` | Height of the chart in pixels |
| `yAxisTitle` | `string` | — | Label for the y-axis |
| `xAxisTitle` | `string` | — | Label for the x-axis |
| `chartTitle` | `string` | — | Accessible chart title (used as `aria-label`) |
| `enablePerfOptimization` | `boolean` | `false` | Reduces re-renders for large datasets |
| `enableReflow` | `boolean` | `false` | Automatically resize when container changes |
| `hideLegend` | `boolean` | `false` | Hide the legend component |
| `hideTooltip` | `boolean` | `false` | Hide the tooltip on hover |
| `yMinValue` | `number` | — | Minimum y-axis value |
| `yMaxValue` | `number` | — | Maximum y-axis value |
| `tickValues` | `Date[] \| number[]` | — | Custom x-axis tick positions |
| `eventAnnotationProps` | `IEventsAnnotationProps` | — | Event annotations on timeline |
| `allowMultipleShapesForPoints` | `boolean` | `false` | Use different shapes per series (circle, square, triangle, diamond) |
| `colorFillBars` | `IColorFillBarsProps[]` | — | Background color bands on regions |
| `onRenderCalloutPerDataPoint` | `(props) => JSX.Element` | — | Custom tooltip renderer per data point |
| `onRenderCalloutPerStack` | `(props) => JSX.Element` | — | Custom tooltip renderer per stacked series |

### Data Format

```typescript
interface IChartProps {
  chartTitle?: string;
  lineChartData?: ILineChartDataPoint[];
}

interface ILineChartDataPoint {
  legend: string;
  data: ILineChartPoints[];
  color: string;
  lineOptions?: ILineChartLineOptions; // dashed, dotted, etc.
  onLineClick?: () => void;
}

interface ILineChartPoints {
  x: number | Date;
  y: number;
  xAxisCalloutData?: string;   // Custom tooltip for x-value
  yAxisCalloutData?: string;   // Custom tooltip for y-value
  callOutAccessibilityData?: IAccessibilityProps;
  onDataPointClick?: () => void;
}
```

### Line Styles

```typescript
interface ILineChartLineOptions {
  lineBorderWidth?: string;  // e.g., '4'
  strokeDasharray?: string;  // e.g., '5,5' for dashed
  strokeDashoffset?: string;
  strokeLinecap?: string;    // 'butt' | 'round' | 'square'
}
```

### Example: Multi-series with dashed lines

```tsx
const data: IChartProps = {
  chartTitle: 'Sales Forecast',
  lineChartData: [
    {
      legend: 'Actual',
      data: [
        { x: new Date('2025-01-01'), y: 100 },
        { x: new Date('2025-02-01'), y: 130 },
        { x: new Date('2025-03-01'), y: 145 },
      ],
      color: '#0078D4',
    },
    {
      legend: 'Forecast',
      data: [
        { x: new Date('2025-03-01'), y: 145 },
        { x: new Date('2025-04-01'), y: 160 },
        { x: new Date('2025-05-01'), y: 175 },
      ],
      color: '#0078D4',
      lineOptions: { strokeDasharray: '5,5' },
    },
  ],
};
```

---

## VerticalBarChart API

### Props (`IVerticalBarChartProps`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `IVerticalBarChartDataPoint[]` | required | Array of bar data points |
| `width` | `number` | `600` | Chart width |
| `height` | `number` | `350` | Chart height |
| `barWidth` | `number` | `16` | Width of each bar in pixels |
| `yAxisTitle` | `string` | — | Y-axis label |
| `chartLabel` | `string` | — | Accessible chart label |
| `colors` | `string[]` | — | Custom color palette |
| `hideLabels` | `boolean` | `false` | Hide bar value labels |
| `lineLegendText` | `string` | — | Legend text for optional line overlay |
| `lineLegendColor` | `string` | — | Color for optional line overlay |
| `yMinValue` | `number` | `0` | Minimum y-axis value |
| `yMaxValue` | `number` | — | Maximum y-axis value |
| `useSingleColor` | `boolean` | `false` | Use one color for all bars |

### Data Format

```typescript
interface IVerticalBarChartDataPoint {
  x: string | number;          // Category label or numeric x
  y: number;                    // Value
  color?: string;               // Bar color
  legend?: string;              // Legend label (for multi-color)
  xAxisCalloutData?: string;    // Custom tooltip x text
  yAxisCalloutData?: string;    // Custom tooltip y text
  lineData?: ILineDataInVerticalBarChart; // Optional line data point overlay
  callOutAccessibilityData?: IAccessibilityProps;
  onClick?: () => void;
}
```

### Example: With line overlay

```tsx
const data: IVerticalBarChartDataPoint[] = [
  { x: 'Jan', y: 120, color: '#0078D4', lineData: { y: 100, yAxisCalloutData: 'Target: 100' } },
  { x: 'Feb', y: 180, color: '#0078D4', lineData: { y: 150, yAxisCalloutData: 'Target: 150' } },
  { x: 'Mar', y: 155, color: '#0078D4', lineData: { y: 160, yAxisCalloutData: 'Target: 160' } },
];

<VerticalBarChart
  data={data}
  lineLegendText="Target"
  lineLegendColor="#D13438"
/>
```

---

## GroupedVerticalBarChart API

### Props (`IGroupedVerticalBarChartProps`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `IGroupedVerticalBarChartData[]` | required | Grouped data |
| `width` | `number` | `600` | Chart width |
| `height` | `number` | `350` | Chart height |
| `barwidth` | `number` | `16` | Width of each bar |
| `yAxisTitle` | `string` | — | Y-axis label |
| `showYAxisGridLines` | `boolean` | `false` | Show horizontal grid lines |
| `wrapXAxisLables` | `boolean` | `false` | Wrap long x-axis labels |
| `hideLabels` | `boolean` | `false` | Hide value labels on bars |

### Data Format

```typescript
interface IGroupedVerticalBarChartData {
  name: string;                              // Category name (x-axis)
  series: IGroupedVerticalBarChartSeriesData[];
}

interface IGroupedVerticalBarChartSeriesData {
  key: string;        // Unique series identifier
  data: number;       // Value
  color: string;      // Bar color
  legend: string;     // Legend label
  xAxisCalloutData?: string;
  yAxisCalloutData?: string;
  onClick?: () => void;
}
```

---

## HorizontalBarChart API

### Props (`IHorizontalBarChartProps`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `IChartProps[]` | required | Array of bar configurations |
| `barHeight` | `number` | `12` | Height of each bar |
| `hideRatio` | `boolean[]` | — | Hide ratio text per bar (e.g., `[false, true]`) |
| `hideLegend` | `boolean` | `false` | Hide legend |
| `barChartCustomData` | `(props) => JSX.Element` | — | Custom right-side annotation |

### Data Format

```typescript
// Each IChartProps represents one horizontal bar
interface IChartProps {
  chartTitle: string;    // Bar label
  chartData: IChartDataPoint[];
}

interface IChartDataPoint {
  legend: string;
  horizontalBarChartdata: { x: number; y: number }; // x = current value, y = total
  color: string;
  xAxisCalloutData?: string;
  yAxisCalloutData?: string;
}
```

### Example: Usage meter bars

```tsx
const data: IChartProps[] = [
  {
    chartTitle: 'Disk Space',
    chartData: [
      {
        legend: 'Used',
        horizontalBarChartdata: { x: 172, y: 256 },
        color: '#0078D4',
        xAxisCalloutData: '172 GB used',
        yAxisCalloutData: '256 GB total',
      },
    ],
  },
];
```

---

## HorizontalBarChartWithAxis API

### Props (`IHorizontalBarChartWithAxisProps`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `IHorizontalBarChartWithAxisDataPoint[]` | required | Data points |
| `width` | `number` | `600` | Chart width |
| `height` | `number` | `350` | Chart height |
| `yAxisTitle` | `string` | — | Y-axis label |
| `showYAxisLables` | `boolean` | `true` | Show category labels |
| `barHeight` | `number` | — | Custom bar height |
| `showXAxisLablesTooltip` | `boolean` | `false` | Tooltip on truncated axis labels |

### Data Format

```typescript
interface IHorizontalBarChartWithAxisDataPoint {
  x: number;          // Value (plotted on x-axis)
  y: string;          // Category label (plotted on y-axis)
  color?: string;
  legend?: string;
  callOutAccessibilityData?: IAccessibilityProps;
}
```

---

## StackedBarChart API

### Props (`IStackedBarChartProps`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `IChartProps` | required | Single stacked bar data |
| `barBackgroundColor` | `string` | — | Background track color |
| `hideLegend` | `boolean` | `false` | Hide legend |
| `hideTooltip` | `boolean` | `false` | Hide tooltip |
| `ignoreFixStyle` | `boolean` | `false` | Allow variable width rendering |
| `hideNumberDisplay` | `boolean` | `false` | Hide the number on the right |

### Data Format

```typescript
interface IChartProps {
  chartTitle: string;
  chartData: IChartDataPoint[];
}

interface IChartDataPoint {
  legend: string;              // Segment label
  data: number;                // Segment value
  color: string;               // Segment color
  placeHolder?: boolean;       // Render as empty/background
  xAxisCalloutData?: string;
  yAxisCalloutData?: string;
  callOutAccessibilityData?: IAccessibilityProps;
  onClick?: () => void;
}
```

---

## MultiStackedBarChart API

### Props (`IMultiStackedBarChartProps`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `IChartProps[]` | required | Array of stacked bars |
| `hideLegend` | `boolean` | `false` | Hide legend |
| `hideTooltip` | `boolean` | `false` | Hide tooltip |
| `hideRatio` | `boolean[]` | — | Hide ratio per bar |
| `barHeight` | `number` | — | Custom bar height |

---

## PieChart API

### Props (`IPieChartProps`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `IChartProps` | required | Pie data with `chartData` array |
| `width` | `number` | `200` | Chart width |
| `height` | `number` | `200` | Chart height |
| `colors` | `string[]` | — | Custom color palette |
| `chartTitle` | `string` | — | Accessible chart title |
| `hideLegend` | `boolean` | `false` | Hide legend |
| `hideTooltip` | `boolean` | `false` | Hide tooltip |

### Data Format

```typescript
interface IChartProps {
  chartTitle: string;
  chartData: IChartDataPoint[];
}

interface IChartDataPoint {
  legend: string;   // Slice label
  data: number;     // Slice value (absolute, not percentage)
  color: string;    // Slice color
  xAxisCalloutData?: string;
  yAxisCalloutData?: string;
  onClick?: () => void;
}
```

---

## DonutChart API

### Props (`IDonutChartProps`)

Extends `IPieChartProps` with:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `innerRadius` | `number` | `0` | Inner radius of donut hole |
| `valueInsideDonut` | `string \| number` | — | Text displayed in center |

### Example: Donut with center metric

```tsx
<DonutChart
  data={{
    chartTitle: 'Task Completion',
    chartData: [
      { legend: 'Done', data: 75, color: '#107C10' },
      { legend: 'Remaining', data: 25, color: '#E1DFDD' },
    ],
  }}
  innerRadius={55}
  valueInsideDonut="75%"
  width={250}
  height={250}
/>
```

---

## AreaChart API

### Props (`IAreaChartProps`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `IChartProps` | required | Chart data with `lineChartData` |
| `width` | `number` | `600` | Chart width |
| `height` | `number` | `350` | Chart height |
| `enablePerfOptimization` | `boolean` | `false` | Performance mode for large data |
| `enableReflow` | `boolean` | `false` | Auto-resize on container change |
| `legendProps` | `ILegendProps` | — | Custom legend configuration |
| `yAxisTitle` | `string` | — | Y-axis label |
| `showYAxisGridLines` | `boolean` | `true` | Show horizontal grid lines |
| `optimizeLargeData` | `boolean` | `false` | Downsample large datasets |

### Data Format

Same as `LineChart` — uses `IChartProps` with `lineChartData`. The area is filled
below each line automatically.

```tsx
const areaData: IChartProps = {
  chartTitle: 'CPU Usage Over Time',
  lineChartData: [
    {
      legend: 'Server A',
      data: [
        { x: new Date('2025-01-01T00:00'), y: 45 },
        { x: new Date('2025-01-01T01:00'), y: 62 },
        { x: new Date('2025-01-01T02:00'), y: 38 },
        { x: new Date('2025-01-01T03:00'), y: 71 },
      ],
      color: '#0078D4',
    },
  ],
};
```

---

## HeatMapChart API

### Props (`IHeatMapChartProps`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `IHeatMapChartData[]` | required | Row data with cell values |
| `xAxisStringLabels` | `string[]` | — | Column labels |
| `yAxisStringLabels` | `string[]` | — | Row labels |
| `domainValuesForColorScale` | `number[]` | required | `[min, max]` value range for color mapping |
| `rangeValuesForColorScale` | `string[]` | required | `[minColor, maxColor]` color range |
| `width` | `number` | `600` | Chart width |
| `height` | `number` | `350` | Chart height |
| `hideTooltip` | `boolean` | `false` | Hide tooltip |
| `sortOrder` | `'ascending' \| 'descending'` | — | Sort order for values |

### Data Format

```typescript
interface IHeatMapChartData {
  value: string;                       // Row label
  data: IHeatMapChartDataPoint[];
}

interface IHeatMapChartDataPoint {
  x: string;            // Column identifier (matches xAxisStringLabels)
  y: number;            // Cell value (maps to color intensity)
  rectText: string;     // Text rendered inside the cell
  legend: string;       // Legend label
  callOutAccessibilityData?: IAccessibilityProps;
  onClick?: () => void;
}
```

### Color Scale Examples

```tsx
// Blue intensity
domainValuesForColorScale={[0, 100]}
rangeValuesForColorScale={['#F0F6FF', '#0078D4']}

// Red-yellow-green diverging
domainValuesForColorScale={[0, 50, 100]}
rangeValuesForColorScale={['#D13438', '#FFB900', '#107C10']}
```

---

## SankeyChart API

### Props (`ISankeyChartProps`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `ISankeyChartData` | required | Nodes and links |
| `width` | `number` | `600` | Chart width |
| `height` | `number` | `400` | Chart height |
| `colorsForNodes` | `string[]` | — | Custom node colors |
| `borderColorsForNodes` | `string[]` | — | Custom node border colors |

### Data Format

```typescript
interface ISankeyChartData {
  nodes: ISankeyChartNode[];
  links: ISankeyChartLink[];
}

interface ISankeyChartNode {
  nodeId: number;      // Unique numeric identifier
  name: string;        // Display label
  color?: string;      // Node color
}

interface ISankeyChartLink {
  source: number;      // Source nodeId
  target: number;      // Target nodeId
  value: number;       // Flow magnitude
}
```

### Example: Multi-stage pipeline

```tsx
const pipelineData: ISankeyChartData = {
  nodes: [
    { nodeId: 0, name: 'Raw Data (1000)' },
    { nodeId: 1, name: 'Validated (850)' },
    { nodeId: 2, name: 'Transformed (800)' },
    { nodeId: 3, name: 'Loaded (790)' },
    { nodeId: 4, name: 'Failed Validation (150)' },
    { nodeId: 5, name: 'Transform Errors (50)' },
    { nodeId: 6, name: 'Load Errors (10)' },
  ],
  links: [
    { source: 0, target: 1, value: 850 },
    { source: 0, target: 4, value: 150 },
    { source: 1, target: 2, value: 800 },
    { source: 1, target: 5, value: 50 },
    { source: 2, target: 3, value: 790 },
    { source: 2, target: 6, value: 10 },
  ],
};
```

---

## TreeChart API

### Props (`ITreeChartProps`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `treeData` | `ITreeChartDataPoint` | required | Root node of tree hierarchy |
| `composition` | `1 \| 2` | `1` | Layout: `1` = compact, `2` = long |
| `width` | `number` | `600` | Chart width |
| `height` | `number` | `400` | Chart height |

### Data Format

```typescript
interface ITreeChartDataPoint {
  name: string;           // Node label
  subname?: string;       // Subtitle/metadata
  fill: string;           // Node background color
  children?: ITreeChartDataPoint[];  // Child nodes
  metric?: string;        // Value to display in node
  bodyText?: string;      // Additional body text
}
```

---

## GaugeChart API

### Props (`IGaugeChartProps`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `segments` | `IGaugeChartSegment[]` | required | Arc segments |
| `chartValue` | `number` | required | Current needle position value |
| `chartTitle` | `string` | — | Title above gauge |
| `sublabel` | `string` | — | Label below the value |
| `minValue` | `number` | `0` | Minimum scale value |
| `maxValue` | `number` | `100` | Maximum scale value |
| `width` | `number` | `250` | Chart width |
| `height` | `number` | `200` | Chart height |
| `chartValueFormat` | `GaugeValueFormat` | — | Format: `fraction` or `percentage` |
| `hideMinMax` | `boolean` | `false` | Hide min/max labels |

### Data Format

```typescript
interface IGaugeChartSegment {
  size: number;      // Segment size (relative — all segments are normalized)
  color: string;     // Segment arc color
  legend: string;    // Legend label for this segment
}
```

### Example: Multi-zone gauge

```tsx
const segments: IGaugeChartSegment[] = [
  { size: 20, color: '#D13438', legend: 'Critical (0-20)' },
  { size: 20, color: '#FF8C00', legend: 'Poor (20-40)' },
  { size: 20, color: '#FFB900', legend: 'Fair (40-60)' },
  { size: 20, color: '#107C10', legend: 'Good (60-80)' },
  { size: 20, color: '#0078D4', legend: 'Excellent (80-100)' },
];

<GaugeChart
  segments={segments}
  chartValue={73}
  chartTitle="Performance Score"
  sublabel="out of 100"
  minValue={0}
  maxValue={100}
/>
```

---

## SparklineChart API

### Props (`ISparklineProps`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `IChartDataPoint[]` | required | Array of `{x, y}` points |
| `width` | `number` | `80` | Sparkline width |
| `height` | `number` | `20` | Sparkline height |
| `valueTextWidth` | `number` | — | Width reserved for inline value text |
| `showLegend` | `boolean` | `false` | Show legend |

### Data Format

```typescript
interface IChartDataPoint {
  x: number;   // Sequence index or time numeric
  y: number;   // Value
}
```

### Example: Inline metric with trend

```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
  <span>Revenue:</span>
  <Sparkline
    data={[
      { x: 1, y: 10 }, { x: 2, y: 14 }, { x: 3, y: 12 },
      { x: 4, y: 18 }, { x: 5, y: 22 }, { x: 6, y: 20 },
    ]}
    width={100}
    height={24}
    valueTextWidth={40}
  />
</div>
```

---

## Color Customization

### Default Fluent Palette

When no color is specified, charts cycle through the default Fluent palette:

```typescript
const defaultPalette = [
  '#0078D4',  // themePrimary (Fluent Blue)
  '#00BCF2',  // cyan
  '#107C10',  // green
  '#FFB900',  // yellow
  '#D13438',  // red
  '#8764B8',  // purple
  '#038387',  // teal
  '#CA5010',  // orange
  '#4F6BED',  // indigo
  '#69797E',  // gray
];
```

### Per-Series Color Assignment

Always assign explicit colors for predictable rendering:

```tsx
const lineData = [
  { legend: 'Revenue', data: [...], color: '#0078D4' },
  { legend: 'Expenses', data: [...], color: '#D13438' },
  { legend: 'Profit', data: [...], color: '#107C10' },
];
```

### Theme Token Mapping

Map chart colors to Fluent design tokens for automatic dark/light adaptation:

```tsx
import { tokens } from '@fluentui/react-components';

// Use semantic tokens for context-aware colors
const statusColors = {
  success: tokens.colorStatusSuccessForeground1,   // green in light, bright green in dark
  warning: tokens.colorStatusWarningForeground1,   // amber
  danger: tokens.colorStatusDangerForeground1,     // red
  info: tokens.colorBrandForeground1,              // brand blue
};
```

**Note:** Since `@fluentui/react-charting` accepts string colors, resolve tokens at render time:

```tsx
import { useThemeClassName, tokens } from '@fluentui/react-components';

function ThemedChart() {
  // Tokens resolve to CSS custom properties; for charting, use computed values
  const computedStyle = getComputedStyle(document.documentElement);
  const brandColor = computedStyle.getPropertyValue('--colorBrandForeground1').trim();

  return <VerticalBarChart data={data} colors={[brandColor]} />;
}
```

### Accessible Color Palettes

For charts that must be distinguishable by colorblind users, use patterns alongside colors:

```tsx
// Ensure 3:1 contrast ratio between adjacent segments
const accessiblePalette = [
  '#0078D4',  // Blue
  '#D83B01',  // Orange (distinguishable from blue for most color blindness types)
  '#107C10',  // Green
  '#5C2D91',  // Purple
  '#008272',  // Teal
  '#A4262C',  // Dark red
];
```

For LineChart, enable shape differentiation:

```tsx
<LineChart data={data} allowMultipleShapesForPoints />
// Series 1 = circles, Series 2 = squares, Series 3 = triangles, Series 4 = diamonds
```

---

## Legend Component

### Built-in Legends

All chart types include a `Legends` component by default. Control it via:

```tsx
// Hide legend entirely
<LineChart data={data} hideLegend />

// Custom legend props
<LineChart
  data={data}
  legendProps={{
    canSelectMultipleLegends: true,     // Allow multi-select filtering
    allowFocusOnLegends: true,          // Keyboard focusable
    onChange: (selectedLegends) => {
      console.log('Active series:', selectedLegends);
    },
  }}
/>
```

### Legend Interaction

Clicking a legend item toggles visibility of that series. This is built-in behavior
for all chart types. When a legend is deselected:
- The associated series is dimmed (opacity reduced)
- Tooltip stops showing data for that series
- Axis ranges may adjust to visible data only

### Standalone Legend Usage

```tsx
import { Legends, ILegend } from '@fluentui/react-charting';

const legendItems: ILegend[] = [
  { title: 'Active Users', color: '#0078D4', action: () => {} },
  { title: 'Inactive Users', color: '#E1DFDD', action: () => {} },
  { title: 'Blocked Users', color: '#D13438', action: () => {} },
];

<Legends legends={legendItems} />
```

---

## Tooltip Customization

### Default Tooltips

All chart components show tooltips on hover by default. The tooltip displays:
- X-axis value
- Y-axis value(s)
- Series legend name(s)

### Custom Tooltip Content

Override tooltip text per data point:

```tsx
const data: IVerticalBarChartDataPoint[] = [
  {
    x: 'Jan',
    y: 12000,
    xAxisCalloutData: 'January 2025',           // Custom x label in tooltip
    yAxisCalloutData: '$12,000 (+15% YoY)',      // Custom y label in tooltip
  },
];
```

### Custom Tooltip Renderer

For full control over tooltip rendering:

```tsx
<LineChart
  data={data}
  onRenderCalloutPerDataPoint={(props) => {
    if (!props) return null;
    const point = props.YValueHover?.[0];
    return (
      <div style={{ padding: 8, maxWidth: 200 }}>
        <strong>{point?.legend}</strong>
        <div>{point?.yAxisCalloutData || point?.y}</div>
        <div style={{ color: '#605E5C', fontSize: 12 }}>
          {props.hoverXValue}
        </div>
      </div>
    );
  }}
/>
```

### Stack Tooltip

For stacked charts, show all series values at a point:

```tsx
<AreaChart
  data={data}
  onRenderCalloutPerStack={(props) => {
    if (!props) return null;
    return (
      <div style={{ padding: 8 }}>
        <div><strong>{props.hoverXValue}</strong></div>
        {props.YValueHover?.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ width: 10, height: 10, backgroundColor: item.color, borderRadius: 2 }} />
            <span>{item.legend}: {item.y}</span>
          </div>
        ))}
      </div>
    );
  }}
/>
```

### Disabling Tooltips

```tsx
<LineChart data={data} hideTooltip />
```

---

## Event Handling

### Click Events

#### Data Point Click

```tsx
const data: IVerticalBarChartDataPoint[] = [
  {
    x: 'Jan',
    y: 12000,
    onClick: () => {
      console.log('Clicked January bar');
      navigate('/reports/january');
    },
  },
];
```

#### Line Click

```tsx
const lineData = {
  lineChartData: [
    {
      legend: 'Revenue',
      data: [...],
      color: '#0078D4',
      onLineClick: () => {
        console.log('Clicked Revenue line');
      },
    },
  ],
};
```

#### Legend Click

```tsx
<LineChart
  data={data}
  legendProps={{
    onChange: (selectedLegends: string[]) => {
      console.log('Visible series:', selectedLegends);
    },
  }}
/>
```

### Hover Events

Hover callbacks are primarily handled through the tooltip system. Use `onRenderCalloutPerDataPoint`
to capture hover events:

```tsx
<LineChart
  data={data}
  onRenderCalloutPerDataPoint={(props) => {
    // props contains the hovered data point
    // Side effects can be triggered here (e.g., highlighting related data)
    updateHighlightedRow(props?.hoverXValue);
    return <DefaultTooltip {...props} />;
  }}
/>
```

### Chart-Level Event Props

Some charts support chart-level mouse events:

```tsx
<VerticalBarChart
  data={data}
  onBarHover={(point, event) => {
    console.log('Hovering:', point.x, point.y);
  }}
/>
```

---

## Performance & Large Datasets

### Enable Performance Optimization

For datasets with more than 100 data points, enable performance mode:

```tsx
<LineChart
  data={largeDataset}
  enablePerfOptimization   // Reduces re-renders
  optimizeLargeData        // Downsamples data for rendering
/>
```

### Data Downsampling

For datasets with thousands of points, downsample before passing to the chart:

```tsx
function downsample(data: Array<{ x: Date; y: number }>, targetPoints: number) {
  if (data.length <= targetPoints) return data;

  const bucketSize = Math.ceil(data.length / targetPoints);
  const sampled: Array<{ x: Date; y: number }> = [];

  for (let i = 0; i < data.length; i += bucketSize) {
    const bucket = data.slice(i, i + bucketSize);
    // Largest Triangle Three Buckets (LTTB) simplified: pick max y in each bucket
    const maxPoint = bucket.reduce((max, p) => (p.y > max.y ? p : max), bucket[0]);
    sampled.push(maxPoint);
  }

  return sampled;
}

// Usage
const optimizedData = {
  lineChartData: [
    {
      legend: 'Metrics',
      data: downsample(rawData, 200),  // Reduce 10K points to 200
      color: '#0078D4',
    },
  ],
};
```

### Virtualized Rendering

For charts within scrollable lists, render only when visible:

```tsx
import { useInView } from 'react-intersection-observer';

function LazyChart({ data }: { data: IChartProps }) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <div ref={ref} style={{ minHeight: 300 }}>
      {inView ? (
        <LineChart data={data} height={300} width={600} enablePerfOptimization />
      ) : (
        <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Loading chart...
        </div>
      )}
    </div>
  );
}
```

### Memoization

Prevent unnecessary re-renders with stable data references:

```tsx
import { useMemo } from 'react';

function PerformantChart({ rawData, filter }: Props) {
  const chartData = useMemo(() => ({
    chartTitle: 'Filtered Results',
    lineChartData: [
      {
        legend: 'Values',
        data: rawData
          .filter(d => d.category === filter)
          .map(d => ({ x: d.timestamp, y: d.value })),
        color: '#0078D4',
      },
    ],
  }), [rawData, filter]);

  return <LineChart data={chartData} enablePerfOptimization />;
}
```

### Bundle Size Optimization

Import only the chart types you need to minimize bundle size:

```tsx
// Good: specific import
import { LineChart } from '@fluentui/react-charting/lib/components/LineChart/LineChart';
import { DonutChart } from '@fluentui/react-charting/lib/components/DonutChart/DonutChart';

// Avoid: barrel import pulls entire library
// import { LineChart, DonutChart } from '@fluentui/react-charting';
```

### Performance Checklist

| Concern | Solution |
|---------|----------|
| > 100 data points | Enable `enablePerfOptimization` |
| > 1000 data points | Downsample with LTTB or max-per-bucket |
| Multiple charts on page | Lazy-load with Intersection Observer |
| Frequent data updates | Memoize chart data, debounce updates |
| Large bundle | Use deep imports for tree-shaking |
| Re-renders | Wrap chart in `React.memo`, stabilize props |
| Animation jank | Set `enableReflow={false}` for static charts |
| Tooltip flicker | Use `hideTooltip` on charts where tooltip is not needed |
