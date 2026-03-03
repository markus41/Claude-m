# Folder Governance — Naming Conventions, Depth Limits, and Lifecycle Rules

Reference for applying folder governance policies to SharePoint and OneDrive document libraries.

---

## Why Folder Governance Matters

Poor folder structure causes:
- Broken URL-length limits (SharePoint maximum path: 400 characters)
- Permissions overload — deeply nested folders with different permissions are hard to audit
- User confusion — multiple teams recreating the same folder hierarchies
- Search degradation — overly deep paths reduce relevance scoring
- Migration failures — long paths break SharePoint migration tools

---

## Naming Conventions

### Recommended Naming Styles

| Style | Example | Use Case |
|-------|---------|---------|
| Kebab-case | `2025-q4-contracts` | Document libraries, folder names |
| Title Case | `Q4 Contracts 2025` | Display names visible to end users |
| Date-prefixed | `2025-03-financial-reports` | Archives, time-ordered folders |
| Owner-prefixed | `finance-annual-report` | Department-scoped documents |

### Characters to Avoid in SharePoint Folder Names

These characters cause issues in SharePoint URLs or Windows sync:

```
" * : < > ? / \ |
# % & { } ~ ` @ =
```

Also avoid:
- Leading/trailing spaces
- Two or more consecutive spaces
- Names that are just a period `.` or two periods `..`
- Names ending with a period or space

### Normalization Function

```javascript
function normalizeFolderName(name, style = 'kebab') {
  let n = name.trim()
    .replace(/["\*:<>?/\\|#%&{}\~`@=]+/g, '')  // strip illegal chars
    .replace(/\s+/g, ' ')                         // collapse spaces
    .trim();

  if (style === 'kebab') {
    return n.toLowerCase().replace(/\s/g, '-').replace(/-{2,}/g, '-');
  }
  if (style === 'title') {
    return n.replace(/\b\w/g, c => c.toUpperCase());
  }
  return n; // 'original' — just sanitize
}
```

---

## Depth Limits

### SharePoint URL Length Limit

SharePoint enforces a **400-character limit** on the full relative URL of a file, including site
collection URL, library, all folder segments, and filename.

Example URL path:
```
/sites/finance/Shared Documents/2025/Q4/Reports/Approved/Final/Budget-Analysis-Final-v3.xlsx
```

**Best practice:** Keep folder depth to **5 levels or fewer**.

### Depth Limit Checker

```javascript
function checkDepth(item, maxDepth = 5) {
  // parentReference.path example:
  // "/drives/{driveId}/root:/sites/finance/Shared Documents/2025/Q4/Reports"
  const pathParts = (item.parentReference?.path ?? '').split('/').filter(Boolean);
  // Subtract the "drives/{id}/root:" prefix (3 parts)
  const depth = Math.max(0, pathParts.length - 3);
  return { depth, exceeds: depth > maxDepth };
}
```

---

## Lifecycle Tagging

Tag folders with lifecycle metadata to support retention and archival:

### Lifecycle States

| State | Description | Action |
|-------|-------------|--------|
| `active` | Currently in use | No action |
| `stale` | No changes in 180+ days | Notify owner |
| `archive-candidate` | No changes in 365+ days | Move to archive library |
| `archived` | Formally archived | Read-only, reduced permissions |
| `delete-candidate` | No changes in 3+ years | Owner approval to delete |

### Stale Folder Detection

```javascript
function classifyFolder(folder, staleDays = 180) {
  const daysSinceModified = (Date.now() - new Date(folder.lastModifiedDateTime)) / 86_400_000;

  if (daysSinceModified > 365 * 3) return 'delete-candidate';
  if (daysSinceModified > 365) return 'archive-candidate';
  if (daysSinceModified > staleDays) return 'stale';
  return 'active';
}
```

---

## Proposed Canonical Folder Structure

### For a Department Site (e.g., Finance)

```
Finance (root)
├── active/
│   ├── 2025/
│   │   ├── q1/
│   │   ├── q2/
│   │   ├── q3/
│   │   └── q4/
│   └── projects/
│       └── {project-name}/
├── reference/
│   ├── policies/
│   ├── templates/
│   └── contracts/
└── archive/
    ├── 2024/
    ├── 2023/
    └── pre-2023/
```

### For a Project Site

```
{Project Name} (root)
├── deliverables/
├── working-files/
├── meetings/
│   └── {YYYY-MM-DD}/
├── reference/
└── archive/
```

---

## Folder Operations via Graph API

### Create a Folder

```http
POST /drives/{driveId}/items/{parentFolderId}/children
Content-Type: application/json

{
  "name": "2025-q4-contracts",
  "folder": {},
  "@microsoft.graph.conflictBehavior": "rename"
}
```

`conflictBehavior` options:
- `rename` — auto-rename if name exists (e.g., `folder (1)`)
- `replace` — overwrite existing folder contents
- `fail` — return 409 if name exists

### Move a Folder (with all contents)

```http
PATCH /drives/{driveId}/items/{folderId}
Content-Type: application/json

{
  "parentReference": {
    "id": "{targetParentFolderId}"
  }
}
```

Moving a folder moves all children recursively. Graph does this in a single API call.

### List Folder Contents Recursively

Use the delta endpoint (full enumeration) and filter by `parentReference.path` prefix, or use
recursive children queries:

```javascript
async function listFolderRecursive(client, driveId, folderId) {
  const children = await getAllPages(client,
    `/drives/${driveId}/items/${folderId}/children?$select=id,name,file,folder,parentReference,size`);

  const result = [];
  for (const child of children) {
    result.push(child);
    if (child.folder) {
      const subChildren = await listFolderRecursive(client, driveId, child.id);
      result.push(...subChildren);
    }
  }
  return result;
}
```

> For large libraries, prefer the delta approach over recursive children to avoid N+1 API calls.

---

## Folder Consolidation Mapping File (YAML)

The `consolidate-files` command reads a YAML mapping file:

```yaml
# sp-move-mapping.yaml
moves:
  - source: "/sites/hr/Shared Documents/Old HR Policies"
    destination: "/sites/hr/Shared Documents/reference/policies"
    description: "Archive old policy folder to reference"

  - source: "/sites/finance/Shared Documents/Budget 2023"
    destination: "/sites/finance/Shared Documents/archive/2023"
    description: "Archive 2023 budget to archive folder"

  - source: "/personal/john.doe@contoso.com/Documents/Work Files"
    destination: "/sites/finance/Shared Documents/active/2025/john-doe"
    description: "Move personal work files to department site"
```

---

## Rollback Script Pattern

Before executing moves, generate a rollback script:

```javascript
function generateRollbackScript(moveLog) {
  const rollback = moveLog.map(entry => ({
    source: entry.destination,         // swap source and destination
    destination: entry.source,
    description: `Rollback: ${entry.description}`
  }));
  return { moves: rollback };
}

// Write rollback script to file
const rollback = generateRollbackScript(executedMoves);
fs.writeFileSync('./sp-reports/rollback-mapping.yaml', yaml.dump(rollback));
```

---

## SharePoint Permissions on Folders — Best Practices

1. **Avoid unique permissions on folders** — inherit from the library where possible
2. **Break inheritance only at the top-level folder** (e.g., department root), not sub-folders
3. **Use SharePoint Groups** instead of individual user permissions
4. **Audit permissions before moving** — moves inherit the destination folder's permissions
5. **Document permission breaks** — record all folders with broken inheritance before consolidation

### List Folders with Unique Permissions (PowerShell)

```powershell
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/finance" -Interactive
$folders = Get-PnPListItem -List "Documents" -Fields HasUniqueRoleAssignments
$folders | Where-Object { $_["HasUniqueRoleAssignments"] -eq $true } |
  Select-Object Id, @{ N="Path"; E={ $_["FileRef"] } }
```
