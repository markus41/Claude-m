# Troubleshooting Reference

## Data Source Errors

### "Cannot connect to data source"

**Causes:**
- Connection string incorrect (wrong server name, database name)
- Credentials not configured in Power BI service
- Gateway offline or not configured for on-prem sources
- Service principal not added to workspace
- Firewall blocking outbound connection from Fabric

**Resolution:**
1. Check data source settings in Power BI service workspace
2. Verify connection string matches the actual server/database
3. Re-enter credentials (stored credentials expire)
4. For gateway sources: check gateway status in Settings > Manage gateways
5. For service principal: ensure SP is added as workspace Member

### "The data source instance has not been specified"

**Cause:** Report references a shared data source that doesn't exist in the workspace.

**Resolution:**
1. Upload the shared data source (.rds) to the workspace
2. Or convert to embedded data source in the .rdl before uploading

### "Query execution failed" / Timeout

**Causes:**
- Query too slow (> 10 min default timeout)
- Query returns too many rows
- Deadlock on source database
- Stored procedure error (PRINT statements, RAISERROR)

**Resolution:**
1. Test query independently in SSMS or Fabric SQL editor
2. Add/optimize indexes on filter columns
3. Reduce result set with tighter WHERE clauses
4. Add SET NOCOUNT ON to stored procedures
5. Remove PRINT/RAISERROR from stored procedures

### "The provided credentials for the data source are invalid"

**Resolution:**
1. Go to workspace Settings > Paginated report section
2. Edit data source credentials
3. For Azure AD: ensure the user/SP has database access
4. For SQL auth: verify username/password
5. Check if password recently rotated

## Parameter Errors

### "The 'ParameterName' parameter is missing a value"

**Causes:**
- Required parameter has no default value
- Multi-value parameter expects at least one selection
- Cascading parameter dependency not resolved

**Resolution:**
1. Set default values in report design (Report Builder)
2. Or provide defaults via REST API parameter update
3. Check cascading parameter order — parent must resolve before child

### "Parameter value is not valid for its type"

**Causes:**
- DateTime parameter receiving string in wrong format
- Integer parameter receiving non-numeric value
- Multi-value parameter receiving single value (or vice versa)

**Resolution:**
1. Verify parameter DataType in RDL matches the value format
2. DateTime format: use ISO 8601 (`2025-03-15T00:00:00`)
3. Multi-value: pass as array in API, comma-separated in URL

### Parameters not showing in browser

**Causes:**
- All parameters are hidden (`<Hidden>true</Hidden>`)
- Parameters have valid defaults and auto-execute is enabled
- Report properties set to hide parameter area

**Resolution:**
- Set at least one parameter to visible
- Check Report Properties > ParameterLayout

## Rendering Errors

### "Processing of this report or subreport has been canceled"

**Causes:**
- Render timeout exceeded (default 10 minutes)
- Memory limit exceeded for capacity SKU
- Infinite loop in custom code
- Circular subreport reference

**Resolution:**
1. Check report complexity (number of pages, data volume)
2. Optimize query to return fewer rows
3. Replace subreports with Lookup expressions
4. Review custom code for infinite loops
5. Check capacity metrics in Fabric admin portal

### "An error has occurred during report processing"

**Generic error.** Check:
1. Expression errors — divide by zero, null reference, type mismatch
2. Dataset query errors — SQL syntax, missing parameters
3. Data source connectivity
4. Subreport errors (error in child propagates to parent)

**Debugging approach:**
1. Open in Report Builder and preview with same parameters
2. Check each dataset individually (Run Query in designer)
3. Test with simple parameter values first
4. Check Report Builder output window for detailed error messages

### Blank pages in output

**Causes:**
- Report body width + margins > page width
- Empty group instances
- Trailing whitespace in body

**Resolution:**
1. Calculate: Body Width + Left Margin + Right Margin ≤ Page Width
2. Common fix: reduce Body Width by even 0.01 inch
3. Check for report items extending beyond the body boundary
4. Remove empty Rectangle or Textbox items at the bottom of the body

### Extra blank page at end

**Cause:** Body height + top/bottom margins exceeds page height, or a report item extends slightly beyond the body boundary.

**Resolution:**
1. Body Height + Top Margin + Bottom Margin ≤ Page Height
2. In Report Builder: drag body bottom edge up
3. Check for invisible items (hidden textboxes, rectangles) at the bottom

### Page numbers showing "0 of 0"

**Cause:** `Globals!PageNumber` and `Globals!TotalPages` only work in page-oriented renderers (PDF, Print, TIFF, Word). In HTML interactive view, they show 0.

**Resolution:**
- This is by design in HTML rendering
- Values resolve correctly in PDF/Print export
- Use `Globals!OverallPageNumber` for multi-section reports

## Export Errors

### "Export request failed with status 'Failed'"

**Causes:**
- Report render error during export
- Export format not supported for the report type
- Capacity throttling (too many concurrent exports)
- Parameter values missing or invalid

**Resolution:**
1. Try rendering the report in browser first to verify it works
2. Check parameter values in the export request
3. Check `error` field in export status response for details
4. Wait and retry if throttled (429 response)

### Excel export has merged cells / wrong layout

**Cause:** Report layout uses overlapping items or items with different widths that don't align to a grid.

**Resolution:**
1. Align all items to a common column grid in Report Builder
2. Avoid overlapping items
3. Use a single Tablix for tabular data (avoid scattered textboxes)
4. Set `SimplePageHeaders=true` in device info settings

### PDF export fonts look wrong

**Cause:** Font not available on the render server.

**Resolution:**
1. Use web-safe fonts (Segoe UI, Arial, Calibri, Times New Roman)
2. Set `EmbedFonts=Always` in device info
3. Avoid custom/specialty fonts unless embedded in the RDL

### CSV export missing data

**Cause:** CSV renderer only exports the first data region in the report body.

**Resolution:**
- Restructure report: put the primary data in the first (or only) Tablix
- Or use Excel export instead for multi-table reports

## Subscription Errors

### "The e-mail address of one or more recipients is not valid"

**Resolution:**
1. Verify email addresses in subscription settings
2. Check for extra spaces or invalid characters
3. Ensure recipients are in the organization's Azure AD (for internal-only subscriptions)

### Subscription not delivering

**Causes:**
- Report render error (check report independently)
- Subscription disabled after consecutive failures
- Email delivery blocked by spam filter
- Capacity paused or unavailable at scheduled time

**Resolution:**
1. Check subscription status in workspace settings
2. Re-enable if disabled
3. Test report manually with same parameters
4. Check capacity status at the scheduled delivery time

## Gateway Errors

### "The gateway is unreachable"

**Resolution:**
1. Check gateway service status on the gateway machine
2. Restart the "On-premises data gateway" Windows service
3. Verify network connectivity (HTTPS outbound to *.servicebus.windows.net)
4. Check gateway logs: `C:\Users\<user>\AppData\Local\Microsoft\On-premises data gateway\Gateway*.log`

### "Data source credentials are invalid" (Gateway)

**Resolution:**
1. In Power BI service: Settings > Manage gateways > Data source
2. Re-enter credentials
3. For Windows auth: use `DOMAIN\username` format
4. For SQL auth: verify the SQL login still exists and password hasn't expired
5. Test connection from the gateway machine directly

## Common Expression Errors

### "#Error" in rendered output

**Causes:**
- Divide by zero: `=Fields!A.Value / Fields!B.Value` when B is 0
- Null reference: aggregate on empty dataset
- Type mismatch: comparing string to number

**Fixes:**
```vb
' Divide by zero protection
=IIF(Fields!B.Value = 0, 0, Fields!A.Value / Fields!B.Value)

' Null protection
=IIF(IsNothing(Fields!Amount.Value), 0, Fields!Amount.Value)

' Type-safe conversion
=IIF(IsNumeric(Fields!Value.Value), CDec(Fields!Value.Value), 0)
```

### "The Value expression for the textbox has a scope parameter that is not valid"

**Cause:** Aggregate scope name doesn't match any group or dataset name.

**Resolution:**
1. Check the scope parameter spelling (case-sensitive)
2. Verify the group exists in the Tablix hierarchy
3. Use `Nothing` for dataset-level scope

### "Expressions that set the BackgroundColor are not allowed in page headers/footers"

**Cause:** Certain expressions involving dataset fields are restricted in page headers/footers.

**Resolution:**
- Use `ReportItems!TextboxName.Value` to reference values from the body
- Use `Globals!*` and `User!*` variables (always allowed in headers/footers)
- Use `Parameters!*` values (always allowed)
- Dataset field references (Fields!) are NOT allowed in headers/footers

## Fabric-Specific Issues

### "Paginated reports are not enabled for this capacity"

**Resolution:**
1. Fabric admin must enable paginated reports for the capacity
2. Go to Fabric admin portal > Capacity settings > Paginated reports > Enable
3. Requires at least F2 SKU (or P1 Premium per user)

### "The report requires a Premium capacity"

**Resolution:**
- Assign the workspace to a Fabric/Premium capacity
- Or use Premium Per User (PPU) licenses for report viewers

### Slow rendering in Fabric vs fast in Report Builder

**Causes:**
- Network latency between Fabric and data source
- Fabric capacity throttling
- Missing gateway for on-prem sources (falls back to direct connect)

**Resolution:**
1. Check if data source requires a gateway
2. Monitor capacity utilization in Fabric admin portal
3. Optimize queries (push filters to source)
4. Consider migrating data source to Fabric (Lakehouse/Warehouse) to eliminate network hops
