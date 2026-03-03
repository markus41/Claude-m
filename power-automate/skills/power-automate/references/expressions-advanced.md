# Power Automate — Advanced Expressions

## Overview
Power Automate expressions use the Azure Logic Apps expression language based on the
Workflow Definition Language. Expressions are enclosed in `@{}` in action definitions or
used directly in `@expression` syntax. They support a rich function library for string
manipulation, date/time, math, array/object operations, type conversion, and flow control.

---

## Expression Syntax

| Pattern | Syntax | Example |
|---|---|---|
| Inline expression | `@{expression}` | `@{triggerBody()?['Name']}` |
| Whole field expression | `@expression` | `@true`, `@null`, `@body('Action')` |
| String interpolation | `"text @{expr} more text"` | `"Hello @{triggerBody()?['Name']}!"` |
| Optional chaining | `?['key']` | `@{body('Action')?['optional']?['nested']}` |
| Null coalescing | `coalesce(a, b)` | `@{coalesce(triggerBody()?['X'], 'default')}` |

---

## Accessing Flow Data

| Function | Returns | Example |
|---|---|---|
| `triggerBody()` | Trigger output body | `@{triggerBody()?['Subject']}` |
| `triggerOutputs()` | Full trigger output | `@{triggerOutputs()?['headers']?['X-Custom']}` |
| `body('ActionName')` | Action output body | `@{body('Get_item')?['fields']?['Title']}` |
| `outputs('ActionName')` | Full action output | `@{outputs('HTTP')?['statusCode']}` |
| `actions('ActionName')` | Action execution metadata | `@{actions('Send_email').status}` |
| `result('ScopeName')` | All actions in scope | `@{result('Try_scope')}` |
| `items('ForEach')` | Current loop item | `@{items('Apply_to_each')?['id']}` |
| `iterationIndexes('ForEach')` | Loop index | `@{iterationIndexes('Apply_to_each')}` |
| `variables('VarName')` | Variable value | `@{variables('counter')}` |
| `parameters('ParamName')` | Flow parameter | `@{parameters('environment')}` |

---

## String Functions

| Function | Signature | Example | Output |
|---|---|---|---|
| `concat` | `concat(str1, str2, ...)` | `@{concat('Hello', ' ', 'World')}` | `Hello World` |
| `substring` | `substring(str, start, length)` | `@{substring('Hello World', 6, 5)}` | `World` |
| `indexOf` | `indexOf(str, searchStr)` | `@{indexOf('Hello', 'ell')}` | `1` |
| `lastIndexOf` | `lastIndexOf(str, searchStr)` | `@{lastIndexOf('a/b/c', '/')}` | `3` |
| `length` | `length(str)` | `@{length('Hello')}` | `5` |
| `toLower` | `toLower(str)` | `@{toLower('HELLO')}` | `hello` |
| `toUpper` | `toUpper(str)` | `@{toUpper('hello')}` | `HELLO` |
| `trim` | `trim(str)` | `@{trim('  hi  ')}` | `hi` |
| `replace` | `replace(str, old, new)` | `@{replace('a-b-c', '-', '_')}` | `a_b_c` |
| `split` | `split(str, delimiter)` | `@{split('a,b,c', ',')}` | `["a","b","c"]` |
| `startsWith` | `startsWith(str, prefix)` | `@{startsWith('Hello', 'He')}` | `true` |
| `endsWith` | `endsWith(str, suffix)` | `@{endsWith('Hello', 'lo')}` | `true` |
| `contains` | `contains(str, substr)` | `@{contains('Hello', 'ell')}` | `true` |
| `empty` | `empty(str)` | `@{empty('')}` | `true` |
| `guid` | `guid()` | `@{guid()}` | `uuid-v4-string` |
| `base64` | `base64(str)` | `@{base64('Hello')}` | `SGVsbG8=` |
| `base64ToString` | `base64ToString(b64)` | `@{base64ToString('SGVsbG8=')}` | `Hello` |
| `encodeURIComponent` | `encodeURIComponent(str)` | `@{encodeURIComponent('a b')}` | `a%20b` |
| `decodeURIComponent` | `decodeURIComponent(str)` | `@{decodeURIComponent('a%20b')}` | `a b` |
| `uriComponent` | `uriComponent(str)` | Same as encodeURIComponent | |
| `formatNumber` | `formatNumber(num, format)` | `@{formatNumber(1234.56, 'C2', 'en-US')}` | `$1,234.56` |

---

## Date/Time Functions

| Function | Signature | Example | Output |
|---|---|---|---|
| `utcNow` | `utcNow()` | `@{utcNow()}` | `2026-03-01T12:00:00.0000000Z` |
| `utcNow` (formatted) | `utcNow('format')` | `@{utcNow('yyyy-MM-dd')}` | `2026-03-01` |
| `convertTimeZone` | `convertTimeZone(ts, from, to)` | `@{convertTimeZone(utcNow(), 'UTC', 'Eastern Standard Time')}` | Local time |
| `addDays` | `addDays(ts, days)` | `@{addDays(utcNow(), 7)}` | +7 days |
| `addHours` | `addHours(ts, hours)` | `@{addHours(utcNow(), -2)}` | -2 hours |
| `addMinutes` | `addMinutes(ts, mins)` | `@{addMinutes(utcNow(), 30)}` | +30 min |
| `addSeconds` | `addSeconds(ts, secs)` | `@{addSeconds(utcNow(), -60)}` | -60 sec |
| `addToTime` | `addToTime(ts, interval, unit)` | `@{addToTime(utcNow(), 1, 'Month')}` | +1 month |
| `getPastTime` | `getPastTime(interval, unit)` | `@{getPastTime(7, 'Day')}` | 7 days ago |
| `getFutureTime` | `getFutureTime(interval, unit)` | `@{getFutureTime(1, 'Hour')}` | 1 hour from now |
| `formatDateTime` | `formatDateTime(ts, format)` | `@{formatDateTime(utcNow(), 'dd MMM yyyy')}` | `01 Mar 2026` |
| `parseDateTime` | `parseDateTime(str, locale)` | `@{parseDateTime('01/03/2026', 'en-GB')}` | ISO datetime |
| `startOfDay` | `startOfDay(ts)` | `@{startOfDay(utcNow())}` | Midnight UTC |
| `startOfHour` | `startOfHour(ts)` | `@{startOfHour(utcNow())}` | Hour start |
| `startOfMonth` | `startOfMonth(ts)` | `@{startOfMonth(utcNow())}` | Month start |
| `ticks` | `ticks(ts)` | `@{ticks(utcNow())}` | 100-ns ticks since epoch |
| `dayOfWeek` | `dayOfWeek(ts)` | `@{dayOfWeek(utcNow())}` | `0`=Sun … `6`=Sat |
| `dayOfMonth` | `dayOfMonth(ts)` | `@{dayOfMonth(utcNow())}` | `1`–`31` |
| `dayOfYear` | `dayOfYear(ts)` | `@{dayOfYear(utcNow())}` | `1`–`366` |

**Common format strings:** `yyyy-MM-dd`, `yyyy-MM-ddTHH:mm:ssZ`, `dd/MM/yyyy`, `MMM dd, yyyy HH:mm`

---

## Math Functions

| Function | Example | Output |
|---|---|---|
| `add(a, b)` | `@{add(10, 5)}` | `15` |
| `sub(a, b)` | `@{sub(10, 5)}` | `5` |
| `mul(a, b)` | `@{mul(10, 5)}` | `50` |
| `div(a, b)` | `@{div(10, 3)}` | `3` (integer) |
| `mod(a, b)` | `@{mod(10, 3)}` | `1` |
| `min(a, b)` | `@{min(10, 5)}` | `5` |
| `max(a, b)` | `@{max(10, 5)}` | `10` |
| `rand(min, max)` | `@{rand(1, 100)}` | Random int 1–99 |
| `float(str)` | `@{float('3.14')}` | `3.14` |
| `int(str)` | `@{int('42')}` | `42` |
| `abs(n)` | `@{abs(-5)}` | `5` |
| `string(n)` | `@{string(42)}` | `"42"` |

---

## Array Functions

| Function | Signature | Example |
|---|---|---|
| `length` | `length(arr)` | `@{length(body('Get_items')?['value'])}` |
| `first` | `first(arr)` | `@{first(body('Get_items')?['value'])}` |
| `last` | `last(arr)` | `@{last(variables('myArray'))}` |
| `take` | `take(arr, n)` | `@{take(variables('arr'), 3)}` — first 3 |
| `skip` | `skip(arr, n)` | `@{skip(variables('arr'), 2)}` — skip first 2 |
| `union` | `union(arr1, arr2)` | Merge arrays, deduplicate |
| `intersection` | `intersection(arr1, arr2)` | Items in both arrays |
| `contains` | `contains(arr, item)` | `@{contains(variables('arr'), 'apple')}` |
| `empty` | `empty(arr)` | `@{empty(variables('arr'))}` |
| `createArray` | `createArray(a, b, c)` | `@{createArray('a', 'b', 'c')}` |
| `range` | `range(start, count)` | `@{range(1, 5)}` → `[1,2,3,4,5]` |
| `indexOf` | `indexOf(arr, item)` | `@{indexOf(variables('arr'), 'b')}` |
| `join` | `join(arr, delimiter)` | `@{join(variables('arr'), ',')}` |
| `reverse` | `reverse(arr)` | `@{reverse(variables('arr'))}` |
| `sort` | `sort(arr)` | `@{sort(variables('numArr'))}` |
| `chunk` | `chunk(arr, size)` | `@{chunk(range(1,10), 3)}` — array of arrays |

---

## Object / JSON Functions

| Function | Example | Notes |
|---|---|---|
| `json(str)` | `@{json(body('HTTP')['body'])}` | Parse JSON string |
| `string(obj)` | `@{string(variables('myObj'))}` | Serialize to JSON string |
| `xpath(xml, path)` | `@{xpath(xml(triggerBody()), '/root/item/text()')}` | XPath on XML |
| `xml(str)` | `@{xml(triggerBody()?['xmlContent'])}` | Parse XML string |
| `coalesce` | `@{coalesce(a, b, c)}` | First non-null value |
| `if` | `@{if(condition, trueVal, falseVal)}` | Ternary |
| `equals` | `@{equals(a, b)}` | `true`/`false` |
| `not` | `@{not(equals(a, b))}` | Logical NOT |
| `and` | `@{and(cond1, cond2)}` | Logical AND |
| `or` | `@{or(cond1, cond2)}` | Logical OR |
| `null` | `@{null}` | Null value |
| `bool` | `@{bool('true')}` | Parse boolean |

---

## Type Conversion Patterns

```
String to Number:   @{int(triggerBody()?['quantity'])}
Number to String:   @{string(variables('count'))}
String to Bool:     @{bool(triggerBody()?['isActive'])}
Bool to String:     @{string(true)}   →  "true"
String to DateTime: @{parseDateTime(triggerBody()?['date'], 'en-US')}
DateTime to String: @{formatDateTime(utcNow(), 'yyyy-MM-dd')}
JSON String to Obj: @{json(body('Compose')?['rawJson'])}
Object to String:   @{string(body('Parse_JSON'))}
Array to String:    @{join(variables('arr'), '; ')}
String to Array:    @{split(triggerBody()?['csv'], ',')}
Base64 encode:      @{base64(triggerBody()?['content'])}
Base64 decode:      @{base64ToString(triggerBody()?['encodedContent'])}
```

---

## Practical Expression Patterns

### Safe property access with default
```
@{coalesce(triggerBody()?['OptionalField'], 'N/A')}
```

### Conditional routing value
```
@{if(greater(int(triggerBody()?['Amount']), 10000), 'high-value', 'standard')}
```

### Build URL from parts
```
@{concat('https://api.contoso.com/items/', encodeURIComponent(triggerBody()?['ItemName']), '?env=', parameters('env_TargetEnv'))}
```

### Format currency
```
@{concat('$', formatNumber(float(triggerBody()?['Amount']), 'N2'))}
```

### Current date in SharePoint format
```
@{formatDateTime(utcNow(), 'yyyy-MM-ddTHH:mm:ssZ')}
```

### Check if array is non-empty
```
@{greater(length(body('Get_items')?['value']), 0)}
```

### Get first email from comma-separated list
```
@{first(split(triggerBody()?['Recipients'], ','))}
```

### Truncate string with ellipsis
```
@{if(greater(length(triggerBody()?['Description']), 100), concat(substring(triggerBody()?['Description'], 0, 97), '...'), triggerBody()?['Description'])}
```

### Build JSON body inline
```json
{
  "subject": "@{concat('[', triggerBody()?['Priority'], '] ', triggerBody()?['Title'])}",
  "body": "@{replace(triggerBody()?['Description'], '\n', '<br>')}",
  "recipients": "@{join(variables('recipientList'), ';')}"
}
```

### Check day of week (skip weekends)
```
@{not(or(equals(dayOfWeek(utcNow()), 0), equals(dayOfWeek(utcNow()), 6)))}
```

---

## Common Expression Mistakes

| Mistake | Problem | Fix |
|---|---|---|
| `@body('Action')['key']` | No optional chaining — throws if null | `@{body('Action')?['key']}` |
| `@{add('10', 5)}` | String passed to math function | `@{add(int('10'), 5)}` |
| `@{utcNow('yyyy/MM/dd')}` | Wrong format separator for OData | Use `yyyy-MM-dd` for dates |
| `@{variables('x') + 1}` | `+` operator not supported | `@{add(variables('x'), 1)}` |
| `@{body('Action').key}` | Dot notation not supported | Use `?['key']` bracket notation |
| `@{if(a == b, ...)}` | `==` not supported | `@{if(equals(a, b), ...)}` |
| `@{triggerBody()['key']}` | Non-optional access crashes on null | Add `?` before `[` |

---

## Limits

| Resource | Limit | Notes |
|---|---|---|
| Expression length | 8,192 characters | Per single expression |
| String function input | 102,400 characters | Per operation |
| `concat` arguments | 50 | Per call |
| Array size in expressions | 100,000 items | Performance degrades above ~10K |
| `split` output array | 100,000 elements | |
| `join` input array | 100,000 elements | |
| Nested expression depth | No documented limit | Practical limit ~20 levels before performance impact |
