# FetchXML & OData Queries — Dataverse Web API

## Overview

Dataverse supports two query languages: **FetchXML** (XML-based, Dataverse-native) and **OData** (URL query parameters, standard protocol). Both can be used through the Web API. FetchXML is more powerful for complex queries (aggregation, linked entities with advanced filters), while OData is simpler for basic CRUD and filtering.

---

## FetchXML Structure

### Basic Query

```xml
<fetch top="50" distinct="false">
  <entity name="cr123_projecttask">
    <attribute name="cr123_name" />
    <attribute name="cr123_duedate" />
    <attribute name="cr123_priority" />
    <attribute name="createdon" />
    <order attribute="cr123_duedate" descending="false" />
    <filter type="and">
      <condition attribute="statecode" operator="eq" value="0" />
      <condition attribute="cr123_priority" operator="eq" value="100002" />
    </filter>
  </entity>
</fetch>
```

### Executing FetchXML via Web API

```
GET {environmentUrl}/api/data/v9.2/cr123_projecttasks?fetchXml={urlEncodedFetchXml}
```

The FetchXML string must be URL-encoded when passed as a query parameter.

### TypeScript Example

```typescript
async function executeFetchXml<T>(
  envUrl: string,
  token: string,
  entitySetName: string,
  fetchXml: string
): Promise<T[]> {
  const encoded = encodeURIComponent(fetchXml);
  const response = await fetch(
    `${envUrl}/api/data/v9.2/${entitySetName}?fetchXml=${encoded}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        Accept: "application/json",
        Prefer: 'odata.include-annotations="*"',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`FetchXML query failed: ${JSON.stringify(error)}`);
  }

  const result = await response.json();
  return result.value as T[];
}
```

---

## FetchXML Filter Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `eq` | Equals | `<condition attribute="status" operator="eq" value="1" />` |
| `ne` | Not equals | `<condition attribute="status" operator="ne" value="0" />` |
| `gt` | Greater than | `<condition attribute="amount" operator="gt" value="1000" />` |
| `ge` | Greater or equal | `<condition attribute="amount" operator="ge" value="1000" />` |
| `lt` | Less than | `<condition attribute="amount" operator="lt" value="500" />` |
| `le` | Less or equal | `<condition attribute="amount" operator="le" value="500" />` |
| `like` | Pattern match | `<condition attribute="name" operator="like" value="%project%" />` |
| `not-like` | Pattern not match | `<condition attribute="name" operator="not-like" value="%test%" />` |
| `in` | In list | `<condition attribute="status" operator="in"><value>1</value><value>2</value></condition>` |
| `not-in` | Not in list | `<condition attribute="status" operator="not-in"><value>3</value><value>4</value></condition>` |
| `between` | Range | `<condition attribute="amount" operator="between"><value>100</value><value>500</value></condition>` |
| `null` | Is null | `<condition attribute="email" operator="null" />` |
| `not-null` | Is not null | `<condition attribute="email" operator="not-null" />` |
| `eq-userid` | Current user | `<condition attribute="ownerid" operator="eq-userid" />` |
| `today` | Today's date | `<condition attribute="duedate" operator="today" />` |
| `yesterday` | Yesterday | `<condition attribute="createdon" operator="yesterday" />` |
| `last-x-days` | Last N days | `<condition attribute="createdon" operator="last-x-days" value="7" />` |
| `next-x-days` | Next N days | `<condition attribute="duedate" operator="next-x-days" value="30" />` |
| `this-month` | Current month | `<condition attribute="createdon" operator="this-month" />` |
| `this-year` | Current year | `<condition attribute="createdon" operator="this-year" />` |
| `above` | Above in hierarchy | `<condition attribute="cr123_parentid" operator="above" value="{guid}" />` |
| `under` | Under in hierarchy | `<condition attribute="cr123_parentid" operator="under" value="{guid}" />` |
| `contain-values` | Multi-select contains | `<condition attribute="cr123_tags" operator="contain-values"><value>100000</value></condition>` |

---

## Link-Entity (Joins)

Link-entity performs joins between tables.

### Inner Join

```xml
<fetch>
  <entity name="cr123_projecttask">
    <attribute name="cr123_name" />
    <attribute name="cr123_duedate" />
    <link-entity name="cr123_project" from="cr123_projectid" to="cr123_projectid" link-type="inner" alias="proj">
      <attribute name="cr123_name" alias="project_name" />
      <filter>
        <condition attribute="statecode" operator="eq" value="0" />
      </filter>
    </link-entity>
  </entity>
</fetch>
```

### Outer Join

```xml
<link-entity name="cr123_resource" from="cr123_resourceid" to="cr123_assignedtoid" link-type="outer" alias="res">
  <attribute name="cr123_name" alias="assigned_to_name" />
</link-entity>
```

### Link-Entity Properties

| Property | Description |
|----------|-------------|
| `name` | Logical name of the related table |
| `from` | Column on the related table to join on |
| `to` | Column on the current table to join on |
| `link-type` | `inner` (default) or `outer` |
| `alias` | Alias prefix for related columns in results |
| `intersect` | `true` for N:N intersect tables |

### N:N Relationship Query

```xml
<fetch>
  <entity name="cr123_project">
    <attribute name="cr123_name" />
    <link-entity name="cr123_project_resource" from="cr123_projectid" to="cr123_projectid" intersect="true">
      <link-entity name="cr123_resource" from="cr123_resourceid" to="cr123_resourceid" alias="res">
        <attribute name="cr123_name" alias="resource_name" />
      </link-entity>
    </link-entity>
  </entity>
</fetch>
```

---

## Aggregation

Enable aggregation with `aggregate="true"` on the fetch element.

### Count

```xml
<fetch aggregate="true">
  <entity name="cr123_projecttask">
    <attribute name="cr123_projecttaskid" alias="task_count" aggregate="count" />
  </entity>
</fetch>
```

### Group By with Sum

```xml
<fetch aggregate="true">
  <entity name="cr123_projecttask">
    <attribute name="cr123_projectid" alias="project" groupby="true" />
    <attribute name="cr123_estimatedhours" alias="total_hours" aggregate="sum" />
    <attribute name="cr123_projecttaskid" alias="task_count" aggregate="count" />
    <filter>
      <condition attribute="statecode" operator="eq" value="0" />
    </filter>
  </entity>
</fetch>
```

### Aggregate Functions

| Function | Description |
|----------|-------------|
| `count` | Count of records |
| `countcolumn` | Count of non-null values in a column |
| `sum` | Sum of numeric column |
| `avg` | Average of numeric column |
| `min` | Minimum value |
| `max` | Maximum value |

### Date Grouping

```xml
<fetch aggregate="true">
  <entity name="cr123_projecttask">
    <attribute name="createdon" alias="month" groupby="true" dategrouping="month" />
    <attribute name="createdon" alias="year" groupby="true" dategrouping="year" />
    <attribute name="cr123_projecttaskid" alias="count" aggregate="count" />
  </entity>
</fetch>
```

Date grouping values: `day`, `week`, `month`, `quarter`, `year`, `fiscal-period`, `fiscal-year`.

---

## Pagination

### Page and Count

```xml
<fetch page="1" count="50">
  <entity name="cr123_projecttask">
    <attribute name="cr123_name" />
    <order attribute="createdon" descending="true" />
  </entity>
</fetch>
```

### Paging Cookie

For efficient pagination over large datasets, use the paging cookie returned in the response:

```xml
<fetch page="2" count="50" paging-cookie="{encodedPagingCookie}">
  <entity name="cr123_projecttask">
    <attribute name="cr123_name" />
    <order attribute="createdon" descending="true" />
  </entity>
</fetch>
```

The paging cookie is returned in the `@Microsoft.Dynamics.CRM.fetchxmlpagingcookie` annotation of the response when more pages exist.

### TypeScript Pagination Helper

```typescript
interface PagedResult<T> {
  records: T[];
  hasMore: boolean;
  pagingCookie: string | null;
}

async function fetchPage<T>(
  envUrl: string,
  token: string,
  entitySetName: string,
  baseFetchXml: string,
  page: number,
  pageSize: number,
  pagingCookie?: string
): Promise<PagedResult<T>> {
  let fetchXml = baseFetchXml.replace("<fetch", `<fetch page="${page}" count="${pageSize}"`);
  if (pagingCookie) {
    fetchXml = fetchXml.replace("<fetch", `<fetch paging-cookie="${encodeURIComponent(pagingCookie)}"`);
  }

  const encoded = encodeURIComponent(fetchXml);
  const response = await fetch(
    `${envUrl}/api/data/v9.2/${entitySetName}?fetchXml=${encoded}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        Prefer: 'odata.include-annotations="*"',
      },
    }
  );

  const result = await response.json();
  return {
    records: result.value as T[],
    hasMore: !!result["@Microsoft.Dynamics.CRM.morerecords"],
    pagingCookie: result["@Microsoft.Dynamics.CRM.fetchxmlpagingcookie"] ?? null,
  };
}
```

---

## OData Query Equivalents

### $select — Choose Columns

```
GET {environmentUrl}/api/data/v9.2/cr123_projecttasks?$select=cr123_name,cr123_duedate,cr123_priority
```

### $filter — Filter Records

```
GET ...?$filter=statecode eq 0 and cr123_priority eq 100002
```

Common operators: `eq`, `ne`, `gt`, `ge`, `lt`, `le`, `contains()`, `startswith()`, `endswith()`

String functions:
```
$filter=contains(cr123_name,'Project') and startswith(cr123_code,'PRJ')
```

Date functions:
```
$filter=cr123_duedate lt 2025-12-31
```

### $expand — Related Records

```
GET ...?$expand=cr123_ProjectId($select=cr123_name,cr123_startdate)
```

Nested expansion (up to 1 level in standard Web API):
```
GET ...?$expand=cr123_ProjectId($select=cr123_name;$expand=ownerid($select=fullname))
```

### $orderby — Sort Results

```
GET ...?$orderby=cr123_duedate asc,createdon desc
```

### $top and $count — Limit and Count

```
GET ...?$top=10&$count=true
```

`$count=true` adds `@odata.count` to the response with the total record count (ignoring `$top`).

### $apply — Aggregation

OData aggregation uses the `$apply` parameter:

**Count:**
```
GET ...?$apply=aggregate($count as task_count)
```

**Group by with sum:**
```
GET ...?$apply=groupby((cr123_priority),aggregate(cr123_estimatedhours with sum as total_hours))
```

**Filter then aggregate:**
```
GET ...?$apply=filter(statecode eq 0)/groupby((_cr123_projectid_value),aggregate($count as task_count))
```

---

## FetchXML to OData Conversion Reference

| FetchXML | OData |
|----------|-------|
| `<attribute name="x" />` | `$select=x` |
| `<filter><condition attribute="x" operator="eq" value="1" /></filter>` | `$filter=x eq 1` |
| `<order attribute="x" descending="true" />` | `$orderby=x desc` |
| `<fetch top="10">` | `$top=10` |
| `<link-entity name="y" link-type="inner">` | `$expand=y_navigation` |
| `aggregate="true" ... aggregate="count"` | `$apply=aggregate($count as alias)` |
| `groupby="true"` | `$apply=groupby((column), ...)` |
| `operator="like" value="%text%"` | `$filter=contains(column,'text')` |
| `operator="null"` | `$filter=column eq null` |
| `operator="in"` | `$filter=Microsoft.Dynamics.CRM.In(PropertyName='x',PropertyValues=['a','b'])` |
| `<fetch page="2" count="50">` | `$skip=50&$top=50` or use `@odata.nextLink` |

---

## Complex Filter Expressions

### Nested OR within AND (FetchXML)

```xml
<filter type="and">
  <condition attribute="statecode" operator="eq" value="0" />
  <filter type="or">
    <condition attribute="cr123_priority" operator="eq" value="100002" />
    <condition attribute="cr123_priority" operator="eq" value="100003" />
  </filter>
</filter>
```

### Equivalent OData

```
$filter=statecode eq 0 and (cr123_priority eq 100002 or cr123_priority eq 100003)
```

### Related Record Filtering (FetchXML)

Filter tasks where the parent project is active and owned by the current user:

```xml
<fetch>
  <entity name="cr123_projecttask">
    <attribute name="cr123_name" />
    <link-entity name="cr123_project" from="cr123_projectid" to="cr123_projectid" alias="proj">
      <filter>
        <condition attribute="statecode" operator="eq" value="0" />
        <condition attribute="ownerid" operator="eq-userid" />
      </filter>
    </link-entity>
  </entity>
</fetch>
```

### Related Record Filtering (OData)

```
GET .../cr123_projecttasks?$filter=cr123_ProjectId/statecode eq 0&$expand=cr123_ProjectId($select=cr123_name)
```

**Note:** OData related filtering is limited to single-level navigation properties. For complex multi-table filtering, FetchXML is more capable.

---

## Performance Tips

1. **Always use $select** — Only request needed columns; avoid returning all columns
2. **Use paging** — Never fetch unbounded result sets; use `$top` or `count` in FetchXML
3. **Index-friendly filters** — Filter on columns that are indexed (primary key, lookup columns, status)
4. **Avoid leading wildcards** — `like '%text'` cannot use indexes; prefer `like 'text%'`
5. **Use FetchXML for aggregation** — FetchXML aggregation is more efficient than client-side aggregation
6. **Prefer annotations** — Use `Prefer: odata.include-annotations="*"` to get formatted values, lookup names, and option set labels in a single request instead of expanding related records
7. **Batch related queries** — Use `$batch` to execute multiple queries in a single HTTP request
