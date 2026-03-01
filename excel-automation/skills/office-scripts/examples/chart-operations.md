# Chart Operations Examples

Complete code examples for creating and customizing charts in Office Scripts.

## Chart Type Reference

| Category | ExcelScript.ChartType | Description |
|----------|----------------------|-------------|
| Column | `columnClustered` | Standard vertical bars, side by side |
| Column | `columnStacked` | Vertical bars stacked on top |
| Column | `columnStacked100` | Vertical bars stacked to 100% |
| Bar | `barClustered` | Horizontal bars, side by side |
| Bar | `barStacked` | Horizontal bars stacked |
| Bar | `barStacked100` | Horizontal bars stacked to 100% |
| Line | `line` | Standard line chart |
| Line | `lineMarkers` | Line with data point markers |
| Line | `lineStacked` | Lines stacked on top |
| Line | `lineStackedMarkers` | Stacked lines with markers |
| Pie | `pie` | Standard pie chart |
| Pie | `doughnut` | Pie with hollow center |
| Pie | `pieExploded` | Pie with separated slices |
| Area | `area` | Standard area chart |
| Area | `areaStacked` | Areas stacked |
| Area | `areaStacked100` | Areas stacked to 100% |
| Scatter | `xyscatter` | Points only (no lines) |
| Scatter | `xyscatterLines` | Points connected by lines |
| Scatter | `xyscatterSmooth` | Points with smooth curves |
| Special | `radar` | Radar/spider chart |
| Special | `waterfall` | Waterfall chart |
| Special | `funnel` | Funnel chart |
| Special | `treemap` | Treemap |
| Special | `sunburst` | Sunburst/multilevel pie |
| Special | `histogram` | Histogram |
| Special | `boxwhisker` | Box and whisker |

## 1. Create a Clustered Column Chart

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();

  // Assume data in A1:C7 (Month, Revenue, Expenses)
  let dataRange = sheet.getRange("A1:C7");

  // Create chart
  let chart = sheet.addChart(ExcelScript.ChartType.columnClustered, dataRange);
  chart.setName("MonthlyComparison");

  // Position and size
  chart.setPosition("E2");
  chart.setWidth(500);
  chart.setHeight(350);

  // Title
  chart.getTitle().setVisible(true);
  chart.getTitle().setText("Revenue vs Expenses");
  chart.getTitle().getFormat().getFont().setSize(14);
  chart.getTitle().getFormat().getFont().setBold(true);

  // Legend
  chart.getLegend().setVisible(true);
  chart.getLegend().setPosition(ExcelScript.ChartLegendPosition.bottom);

  // Value axis
  let valueAxis = chart.getAxes().getValueAxis();
  valueAxis.setNumberFormat("$#,##0");
  valueAxis.getTitle().setText("Amount ($)");
  valueAxis.getTitle().setVisible(true);

  // Category axis
  let categoryAxis = chart.getAxes().getCategoryAxis();
  categoryAxis.getTitle().setText("Month");
  categoryAxis.getTitle().setVisible(true);

  // Series colors
  let series = chart.getSeries();
  if (series.length >= 2) {
    series[0].getFormat().getFill().setSolidColor("#4472C4"); // Revenue = blue
    series[1].getFormat().getFill().setSolidColor("#ED7D31"); // Expenses = orange
  }
}
```

## 2. Create a Pie Chart with Data Labels

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();

  // Data: A1:B5 (Category, Value)
  let data: (string | number)[][] = [
    ["Category", "Sales"],
    ["Electronics", 45000],
    ["Clothing", 28000],
    ["Food", 18000],
    ["Other", 9000]
  ];
  sheet.getRange("A1:B5").setValues(data);

  let chart = sheet.addChart(ExcelScript.ChartType.pie, sheet.getRange("A1:B5"));
  chart.setName("SalesBreakdown");
  chart.setPosition("D2");
  chart.setWidth(400);
  chart.setHeight(400);

  // Title
  chart.getTitle().setVisible(true);
  chart.getTitle().setText("Sales by Category");

  // Data labels
  let pieSeries = chart.getSeries()[0];
  pieSeries.setHasDataLabels(true);
  let labels = pieSeries.getDataLabels();
  labels.setShowCategoryName(true);
  labels.setShowPercentage(true);
  labels.setShowValue(false);
  labels.setShowSeriesName(false);
  labels.setSeparator("\n");
  labels.getFormat().getFont().setSize(10);

  // Explode the first slice
  pieSeries.setExplosion(10);

  // Legend
  chart.getLegend().setVisible(false); // Labels are enough
}
```

## 3. Create a Line Chart with Markers

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();

  // Assume time-series data in A1:B13 (Month, Value)
  let dataRange = sheet.getRange("A1:B13");

  let chart = sheet.addChart(ExcelScript.ChartType.lineMarkers, dataRange);
  chart.setName("TrendChart");
  chart.setPosition("D2");
  chart.setWidth(550);
  chart.setHeight(350);

  // Title
  chart.getTitle().setVisible(true);
  chart.getTitle().setText("Monthly Trend");

  // Customize the series
  let series = chart.getSeries()[0];
  series.getFormat().getLine().setColor("#4472C4");
  series.getFormat().getLine().setWeight(2.5);
  series.setMarkerStyle(ExcelScript.ChartMarkerStyle.circle);
  series.setMarkerSize(8);
  series.setMarkerForegroundColor("#4472C4");
  series.setMarkerBackgroundColor("white");

  // Data labels on the line
  series.setHasDataLabels(true);
  let labels = series.getDataLabels();
  labels.setShowValue(true);
  labels.setPosition(ExcelScript.ChartDataLabelPosition.above);
  labels.getFormat().getFont().setSize(9);
  labels.setNumberFormat("#,##0");

  // Value axis
  let valueAxis = chart.getAxes().getValueAxis();
  valueAxis.setMinimum(0);
  valueAxis.setMajorGridlinesVisible(true);

  // Category axis
  let categoryAxis = chart.getAxes().getCategoryAxis();
  categoryAxis.setTickLabelRotation(45);
}
```

## 4. Create a Stacked Bar Chart from Table Data

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();
  let table = sheet.getTable("QuarterlyData");
  if (!table) {
    console.log("Table 'QuarterlyData' not found");
    return;
  }

  // Use the table's full range as chart data
  let chartData = table.getRange();

  let chart = sheet.addChart(ExcelScript.ChartType.barStacked, chartData);
  chart.setName("QuarterlyBreakdown");
  chart.setPosition("G2");
  chart.setWidth(500);
  chart.setHeight(400);

  // Title
  chart.getTitle().setVisible(true);
  chart.getTitle().setText("Quarterly Revenue by Region");
  chart.getTitle().getFormat().getFont().setSize(14);

  // Legend at right
  chart.getLegend().setVisible(true);
  chart.getLegend().setPosition(ExcelScript.ChartLegendPosition.right);

  // Value axis formatting
  let valueAxis = chart.getAxes().getValueAxis();
  valueAxis.setNumberFormat("$#,##0K");
  valueAxis.getTitle().setText("Revenue");
  valueAxis.getTitle().setVisible(true);

  // Custom series colors
  let colors = ["#4472C4", "#ED7D31", "#A5A5A5", "#FFC000"];
  let allSeries = chart.getSeries();
  for (let i = 0; i < allSeries.length && i < colors.length; i++) {
    allSeries[i].getFormat().getFill().setSolidColor(colors[i]);
  }
}
```

## 5. Create Multiple Charts from the Same Data

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();
  let dataRange = sheet.getRange("A1:D7"); // Month, Sales, Costs, Profit

  // Chart 1: Column chart for Sales and Costs
  let chart1 = sheet.addChart(
    ExcelScript.ChartType.columnClustered,
    sheet.getRange("A1:C7") // Month, Sales, Costs only
  );
  chart1.setName("SalesVsCosts");
  chart1.setPosition("F2");
  chart1.setWidth(450);
  chart1.setHeight(300);
  chart1.getTitle().setVisible(true);
  chart1.getTitle().setText("Sales vs Costs");

  // Chart 2: Line chart for Profit trend
  let chart2 = sheet.addChart(
    ExcelScript.ChartType.lineMarkers,
    sheet.getRange("A1:A7,D1:D7") // Month + Profit (non-contiguous needs workaround)
  );
  chart2.setName("ProfitTrend");
  chart2.setPosition("F20");
  chart2.setWidth(450);
  chart2.setHeight(300);
  chart2.getTitle().setVisible(true);
  chart2.getTitle().setText("Profit Trend");

  // Note: For non-contiguous ranges, you may need to set series data manually
  // or restructure the data to be contiguous.
}
```

## 6. Delete and Replace a Chart

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();

  // Delete existing chart if present
  let existingChart = sheet.getChart("SalesChart");
  if (existingChart) {
    existingChart.delete();
  }

  // Create fresh chart with updated data
  let usedRange = sheet.getUsedRange();
  if (!usedRange) return;

  let chart = sheet.addChart(ExcelScript.ChartType.columnClustered, usedRange);
  chart.setName("SalesChart");
  chart.setPosition("F2");
  chart.setWidth(500);
  chart.setHeight(350);
  chart.getTitle().setVisible(true);
  chart.getTitle().setText("Updated Sales Data");
}
```

## 7. Format All Charts on a Sheet

```typescript
function main(workbook: ExcelScript.Workbook) {
  let sheet = workbook.getActiveWorksheet();
  let charts = sheet.getCharts();

  for (let chart of charts) {
    // Consistent title formatting
    if (chart.getTitle().getVisible()) {
      chart.getTitle().getFormat().getFont().setSize(14);
      chart.getTitle().getFormat().getFont().setBold(true);
      chart.getTitle().getFormat().getFont().setName("Calibri");
    }

    // Legend at bottom
    chart.getLegend().setPosition(ExcelScript.ChartLegendPosition.bottom);

    // Standard size
    chart.setWidth(500);
    chart.setHeight(350);

    console.log(`Formatted chart: ${chart.getName()}`);
  }
}
```
