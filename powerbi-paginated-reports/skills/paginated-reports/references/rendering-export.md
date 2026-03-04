# Rendering & Export Reference

## Rendering Overview

Paginated reports render through the Power BI service rendering engine. The engine processes the RDL, executes queries, evaluates expressions, and produces output in the requested format.

### Rendering Pipeline

1. **Parse RDL** — Validate XML structure
2. **Resolve parameters** — Apply default values or user selections
3. **Execute queries** — Run dataset queries against data sources
4. **Evaluate expressions** — Process all VB.NET expressions
5. **Layout** — Calculate positions, page breaks, grouping
6. **Render** — Produce output in target format

## Output Formats

### PDF

**Use case**: Print-ready documents, archival, email attachments

```
Device info settings:
- StartPage / EndPage — Render specific page range
- DpiX / DpiY — Resolution (default 150)
- MarginTop / MarginBottom / MarginLeft / MarginRight — Override report margins
- HumanReadablePDF — true/false, produces tagged PDF for accessibility
- EmbedFonts — Always/None (default Always)
```

Key behaviors:
- Pixel-perfect rendering matching Report Builder preview
- All page breaks respected
- Embedded fonts for consistent display
- Hyperlinks preserved as clickable PDF links
- Bookmarks become PDF outline entries
- Images embedded at specified resolution

### Excel (EXCELOPENXML / .xlsx)

**Use case**: Data extraction, further analysis, pivot tables

```
Device info settings:
- SimplePageHeaders — true/false, simplify header rendering
- OmitDocumentMap — true/false
- OmitFormulas — true/false
```

Key behaviors:
- Each page becomes a worksheet (or single sheet depending on layout)
- Tablix data regions map to Excel tables
- Cell formatting preserved (fonts, colors, borders, number formats)
- Formulas NOT generated — all values are static
- Merged cells for spanning content
- Column widths match report layout
- Report parameters listed in first rows (optional)
- Maximum 1,048,576 rows per sheet

### Word (WORDOPENXML / .docx)

**Use case**: Editable letters, merge-ready templates, legal documents

```
Device info settings:
- AutoFit — true/false, auto-fit tables to content
```

Key behaviors:
- Layout preserved as Word tables and text frames
- Editable after export — users can modify content
- Page headers/footers become Word headers/footers
- Page breaks become Word section breaks
- Images embedded
- Hyperlinks preserved

### CSV

**Use case**: Data feeds, system imports, flat file integration

```
Device info settings:
- NoHeader — true/false (default false)
- Qualifier — Quote character (default ")
- Delimiter — Field separator (default ,)
- FileExtension — .csv (default)
- Encoding — UTF-8 (default)
```

Key behaviors:
- Flat data only — no formatting, images, or layout
- One row per detail row
- Group headers/footers excluded
- Only the first data region is exported
- Column names from field names (or textbox values)

### XML

**Use case**: System integration, data exchange, XSLT transformation

```
Device info settings:
- XSLT — Path to XSLT stylesheet for transformation
- DataElementOutput — Output / NoOutput per element
- Encoding — UTF-8 (default)
```

Key behaviors:
- Hierarchical XML matching report structure
- Elements named after fields and groups
- Attributes for metadata
- Can apply XSLT for custom output schemas

### MHTML (Web Archive)

**Use case**: Email body, single-file web archive

Key behaviors:
- Single file containing HTML + embedded images
- CSS styling preserved
- Interactive features disabled (no drill-down)
- Suitable for email rendering

### PowerPoint (PPTX)

**Use case**: Presentation slides

Key behaviors:
- Each report page becomes a slide
- Layout rendered as PowerPoint shapes
- Images embedded
- Text editable in PowerPoint
- Charts become static images (not native PowerPoint charts)

### TIFF (Image)

**Use case**: Image archive, fax systems

```
Device info settings:
- DpiX / DpiY — Resolution (default 96)
- StartPage / EndPage — Page range
- ColorDepth — 1 (B&W), 4, 8, 24, 32
- Compression — LZW, CCITT3, CCITT4, RLE, None
```

Key behaviors:
- Multi-page TIFF (all pages in one file)
- Pixel-perfect rendering
- Configurable resolution and color depth
- CCITT4 compression for B&W fax-quality output

## Interactive HTML (Browser)

Default format when viewing in the Power BI service.

Features:
- **Search** — Find text within the rendered report
- **Sort** — Click column headers to sort (if interactive sorting enabled)
- **Drill-down** — Expand/collapse toggle items
- **Document map** — Sidebar navigation from DocumentMapLabel elements
- **Parameters toolbar** — Parameter selection UI at the top
- **Export menu** — Download in any format
- **Print** — Browser print dialog with print-optimized CSS

### Interactive Sorting

Enable in Tablix column header textbox properties:
```xml
<UserSort>
  <SortExpression>=Fields!Amount.Value</SortExpression>
</UserSort>
```

## Export via REST API

### ExportTo Endpoint

```
POST https://api.powerbi.com/v1.0/myorg/groups/{workspaceId}/reports/{reportId}/ExportTo
```

### Request Body

```json
{
  "format": "PDF",
  "paginatedReportConfiguration": {
    "parameterValues": [
      { "name": "Region", "value": "North" },
      { "name": "StartDate", "value": "2025-01-01" },
      { "name": "EndDate", "value": "2025-03-31" }
    ],
    "formatSettings": {
      "PDF": {
        "StartPage": 1,
        "EndPage": 10,
        "DpiX": 300,
        "DpiY": 300
      }
    }
  }
}
```

### Format Values

| API Format Value | Extension |
|-----------------|-----------|
| `PDF` | .pdf |
| `EXCELOPENXML` | .xlsx |
| `WORDOPENXML` | .docx |
| `CSV` | .csv |
| `XML` | .xml |
| `MHTML` | .mhtml |
| `PPTX` | .pptx |
| `IMAGE` | .tiff |
| `ACCESSIBLEPDF` | .pdf (tagged) |

### Export Flow

```
1. POST ExportTo → returns { "id": "export-id" }
2. GET /exports/{export-id} → poll status (NotStarted → Running → Succeeded/Failed)
3. GET /exports/{export-id}/file → binary stream (when status = Succeeded)
```

Polling interval: start at 5 seconds, increase to 30 seconds max.

### TypeScript Example

```typescript
import axios from 'axios';

async function exportReport(
  token: string,
  workspaceId: string,
  reportId: string,
  format: string,
  params: { name: string; value: string }[]
): Promise<Buffer> {
  const baseUrl = 'https://api.powerbi.com/v1.0/myorg';

  // Start export
  const exportRes = await axios.post(
    `${baseUrl}/groups/${workspaceId}/reports/${reportId}/ExportTo`,
    {
      format,
      paginatedReportConfiguration: {
        parameterValues: params,
      },
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const exportId = exportRes.data.id;

  // Poll for completion
  let status = 'NotStarted';
  while (status !== 'Succeeded' && status !== 'Failed') {
    await new Promise(resolve => setTimeout(resolve, 5000));
    const statusRes = await axios.get(
      `${baseUrl}/groups/${workspaceId}/reports/${reportId}/exports/${exportId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    status = statusRes.data.status;
    if (status === 'Failed') {
      throw new Error(`Export failed: ${statusRes.data.error?.message}`);
    }
  }

  // Download file
  const fileRes = await axios.get(
    `${baseUrl}/groups/${workspaceId}/reports/${reportId}/exports/${exportId}/file`,
    {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'arraybuffer',
    }
  );

  return Buffer.from(fileRes.data);
}
```

## Page Break Control

### Break Locations

- `Start` — Break before the item
- `End` — Break after the item
- `StartAndEnd` — Break before and after
- `Between` — Break between instances (groups)

### Group-Level Page Breaks

```xml
<Group Name="InvoiceGroup">
  <GroupExpressions>
    <GroupExpression>=Fields!InvoiceID.Value</GroupExpression>
  </GroupExpressions>
  <PageBreak>
    <BreakLocation>Between</BreakLocation>
  </PageBreak>
</Group>
```

### Conditional Page Breaks

```xml
<PageBreak>
  <BreakLocation>Between</BreakLocation>
  <Disabled>=IIF(RowNumber(Nothing) Mod 50 = 0, False, True)</Disabled>
</PageBreak>
```

### KeepTogether Property

Prevents a data region or group from splitting across pages:

```xml
<KeepTogether>true</KeepTogether>
```

### KeepWithGroup

Controls whether header/footer rows stay with their group on the same page:

```xml
<TablixMember>
  <KeepWithGroup>After</KeepWithGroup>   <!-- Header stays with data -->
  <RepeatOnNewPage>true</RepeatOnNewPage> <!-- Repeat on continuation pages -->
</TablixMember>
```

Values: `None`, `Before`, `After`

## Device Info Reference

Device info settings control renderer-specific behavior. Pass via export API or report URL parameters.

### URL Parameter Format

```
https://app.powerbi.com/rdlreports?reportId={id}&rs:Format=PDF&rc:DpiX=300&rc:DpiY=300
```

- `rs:Format` — Output format
- `rs:ParameterLanguage` — Parameter date/number culture
- `rc:*` — Device info settings (renderer configuration)
- `rp:*` — Report parameter values

### Common Device Info Settings (All Renderers)

| Setting | Type | Description |
|---------|------|-------------|
| `StartPage` | int | First page to render |
| `EndPage` | int | Last page to render |
| `StreamRoot` | string | Path prefix for external resources |
| `Toolbar` | bool | Show/hide parameter toolbar (HTML only) |

### PDF-Specific

| Setting | Default | Description |
|---------|---------|-------------|
| `DpiX` | 150 | Horizontal resolution |
| `DpiY` | 150 | Vertical resolution |
| `HumanReadablePDF` | false | Tagged PDF for accessibility |
| `EmbedFonts` | Always | Font embedding (Always/None) |

### Excel-Specific

| Setting | Default | Description |
|---------|---------|-------------|
| `SimplePageHeaders` | false | Simplify header rendering |
| `OmitDocumentMap` | false | Exclude document map sheet |
| `OmitFormulas` | false | Exclude calculated expressions |

### Image (TIFF)-Specific

| Setting | Default | Description |
|---------|---------|-------------|
| `DpiX` | 96 | Horizontal resolution |
| `DpiY` | 96 | Vertical resolution |
| `ColorDepth` | 24 | Bits per pixel (1, 4, 8, 24, 32) |
| `Compression` | LZW | LZW, CCITT3, CCITT4, RLE, None |
| `OutputFormat` | TIFF | Also supports BMP, EMF, GIF, JPEG, PNG |
