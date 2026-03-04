# VB.NET Expressions & Custom Code Reference

## Expression Syntax

All expressions start with `=` and use VB.NET syntax.

```
=Fields!FieldName.Value
=Parameters!ParamName.Value
=Globals!PageNumber
=User!UserID
=ReportItems!TextboxName.Value
```

## Aggregate Functions

### Basic Aggregates

```vb
=Sum(Fields!Amount.Value)
=Avg(Fields!Amount.Value)
=Count(Fields!OrderID.Value)
=CountDistinct(Fields!CustomerID.Value)
=Max(Fields!OrderDate.Value)
=Min(Fields!OrderDate.Value)
=First(Fields!CustomerName.Value)
=Last(Fields!CustomerName.Value)
=StDev(Fields!Amount.Value)
=Var(Fields!Amount.Value)
```

### Scoped Aggregates

Aggregate within a specific group scope:

```vb
' Sum within the current group
=Sum(Fields!Amount.Value, "RegionGroup")

' Sum across all data (Nothing = dataset scope)
=Sum(Fields!Amount.Value, Nothing)

' Percentage of parent group
=Fields!Amount.Value / Sum(Fields!Amount.Value, "RegionGroup")

' Percentage of grand total
=Sum(Fields!Amount.Value) / Sum(Fields!Amount.Value, Nothing)
```

### Running Aggregates

```vb
' Running total across all rows
=RunningValue(Fields!Amount.Value, Sum, Nothing)

' Running total within group
=RunningValue(Fields!Amount.Value, Sum, "RegionGroup")

' Running count
=RunningValue(Fields!OrderID.Value, Count, Nothing)

' Running average
=RunningValue(Fields!Amount.Value, Avg, Nothing)
```

### Row Numbering

```vb
' Sequential across entire dataset
=RowNumber(Nothing)

' Sequential within group
=RowNumber("RegionGroup")
```

## Conditional Expressions

### IIF (Inline If)

```vb
' Simple condition
=IIF(Fields!Amount.Value > 1000, "High", "Low")

' Nested IIF (avoid deep nesting — use Switch instead)
=IIF(Fields!Status.Value = "Active", "Green",
  IIF(Fields!Status.Value = "Pending", "Yellow", "Red"))

' Null check
=IIF(IsNothing(Fields!Email.Value), "N/A", Fields!Email.Value)
```

### Switch

```vb
' Multi-condition (evaluates in order, returns first True match)
=Switch(
  Fields!Score.Value >= 90, "A",
  Fields!Score.Value >= 80, "B",
  Fields!Score.Value >= 70, "C",
  Fields!Score.Value >= 60, "D",
  True, "F"
)
```

### Choose

```vb
' Index-based selection (1-based)
=Choose(Fields!Quarter.Value, "Q1", "Q2", "Q3", "Q4")
```

## Formatting Functions

### Number Formatting

```vb
=Format(Fields!Amount.Value, "C2")          ' $1,234.56
=Format(Fields!Amount.Value, "N0")          ' 1,235
=Format(Fields!Amount.Value, "#,##0.00")    ' 1,234.56
=Format(Fields!Ratio.Value, "P1")           ' 85.3%
=Format(Fields!Amount.Value, "#,##0;(#,##0);-")  ' Negative in parentheses
=FormatNumber(Fields!Amount.Value, 2)       ' 1,234.56
=FormatCurrency(Fields!Amount.Value, 2)     ' $1,234.56
=FormatPercent(Fields!Ratio.Value, 1)       ' 85.3%
```

### Date Formatting

```vb
=Format(Fields!Date.Value, "yyyy-MM-dd")           ' 2025-03-15
=Format(Fields!Date.Value, "MMMM dd, yyyy")        ' March 15, 2025
=Format(Fields!Date.Value, "MMM yyyy")              ' Mar 2025
=Format(Fields!Date.Value, "dddd, MMMM dd, yyyy")  ' Saturday, March 15, 2025
=Format(Fields!Date.Value, "MM/dd/yyyy HH:mm")     ' 03/15/2025 14:30
=FormatDateTime(Fields!Date.Value, DateFormat.ShortDate)  ' 3/15/2025
=FormatDateTime(Fields!Date.Value, DateFormat.LongDate)   ' Saturday, March 15, 2025
```

### Custom Text Formatting

```vb
' Padding
=Fields!OrderID.Value.ToString().PadLeft(8, "0"c)  ' 00001234

' Upper/Lower
=UCase(Fields!Name.Value)  ' JOHN DOE
=LCase(Fields!Email.Value) ' john@example.com

' String concatenation
=Fields!FirstName.Value & " " & Fields!LastName.Value
```

## Text Functions

```vb
=Len(Fields!Name.Value)                           ' String length
=Left(Fields!Code.Value, 3)                        ' First 3 characters
=Right(Fields!Code.Value, 4)                       ' Last 4 characters
=Mid(Fields!Code.Value, 2, 3)                      ' 3 chars starting at position 2
=Trim(Fields!Name.Value)                           ' Remove leading/trailing spaces
=Replace(Fields!Phone.Value, "-", "")              ' Remove dashes
=InStr(Fields!Email.Value, "@")                    ' Position of @ (0 if not found)
=Split(Fields!FullName.Value, " ")(0)              ' First word (split by space)
=Join(Parameters!Regions.Value, ", ")              ' Join multi-value parameter
=StrReverse(Fields!Code.Value)                     ' Reverse string
```

## Date Functions

```vb
' Current date/time
=Today()                                    ' Date only
=Now()                                      ' Date and time

' Date arithmetic
=DateAdd(DateInterval.Day, 30, Fields!StartDate.Value)
=DateAdd(DateInterval.Month, -1, Today())
=DateAdd(DateInterval.Year, 1, Fields!StartDate.Value)

' Date difference
=DateDiff(DateInterval.Day, Fields!StartDate.Value, Fields!EndDate.Value)
=DateDiff(DateInterval.Month, Fields!HireDate.Value, Today())

' Date parts
=Year(Fields!Date.Value)
=Month(Fields!Date.Value)
=Day(Fields!Date.Value)
=Weekday(Fields!Date.Value)
=DatePart(DateInterval.Quarter, Fields!Date.Value)
=MonthName(Month(Fields!Date.Value))
=WeekdayName(Weekday(Fields!Date.Value))

' Date construction
=DateSerial(Year(Today()), 1, 1)            ' January 1 of current year
=DateSerial(Year(Today()), Month(Today()), 1) ' First of current month
```

## Math Functions

```vb
=Math.Round(Fields!Amount.Value, 2)
=Math.Ceiling(Fields!Amount.Value)
=Math.Floor(Fields!Amount.Value)
=Math.Abs(Fields!Variance.Value)
=Math.Max(Fields!A.Value, Fields!B.Value)    ' Note: only 2 args
=Math.Min(Fields!A.Value, Fields!B.Value)
```

## Conversion Functions

```vb
=CInt(Fields!StringValue.Value)         ' To Integer
=CDec(Fields!StringValue.Value)         ' To Decimal
=CDbl(Fields!StringValue.Value)         ' To Double
=CStr(Fields!NumericValue.Value)        ' To String
=CDate(Fields!StringDate.Value)         ' To DateTime
=CBool(Fields!FlagValue.Value)          ' To Boolean
=Val(Fields!MixedValue.Value)           ' Extract numeric from string
```

## Null Handling

```vb
' Check for null
=IsNothing(Fields!Email.Value)

' Null coalescing
=IIF(IsNothing(Fields!Email.Value), "No email", Fields!Email.Value)

' Null-safe aggregate
=IIF(CountRows() = 0, 0, Sum(Fields!Amount.Value))

' Nothing keyword (VB.NET null)
=IIF(Fields!Amount.Value = Nothing, 0, Fields!Amount.Value)
```

## Lookup Functions

### Lookup (Single Match)

```vb
' Look up a single value from another dataset
=Lookup(
  Fields!ProductID.Value,           ' Source value
  Fields!ProductID.Value,           ' Match field in target dataset
  Fields!ProductName.Value,         ' Return field from target dataset
  "ProductsDataset"                 ' Target dataset name
)
```

### LookupSet (Multiple Matches)

```vb
' Returns all matches — use with Join
=Join(
  LookupSet(
    Fields!OrderID.Value,
    Fields!OrderID.Value,
    Fields!ProductName.Value,
    "OrderDetailsDataset"
  ),
  ", "
)
```

### MultiLookup (Multiple Source Values)

```vb
' Look up multiple values at once
=Join(
  MultiLookup(
    Split(Fields!CategoryIDs.Value, ","),
    Fields!CategoryID.Value,
    Fields!CategoryName.Value,
    "CategoriesDataset"
  ),
  ", "
)
```

## Global Variables

```vb
=Globals!ReportName                  ' Report file name
=Globals!ExecutionTime               ' When report started rendering
=Globals!PageNumber                  ' Current page (page renderers only)
=Globals!TotalPages                  ' Total page count (page renderers only)
=Globals!OverallPageNumber           ' Page across all report sections
=Globals!OverallTotalPages           ' Total pages across all sections
=Globals!RenderFormat.Name           ' "PDF", "EXCELOPENXML", "HTML5", etc.
=Globals!ReportFolder                ' Server folder path
=Globals!ReportServerUrl             ' Report server base URL
=User!UserID                         ' Domain\Username or UPN
=User!Language                       ' Browser language (e.g., "en-US")
```

## Custom Code Block

Add in Report Properties > Code:

```vb
' Color coding based on value
Public Function GetStatusColor(ByVal status As String) As String
    Select Case status
        Case "Active"
            Return "Green"
        Case "Pending"
            Return "#FFA500"
        Case "Expired"
            Return "Red"
        Case Else
            Return "Gray"
    End Select
End Function

' Running total with reset
Private shared runningTotal As Decimal = 0
Public Shared Function AddToRunningTotal(ByVal amount As Decimal) As Decimal
    runningTotal = runningTotal + amount
    Return runningTotal
End Function
Public Shared Function ResetRunningTotal() As Decimal
    runningTotal = 0
    Return runningTotal
End Function

' Ordinal suffix (1st, 2nd, 3rd, 4th...)
Public Function GetOrdinal(ByVal number As Integer) As String
    If number Mod 100 >= 11 And number Mod 100 <= 13 Then
        Return number.ToString() & "th"
    End If
    Select Case number Mod 10
        Case 1: Return number.ToString() & "st"
        Case 2: Return number.ToString() & "nd"
        Case 3: Return number.ToString() & "rd"
        Case Else: Return number.ToString() & "th"
    End Select
End Function

' Barcode-friendly check digit (Mod 10 / Luhn)
Public Function LuhnCheckDigit(ByVal input As String) As String
    Dim sum As Integer = 0
    Dim alt As Boolean = True
    For i As Integer = input.Length - 1 To 0 Step -1
        Dim n As Integer = Integer.Parse(input.Substring(i, 1))
        If alt Then
            n *= 2
            If n > 9 Then n -= 9
        End If
        sum += n
        alt = Not alt
    Next
    Return ((10 - (sum Mod 10)) Mod 10).ToString()
End Function
```

Call with `=Code.GetStatusColor(Fields!Status.Value)`.

## Custom Assembly References

### Adding References

In Report Properties > References, add:
- Assembly name (e.g., `MyCompany.ReportHelpers`)
- Class instances (optional): Instance name + class name

### Calling Static Methods

```vb
=MyCompany.ReportHelpers.FormatUtils.FormatBarcode(Fields!SKU.Value)
```

### Calling Instance Methods

If you defined an instance named `helper` of class `MyCompany.ReportHelpers.Helper`:
```vb
=Code.helper.ProcessValue(Fields!Input.Value)
```

### Security Restrictions

In Fabric (Power BI service), custom assemblies are sandboxed:
- No file system access
- No network access
- No reflection
- Limited namespace access
- Use custom code block instead when possible

## Conditional Formatting Expressions

### Background Color

```vb
' Traffic light
=Switch(
  Fields!Score.Value >= 80, "LightGreen",
  Fields!Score.Value >= 50, "LightYellow",
  True, "LightCoral"
)

' Alternating rows
=IIF(RowNumber(Nothing) Mod 2 = 0, "WhiteSmoke", "White")

' Heat map gradient
=IIF(Fields!Value.Value > Avg(Fields!Value.Value, Nothing),
  "LightGreen", "LightCoral")
```

### Font Weight / Style

```vb
' Bold for negative
=IIF(Fields!Amount.Value < 0, "Bold", "Normal")

' Italic for estimates
=IIF(Fields!IsEstimate.Value, "Italic", "Normal")
```

### Visibility

```vb
' Hide when no data
=IIF(CountRows("DatasetName") = 0, True, False)

' Show only in PDF
=IIF(Globals!RenderFormat.Name = "PDF", False, True)

' Conditional detail
=IIF(Parameters!ShowDetail.Value = True, False, True)
```

## Common Expression Patterns

### Page X of Y

```vb
="Page " & Globals!PageNumber & " of " & Globals!TotalPages
```

### Report Generated Timestamp

```vb
="Generated: " & Format(Globals!ExecutionTime, "MMMM dd, yyyy 'at' h:mm tt")
```

### Confidentiality Footer

```vb
="CONFIDENTIAL - Prepared for " & User!UserID & " on " & Format(Today(), "MM/dd/yyyy")
```

### Dynamic Column Header with Parameter

```vb
="Sales for " & Format(Parameters!ReportMonth.Value, "MMMM yyyy")
```

### Conditional Page Break

Use in group properties PageBreak expression:
```vb
=IIF(Fields!Region.Value <> Previous(Fields!Region.Value), True, False)
```

### Previous Value Comparison

```vb
' Change indicator
=IIF(Fields!Amount.Value > Previous(Fields!Amount.Value), "▲",
  IIF(Fields!Amount.Value < Previous(Fields!Amount.Value), "▼", "="))
```
