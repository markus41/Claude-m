# Layout Analysis Reference — Azure AI Document Intelligence

Complete reference for the `prebuilt-layout` model capabilities: document structure extraction, table parsing, figure detection, selection marks, barcode recognition, and coordinate systems.

---

## Layout Model Overview

The `prebuilt-layout` model extracts structural elements from documents without domain-specific field extraction. Use it when you need:

- **Tables** — row/column structure, headers, merged cells, multi-page tables
- **Paragraphs** — with semantic roles (title, heading, footnote, header, footer)
- **Figures** — images, charts, diagrams with captions
- **Selection marks** — checkboxes, radio buttons with state
- **Barcodes** — QR codes, Code 128, EAN, UPC, and more
- **Page metadata** — dimensions, rotation, word-level OCR

The layout model is cheaper per page than domain-specific prebuilt models. Use it when you need structure but not field extraction.

---

## Analyze with Layout Model

### REST API

```http
POST https://{endpoint}/documentintelligence/documentModels/prebuilt-layout:analyze?api-version=2024-11-30
Ocp-Apim-Subscription-Key: {apiKey}
Content-Type: application/json

{
  "urlSource": "https://example.com/report.pdf"
}
```

### Optional Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `pages` | string | Page range (e.g., "1-3", "1,3,5-7") | All pages |
| `locale` | string | Document locale hint (e.g., "en-US") | Auto-detect |
| `features` | array | Optional features: `barcodes`, `formulas`, `keyValuePairs`, `languages`, `styleFont` | None |
| `outputContentFormat` | string | `text` or `markdown` | `text` |

Example with optional features:

```http
POST .../prebuilt-layout:analyze?api-version=2024-11-30&features=barcodes,keyValuePairs
```

---

## Result Structure

The `AnalyzeResult` from the layout model contains:

```json
{
  "apiVersion": "2024-11-30",
  "modelId": "prebuilt-layout",
  "stringIndexType": "utf16CodeUnit",
  "content": "Full extracted text content...",
  "pages": [...],
  "paragraphs": [...],
  "tables": [...],
  "figures": [...],
  "styles": [...],
  "sections": [...],
  "languages": [...]
}
```

---

## Pages

Each page contains word-level and line-level OCR results plus metadata.

```json
{
  "pageNumber": 1,
  "angle": 0.0,
  "width": 8.5,
  "height": 11.0,
  "unit": "inch",
  "words": [
    {
      "content": "Invoice",
      "polygon": [1.0, 0.5, 1.8, 0.5, 1.8, 0.7, 1.0, 0.7],
      "confidence": 0.99,
      "span": { "offset": 0, "length": 7 }
    }
  ],
  "lines": [
    {
      "content": "Invoice #12345",
      "polygon": [1.0, 0.5, 3.5, 0.5, 3.5, 0.7, 1.0, 0.7],
      "spans": [{ "offset": 0, "length": 14 }]
    }
  ],
  "selectionMarks": [...],
  "barcodes": [...]
}
```

### Page Properties

| Property | Type | Description |
|----------|------|-------------|
| `pageNumber` | integer | 1-based page number |
| `angle` | number | Rotation angle in degrees (-180 to 180) |
| `width` | number | Page width in the specified unit |
| `height` | number | Page height in the specified unit |
| `unit` | string | `inch` (PDFs) or `pixel` (images) |
| `words` | array | Individual words with confidence and polygon |
| `lines` | array | Lines of text (word groupings) |
| `selectionMarks` | array | Checkboxes and radio buttons |
| `barcodes` | array | Detected barcodes (when `barcodes` feature enabled) |

---

## Paragraphs

Paragraphs provide semantic structure with roles.

```json
{
  "role": "title",
  "content": "Quarterly Financial Report",
  "boundingRegions": [
    {
      "pageNumber": 1,
      "polygon": [1.0, 0.3, 6.5, 0.3, 6.5, 0.6, 1.0, 0.6]
    }
  ],
  "spans": [{ "offset": 0, "length": 28 }]
}
```

### Paragraph Roles

| Role | Description | Use Case |
|------|-------------|----------|
| `title` | Document title | Identify document name |
| `sectionHeading` | Section header | Build table of contents, structure navigation |
| `footnote` | Footnote text | Separate footnotes from body text |
| `pageHeader` | Repeated page header | Filter out non-content text |
| `pageFooter` | Repeated page footer | Filter out non-content text |
| `pageNumber` | Page number | Navigation, ordering |
| `formulaBlock` | Mathematical formula | Specialized processing |
| (none) | Regular body paragraph | Main content |

### Reading Order

Paragraphs are returned in reading order (top-to-bottom, left-to-right for LTR languages). Multi-column layouts are detected and paragraphs are ordered by column.

For documents with complex layouts (sidebars, callout boxes), the reading order follows visual flow:
1. Main content column first
2. Sidebars and callouts in visual order
3. Headers before body text
4. Footnotes at the end

---

## Tables

Tables are extracted with full structural information including headers, merged cells, and multi-page spanning.

### Table Object

```json
{
  "rowCount": 5,
  "columnCount": 4,
  "boundingRegions": [
    { "pageNumber": 1, "polygon": [0.5, 3.0, 7.5, 3.0, 7.5, 6.0, 0.5, 6.0] }
  ],
  "spans": [{ "offset": 200, "length": 450 }],
  "cells": [...]
}
```

### Cell Object

```json
{
  "rowIndex": 0,
  "columnIndex": 0,
  "content": "Product Name",
  "kind": "columnHeader",
  "rowSpan": 1,
  "columnSpan": 1,
  "boundingRegions": [
    {
      "pageNumber": 1,
      "polygon": [0.5, 3.0, 2.5, 3.0, 2.5, 3.3, 0.5, 3.3]
    }
  ],
  "spans": [{ "offset": 200, "length": 12 }],
  "confidence": 0.95
}
```

### Cell Kinds

| Kind | Description | Typical Position |
|------|-------------|-----------------|
| `columnHeader` | Column header cell | Top row |
| `rowHeader` | Row header cell | First column |
| `content` | Regular data cell | Body of table |
| `stub` | Empty or spacer cell | Corner cells, merged areas |
| `description` | Description/caption cell | Above or below table |

### Merged Cells

Cells that span multiple rows or columns use `rowSpan` and `columnSpan`:

```json
{
  "rowIndex": 0,
  "columnIndex": 0,
  "content": "Financial Summary",
  "kind": "columnHeader",
  "rowSpan": 1,
  "columnSpan": 4
}
```

This cell occupies columns 0-3 in row 0.

### Multi-Page Tables

Tables spanning multiple pages are tracked as a single table object. Cells include `boundingRegions` with different `pageNumber` values:

```json
{
  "rowCount": 50,
  "columnCount": 5,
  "boundingRegions": [
    { "pageNumber": 1, "polygon": [...] },
    { "pageNumber": 2, "polygon": [...] }
  ],
  "cells": [
    { "rowIndex": 0, "columnIndex": 0, "content": "Header", "boundingRegions": [{ "pageNumber": 1, ... }] },
    { "rowIndex": 30, "columnIndex": 0, "content": "Row 31", "boundingRegions": [{ "pageNumber": 2, ... }] }
  ]
}
```

### Converting Table to Markdown

```python
def table_to_markdown(table):
    """Convert a Document Intelligence table to markdown."""
    # Build grid
    grid = {}
    for cell in table["cells"]:
        grid[(cell["rowIndex"], cell["columnIndex"])] = cell["content"]

    rows = []
    for r in range(table["rowCount"]):
        row = []
        for c in range(table["columnCount"]):
            row.append(grid.get((r, c), ""))
        rows.append("| " + " | ".join(row) + " |")

    # Insert separator after header row
    if rows:
        sep = "| " + " | ".join(["---"] * table["columnCount"]) + " |"
        rows.insert(1, sep)

    return "\n".join(rows)
```

### Converting Table to CSV

```python
import csv
import io

def table_to_csv(table):
    """Convert a Document Intelligence table to CSV string."""
    output = io.StringIO()
    writer = csv.writer(output)

    grid = {}
    for cell in table["cells"]:
        grid[(cell["rowIndex"], cell["columnIndex"])] = cell["content"]

    for r in range(table["rowCount"]):
        row = [grid.get((r, c), "") for c in range(table["columnCount"])]
        writer.writerow(row)

    return output.getvalue()
```

---

## Figures

Figures represent images, charts, diagrams, and other non-text visual elements.

```json
{
  "id": "figure-1",
  "boundingRegions": [
    {
      "pageNumber": 2,
      "polygon": [1.0, 2.0, 6.0, 2.0, 6.0, 5.0, 1.0, 5.0]
    }
  ],
  "spans": [{ "offset": 500, "length": 0 }],
  "caption": {
    "content": "Figure 1: Revenue trend 2020-2024",
    "boundingRegions": [
      { "pageNumber": 2, "polygon": [1.5, 5.1, 5.5, 5.1, 5.5, 5.3, 1.5, 5.3] }
    ],
    "spans": [{ "offset": 500, "length": 36 }]
  },
  "elements": ["/paragraphs/15", "/paragraphs/16"]
}
```

### Figure Properties

| Property | Description |
|----------|-------------|
| `id` | Unique identifier for cross-referencing |
| `boundingRegions` | Location on the page |
| `caption` | Detected caption text and location |
| `elements` | References to related paragraphs/content |
| `footnotes` | Related footnote elements |

---

## Selection Marks

Checkboxes, radio buttons, and other selection indicators.

```json
{
  "state": "selected",
  "confidence": 0.98,
  "polygon": [1.2, 3.4, 1.4, 3.4, 1.4, 3.6, 1.2, 3.6],
  "span": { "offset": 120, "length": 1 }
}
```

### Selection Mark States

| State | Description |
|-------|-------------|
| `selected` | Checkbox is checked / radio button is filled |
| `unselected` | Checkbox is unchecked / radio button is empty |

### Working with Selection Marks

To determine what a selection mark refers to, use its position relative to nearby text:

```python
def find_nearest_text(selection_mark, words):
    """Find the text nearest to a selection mark."""
    sm_x = (selection_mark["polygon"][0] + selection_mark["polygon"][2]) / 2
    sm_y = (selection_mark["polygon"][1] + selection_mark["polygon"][5]) / 2

    closest = None
    min_dist = float("inf")

    for word in words:
        w_x = (word["polygon"][0] + word["polygon"][2]) / 2
        w_y = (word["polygon"][1] + word["polygon"][5]) / 2
        dist = ((sm_x - w_x)**2 + (sm_y - w_y)**2) ** 0.5

        if dist < min_dist:
            min_dist = dist
            closest = word

    return closest["content"] if closest else None
```

---

## Barcode Recognition

Barcodes are detected when the `barcodes` feature is enabled.

```http
POST .../prebuilt-layout:analyze?api-version=2024-11-30&features=barcodes
```

### Barcode Object

```json
{
  "kind": "QRCode",
  "value": "https://example.com/product/12345",
  "polygon": [3.0, 1.0, 4.5, 1.0, 4.5, 2.5, 3.0, 2.5],
  "span": { "offset": 0, "length": 0 },
  "confidence": 0.99
}
```

### Supported Barcode Formats

| Format | Kind Value | Description |
|--------|-----------|-------------|
| QR Code | `QRCode` | 2D matrix barcode |
| Code 128 | `Code128` | High-density alphanumeric |
| Code 39 | `Code39` | Alphanumeric, self-checking |
| Code 93 | `Code93` | Higher density than Code 39 |
| UPC-A | `UPCA` | 12-digit product code (US) |
| UPC-E | `UPCE` | Compressed UPC-A (6 digit) |
| EAN-8 | `EAN8` | 8-digit product code |
| EAN-13 | `EAN13` | 13-digit product code (international) |
| ITF | `ITF` | Interleaved 2 of 5 |
| Codabar | `Codabar` | Libraries, blood banks |
| DataBar | `DataBar` | GS1 DataBar |
| DataBar Expanded | `DataBarExpanded` | GS1 DataBar with additional data |
| PDF417 | `PDF417` | 2D stacked barcode |
| Data Matrix | `DataMatrix` | 2D matrix (industrial) |

---

## Coordinate System

### Units

| Document Type | Unit | Reference |
|---------------|------|-----------|
| PDF | `inch` | 72 points per inch |
| Image (JPEG, PNG, etc.) | `pixel` | Native image resolution |
| TIFF | `inch` | Based on DPI metadata |

### Polygon Format

Polygons are arrays of 8 numbers representing 4 corner points in clockwise order:

```
[x1, y1, x2, y2, x3, y3, x4, y4]

(x1,y1) ─── (x2,y2)
   |             |
(x4,y4) ─── (x3,y3)
```

- `(x1, y1)` = top-left
- `(x2, y2)` = top-right
- `(x3, y3)` = bottom-right
- `(x4, y4)` = bottom-left

Origin is the top-left corner of the page.

### Converting Coordinates

```python
def polygon_to_pixels(polygon, page_width_inches, page_height_inches, image_width_px, image_height_px):
    """Convert inch-based polygon to pixel coordinates."""
    x_scale = image_width_px / page_width_inches
    y_scale = image_height_px / page_height_inches

    return [
        polygon[i] * x_scale if i % 2 == 0 else polygon[i] * y_scale
        for i in range(len(polygon))
    ]

def polygon_to_bbox(polygon):
    """Convert polygon to bounding box (x, y, width, height)."""
    xs = [polygon[i] for i in range(0, len(polygon), 2)]
    ys = [polygon[i] for i in range(1, len(polygon), 2)]
    x = min(xs)
    y = min(ys)
    return {
        "x": x,
        "y": y,
        "width": max(xs) - x,
        "height": max(ys) - y
    }
```

### Handling Rotated Pages

Pages may have a non-zero `angle` value (rotation). When rendering overlays:

1. Check `page.angle` — if non-zero, the page content is rotated
2. Coordinates are always relative to the unrotated page
3. Apply rotation transform when rendering bounding boxes on the rotated image

```python
import math

def rotate_point(x, y, angle_degrees, center_x, center_y):
    """Rotate a point around a center."""
    angle_rad = math.radians(angle_degrees)
    cos_a = math.cos(angle_rad)
    sin_a = math.sin(angle_rad)
    dx = x - center_x
    dy = y - center_y
    return (
        center_x + dx * cos_a - dy * sin_a,
        center_y + dx * sin_a + dy * cos_a
    )
```

---

## Markdown Output Format

When `outputContentFormat` is set to `markdown`, the content field returns structured markdown:

```http
POST .../prebuilt-layout:analyze?api-version=2024-11-30&outputContentFormat=markdown
```

The markdown output includes:
- Headings (`#`, `##`, `###`) for title and section heading paragraphs
- Markdown tables for extracted tables
- Checkbox syntax (`[x]` and `[ ]`) for selection marks
- Figure references with captions

This is useful for feeding document content to LLMs that process markdown well.

---

## Performance Tips

1. **Page range filtering** — Specify `pages` parameter to analyze only the pages you need. Reduces latency and cost.

2. **Feature selection** — Only enable optional features (`barcodes`, `formulas`, `keyValuePairs`) when needed. Each feature adds processing time.

3. **Image resolution** — For scanned documents, 300 DPI provides the best accuracy/speed tradeoff. Higher DPI increases file size and latency without significant accuracy gains. Below 150 DPI, accuracy degrades noticeably.

4. **PDF vs image** — Native digital PDFs (not scanned) are processed faster and more accurately than scanned images. When possible, use the original PDF rather than a scanned version.

5. **File size** — Compress images before submission. JPEG at 85% quality provides good accuracy while reducing file size significantly compared to PNG or uncompressed TIFF.

6. **Concurrent requests** — S0 tier allows 15 RPS. For batch workloads, use concurrent requests with a semaphore to maximize throughput without hitting rate limits.

---

## Common Issues

1. **Tables not detected** — Very light table borders or borderless tables may not be detected. Consider using `prebuilt-document` with key-value pair extraction as a fallback.

2. **Wrong reading order** — Complex multi-column layouts may produce incorrect reading order. Check `paragraphs` role assignments and use `boundingRegions` to determine spatial position.

3. **Selection marks misclassified** — Partially filled checkboxes may be classified as `unselected`. If your forms have partially filled marks, add post-processing logic to check confidence scores.

4. **Barcode not decoded** — Damaged or partially obscured barcodes may be detected but not decoded (empty `value`). Check the `confidence` score and handle null/empty values.

5. **Multi-page table split** — If a table header is not repeated on page 2, the continuation may be treated as a separate table. Check `boundingRegions` across pages to identify split tables.

6. **Rotated content** — Pages scanned at an angle have non-zero `angle` values. The layout model auto-corrects for small rotations (< 15 degrees). For heavily rotated pages, pre-process with image rotation.
