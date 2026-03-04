# Notion Formula Language — Complete Reference

Notion formulas use a functional syntax for computed properties. This is the complete function reference with patterns and examples.

## Syntax Basics

### Expression Structure

Formulas are single expressions (not multi-statement programs):
```
if(prop("Status") == "Done", "✅", "⏳")
```

### Property References

```
prop("Property Name")    // Reference any property by name
```

Returns the value of the named property. Type depends on the property type.

### Constants

```
true, false              // Boolean
"string"                 // String (double quotes)
42, 3.14                 // Numbers
```

### Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `+` | Add / Concatenate | `1 + 2`, `"a" + "b"` |
| `-` | Subtract | `10 - 3` |
| `*` | Multiply | `5 * 4` |
| `/` | Divide | `10 / 3` |
| `%` | Modulo | `10 % 3` |
| `^` | Power | `2 ^ 3` |
| `==` | Equals | `prop("Status") == "Done"` |
| `!=` | Not equals | `prop("Status") != "Done"` |
| `>` | Greater than | `prop("Score") > 80` |
| `<` | Less than | `prop("Score") < 50` |
| `>=` | Greater or equal | `prop("Score") >= 90` |
| `<=` | Less or equal | `prop("Score") <= 20` |
| `and` | Logical AND | `true and false` |
| `or` | Logical OR | `true or false` |
| `not` | Logical NOT | `not true` |
| `? :` | Ternary | `prop("Done") ? "✅" : "⏳"` |

### Comments

```
// This is a comment
prop("Name") // Inline comment
```

## Logic Functions

### if(condition, then, else)
```
if(prop("Status") == "Done", "✅",
  if(prop("Status") == "In Progress", "🔄", "⏳"))
```

### and(a, b, ...)
```
and(prop("Checkbox1"), prop("Checkbox2"))
```

### or(a, b, ...)
```
or(prop("Priority") == "High", prop("Priority") == "Urgent")
```

### not(value)
```
not(empty(prop("Due Date")))
```

### empty(value)
```
empty(prop("Description"))   // true if property is empty
```

### ifs(condition1, value1, condition2, value2, ..., default)
```
ifs(
  prop("Score") >= 90, "A",
  prop("Score") >= 80, "B",
  prop("Score") >= 70, "C",
  prop("Score") >= 60, "D",
  "F"
)
```

## Math Functions

### Basic
```
add(a, b)           // a + b
subtract(a, b)      // a - b
multiply(a, b)      // a * b
divide(a, b)        // a / b
mod(a, b)           // a % b
pow(base, exp)      // base ^ exp
```

### Rounding
```
round(3.7)          // 4
ceil(3.2)           // 4
floor(3.8)          // 3
```

### Other Math
```
abs(-5)             // 5
sign(-3)            // -1
min(1, 2, 3)        // 1
max(1, 2, 3)        // 3
sqrt(16)            // 4
cbrt(27)            // 3
exp(1)              // 2.718...
ln(2.718)           // ~1
log10(100)          // 2
log2(8)             // 3
```

### Constants
```
pi()                // 3.14159...
e()                 // 2.71828...
```

## Text Functions

### Concatenation
```
concat("Hello", " ", "World")    // "Hello World"
join(", ", prop("Tags"))         // "tag1, tag2, tag3"
"Hello" + " " + "World"         // "Hello World"
```

### Extraction
```
slice("Hello", 0, 3)      // "Hel"
slice("Hello", 2)          // "llo"
length("Hello")             // 5
```

### Search & Replace
```
contains("Hello World", "World")  // true
test("hello", "^h")               // true (regex)
replace("Hello", "H", "J")        // "Jello" (first match)
replaceAll("aaa", "a", "b")       // "bbb" (all matches)
```

### Case
```
upper("hello")      // "HELLO"
lower("HELLO")      // "hello"
```

### Formatting
```
repeat("⭐", 3)            // "⭐⭐⭐"
padStart("5", 3, "0")      // "005"
padEnd("Hi", 5, ".")       // "Hi..."
trim("  hello  ")           // "hello"
```

### format(value, pattern)
```
format(prop("Number"))      // Number to string
```

## Date Functions

### Current Date/Time
```
now()                       // Current date and time
today()                     // Current date (no time)
```

### Date Components
```
year(prop("Date"))          // 2024
month(prop("Date"))         // 3 (1-12)
date(prop("Date"))          // 15 (day of month, 1-31)
day(prop("Date"))           // 1 (day of week, 0=Sun, 6=Sat)
hour(prop("Date"))          // 14 (0-23)
minute(prop("Date"))        // 30 (0-59)
```

### Date Arithmetic
```
dateAdd(prop("Date"), 7, "days")
dateSubtract(prop("Date"), 1, "months")
```

**Units**: `"years"`, `"quarters"`, `"months"`, `"weeks"`, `"days"`, `"hours"`, `"minutes"`

### Date Difference
```
dateBetween(prop("Due Date"), now(), "days")
```

Returns the difference in the specified unit. Positive if first date is later.

### Date Formatting
```
formatDate(prop("Date"), "MMMM D, YYYY")
formatDate(prop("Date"), "MMM D")
formatDate(prop("Date"), "YYYY-MM-DD")
formatDate(prop("Date"), "hh:mm A")
```

**Format tokens**:
| Token | Output | Example |
|-------|--------|---------|
| `YYYY` | 4-digit year | 2024 |
| `YY` | 2-digit year | 24 |
| `MMMM` | Full month | January |
| `MMM` | Short month | Jan |
| `MM` | 2-digit month | 01 |
| `M` | Month | 1 |
| `DD` | 2-digit day | 05 |
| `D` | Day | 5 |
| `dddd` | Full weekday | Monday |
| `ddd` | Short weekday | Mon |
| `dd` | Min weekday | Mo |
| `HH` | 24h hour | 14 |
| `hh` | 12h hour | 02 |
| `mm` | Minutes | 30 |
| `ss` | Seconds | 45 |
| `A` | AM/PM | PM |
| `a` | am/pm | pm |

### Date Construction
```
parseDate("2024-03-15")     // Create date from string
```

### Date Range
```
dateStart(prop("Date"))     // Start of a date range
dateEnd(prop("Date"))       // End of a date range
```

### Timestamps
```
timestamp(prop("Date"))     // Unix timestamp (ms)
fromTimestamp(1710460800000) // Date from Unix timestamp
```

## List Functions

Lists (arrays) come from multi-select properties, rollup properties, or formula operations.

### Access
```
at(list, 0)          // First element
first(list)          // First element
last(list)           // Last element
```

### Manipulation
```
slice(list, 1, 3)    // Sub-array
concat(list1, list2) // Merge lists
sort(list)           // Sort ascending
reverse(list)        // Reverse order
flat(list)           // Flatten nested lists
unique(list)         // Remove duplicates
```

### Iteration
```
map(list, current, current + 1)
filter(list, current, current > 5)
find(list, current, current == "target")
findIndex(list, current, current == "target")
```

### Testing
```
every(list, current, current > 0)   // All positive?
some(list, current, current > 100)  // Any over 100?
includes(list, "value")             // Contains value?
```

### Aggregation
```
length(list)         // Count items
sum(list)            // Sum numbers
min(list)            // Minimum
max(list)            // Maximum
join(", ", list)     // Join to string
```

## Type Functions

### Type Checking
```
typeof(value)        // Returns type name
toNumber(value)      // Convert to number
```

### Conversion
```
toNumber("42")       // 42
+"42"                // 42 (unary plus)
format(42)           // "42"
```

## Common Formula Patterns

### Days Until Deadline
```
if(empty(prop("Due Date")), "",
  let(days, dateBetween(prop("Due Date"), now(), "days"),
    if(days < 0, "🔴 " + format(abs(days)) + "d overdue",
      if(days == 0, "⚠️ Due today",
        if(days <= 3, "🟡 " + format(days) + "d left",
          "🟢 " + format(days) + "d left")))))
```

### Status Emoji
```
ifs(
  prop("Status") == "Done", "✅",
  prop("Status") == "In Progress", "🔄",
  prop("Status") == "Blocked", "🔴",
  prop("Status") == "Review", "👀",
  "⏳"
)
```

### Progress Bar
```
let(
  pct, if(prop("Total") == 0, 0, round(prop("Done") / prop("Total") * 100)),
  filled, round(pct / 10),
  repeat("▓", filled) + repeat("░", 10 - filled) + " " + format(pct) + "%"
)
```

### Task Priority Score
```
let(
  urgency, if(empty(prop("Due Date")), 0,
    if(dateBetween(prop("Due Date"), now(), "days") < 0, 10,
      if(dateBetween(prop("Due Date"), now(), "days") <= 3, 7,
        if(dateBetween(prop("Due Date"), now(), "days") <= 7, 4, 1)))),
  importance, ifs(
    prop("Priority") == "Urgent", 10,
    prop("Priority") == "High", 7,
    prop("Priority") == "Medium", 4,
    1),
  urgency + importance
)
```

### Time Tracking Summary
```
let(
  hours, prop("Hours Logged"),
  if(empty(hours), "No time logged",
    if(hours < 1, format(round(hours * 60)) + "m",
      if(hours < 8, format(round(hours * 10) / 10) + "h",
        format(floor(hours / 8)) + "d " + format(round(mod(hours, 8) * 10) / 10) + "h")))
)
```

### Conditional Formatting Tags
```
if(empty(prop("Due Date")), "",
  let(days, dateBetween(prop("Due Date"), now(), "days"),
    ifs(
      days < 0, "OVERDUE",
      days == 0, "TODAY",
      days <= 3, "SOON",
      days <= 7, "THIS WEEK",
      "UPCOMING"
    )))
```

### Sprint Assignment
```
let(
  start, parseDate("2024-01-08"),
  daysSinceStart, dateBetween(prop("Created"), start, "days"),
  sprintNum, floor(daysSinceStart / 14) + 1,
  "Sprint " + format(sprintNum)
)
```

## let() — Variable Binding

```
let(
  varName, expression,
  varName2, expression2,
  finalExpression
)
```

Use `let()` to:
- Avoid repeating expressions
- Make formulas readable
- Break complex logic into named steps

```
let(
  revenue, prop("Units Sold") * prop("Price"),
  cost, prop("Units Sold") * prop("Unit Cost"),
  profit, revenue - cost,
  margin, if(revenue == 0, 0, round(profit / revenue * 100)),
  format(margin) + "% margin ($" + format(round(profit)) + " profit)"
)
```

## Formula Debugging Tips

1. **Start simple** — Build formulas incrementally, testing each part
2. **Check property names** — Must match exactly (case-sensitive in `prop()`)
3. **Handle empty values** — Always check `empty()` before computing
4. **Use `let()`** — Makes complex formulas readable and debuggable
5. **Check types** — `dateBetween` needs dates, `round` needs numbers
6. **Division by zero** — Always guard: `if(prop("Total") == 0, 0, prop("Done") / prop("Total"))`
7. **Date comparisons** — Use `dateBetween`, not direct comparison operators
