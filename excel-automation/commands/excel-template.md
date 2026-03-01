---
description: "Generate a reusable Excel template with headers, validation, and formatting"
argument-hint: "<type> [--columns ...] [--validation on|off]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Skill
---

# /excel-template — Generate an Excel Template

## Purpose

Generates a Python script (using openpyxl) that creates a reusable Excel `.xlsx` template with professional formatting, data validation dropdowns, conditional formatting rules, named ranges, and optional sheet protection. Use this when the user needs a blank template for data entry, intake forms, or standardized reporting.

## Instructions

When this command is invoked:

1. **Load the pandas-cleaning skill** for reference on openpyxl formatting patterns and output conventions.

2. **Analyze the user's request** to determine:
   - **Template type**: What kind of template (data entry form, tracking sheet, report template, invoice, inventory, budget, etc.)
   - **Columns**: What columns/headers are needed (from `--columns` flag or inferred from the type)
   - **Data validation**: What dropdown lists, numeric ranges, or format constraints are needed
   - **Conditional formatting**: What visual rules to apply (e.g., highlight overdue dates, color-code status values)
   - **Named ranges**: What named ranges to define for formulas or external references
   - **Protection**: Whether to protect the template structure (lock headers, allow data entry in body)

3. **Generate a complete Python script** that uses openpyxl to:

   ### Header Setup
   - Create one or more worksheets with descriptive names
   - Write column headers in row 1
   - Apply professional header styling:
     ```python
     header_font = Font(bold=True, color="FFFFFF", size=11)
     header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
     header_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
     ```
   - Auto-fit column widths based on header text (with minimum and maximum widths)
   - Freeze the header row (`ws.freeze_panes = "A2"`)

   ### Data Validation (when `--validation on` or by default)
   - Add dropdown lists for categorical columns:
     ```python
     from openpyxl.worksheet.datavalidation import DataValidation
     dv = DataValidation(type="list", formula1='"Option1,Option2,Option3"', allow_blank=True)
     dv.error = "Please select a valid option"
     dv.errorTitle = "Invalid Entry"
     dv.prompt = "Select from dropdown"
     dv.promptTitle = "Choose a value"
     ws.add_data_validation(dv)
     dv.add(f"C2:C1000")  # Apply to data range
     ```
   - Add numeric constraints for number columns (e.g., `type="whole"`, `operator="greaterThan"`, `formula1="0"`)
   - Add date constraints for date columns (e.g., `type="date"`, `operator="greaterThan"`)
   - Add text length limits where appropriate

   ### Conditional Formatting
   - Color-code status columns (green for complete/active, red for overdue/inactive, yellow for pending)
   - Highlight rows based on date comparisons (e.g., overdue = past due date)
   - Number-based formatting (e.g., negative values in red, above-threshold in bold)
   - Use `openpyxl.formatting.rule` for rules:
     ```python
     from openpyxl.formatting.rule import CellIsRule
     red_fill = PatternFill(start_color="FFC7CE", end_color="FFC7CE", fill_type="solid")
     ws.conditional_formatting.add("D2:D1000",
         CellIsRule(operator="lessThan", formula=["TODAY()"], fill=red_fill))
     ```

   ### Named Ranges
   - Define named ranges for key data areas:
     ```python
     from openpyxl.workbook.defined_name import DefinedName
     ref = f"'{sheet_name}'!$A$2:${last_col}$1000"
     defn = DefinedName("DataRange", attr_text=ref)
     wb.defined_names.add(defn)
     ```
   - Create named ranges for dropdown source lists (if using a lookup sheet)

   ### Sheet Protection (optional)
   - Lock header row and structure
   - Allow data entry in the body range
   - Optionally password-protect:
     ```python
     ws.protection.sheet = True
     ws.protection.password = "optional"
     ws.protection.enable()
     # Unlock data cells for entry
     for row in ws.iter_rows(min_row=2, max_row=1000):
         for cell in row:
             cell.protection = Protection(locked=False)
     ```

   ### Additional Sheets
   - **Lookup sheet** (hidden): For dropdown source lists that are too long for inline formulas
   - **Instructions sheet**: Brief usage instructions for the template
   - **Example row**: Optionally include one example data row (in italics) that users can overwrite

4. **Write the Python script** to the current directory with a descriptive filename like `create_<type>_template.py`.

5. **Explain the template** briefly:
   - What sheets are included and their purpose
   - What validations are in place
   - What conditional formatting rules exist
   - How to use the template (fill in data starting at row 2)
   - How to run the generation script (`python create_<type>_template.py`)

## Common Template Types

| Type | Typical Columns | Validations |
|------|----------------|-------------|
| `contact-list` | Name, Email, Phone, Company, Role, Status | Email format, phone format, status dropdown |
| `inventory` | Item, SKU, Category, Quantity, Unit Price, Reorder Level | Positive numbers, category dropdown |
| `project-tracker` | Task, Owner, Status, Priority, Start Date, Due Date, % Complete | Status/priority dropdowns, date validation, 0-100% range |
| `budget` | Category, Description, Budgeted, Actual, Variance, Notes | Positive currency, auto-calculated variance |
| `invoice` | Item, Description, Quantity, Unit Price, Total, Tax | Positive numbers, formula columns |
| `employee-roster` | Name, Department, Title, Start Date, Email, Phone, Status | Department dropdown, date validation, email format |
| `survey-results` | Respondent, Q1, Q2, Q3, Q4, Q5, Comments, Timestamp | Rating scale 1-5, date validation |

If the user provides a type not in this list, infer appropriate columns and validations from the type name and description.

## Checklist Before Output

- [ ] All requested columns are included with appropriate headers
- [ ] Header styling is professional (bold, colored fill, centered, wrap text)
- [ ] Column widths are auto-fitted with sensible min/max
- [ ] Header row is frozen
- [ ] Data validation is applied to appropriate columns (unless `--validation off`)
- [ ] Conditional formatting rules match the template purpose
- [ ] Named ranges defined for the data area
- [ ] Script is self-contained and runnable with `python <script>.py`
- [ ] Output `.xlsx` path is clearly specified in the script

## Example Usage

```bash
# Standard project tracker
/excel-template project-tracker

# Custom columns for inventory
/excel-template inventory --columns "SKU, Product Name, Category, Qty on Hand, Reorder Point, Supplier, Cost"

# Contact list without validation
/excel-template contact-list --validation off

# Custom type
/excel-template expense-report --columns "Date, Category, Description, Amount, Receipt, Approved By"

# Budget template with specific categories
/excel-template budget --columns "Department, Line Item, Q1 Budget, Q1 Actual, Q2 Budget, Q2 Actual, Notes"
```
