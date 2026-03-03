# Managed Metadata, Content Types, and Term Store

Reference for SharePoint managed metadata columns, content types, and term store integration
via Microsoft Graph API.

---

## Content Types

Content types define a reusable schema (set of columns + template) that can be applied to files
in document libraries.

### List Site Content Types

```
GET /sites/{siteId}/contentTypes?$select=id,name,description,group,isBuiltIn,order
```

### List Library (List) Content Types

```
GET /sites/{siteId}/lists/{listId}/contentTypes?$select=id,name,description
```

### Common Built-in Content Types

| Name | ID Prefix | Use Case |
|------|-----------|---------|
| Document | `0x0101` | Generic files |
| Form | `0x0102` | InfoPath forms |
| Picture | `0x010102` | Images |
| Web Page | `0x010108` | Publishing pages |
| Announcement | `0x0104` | News/announcements |

Custom content types have IDs like `0x010100{guid}`.

### Apply a Content Type to a List Item

```http
PATCH /sites/{siteId}/lists/{listId}/items/{itemId}
Content-Type: application/json

{
  "contentType": { "id": "0x010100A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6" }
}
```

---

## Columns (Site Columns and List Columns)

### List All Columns in a Library

```
GET /sites/{siteId}/lists/{listId}/columns?$select=id,name,displayName,columnGroup,type,required,indexed
```

Column types:
| `type` value | Description |
|---|---|
| `text` | Single-line text |
| `note` | Multi-line text |
| `number` | Numeric |
| `dateTime` | Date/time |
| `boolean` | Yes/No |
| `choice` | Dropdown choices |
| `lookup` | Lookup to another list |
| `taxonomyField` | Managed metadata |
| `person` | People picker |
| `hyperlink` | URL + description |

### Update a Column Value on a File

```http
PATCH /sites/{siteId}/lists/{listId}/items/{itemId}/fields
Content-Type: application/json

{
  "Department": "Legal",
  "ProjectYear": "2025",
  "Status": "Draft"
}
```

For choice columns, the value must exactly match one of the configured choices.

### Batch Update Metadata (up to 20 items)

```http
POST https://graph.microsoft.com/v1.0/$batch
Content-Type: application/json

{
  "requests": [
    {
      "id": "1",
      "method": "PATCH",
      "url": "/sites/{siteId}/lists/{listId}/items/{itemId1}/fields",
      "headers": { "Content-Type": "application/json" },
      "body": { "Department": "Finance", "RetentionLabel": "7-Year" }
    },
    {
      "id": "2",
      "method": "PATCH",
      "url": "/sites/{siteId}/lists/{listId}/items/{itemId2}/fields",
      "headers": { "Content-Type": "application/json" },
      "body": { "Department": "HR", "RetentionLabel": "3-Year" }
    }
  ]
}
```

---

## Managed Metadata (Taxonomy / Term Store)

Managed metadata columns link file fields to a centrally managed taxonomy maintained in the
Term Store. Changes to terms propagate automatically to all files using that term.

### Anatomy of a Managed Metadata Field Value

When you read a list item with a managed metadata column, the field value looks like:

```json
{
  "DepartmentLookupId": "5",
  "Department": "Finance|8b5e8b3a-1234-5678-abcd-ef0123456789"
}
```

Format: `<Label>|<TermGuid>`

### Writing a Managed Metadata Field

```http
PATCH /sites/{siteId}/lists/{listId}/items/{itemId}/fields
Content-Type: application/json

{
  "DepartmentLookupId": "-1",
  "Department": "Finance|8b5e8b3a-1234-5678-abcd-ef0123456789"
}
```

> **Important:** Set `{ColumnName}LookupId` to `-1` when writing a new term value — this signals
> SharePoint to create a new lookup entry for the term.

### Term Store — Enumerate Groups, Sets, and Terms

```
GET /sites/{siteId}/termStore
GET /sites/{siteId}/termStore/groups?$select=id,displayName
GET /sites/{siteId}/termStore/groups/{groupId}/sets?$select=id,localizedNames,description
GET /sites/{siteId}/termStore/sets/{setId}/terms?$select=id,labels,descriptions,isDeprecated
```

Also available at tenant level:
```
GET /termStore/groups
GET /termStore/sets/{setId}/terms
```

### Term Response Example

```json
{
  "id": "8b5e8b3a-1234-5678-abcd-ef0123456789",
  "labels": [
    { "name": "Finance", "languageTag": "en-US", "isDefault": true }
  ],
  "isDeprecated": false
}
```

### Term Lookup by Label

```javascript
async function findTermByLabel(client, siteId, setId, label) {
  const terms = await getAllPages(client,
    `/sites/${siteId}/termStore/sets/${setId}/terms?$select=id,labels`);
  return terms.find(t =>
    t.labels.some(l => l.name.toLowerCase() === label.toLowerCase())
  );
}
```

---

## Sensitivity Labels (Purview)

Sensitivity labels can be read and applied to files via Graph. Reading them requires the
`InformationProtectionPolicy.Read` permission.

### Get Label Applied to a File

```
GET /drives/{driveId}/items/{itemId}/extractSensitivityLabels
```

Response:
```json
{
  "labels": [
    { "sensitivityLabelId": "guid", "assignmentMethod": "auto", "name": "Confidential" }
  ]
}
```

### Apply a Sensitivity Label

```http
POST /drives/{driveId}/items/{itemId}/assignSensitivityLabel
Content-Type: application/json

{
  "sensitivityLabelId": "{labelGuid}",
  "assignmentMethod": "standard",
  "justificationText": "Applying organization classification policy"
}
```

---

## Retention Labels (Purview)

Retention labels are applied via the compliance API (beta endpoint):

```http
PATCH /drives/{driveId}/items/{itemId}
Content-Type: application/json

{
  "retentionLabel": { "name": "7-Year Financial Records" }
}
```

---

## Categorization Rules File Format (YAML)

The `apply-categories` command uses a YAML rules file to map file patterns to metadata:

```yaml
# sp-categories.yaml
rules:
  - name: Finance documents
    match:
      extensions: [.xlsx, .xls, .csv]
      path_contains: [finance, budget, accounts]
    apply:
      Department: Finance
      RetentionLabel: 7-Year Financial Records
      ContentType: Financial Document

  - name: HR documents
    match:
      extensions: [.docx, .pdf]
      path_contains: [hr, human-resources, personnel]
    apply:
      Department: HR
      RetentionLabel: 7-Year HR Records
      ContentType: HR Document

  - name: Legal contracts
    match:
      extensions: [.docx, .pdf]
      name_contains: [contract, agreement, nda, sla]
    apply:
      Department: Legal
      RetentionLabel: 10-Year Legal Records
      ContentType: Contract
```

---

## Required Permissions

| Operation | Permission |
|-----------|-----------|
| Read list columns/items | `Sites.Read.All` |
| Update list item fields | `Sites.ReadWrite.All` |
| Read term store | `TermStore.Read.All` |
| Update term store | `TermStore.ReadWrite.All` |
| Read sensitivity labels | `InformationProtectionPolicy.Read` |
| Apply sensitivity labels | `InformationProtectionPolicy.ReadWrite.All` |
