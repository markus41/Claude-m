---
name: la-expression-helper
description: "Generate, validate, and explain Logic App workflow expressions"
argument-hint: "<goal-description> [--validate <expression>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Logic App Expression Helper

Generate, validate, and explain Workflow Definition Language (WDL) expressions for Azure Logic Apps.

## Instructions

### 1. Understand the User's Goal

Ask the user what data transformation or logic they need if not provided. Common goals include:
- String manipulation (concatenation, substring, replace, formatting)
- Date/time operations (conversion, formatting, arithmetic)
- JSON data access (property extraction, array filtering, transformation)
- Conditional logic (if/else, switch, null handling)
- Type conversion (string to number, JSON parsing, Base64 encoding)
- Collection operations (filtering, selecting, counting, joining)

### 2. Generate the Appropriate Expression

Build the expression using WDL functions. Logic App expressions use the `@{...}` syntax in string contexts or `@<expression>` when the entire value is an expression.

**Expression function reference** (organized by category):

**String Functions**:
| Function | Description | Example |
|----------|-------------|---------|
| `concat(text1, text2, ...)` | Join strings | `@concat('Hello ', triggerBody()?['name'])` |
| `substring(text, startIndex, length)` | Extract substring | `@substring('Hello World', 0, 5)` returns `Hello` |
| `replace(text, oldText, newText)` | Replace text | `@replace(triggerBody()?['msg'], ' ', '-')` |
| `toLower(text)` / `toUpper(text)` | Change case | `@toLower(triggerBody()?['email'])` |
| `trim(text)` | Remove whitespace | `@trim(triggerBody()?['input'])` |
| `split(text, delimiter)` | Split to array | `@split('a,b,c', ',')` |
| `indexOf(text, searchText)` | Find position | `@indexOf('Hello', 'lo')` returns `3` |
| `startsWith(text, searchText)` | Check prefix | `@startsWith(triggerBody()?['code'], 'PRD-')` |
| `endsWith(text, searchText)` | Check suffix | `@endsWith(triggerBody()?['file'], '.pdf')` |
| `length(text)` | String length | `@length(triggerBody()?['name'])` |
| `guid()` | Generate GUID | `@guid()` |

**Date/Time Functions**:
| Function | Description | Example |
|----------|-------------|---------|
| `utcNow()` | Current UTC timestamp | `@utcNow()` |
| `formatDateTime(timestamp, format)` | Format date | `@formatDateTime(utcNow(), 'yyyy-MM-dd')` |
| `addDays(timestamp, days)` | Add days | `@addDays(utcNow(), 7)` |
| `addHours(timestamp, hours)` | Add hours | `@addHours(utcNow(), -24)` |
| `addMinutes(timestamp, minutes)` | Add minutes | `@addMinutes(triggerBody()?['start'], 30)` |
| `convertTimeZone(timestamp, source, dest)` | Convert timezone | `@convertTimeZone(utcNow(), 'UTC', 'Eastern Standard Time')` |
| `dayOfWeek(timestamp)` | Day number (0=Sun) | `@dayOfWeek(utcNow())` |
| `ticks(timestamp)` | Timestamp to ticks | `@ticks(utcNow())` |
| `dateDifference(start, end)` | Duration between dates | `@dateDifference(triggerBody()?['start'], utcNow())` |

**Collection Functions**:
| Function | Description | Example |
|----------|-------------|---------|
| `length(collection)` | Array length | `@length(triggerBody()?['items'])` |
| `first(collection)` | First element | `@first(body('Get_rows')?['value'])` |
| `last(collection)` | Last element | `@last(body('Get_rows')?['value'])` |
| `contains(collection, value)` | Check membership | `@contains(triggerBody()?['tags'], 'urgent')` |
| `union(collection1, collection2)` | Merge arrays | `@union(variables('list1'), variables('list2'))` |
| `intersection(col1, col2)` | Common elements | `@intersection(variables('a'), variables('b'))` |
| `skip(collection, count)` | Skip N elements | `@skip(body('Get_rows')?['value'], 10)` |
| `take(collection, count)` | Take N elements | `@take(body('Get_rows')?['value'], 5)` |
| `join(collection, delimiter)` | Join array to string | `@join(triggerBody()?['tags'], ', ')` |

**Logical Functions**:
| Function | Description | Example |
|----------|-------------|---------|
| `if(condition, trueVal, falseVal)` | Conditional | `@if(equals(triggerBody()?['status'], 'active'), 'Yes', 'No')` |
| `equals(val1, val2)` | Equality check | `@equals(triggerBody()?['type'], 'order')` |
| `and(expr1, expr2)` | Logical AND | `@and(greater(variables('count'), 0), less(variables('count'), 100))` |
| `or(expr1, expr2)` | Logical OR | `@or(equals(variables('status'), 'A'), equals(variables('status'), 'B'))` |
| `not(expression)` | Logical NOT | `@not(equals(triggerBody()?['active'], true))` |
| `greater(val1, val2)` | Greater than | `@greater(length(triggerBody()?['items']), 0)` |
| `less(val1, val2)` | Less than | `@less(variables('retryCount'), 3)` |
| `coalesce(val1, val2, ...)` | First non-null | `@coalesce(triggerBody()?['name'], 'Unknown')` |

**Conversion Functions**:
| Function | Description | Example |
|----------|-------------|---------|
| `int(value)` | Convert to integer | `@int(triggerBody()?['quantity'])` |
| `float(value)` | Convert to float | `@float(triggerBody()?['price'])` |
| `string(value)` | Convert to string | `@string(triggerBody()?['id'])` |
| `json(value)` | Parse JSON string | `@json(triggerBody())` |
| `base64(value)` | Base64 encode | `@base64(body('Get_file'))` |
| `base64ToString(value)` | Base64 decode | `@base64ToString(triggerBody()?['data'])` |
| `decodeUriComponent(value)` | URL decode | `@decodeUriComponent(triggerBody()?['url'])` |
| `encodeUriComponent(value)` | URL encode | `@encodeUriComponent(variables('path'))` |
| `xml(value)` | Convert to XML | `@xml(triggerBody())` |
| `xpath(xml, expression)` | XPath query | `@xpath(xml(body('Get_file')), '//order/id')` |

**Data Access Functions**:
| Function | Description | Example |
|----------|-------------|---------|
| `triggerBody()` | Trigger output body | `@triggerBody()` |
| `triggerOutputs()` | All trigger outputs | `@triggerOutputs()?['headers']` |
| `body('actionName')` | Action output body | `@body('Send_email')` |
| `outputs('actionName')` | All action outputs | `@outputs('HTTP')?['statusCode']` |
| `actions('actionName')` | Action status info | `@actions('Step_1')?['status']` |
| `variables('name')` | Variable value | `@variables('counter')` |
| `parameters('name')` | Parameter value | `@parameters('apiEndpoint')` |
| `items('ForEachLoop')` | Current loop item | `@items('For_each')?['id']` |

### 3. Explain the Expression Components

Break down the generated expression and explain each function call, its arguments, and what it returns. Use clear language and provide the expected output for sample input data.

### 4. Show Common Pitfalls

Warn about frequent mistakes:

- **Null handling**: Always use `?` (safe navigation) or `coalesce()` to handle null values. `triggerBody()?['name']` is safe; `triggerBody()['name']` will fail if `name` is missing.
- **Type coercion**: Comparison functions require matching types. Use `int()`, `float()`, or `string()` to convert before comparing.
- **UTC dates**: `utcNow()` always returns UTC. Use `convertTimeZone()` for local time. Date strings must be ISO 8601 format.
- **String vs expression context**: Use `@{expression}` inside strings, but `@expression` when the entire value is the expression. Do not mix: `"@concat('a', 'b')"` is correct, `"prefix @concat('a', 'b') suffix"` is NOT — use `"@{concat('a', 'b')}"` inside strings.
- **Array indexing**: Use `first()`, `last()`, or bracket notation `[0]`. Arrays are zero-indexed.
- **Case sensitivity**: Function names are case-insensitive, but property names in JSON are case-sensitive.
- **Nested quotes**: Use single quotes inside expressions: `@equals(triggerBody()?['status'], 'active')`.

### 5. Provide Expression in Context

Show how the expression fits in a `workflow.json` action:

```json
{
  "Compose_Result": {
    "type": "Compose",
    "runAfter": {},
    "inputs": "@if(greater(length(triggerBody()?['items']), 0), concat('Found ', string(length(triggerBody()?['items'])), ' items'), 'No items found')"
  }
}
```

Or in a condition action:
```json
{
  "Condition_Check_Status": {
    "type": "If",
    "runAfter": {},
    "expression": {
      "and": [
        {
          "equals": [
            "@triggerBody()?['status']",
            "approved"
          ]
        },
        {
          "greater": [
            "@triggerBody()?['amount']",
            1000
          ]
        }
      ]
    },
    "actions": {},
    "else": { "actions": {} }
  }
}
```

### 6. Validate an Existing Expression

If `--validate` is provided with an expression:

1. **Parse the expression**: Check for balanced parentheses, correct function names, proper quoting.
2. **Check function signatures**: Verify each function is called with the correct number and types of arguments.
3. **Identify issues**:
   - Missing `?` for null-safe property access
   - Mismatched types in comparisons
   - Invalid function names (check against the reference table)
   - Incorrect string quoting (double quotes inside expressions)
   - Missing closing parentheses or brackets
4. **Suggest corrections**: Provide the fixed expression with an explanation of what was wrong.
5. **Show the corrected expression in context**: Display it in a workflow.json snippet.
