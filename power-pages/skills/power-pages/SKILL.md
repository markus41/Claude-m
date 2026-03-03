---
name: Power Pages Development
description: >
  Deep expertise in Microsoft Power Pages (formerly Portals) — site creation, page templates,
  Liquid template language, web forms, table permissions, web roles, authentication providers,
  and Dataverse portal integration via PAC CLI and Web API.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - power pages
  - portals
  - portal
  - liquid template
  - web template
  - web form
  - table permission
  - web role
  - entity list
  - entity form
  - content snippet
  - site setting
  - power pages site
  - adx_webpage
  - adx_webtemplate
  - pac pages
---

# Power Pages Development

## Overview

Microsoft Power Pages (formerly Power Apps Portals, formerly Dynamics 365 Portals) is a low-code platform for building external-facing websites backed by Microsoft Dataverse. Power Pages sites allow organizations to expose Dataverse data to external users — customers, partners, vendors, or the public — through authenticated or anonymous web experiences.

Power Pages combines drag-and-drop design with Liquid templates, FetchXML data queries, and a granular table permission model. Sites run as managed Azure web apps with built-in CDN, DDoS protection, and automatic scaling.

## Core Concepts

### Site Hierarchy

```
Website
├── Web Pages (content hierarchy with parent/child)
│   ├── Page Templates (map pages to web templates)
│   │   └── Web Templates (Liquid + HTML source code)
│   └── Content Snippets (reusable text/HTML fragments)
├── Entity Lists (display Dataverse records in grid views)
├── Entity Forms / Basic Forms (single-record forms)
├── Web Forms (multi-step wizard forms)
├── Web Roles (group users by access level)
├── Table Permissions (control CRUD on Dataverse tables)
└── Site Settings (key-value configuration)
```

### Key Terminology

- **Web Page** (`adx_webpage`): A content page with a URL, title, and HTML body. Pages form a parent-child hierarchy for navigation.
- **Page Template** (`adx_pagetemplate`): Maps a web page to a web template. Controls which Liquid template renders the page.
- **Web Template** (`adx_webtemplate`): The actual Liquid + HTML source code. Supports `{% include %}` for partials, `{% extends %}` for inheritance, and `{% fetchxml %}` for data queries.
- **Entity List** (`adx_entitylist`): Renders a Dataverse view as an HTML grid with search, filter, pagination, and inline actions (view/edit/delete).
- **Entity Form / Basic Form** (`adx_entityform`): Renders a Dataverse form for a single record. Supports Insert, Edit, and Read Only modes.
- **Web Form** (`adx_webform`): A multi-step form wizard with conditional branching, validation, and redirect on completion.
- **Content Snippet** (`adx_contentsnippet`): A named reusable block of text or HTML, referenced in templates via `{% snippet 'SnippetName' %}`.
- **Site Setting** (`adx_sitesetting`): A key-value pair for runtime configuration (e.g., auth provider settings, cache duration, custom behavior).

## Dataverse Tables for Power Pages

All Power Pages configuration is stored as Dataverse records. The prefix `adx_` identifies portal-specific tables.

| Table (Logical Name) | Purpose |
|----------------------|---------|
| `adx_website` | Root site record — domain, default language, header/footer templates |
| `adx_webpage` | Individual pages with URL, title, content, parent page reference |
| `adx_pagetemplate` | Maps pages to web templates, sets caching and MIME type |
| `adx_webtemplate` | Liquid + HTML source code for rendering |
| `adx_webform` | Multi-step form container |
| `adx_webformstep` | Individual step in a web form with target entity and mode |
| `adx_entityform` | Single-step form (basic form) with target entity |
| `adx_entitylist` | Grid view configuration for listing Dataverse records |
| `adx_webrole` | Security role grouping for portal users |
| `adx_entitypermission` | CRUD privilege grants scoped to a table and web role |
| `adx_contentsnippet` | Named reusable content block |
| `adx_sitesetting` | Key-value runtime configuration |
| `adx_weblink` | Navigation menu links |
| `adx_weblinkset` | Navigation menu container (header nav, footer nav) |

## API Endpoints

Power Pages configuration is managed via the Dataverse Web API.

Base URL: `https://{org}.api.crm.dynamics.com/api/data/v9.2`

### Web Pages

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/adx_webpages` | List all web pages |
| GET | `/adx_webpages({id})` | Get a specific page |
| POST | `/adx_webpages` | Create a new page |
| PATCH | `/adx_webpages({id})` | Update page content or properties |
| DELETE | `/adx_webpages({id})` | Delete a page |

### Web Templates

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/adx_webtemplates` | List all web templates |
| GET | `/adx_webtemplates({id})` | Get a specific template |
| POST | `/adx_webtemplates` | Create a new template |
| PATCH | `/adx_webtemplates({id})` | Update template source |
| DELETE | `/adx_webtemplates({id})` | Delete a template |

### Web Forms

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/adx_webforms` | List all web forms |
| POST | `/adx_webforms` | Create a new web form |
| PATCH | `/adx_webforms({id})` | Update web form (e.g., set start step) |
| GET | `/adx_webformsteps` | List all form steps |
| POST | `/adx_webformsteps` | Create a form step |
| PATCH | `/adx_webformsteps({id})` | Update step (next step, conditions) |

### Table Permissions

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/adx_entitypermissions` | List all table permissions |
| POST | `/adx_entitypermissions` | Create a table permission |
| PATCH | `/adx_entitypermissions({id})` | Update privileges or scope |
| DELETE | `/adx_entitypermissions({id})` | Delete a table permission |

### Web Roles

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/adx_webroles` | List all web roles |
| POST | `/adx_webroles` | Create a web role |
| PATCH | `/adx_webroles({id})` | Update web role |
| POST | `/adx_entitypermissions({id})/adx_entitypermission_webrole/$ref` | Associate permission with role |

## JSON Request Bodies

### Create Web Page

```json
{
  "adx_name": "Contact Us",
  "adx_partialurl": "contact-us",
  "adx_isroot": false,
  "adx_hiddenfromnavigation": false,
  "adx_websiteid@odata.bind": "/adx_websites(<website-id>)",
  "adx_parentpageid@odata.bind": "/adx_webpages(<parent-page-id>)",
  "adx_pagetemplateid@odata.bind": "/adx_pagetemplates(<template-id>)"
}
```

### Create Table Permission

```json
{
  "adx_entityname": "Case",
  "adx_entitylogicalname": "incident",
  "adx_scope": 756150001,
  "adx_read": true,
  "adx_write": true,
  "adx_create": true,
  "adx_delete": false,
  "adx_append": true,
  "adx_appendto": true,
  "adx_websiteid@odata.bind": "/adx_websites(<website-id>)"
}
```

**Scope values**: 756150000 = Global, 756150001 = Contact, 756150002 = Account, 756150003 = Self, 756150004 = Parent.

### Create Web Form

```json
{
  "adx_name": "Support Case Submission",
  "adx_websiteid@odata.bind": "/adx_websites(<website-id>)"
}
```

### Create Web Form Step

```json
{
  "adx_name": "Step 1 - Contact Information",
  "adx_type": 100000000,
  "adx_targetentitylogicalname": "incident",
  "adx_mode": 100000000,
  "adx_webformid@odata.bind": "/adx_webforms(<form-id>)",
  "adx_nextstep@odata.bind": "/adx_webformsteps(<next-step-id>)"
}
```

**Mode values**: 100000000 = Insert, 100000001 = Edit, 100000002 = Read Only.

### Create Web Role

```json
{
  "adx_name": "Customer",
  "adx_description": "External customer with access to their own cases and account data",
  "adx_websiteid@odata.bind": "/adx_websites(<website-id>)"
}
```

## Liquid Template Language

Power Pages uses the Liquid template language (Shopify-based with Microsoft extensions) for dynamic rendering.

### Objects

| Object | Description |
|--------|-------------|
| `page` | Current page — `page.title`, `page.url`, `page.content`, `page.description` |
| `user` | Current authenticated user — `user.fullname`, `user.email`, `user.id`, `user.roles` |
| `website` | Site root — `website.name`, `website.id` |
| `request` | HTTP request — `request.url`, `request.params`, `request.path` |
| `settings` | Site settings dictionary — `settings["Authentication/OpenAuth/Enabled"]` |
| `entities` | Dataverse entity access — `entities.incident` |
| `sitemarkers` | Named page references — `sitemarkers["Home"].url` |
| `snippets` | Content snippets — `snippets["Footer Copyright"]` |

### Tags

**FetchXML query** (the most powerful data access method):
```liquid
{% fetchxml my_cases %}
<fetch mapping="logical" count="10">
  <entity name="incident">
    <attribute name="title" />
    <attribute name="ticketnumber" />
    <attribute name="createdon" />
    <filter type="and">
      <condition attribute="customerid" operator="eq" value="{{ user.id }}" />
      <condition attribute="statecode" operator="eq" value="0" />
    </filter>
    <order attribute="createdon" descending="true" />
  </entity>
</fetch>
{% endfetchxml %}

{% for case in my_cases.results.entities %}
  <p>{{ case.ticketnumber }} — {{ case.title }}</p>
{% endfor %}
```

**Include** (embed another web template):
```liquid
{% include 'Header' %}
{% include 'Sidebar' with sidebar_title: 'Navigation' %}
```

**Editable content** (in-place editing in design mode):
```liquid
{% editable page 'content' %}
```

**Control flow**:
```liquid
{% if user %}
  Welcome, {{ user.fullname }}!
{% else %}
  <a href="/.auth/login/local">Sign In</a>
{% endif %}

{% unless page.children.size == 0 %}
  <ul>{% for child in page.children %}<li>{{ child.title }}</li>{% endfor %}</ul>
{% endunless %}
```

### Filters

| Filter | Example | Purpose |
|--------|---------|---------|
| `escape` | `{{ user_input \| escape }}` | HTML-encode to prevent XSS |
| `date` | `{{ case.createdon \| date: "yyyy-MM-dd" }}` | Format dates |
| `default` | `{{ variable \| default: "N/A" }}` | Fallback for null values |
| `truncate` | `{{ text \| truncate: 100 }}` | Limit string length |
| `json` | `{{ records \| json }}` | Serialize to JSON for JavaScript |

## Authentication

Power Pages supports multiple authentication providers configured via site settings.

### Built-in Providers

| Provider | Site Setting Prefix | Notes |
|----------|-------------------|-------|
| Local (email/password) | `Authentication/Registration/` | Built-in registration with email confirmation |
| Azure AD B2C | `Authentication/OpenIdConnect/AzureADB2C/` | Recommended for customer-facing sites |
| Azure AD (Entra ID) | `Authentication/OpenIdConnect/AzureAD/` | For employee/partner portals |
| External OAuth | `Authentication/OpenIdConnect/{provider}/` | Any OIDC-compliant identity provider |

### Key Site Settings for Azure AD B2C

| Site Setting Name | Value |
|-------------------|-------|
| `Authentication/OpenIdConnect/AzureADB2C/Authority` | `https://{tenant}.b2clogin.com/{tenant}.onmicrosoft.com/v2.0/.well-known/openid-configuration?p=B2C_1_SignUpSignIn` |
| `Authentication/OpenIdConnect/AzureADB2C/ClientId` | App registration client ID |
| `Authentication/OpenIdConnect/AzureADB2C/RedirectUri` | `https://{site}.powerappsportals.com/signin-adb2c` |

### Login/Logout URLs

- Login: `/.auth/login/{provider}` (e.g., `/.auth/login/local`, `/.auth/login/AzureADB2C`)
- Logout: `/.auth/logout`
- Profile: `/.auth/me` (returns current user claims as JSON)

## PAC CLI for Power Pages

The Power Platform CLI provides commands for local Power Pages development.

| Command | Purpose |
|---------|---------|
| `pac pages list` | List Power Pages sites in the connected environment |
| `pac pages upload --path ./portal` | Upload local portal files to the environment |
| `pac pages download --path ./portal` | Download portal configuration to local directory |
| `pac pages launch --name "MySite"` | Open the site in a browser |

**VS Code Extension**: Install "Power Platform Tools" for VS Code to get IntelliSense for Liquid templates, local preview, and one-click upload/download.

**Local directory structure** (after `pac pages download`):
```
portal/
  web-templates/
    Header.html
    Footer.html
    Layout.html
  web-pages/
    Home/
      content.html
      metadata.yml
  content-snippets/
    Footer-Copyright.html
  site-settings.yml
```

## Permissions / Scopes

| Scope / Role | Purpose |
|--------------|---------|
| `https://{org}.crm.dynamics.com/user_impersonation` | Dataverse Web API access for managing portal configuration |
| System Administrator | Full access to all Power Pages configuration tables |
| System Customizer | Create and modify portal components, web templates, and forms |
| Portal Administrator (web role) | Runtime administrative access within the portal itself |

## Error Handling

### Dataverse API Errors

| Status | Meaning | Action |
|--------|---------|--------|
| 400 | Bad Request — invalid JSON or missing required field | Check entity logical name and field names |
| 401 | Unauthorized — expired or missing token | Re-authenticate with `pac auth create` |
| 403 | Forbidden — insufficient Dataverse security role | Verify System Administrator or System Customizer role |
| 404 | Not Found — record does not exist | Confirm entity set name and record GUID |
| 409 | Conflict — duplicate key | Check for existing records with the same `adx_name` |
| 429 | Too Many Requests | Retry after `Retry-After` header |

### Portal Runtime Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Liquid compilation error | Syntax error in web template (mismatched tags, undefined variable) | Check for unclosed `{% %}` tags and undefined objects |
| FetchXML validation error | Invalid entity name, attribute, or filter condition | Verify entity and attribute logical names in Dataverse |
| Table permission denied | User's web role lacks the required privilege on the table | Add or update table permission with correct scope and privileges |
| Redirect loop | Page template or web page configuration creates a circular redirect | Check page template assignments and redirect site settings |

## Common Patterns

### Public Knowledge Base with Search

Build a public-facing knowledge base with article search:

1. Create a Dataverse table `cr_article` with columns: `cr_title` (text), `cr_body` (multiline), `cr_category` (option set), `cr_publishdate` (date), `cr_ispublished` (boolean).
2. Create a table permission with scope `Global` and `Read` only, assigned to the `Anonymous Users` web role.
3. Create a web template with a FetchXML query filtered by `cr_ispublished eq true`, ordered by `cr_publishdate desc`.
4. Add a search bar using `request.params['q']` to filter articles: `<condition attribute="cr_title" operator="like" value="%{{ request.params['q'] }}%" />`.
5. Create an article detail page template that receives the article ID via URL parameter.

### Authenticated Customer Portal with Case Submission

Build a portal where customers can submit and track support cases:

1. Configure Azure AD B2C authentication via site settings.
2. Create a basic form for `incident` (Case) in Insert mode for case submission.
3. Create an entity list for `incident` filtered by `customerid` = current contact.
4. Set table permissions: scope = Contact, privileges = Read + Write + Create (no Delete).
5. Add a web form for multi-step case submission: Contact Info → Case Details → Attachments → Confirmation.

### Multi-Step Application Form

Build a wizard-style application form (e.g., job application, grant request):

1. Create a custom Dataverse table `cr_application` with fields for each section.
2. Create a web form with 4 steps: Personal Info → Qualifications → Documents → Review & Submit.
3. Configure step 3 with a file upload field using Dataverse Notes (annotations) for attachments.
4. Add a condition step between step 2 and 3: if `cr_requiresdocuments` is true, show step 3; otherwise skip to step 4.
5. Set the final step type to "Redirect" with a thank-you page URL.

### Partner Portal with Account-Scoped Data

Build a portal where partner organizations see only their own data:

1. Create web roles: "Partner Admin" (can manage all records for their account) and "Partner User" (read-only).
2. Create table permissions with scope = Account for shared entities (opportunities, orders, invoices).
3. Partner Admin gets Read + Write + Create privileges; Partner User gets Read only.
4. Create entity lists with the Dataverse view filtered by the current contact's parent account.
5. Use Liquid `{% if user.roles contains 'Partner Admin' %}` to conditionally show edit buttons.

## Best Practices

- **Minimal scope**: Always use the most restrictive table permission scope possible (Self > Contact > Account > Global).
- **Template inheritance**: Use `{% extends 'Base Layout' %}` and `{% block content %}` for consistent layouts.
- **Escape user input**: Always use `| escape` filter when rendering user-generated content to prevent XSS.
- **Cache wisely**: Set appropriate cache duration on page templates — static content can cache for hours, dynamic content should cache briefly or not at all.
- **FetchXML pagination**: Use `count` and `page` attributes in FetchXML to paginate large result sets.
- **Site settings over hardcoding**: Store configuration values in site settings rather than hardcoding in Liquid templates.
- **Local development**: Use `pac pages download` for local editing and version control, then `pac pages upload` to deploy.

## Reference Files

| Reference | Path | Content |
|-----------|------|---------|
| Liquid Reference | `references/liquid-reference.md` | Complete Liquid tag, filter, and object reference |
| Table Permissions | `references/table-permissions.md` | Scope matrix, privilege combinations, web role mapping |
| FetchXML in Liquid | `references/fetchxml-liquid.md` | FetchXML query examples for common portal scenarios |
| Authentication Setup | `references/auth-setup.md` | Step-by-step Azure AD B2C and OIDC configuration |

## Example Files

| Example | Path | Content |
|---------|------|---------|
| Knowledge Base Site | `examples/knowledge-base.md` | Public article portal with search and categories |
| Customer Portal | `examples/customer-portal.md` | Authenticated case submission and tracking |
| Partner Portal | `examples/partner-portal.md` | Account-scoped data with role-based access |
| Multi-Step Form | `examples/multi-step-form.md` | Application wizard with conditional steps |

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| Liquid template syntax, tags, filters, global objects, FetchXML in Liquid, JS/CSS injection | [`references/site-design-liquid.md`](./references/site-design-liquid.md) |
| Basic forms, multi-step web forms, field validation, entity lists, subgrids, OData endpoint | [`references/web-forms-lists.md`](./references/web-forms-lists.md) |
| Table permission scopes (Global/Contact/Account/Self/Parent), privileges, web role assignment | [`references/table-permissions.md`](./references/table-permissions.md) |
| Local auth, Azure AD/Entra ID, Azure AD B2C, OIDC, open vs invitation registration, session timeout | [`references/authentication.md`](./references/authentication.md) |
