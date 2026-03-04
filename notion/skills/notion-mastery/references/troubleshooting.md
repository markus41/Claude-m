# Notion Troubleshooting — Common Issues and Solutions

Diagnostic guide for common Notion problems when working with MCP tools, the REST API, and page design.

## MCP Tool Errors

### "Page not found" / 404

**Cause**: The page URL is invalid, the page was deleted, or the integration doesn't have access.

**Fix**:
1. Verify the URL is correct (copy directly from Notion)
2. Check that the integration is connected to the page (Page → ... → Connections)
3. If the page is in a teamspace, ensure the integration has teamspace access
4. Try searching for the page with `notion-search` to confirm it exists

### "Cannot update page" / 403

**Cause**: The integration lacks write permissions.

**Fix**:
1. Check integration capabilities at https://www.notion.so/my-integrations
2. Ensure "Update content" capability is enabled
3. Verify the integration is shared with the specific page
4. Parent page access doesn't automatically grant child page access — share explicitly

### "Invalid content" / Malformed Markdown

**Cause**: Notion-flavored Markdown syntax error.

**Common issues**:
- Missing closing `:::` for callouts
- Unindented children in toggle headings
- Using `<strong>` instead of `**` inside callouts and tables
- Unescaped special characters outside code blocks
- Missing tab indentation (using spaces instead)
- Empty list items without text

**Fix**:
1. Check callout syntax: Opening `:::` and closing `:::` on their own lines
2. Verify toggle heading children are tab-indented
3. Use Notion-flavored Markdown (not HTML) for inline formatting
4. Escape special characters: `\ * ~ \` $ [ ] < > { } | ^`
5. Use tabs (not spaces) for indentation

### "Rate limited" / 429

**Cause**: Too many requests to the Notion API (3 requests/second limit).

**Fix**:
1. Add delays between consecutive MCP tool calls
2. Batch operations where possible (create multiple pages in one call)
3. Respect the `Retry-After` header
4. For bulk operations, use the REST API with rate limiting logic

### "Property not found"

**Cause**: The property name doesn't match the database schema exactly.

**Fix**:
1. Fetch the database with `notion-fetch` to see exact property names
2. Property names are case-sensitive
3. Check for leading/trailing spaces in property names
4. If a property was recently renamed, the old name no longer works

## Page Design Issues

### Content Not Inside Toggle

**Symptom**: Content appears below a toggle heading instead of inside it.

**Cause**: Children are not tab-indented.

**Fix**:
```
## Section {toggle="true"}
	This content IS inside the toggle (tab-indented)

## Section {toggle="true"}
This content is NOT inside the toggle (no indentation)
```

### Callout Not Rendering

**Symptom**: Raw Markdown text appears instead of a callout block.

**Cause**: Incorrect callout syntax.

**Fix**:
```
::: callout {icon="💡" color="yellow_bg"}
Content here
:::
```

Common mistakes:
- Using `:::callout` without a space (must be `::: callout`)
- Missing closing `:::`
- Putting the closing `:::` on the same line as content

### Table Cells Showing Raw Markdown

**Symptom**: Bold, links, or other formatting appears as raw text in table cells.

**Cause**: Using HTML instead of Notion Markdown inside tables.

**Fix**:
```
<!-- Wrong -->
<td><strong>Bold</strong></td>

<!-- Right -->
<td>**Bold**</td>
```

### Columns Not Displaying

**Symptom**: Content appears in a single column instead of side by side.

**Cause**: Missing indentation or incorrect XML structure.

**Fix**:
```
<columns>
	<column>
		Left content (must be indented)
	</column>
	<column>
		Right content (must be indented)
	</column>
</columns>
```

### Mermaid Diagram Errors

**Symptom**: Diagram shows syntax errors or doesn't render.

**Common fixes**:
- Wrap node text with special characters in double quotes: `A["Notion (App)"]`
- Use `<br>` for line breaks (not `\n`)
- Don't use `\(` or `\)` — quote the whole label instead
- Ensure `mermaid` language is specified on the code fence

### Images Not Displaying

**Symptom**: Image shows broken icon or alt text.

**Cause**: URL is invalid, inaccessible, or wrapped incorrectly.

**Fix**:
1. Verify the image URL is publicly accessible
2. Use the correct syntax: `![Caption](URL)`
3. For media blocks, don't wrap URLs in double braces: use `src="example.com"` not `src="{{https://example.com}}"`

## Database Issues

### Formula Returning #Error

**Symptom**: Formula property shows `#Error` or unexpected results.

**Common causes and fixes**:

| Issue | Example | Fix |
|-------|---------|-----|
| Division by zero | `prop("A") / prop("B")` | `if(prop("B") == 0, 0, prop("A") / prop("B"))` |
| Empty property | `dateBetween(prop("Date"), now(), "days")` | `if(empty(prop("Date")), "", dateBetween(...))` |
| Type mismatch | Adding number to string | Use `format()` or `toNumber()` |
| Wrong property name | `prop("status")` | Match exact case: `prop("Status")` |
| Missing quotes | `prop(Status)` | Always use quotes: `prop("Status")` |

### Relation Not Showing Data

**Symptom**: Relation property is empty even though related pages exist.

**Fix**:
1. Verify the target database ID is correct
2. Ensure both databases are shared with the integration
3. Check that related pages actually exist in the target database
4. For two-way relations, verify the synced property name matches

### Rollup Returning Empty

**Symptom**: Rollup shows empty or zero even with related data.

**Fix**:
1. Verify the relation property has linked entries
2. Check the target property exists in the related database
3. Ensure the aggregation function matches the property type
4. Check that related pages have values in the target property

### Linked Database Not Updating

**Symptom**: Linked database shows stale data.

**Cause**: Notion caches linked database views.

**Fix**:
1. Refresh the page in the browser
2. Check filters — entries might be filtered out
3. Verify the source database wasn't deleted or moved
4. Ensure the integration still has access to the source

## API-Specific Issues

### 400 Bad Request

**Common causes**:
- Missing required fields (e.g., `parent` for page creation)
- Invalid property type values
- Exceeding block nesting limits (max depth depends on block type)
- Sending array when object expected (or vice versa)

**Debug**: Check the error message body — Notion's API returns descriptive error messages.

### Pagination Issues

**Symptom**: Missing results from list/query endpoints.

**Fix**:
1. Always check `has_more` in the response
2. Use `start_cursor` from the previous response for the next request
3. Default page size is 100 — increase or paginate for more results
4. Don't assume a fixed number of pages — always loop until `has_more` is false

### Rich Text Formatting Lost

**Symptom**: Text appears plain after API update.

**Cause**: Rich text annotations not properly set.

**Fix**: Include full annotation object:
```json
{
  "text": { "content": "Bold text" },
  "annotations": {
    "bold": true,
    "italic": false,
    "strikethrough": false,
    "underline": false,
    "code": false,
    "color": "default"
  }
}
```

### Block Children Not Appearing

**Symptom**: Created page has no content blocks.

**Cause**: Children blocks not included in create request, or incorrect nesting.

**Fix**:
1. Include `children` array in the page create request
2. Each child must have `object: "block"` and `type` field
3. For nested blocks, include children within the parent block object
4. Verify block types are valid (check API docs for supported types)

## Performance Issues

### Slow Page Loading

**Causes and fixes**:
1. **Too many blocks** — Split into sub-pages
2. **Large embedded images** — Compress images before uploading
3. **Complex formulas** — Simplify or use AI autofill instead
4. **Many rollups** — Each rollup queries related data on load
5. **Excessive synced blocks** — Each synced block reference fetches from source

### Slow Database Queries

**Causes and fixes**:
1. **No filters** — Always filter to reduce result set
2. **Complex formulas in sort** — Sort by simple properties
3. **Too many properties** — Hide unused properties in views
4. **Large result sets** — Use pagination (page_size: 50-100)
5. **Frequent polling** — Cache results and use webhooks for updates

## Common Workflow Mistakes

### Creating Duplicate Pages

**Fix**: Always search before creating:
```
1. notion-search for existing page
2. If found → notion-update-page
3. If not found → notion-create-pages
```

### Moving Instead of Mentioning

**Fix**: Use `<mention-page>` for links, `<page>` only when you intend to move:
```
<!-- This MOVES the page -->
<page url="{{URL}}">Title</page>

<!-- This LINKS to the page (safe) -->
<mention-page url="{{URL}}">Title</mention-page>
```

### Overwriting Page Content

**Fix**: Use `insertContent` to append instead of `content` to replace:
```
notion-update-page:
  url: page-url
  insertContent: "New content to append"  // Adds to existing
  # NOT content: "..."                     // This would replace everything
```

### Not Verifying After Changes

**Fix**: Always fetch after create/update to verify:
```
1. notion-create-pages (or notion-update-page)
2. notion-fetch → verify content/properties are correct
3. If incorrect → fix and retry
```
