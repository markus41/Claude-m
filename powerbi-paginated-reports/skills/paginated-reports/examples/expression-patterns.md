# Expression Patterns Cookbook

Production-ready VB.NET expression patterns for common paginated report scenarios.

## Formatting Patterns

### Currency with Negative in Parentheses

```vb
=Format(Fields!Amount.Value, "$#,##0.00;($#,##0.00);$0.00")
```

### Ordinal Date (March 15th, 2025)

```vb
=Format(Fields!Date.Value, "MMMM ") &
  Day(Fields!Date.Value) &
  Switch(
    Day(Fields!Date.Value) Mod 10 = 1 And Day(Fields!Date.Value) <> 11, "st",
    Day(Fields!Date.Value) Mod 10 = 2 And Day(Fields!Date.Value) <> 12, "nd",
    Day(Fields!Date.Value) Mod 10 = 3 And Day(Fields!Date.Value) <> 13, "rd",
    True, "th"
  ) & Format(Fields!Date.Value, ", yyyy")
```

### Phone Number Formatting

```vb
=IIF(Len(Replace(Replace(Replace(Fields!Phone.Value, "-", ""), "(", ""), ")", "")) = 10,
  "(" & Left(Replace(Replace(Replace(Fields!Phone.Value, "-", ""), "(", ""), ")", ""), 3) & ") " &
  Mid(Replace(Replace(Replace(Fields!Phone.Value, "-", ""), "(", ""), ")", ""), 4, 3) & "-" &
  Right(Replace(Replace(Replace(Fields!Phone.Value, "-", ""), "(", ""), ")", ""), 4),
  Fields!Phone.Value)
```

### Address Block (Multi-Line)

```vb
=Fields!Address1.Value &
  IIF(IsNothing(Fields!Address2.Value) Or Fields!Address2.Value = "", "",
    vbCrLf & Fields!Address2.Value) &
  vbCrLf & Fields!City.Value & ", " & Fields!State.Value & " " & Fields!ZipCode.Value
```

## Conditional Formatting Patterns

### Traffic Light Background

```vb
=Switch(
  Fields!Score.Value >= 90, "#4CAF50",
  Fields!Score.Value >= 70, "#FFC107",
  Fields!Score.Value >= 50, "#FF9800",
  True, "#F44336"
)
```

### Variance Indicators

```vb
' Up/down arrow with color
=IIF(Fields!Actual.Value >= Fields!Budget.Value, "▲", "▼")

' Color for variance
=IIF(Fields!Actual.Value >= Fields!Budget.Value, "Green", "Red")

' Variance percentage
=IIF(Fields!Budget.Value = 0, "N/A",
  Format((Fields!Actual.Value - Fields!Budget.Value) / Fields!Budget.Value, "P1"))
```

### Alternating Row Colors (Within Groups)

```vb
' Reset row count per group
=IIF(RowNumber("DepartmentGroup") Mod 2 = 0, "WhiteSmoke", "White")
```

### Progress Bar (Using Rectangle Width)

```vb
' Set Rectangle width expression (as fraction of max width)
=CStr(Math.Min(Fields!Completion.Value / 100, 1) * 2) & "in"

' Background color based on completion
=Switch(
  Fields!Completion.Value >= 100, "#4CAF50",
  Fields!Completion.Value >= 50, "#2196F3",
  True, "#FF9800"
)
```

## Aggregate Patterns

### Percentage of Group Total

```vb
=Fields!Amount.Value / Sum(Fields!Amount.Value, "RegionGroup") * 100
```

### Percentage of Grand Total

```vb
=Sum(Fields!Amount.Value) / Sum(Fields!Amount.Value, Nothing) * 100
```

### Running Total

```vb
=RunningValue(Fields!Amount.Value, Sum, Nothing)
```

### Running Total with Group Reset

```vb
=RunningValue(Fields!Amount.Value, Sum, "DepartmentGroup")
```

### Rank Within Group

```vb
=RowNumber("ProductGroup")
```

### Count with Condition (CountIf)

```vb
=Sum(IIF(Fields!Status.Value = "Active", 1, 0))
```

### Sum with Condition (SumIf)

```vb
=Sum(IIF(Fields!Category.Value = "Premium", Fields!Amount.Value, CDec(0)))
```

### Average Excluding Nulls

```vb
=IIF(
  Sum(IIF(IsNothing(Fields!Score.Value), 0, 1)) = 0,
  Nothing,
  Sum(IIF(IsNothing(Fields!Score.Value), CDec(0), Fields!Score.Value)) /
  Sum(IIF(IsNothing(Fields!Score.Value), 0, 1))
)
```

### Median (Using Custom Code)

Add to Report Properties > Code:

```vb
Private values As New System.Collections.ArrayList()
Public Function AddValue(ByVal v As Object) As Decimal
    If Not IsNothing(v) Then values.Add(CDec(v))
    Return 0
End Function
Public Function GetMedian() As Decimal
    If values.Count = 0 Then Return 0
    values.Sort()
    Dim mid As Integer = values.Count \ 2
    If values.Count Mod 2 = 0 Then
        Return (CDec(values(mid - 1)) + CDec(values(mid))) / 2
    End If
    Return CDec(values(mid))
End Function
```

Call in a hidden textbox in the detail row: `=Code.AddValue(Fields!Amount.Value)`
Call in the group footer: `=Code.GetMedian()`

## Lookup Patterns

### Single Value from Another Dataset

```vb
=Lookup(Fields!ProductID.Value, Fields!ProductID.Value, Fields!ProductName.Value, "Products")
```

### Comma-Separated List of Related Items

```vb
=Join(
  LookupSet(
    Fields!OrderID.Value,
    Fields!OrderID.Value,
    Fields!ItemDescription.Value,
    "OrderItems"
  ),
  ", "
)
```

### Count of Related Items

```vb
=LookupSet(
  Fields!OrderID.Value,
  Fields!OrderID.Value,
  Fields!ItemID.Value,
  "OrderItems"
).Length
```

### Lookup with Default

```vb
=IIF(
  IsNothing(Lookup(Fields!CategoryID.Value, Fields!ID.Value, Fields!Name.Value, "Categories")),
  "Uncategorized",
  Lookup(Fields!CategoryID.Value, Fields!ID.Value, Fields!Name.Value, "Categories")
)
```

## Date Calculation Patterns

### Fiscal Year (July Start)

```vb
=IIF(Month(Fields!Date.Value) >= 7,
  "FY" & Year(Fields!Date.Value) + 1,
  "FY" & Year(Fields!Date.Value))
```

### Fiscal Quarter

```vb
=IIF(Month(Fields!Date.Value) >= 7,
  "Q" & ((Month(Fields!Date.Value) - 7) \ 3 + 1),
  "Q" & ((Month(Fields!Date.Value) + 5) \ 3 + 1))
```

### Days Until Due

```vb
=IIF(Fields!DueDate.Value < Today(),
  "Overdue by " & DateDiff(DateInterval.Day, Fields!DueDate.Value, Today()) & " days",
  DateDiff(DateInterval.Day, Today(), Fields!DueDate.Value) & " days remaining")
```

### Age from Birthdate

```vb
=DateDiff(DateInterval.Year, Fields!BirthDate.Value, Today()) -
  IIF(DateSerial(Year(Today()), Month(Fields!BirthDate.Value), Day(Fields!BirthDate.Value)) > Today(), 1, 0)
```

### Week Number (ISO 8601)

```vb
=System.Globalization.CultureInfo.CurrentCulture.Calendar.GetWeekOfYear(
  Fields!Date.Value,
  System.Globalization.CalendarWeekRule.FirstFourDayWeek,
  DayOfWeek.Monday)
```

### Business Days Between Dates

Add to custom code:

```vb
Public Function BusinessDays(ByVal startDate As DateTime, ByVal endDate As DateTime) As Integer
    Dim count As Integer = 0
    Dim current As DateTime = startDate
    While current <= endDate
        If current.DayOfWeek <> DayOfWeek.Saturday And current.DayOfWeek <> DayOfWeek.Sunday Then
            count += 1
        End If
        current = current.AddDays(1)
    End While
    Return count
End Function
```

Call: `=Code.BusinessDays(Fields!StartDate.Value, Fields!EndDate.Value)`

## Page and Layout Patterns

### "Continued on Next Page" Footer

```vb
' In group footer, only show when group continues on next page
=IIF(Globals!PageNumber < Globals!TotalPages, "Continued on next page...", "")
```

### Dynamic Report Title

```vb
="Sales Report — " &
  Format(Parameters!StartDate.Value, "MMM d, yyyy") & " to " &
  Format(Parameters!EndDate.Value, "MMM d, yyyy")
```

### Confidential Watermark Text

```vb
="DRAFT — Generated " & Format(Globals!ExecutionTime, "MM/dd/yyyy HH:mm") & " by " & User!UserID
```

### Show "No Data" Message

```vb
' Set NoRowsMessage property on the Tablix
No records found for the selected criteria. Please adjust your parameters and try again.
```

Or use a textbox with visibility:
```vb
' Visibility Hidden expression (hide when data exists)
=IIF(CountRows("MainDataset") > 0, True, False)
```

### Format-Aware Content

```vb
' Show different content based on output format
=Switch(
  Globals!RenderFormat.Name = "PDF", "See attached document for details.",
  Globals!RenderFormat.Name = "EXCELOPENXML", "Data exported for analysis.",
  Globals!RenderFormat.Name = "HTML5", "Click column headers to sort.",
  True, ""
)
```

### Hide Element in Specific Format

```vb
' Hide interactive instructions in PDF
=IIF(Globals!RenderFormat.Name = "PDF", True, False)

' Show print-only disclaimer
=IIF(Globals!RenderFormat.Name = "HTML5", True, False)
```

## String Building Patterns

### Name with Preferred Name

```vb
=Fields!LastName.Value & ", " & Fields!FirstName.Value &
  IIF(IsNothing(Fields!PreferredName.Value) Or Fields!PreferredName.Value = "",
    "", " (" & Fields!PreferredName.Value & ")")
```

### Pluralization

```vb
=CStr(Fields!Count.Value) & " item" & IIF(Fields!Count.Value <> 1, "s", "")
```

### Truncate with Ellipsis

```vb
=IIF(Len(Fields!Description.Value) > 100,
  Left(Fields!Description.Value, 97) & "...",
  Fields!Description.Value)
```

### Title Case

Add to custom code:
```vb
Public Function TitleCase(ByVal input As String) As String
    Return System.Globalization.CultureInfo.CurrentCulture.TextInfo.ToTitleCase(input.ToLower())
End Function
```

Call: `=Code.TitleCase(Fields!Name.Value)`
