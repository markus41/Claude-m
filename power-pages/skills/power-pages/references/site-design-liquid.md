# Site Design and Liquid Templates Reference

## Overview

Power Pages uses the Liquid template language (Shopify-based with Microsoft extensions) for dynamic server-side rendering. Web templates combine Liquid markup with HTML, CSS, and JavaScript to render pages, query Dataverse data with FetchXML, and display dynamic content. This reference covers Liquid tags and filters, fetchXML in Liquid, partials, global objects, JavaScript and web template integration, and custom CSS/JS injection.

---

## Liquid Template Syntax Overview

| Syntax | Purpose | Example |
|---|---|---|
| `{{ expression }}` | Output a value | `{{ page.title }}` |
| `{% tag %}` | Logic, flow control, data | `{% if user %}...{% endif %}` |
| `{%- tag -%}` | Whitespace-trimmed variant | `{%- assign x = 1 -%}` |
| `{{ value \| filter }}` | Apply a filter to a value | `{{ text \| upcase }}` |
| `{% comment %}...{% endcomment %}` | Comments (not rendered) | |

---

## Liquid Tags

### Control Flow Tags

```liquid
{% if condition %}
  ...
{% elsif other_condition %}
  ...
{% else %}
  ...
{% endif %}

{% unless condition %}
  Renders when condition is FALSE
{% endunless %}

{% case variable %}
  {% when 'value1' %}
    ...
  {% when 'value2' %}
    ...
  {% else %}
    ...
{% endcase %}
```

### Loop Tags

```liquid
{% for item in collection %}
  <li>{{ item.name }}</li>
{% else %}
  <p>No items found.</p>
{% endfor %}

{% for i in (1..5) %}
  {{ i }}
{% endfor %}

{% for item in collection limit:10 offset:0 %}
  {{ item.title }}
{% endfor %}

{%- for item in collection -%}
  {{ forloop.index }}   <!-- 1-based index -->
  {{ forloop.index0 }}  <!-- 0-based index -->
  {{ forloop.first }}   <!-- true on first iteration -->
  {{ forloop.last }}    <!-- true on last iteration -->
  {{ forloop.length }}  <!-- total count -->
  {% if forloop.last %}{% else %}, {% endif %}
{%- endfor -%}
```

### Variable Assignment

```liquid
{% assign myVar = 'Hello World' %}
{% assign count = 42 %}
{% assign isActive = true %}

{% assign filteredList = collection | where: "status", "Active" %}

{% capture htmlBlock %}
  <p>This is captured HTML with {{ variable }} interpolation.</p>
{% endcapture %}
{{ htmlBlock }}

{% increment counter %}  <!-- 0, 1, 2, ... per tag call -->
{% decrement counter %}  <!-- -1, -2, -3, ... -->
```

### Include (Embed Web Templates as Partials)

```liquid
{% include 'Header' %}
{% include 'Footer' %}
{% include 'Sidebar' with title: 'Navigation', items: page.children %}

<!-- Include with multiple parameters -->
{% include 'Alert' with
   alert_type: 'warning',
   alert_message: 'Your session will expire in 5 minutes.',
   dismissible: true %}
```

### Extends / Block (Template Inheritance)

```liquid
<!-- Base layout: 'Base Layout' web template -->
<!DOCTYPE html>
<html>
<head>
  <title>{% block title %}{{ page.title }} — {{ website.name }}{% endblock %}</title>
  {% block head %}{% endblock %}
</head>
<body>
  {% include 'Header' %}
  <main>
    {% block content %}{% endblock %}
  </main>
  {% include 'Footer' %}
</body>
</html>

<!-- Page template that extends Base Layout -->
{% extends 'Base Layout' %}

{% block title %}{{ page.title }} | Custom Title{% endblock %}

{% block content %}
  <h1>{{ page.title }}</h1>
  {{ page.content }}
{% endblock %}
```

### Editable Regions (In-Place Editing)

```liquid
{% editable page 'content' %}
{% editable page 'summary' type: 'html', default: 'Add a summary here.' %}
{% editable snippet 'Footer Text' %}
```

---

## FetchXML Queries in Liquid

The `fetchxml` tag is the most powerful data access method in Power Pages. It executes a server-side Dataverse query and returns the results as a Liquid object.

### Basic FetchXML Query

```liquid
{% fetchxml accounts_query %}
<fetch mapping="logical" count="10" aggregate="false">
  <entity name="account">
    <attribute name="name" />
    <attribute name="telephone1" />
    <attribute name="address1_city" />
    <attribute name="accountid" />
    <filter type="and">
      <condition attribute="statecode" operator="eq" value="0" />
    </filter>
    <order attribute="name" descending="false" />
  </entity>
</fetch>
{% endfetchxml %}

{% for account in accounts_query.results.entities %}
  <div class="account-card">
    <h3>{{ account.name }}</h3>
    <p>{{ account.telephone1 }}</p>
    <p>{{ account.address1_city }}</p>
  </div>
{% else %}
  <p>No accounts found.</p>
{% endfor %}

<!-- Total count -->
<p>Found {{ accounts_query.results.total_record_count }} accounts.</p>
```

### FetchXML with User Context Filter

```liquid
{% fetchxml my_cases %}
<fetch mapping="logical" count="25">
  <entity name="incident">
    <attribute name="title" />
    <attribute name="ticketnumber" />
    <attribute name="statuscode" />
    <attribute name="createdon" />
    <attribute name="incidentid" />
    <filter type="and">
      <condition attribute="customerid" operator="eq" value="{{ user.id }}" />
      <condition attribute="statecode" operator="eq" value="0" />
    </filter>
    <order attribute="createdon" descending="true" />
  </entity>
</fetch>
{% endfetchxml %}

{% if user %}
  {% for case in my_cases.results.entities %}
    <tr>
      <td><a href="/cases/{{ case.incidentid }}">{{ case.ticketnumber }}</a></td>
      <td>{{ case.title }}</td>
      <td>{{ case["statuscode@OData.Community.Display.V1.FormattedValue"] }}</td>
      <td>{{ case.createdon | date: "yyyy-MM-dd" }}</td>
    </tr>
  {% endfor %}
{% endif %}
```

### FetchXML with URL Parameter Filter

```liquid
{% assign search_term = request.params['q'] | default: '' %}
{% assign category = request.params['category'] | default: '' %}

{% fetchxml articles %}
<fetch mapping="logical" count="20">
  <entity name="cr_article">
    <attribute name="cr_title" />
    <attribute name="cr_summary" />
    <attribute name="cr_category" />
    <attribute name="cr_publishdate" />
    <attribute name="cr_articleid" />
    <filter type="and">
      <condition attribute="cr_ispublished" operator="eq" value="1" />
      {% if search_term != '' %}
      <condition attribute="cr_title" operator="like" value="%{{ search_term | escape }}%" />
      {% endif %}
      {% if category != '' %}
      <condition attribute="cr_category" operator="eq" value="{{ category | escape }}" />
      {% endif %}
    </filter>
    <order attribute="cr_publishdate" descending="true" />
  </entity>
</fetch>
{% endfetchxml %}
```

### FetchXML with Related Entity (Link-Entity)

```liquid
{% fetchxml orders_with_account %}
<fetch mapping="logical" count="50">
  <entity name="salesorder">
    <attribute name="name" />
    <attribute name="totalamount" />
    <attribute name="statecode" />
    <link-entity name="account" from="accountid" to="customerid" alias="acct">
      <attribute name="name" alias="accountname" />
      <filter type="and">
        <condition attribute="accountid" operator="eq" value="{{ user.parentcustomerid.id }}" />
      </filter>
    </link-entity>
    <order attribute="createdon" descending="true" />
  </entity>
</fetch>
{% endfetchxml %}

{% for order in orders_with_account.results.entities %}
  <p>{{ order.name }} — {{ order["acct.accountname"] }} — {{ order.totalamount | number_with_delimiter }}</p>
{% endfor %}
```

### FetchXML Aggregate Query

```liquid
{% fetchxml case_count_by_status %}
<fetch mapping="logical" aggregate="true">
  <entity name="incident">
    <attribute name="incidentid" alias="casecount" aggregate="count" />
    <attribute name="statuscode" alias="status" groupby="true" />
    <filter>
      <condition attribute="customerid" operator="eq" value="{{ user.id }}" />
    </filter>
  </entity>
</fetch>
{% endfetchxml %}

{% for row in case_count_by_status.results.entities %}
  {{ row["status@OData.Community.Display.V1.FormattedValue"] }}: {{ row.casecount }}
{% endfor %}
```

---

## Liquid Filters

### String Filters

```liquid
{{ "hello world" | upcase }}         → "HELLO WORLD"
{{ "HELLO WORLD" | downcase }}        → "hello world"
{{ "  spaces  " | strip }}           → "spaces"
{{ "hello world" | capitalize }}      → "Hello world"
{{ "hello world" | replace: "world", "pages" }}  → "hello pages"
{{ "hello world" | remove: "world" }} → "hello "
{{ "long text here" | truncate: 10 }} → "long te..."
{{ "long text here" | truncate: 10, "..." }} → "long te..."
{{ "hello\nworld" | newline_to_br }}  → "hello<br/>world"
{{ "<script>evil</script>" | escape }} → "&lt;script&gt;evil&lt;/script&gt;"
{{ "hello world" | url_encode }}      → "hello%20world"
{{ "hello%20world" | url_decode }}    → "hello world"
{{ "Hello World" | handleize }}       → "hello-world"  (slug)
{{ "12345" | prepend: "#" }}          → "#12345"
{{ "Hello" | append: " World" }}      → "Hello World"
{{ "Hello World" | size }}            → 11
{{ "Hello World" | split: " " }}      → ["Hello", "World"]
```

### Number Filters

```liquid
{{ 1234567.89 | number_with_delimiter }}  → "1,234,567.89"
{{ 3.14159 | round: 2 }}                  → 3.14
{{ 3.14159 | floor }}                     → 3
{{ 3.14159 | ceil }}                      → 4
{{ -5 | abs }}                            → 5
{{ 10 | divided_by: 3 }}                  → 3 (integer)
{{ 10 | divided_by: 3.0 }}                → 3.3333...
{{ 10 | modulo: 3 }}                      → 1
{{ 5 | times: 3 }}                        → 15
{{ 5 | plus: 3 }}                         → 8
{{ 5 | minus: 3 }}                        → 2
```

### Date Filters

```liquid
{{ now | date: "yyyy-MM-dd" }}             → "2026-03-03"
{{ now | date: "MMMM d, yyyy" }}           → "March 3, 2026"
{{ case.createdon | date: "dd/MM/yyyy" }}
{{ case.createdon | date_to_string }}       → "03 Mar 2026"
{{ case.createdon | date_to_long_string }}  → "Tuesday, 03 March 2026"
```

### Array Filters

```liquid
{% assign items = collection | where: "status", "Active" %}
{% assign sorted = collection | sort: "name" %}
{% assign reversed = collection | reverse %}
{% assign first_three = collection | limit: 3 %}
{% assign page_two = collection | offset: 10 | limit: 10 %}
{{ collection | size }}                        → count
{% assign joined = array | join: ", " %}
{% assign unique = array | uniq %}
{% assign mapped_names = items | map: "name" %}
```

### Miscellaneous Filters

```liquid
{{ variable | default: "fallback value" }}
{{ number | json }}                          → JSON-serialized
{{ object | json }}                          → JSON-serialized object
{{ html_string | strip_html }}              → plain text
{{ markdown_string | markdownify }}          → rendered HTML
```

---

## Global Objects

### page

```liquid
{{ page.id }}           <!-- GUID of the web page record -->
{{ page.title }}        <!-- Page display title -->
{{ page.url }}          <!-- Relative URL: "/contact-us" -->
{{ page.description }}  <!-- Page meta description -->
{{ page.content }}      <!-- Page HTML body content -->
{{ page.summary }}      <!-- Short summary -->
{{ page.author.name }}  <!-- Author name -->
{{ page.parent }}       <!-- Parent page object -->
{{ page.children }}     <!-- Array of child pages -->
{{ page.breadcrumbs }}  <!-- Array of pages from root to current -->
{{ page.sitemarkers }}  <!-- Named sitemarkers linked to this page -->
```

### user

```liquid
{{ user }}              <!-- null for anonymous users -->
{{ user.id }}           <!-- Contact record GUID -->
{{ user.fullname }}     <!-- Display name -->
{{ user.email }}        <!-- Email address -->
{{ user.username }}     <!-- Portal username -->
{{ user.roles }}        <!-- Array of web role names -->
{{ user.entity_logical_name }}  <!-- "contact" -->
{{ user.parentcustomerid }}     <!-- Parent account/contact lookup -->

{% if user %}
  <p>Welcome, {{ user.fullname }}</p>
{% else %}
  <a href="/.auth/login/local">Sign In</a>
{% endif %}

{% if user.roles contains 'Administrators' %}
  <!-- Admin-only content -->
{% endif %}
```

### website

```liquid
{{ website.id }}            <!-- Website record GUID -->
{{ website.name }}          <!-- Website display name -->
{{ website.url }}           <!-- Root URL -->
{{ website.primarydomain }} <!-- Primary custom domain -->
{{ website.defaultlanguage.code }}  <!-- e.g., "en-US" -->
```

### request

```liquid
{{ request.url }}            <!-- Full current URL -->
{{ request.path }}           <!-- Path portion: "/contact-us" -->
{{ request.params }}         <!-- Query string parameter dictionary -->
{{ request.params['id'] }}   <!-- Single query parameter -->
{{ request.cookies }}        <!-- Request cookies dictionary -->
{{ request.headers }}        <!-- Request headers dictionary -->
{{ request.headers['Accept-Language'] }}
```

### settings (Site Settings)

```liquid
{{ settings['Authentication/OpenAuth/Enabled'] }}
{{ settings['HTTP/Access-Control-Allow-Origin'] }}
{{ settings['MyApp/Theme/PrimaryColor'] | default: '#0078d4' }}
```

### sitemarkers

```liquid
{{ sitemarkers['Home'].url }}           <!-- URL of named page -->
{{ sitemarkers['Contact Us'].url }}
{{ sitemarkers['Login'].title }}
```

### snippets (Content Snippets)

```liquid
{{ snippets['Footer Copyright'] }}
{{ snippets['Header Logo Alt Text'] | default: 'Logo' }}
{% snippet 'Header Navigation' %}   <!-- Alternative tag syntax -->
```

---

## JavaScript and Web Templates

### Inject Dynamic Data into JavaScript

```liquid
<script>
  // Pass Dataverse data to client-side JavaScript
  var portalData = {
    currentUser: {
      id: "{{ user.id | default: '' }}",
      name: "{{ user.fullname | default: 'Anonymous' | escape }}",
      roles: {{ user.roles | json | default: '[]' }}
    },
    pageId: "{{ page.id }}",
    config: {
      apiBase: "{{ settings['MyApp/ApiBaseUrl'] | default: '/api' }}"
    }
  };

  // Pass Dataverse records as JSON
  var cases = {{ my_cases.results.entities | json }};
</script>
```

### Register and Inline Web Resources

```liquid
{% assign webResourceUrl = "/WebResources/cr_/js/portal-utils.js" %}
<script src="{{ webResourceUrl }}"></script>
<link rel="stylesheet" href="/WebResources/cr_/css/portal-theme.css" />
```

### Custom CSS Injection via Web Template

```liquid
{% block head %}
<style>
  :root {
    --primary-color: {{ settings['Theme/PrimaryColor'] | default: '#0078d4' }};
    --font-family: {{ settings['Theme/FontFamily'] | default: "'Segoe UI', sans-serif" }};
  }
  .portal-header {
    background-color: var(--primary-color);
    font-family: var(--font-family);
  }
  {% if page.url == '/' %}
  .hero-section { display: block; }
  {% else %}
  .hero-section { display: none; }
  {% endif %}
</style>
{% endblock %}
```

---

## Error Codes and Conditions

| Condition | Meaning | Remediation |
|---|---|---|
| `Liquid compilation error` | Mismatched `{% %}` tags or undefined Liquid tag | Check all tags are properly closed; review PAC CLI output |
| `FetchXML validation error` | Invalid entity name, attribute, or operator in FetchXML | Test FetchXML in Advanced Find or XrmToolBox before embedding |
| `{{ user.id }}` renders as empty string | Anonymous user (not signed in) | Guard with `{% if user %}` before accessing user properties |
| `Object reference not set (Liquid)` | Accessing a property on a null object | Use `| default: ''` filter or guard with `{% if object %}` |
| FetchXML returns no results unexpectedly | Table permission missing or scope too restrictive | Verify `adx_entitypermission` record grants Read access |
| `{% include 'TemplateName' %}` renders blank | Web template name mismatch (case-sensitive) | Verify template name exactly matches `adx_name` in Dataverse |
| XSS vulnerability via `{{ user_input }}` | User-provided content rendered without escaping | Always use `{{ variable \| escape }}` for user-generated content |
| Site settings variable empty | Site setting record not present in environment | Create `adx_sitesetting` record with the expected name |

---

## Limits Table

| Resource | Limit | Notes |
|---|---|---|
| FetchXML result count (`count` attribute) | 5,000 | Per single fetch query |
| FetchXML query execution timeout | 30 seconds | Portal request timeout also applies |
| Liquid template rendering timeout | 30 seconds | Page request overall timeout |
| `{% for %}` loop iterations | 1,000 per loop | Exceeding silently stops iteration |
| Nested `{% include %}` depth | 20 levels | Prevents infinite include recursion |
| Content snippet size | 1 MB | Per snippet |
| Web template source size | No hard limit | Large templates degrade rendering performance |
| Site settings per site | No hard limit | Hundreds of site settings is common |
| Cache duration (Page Template) | Configurable | 0 = no cache; high-traffic public pages benefit from 300+ seconds |
