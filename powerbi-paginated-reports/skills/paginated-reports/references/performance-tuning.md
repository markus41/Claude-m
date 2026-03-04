# Performance Tuning Reference

## Query Performance

### Push Filters to the Data Source

The single most impactful optimization: filter data in the query, not in the report.

**Bad** — fetches all rows, then filters in the report:
```sql
SELECT * FROM Sales
```
With report-side filter on Region.

**Good** — fetches only needed rows:
```sql
SELECT OrderID, CustomerName, Amount, OrderDate
FROM Sales
WHERE Region = @Region
  AND OrderDate BETWEEN @StartDate AND @EndDate
```

### Limit Result Set Size

Paginated reports are not designed for millions of rows. Target:
- Detail reports: < 50,000 rows
- Summary reports: < 10,000 rows
- Export-heavy reports: < 100,000 rows

Use TOP / LIMIT clauses as safety nets:
```sql
SELECT TOP 50000 * FROM Sales
WHERE Region = @Region
ORDER BY OrderDate DESC
```

### Use Stored Procedures

Benefits:
- Pre-compiled execution plans
- Encapsulated business logic
- Parameterized by design
- Easier to tune independently

```sql
CREATE PROCEDURE dbo.usp_SalesReport
    @Region NVARCHAR(50),
    @StartDate DATE,
    @EndDate DATE
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        c.CustomerName,
        p.Category,
        SUM(s.Amount) AS TotalAmount,
        COUNT(s.OrderID) AS OrderCount
    FROM dbo.Sales s
    INNER JOIN dbo.Customers c ON s.CustomerID = c.CustomerID
    INNER JOIN dbo.Products p ON s.ProductID = p.ProductID
    WHERE s.Region = @Region
      AND s.OrderDate BETWEEN @StartDate AND @EndDate
    GROUP BY c.CustomerName, p.Category
    ORDER BY TotalAmount DESC;
END;
```

### Index Strategy

Ensure indexes exist on:
- Filter columns (WHERE clause parameters)
- Join columns (INNER/LEFT JOIN keys)
- Sort columns (ORDER BY)
- Group columns (GROUP BY)

For Fabric Lakehouse/Warehouse:
- Delta Lake tables auto-optimize with Z-ORDER
- Use OPTIMIZE command for manual compaction
- V-Order format improves read performance

### Avoid Expensive Query Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| `SELECT *` | Fetches unnecessary columns | List specific columns |
| Correlated subqueries | N+1 query execution | Use JOINs |
| DISTINCT on large sets | Full sort operation | Fix data model |
| Functions on filter columns | Prevents index use | Move function to parameter side |
| LIKE '%value%' | Full scan | Use full-text search or prefix LIKE 'value%' |
| Multiple UNIONs | Multiple scans | Use CASE or pivoting |

### DAX Query Optimization (Semantic Model)

When connecting to a Power BI semantic model:

```dax
-- Good: Use SUMMARIZECOLUMNS (optimized for Analysis Services)
EVALUATE
SUMMARIZECOLUMNS(
    'Date'[Year],
    'Product'[Category],
    FILTER(ALL('Date'[Year]), 'Date'[Year] IN {2024, 2025}),
    "Sales", [Total Sales]
)

-- Avoid: ADDCOLUMNS with row-by-row calculation
EVALUATE
ADDCOLUMNS(
    CROSSJOIN(VALUES('Date'[Year]), VALUES('Product'[Category])),
    "Sales", CALCULATE([Total Sales])
)
```

## Rendering Performance

### Minimize Subreports

Each subreport:
- Opens its own data source connection
- Runs its own query
- Renders independently
- Adds latency per instance

**Alternatives to subreports:**
- **Lookup/LookupSet** — For small cross-references (< 1000 rows in target dataset)
- **Nested groups** — For hierarchical data from the same query
- **Multiple datasets** — With expressions referencing both
- **Single query with JOINs** — Flatten the data at the query level

### Reduce Expression Complexity

Expressions evaluate per cell, per row. Complex expressions multiply render time.

**Expensive patterns:**
```vb
' Nested aggregates in detail rows
=Sum(Fields!Amount.Value, "RegionGroup") / Sum(Fields!Amount.Value, Nothing)

' String manipulation per row
=Replace(Replace(Replace(Fields!Address.Value, vbCrLf, " "), vbCr, " "), vbLf, " ")
```

**Optimizations:**
- Move calculations to the query (SQL is faster than VB.NET expressions)
- Use calculated fields in the dataset instead of cell expressions
- Cache repeated calculations in custom code functions

### Optimize Images

| Technique | Impact |
|-----------|--------|
| Compress before embedding | Reduces RDL file size and render memory |
| Use JPEG for photos | Smaller than PNG for photographic content |
| Use PNG for logos/icons | Better for solid colors, transparency |
| Target 150 DPI for screen | Higher DPI increases render time |
| External URL for large images | RDL stays small, but adds HTTP call per render |
| Limit image count per page | Each image adds memory allocation |

### Reduce Merged Cells

Merged cells in Tablix increase layout complexity. The renderer must calculate spanning across multiple columns/rows. Minimize merging in large tables.

### Use Visibility Toggling

Instead of separate detail/summary reports, use toggle visibility:
- One report with expandable sections
- Summary renders fast (detail hidden)
- User expands only sections they need
- Reduces the need for drillthrough subreports

## Caching and Snapshots

### Report Execution Settings (Power BI Service)

Configure in: Workspace > Report Settings > Execution

| Mode | Behavior | Use Case |
|------|----------|----------|
| On-demand | Fresh query every view | Real-time data, small datasets |
| Cached | Renders once, serves cached output | Large datasets, stable data |
| Snapshot | Scheduled render, stores result | Scheduled distribution, audit |

### Cache Duration

Set cache expiration in minutes (default: varies by capacity SKU). Longer cache = faster repeat views, but stale data.

### Snapshot Scheduling

```json
{
  "schedule": {
    "frequency": "Daily",
    "timeZoneId": "Eastern Standard Time",
    "times": ["06:00", "18:00"],
    "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
  }
}
```

## Capacity and SKU Considerations

### Fabric SKU Impact on Paginated Reports

| SKU | Max Memory per Report | Concurrent Renders | Notes |
|-----|----------------------|--------------------|----- |
| F2 | 256 MB | Low | Dev/test only |
| F4 | 512 MB | Moderate | Small team |
| F8 | 1 GB | Good | Departmental |
| F16 | 2 GB | High | Enterprise |
| F32+ | 4 GB+ | Very high | Large-scale |

### Memory Optimization

Reports that exceed memory limits fail with timeout or out-of-memory errors.

Reduce memory consumption:
- Fewer rows in datasets
- Fewer concurrent subreports
- Smaller embedded images
- Less complex grouping hierarchies
- Paginate large exports (use StartPage/EndPage)

### Timeout Configuration

Default render timeout: 10 minutes (600 seconds).

For long-running reports:
- Optimize queries first (target < 30 seconds query time)
- Reduce report complexity
- Consider splitting into multiple reports
- Use snapshots for complex reports

## Monitoring and Diagnostics

### Power BI Activity Log

Track report usage and performance:

```powershell
# PowerShell: Get paginated report activity
Get-PowerBIActivityEvent -StartDateTime '2025-03-01T00:00:00' -EndDateTime '2025-03-02T00:00:00' |
    ConvertFrom-Json |
    Where-Object { $_.Activity -eq 'ViewPaginatedReport' -or $_.Activity -eq 'ExportPaginatedReport' } |
    Select-Object CreationTime, UserId, Activity, ReportName, @{N='Duration';E={$_.DurationMs}}
```

### Execution Log (Admin API)

```
GET https://api.powerbi.com/v1.0/myorg/admin/reports/{reportId}/executionDetails
```

Returns: query execution time, rendering time, row count, data source latency.

### Key Performance Metrics

| Metric | Target | Action if Exceeded |
|--------|--------|--------------------|
| Query time | < 10 seconds | Optimize SQL, add indexes |
| Render time | < 30 seconds | Simplify layout, reduce expressions |
| Total time | < 60 seconds | Combine query + render optimizations |
| Memory usage | < 50% of SKU limit | Reduce dataset size, images |
| Export time | < 5 minutes | Paginate exports, reduce pages |

## Performance Checklist

- [ ] All filter parameters pushed to WHERE clause
- [ ] SELECT lists only needed columns (no `SELECT *`)
- [ ] Indexes exist on filter, join, sort columns
- [ ] Result set < 50,000 rows for detail reports
- [ ] Subreports replaced with Lookup where possible
- [ ] Images compressed and appropriately sized
- [ ] Complex calculations moved to SQL query
- [ ] Cache enabled for stable data reports
- [ ] Memory usage tested against capacity SKU
- [ ] Render time under 30 seconds for interactive use
