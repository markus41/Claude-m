# Duplicate Detection Strategies for SharePoint / OneDrive Files

Reference for detecting exact and near-duplicate files in SharePoint/OneDrive file inventories.

---

## Strategy Overview

| Strategy | Signal | Accuracy | Cost |
|----------|--------|----------|------|
| Exact (hash) | `sha1Hash` from Graph API | 100% binary identical | Low — hash already in Graph response |
| Near-dup (name + size) | Normalized name + size bucket | High — catches copies/renames | Low — computed from inventory |
| Near-dup (name + modified) | Same name, different dates | Medium — catches versioned copies | Low |
| Content similarity | Text extraction + cosine sim | Very high | High — requires content download |

For bulk scans, **exact + near-dup by name+size** covers 95%+ of real-world duplicates without
downloading file content.

---

## Exact Duplicate Detection

### How It Works

Microsoft Graph returns `file.hashes.sha1Hash` for every file item (folders are excluded).
Files with the same SHA-1 hash are byte-for-byte identical regardless of name, location, or
modification date.

### Graph API Field

```
GET /drives/{driveId}/items/{itemId}?$select=id,name,size,file,parentReference,createdBy,lastModifiedDateTime
```

Response:
```json
{
  "id": "01ABC123",
  "name": "Q4-Budget.xlsx",
  "size": 204800,
  "file": {
    "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "hashes": {
      "quickXorHash": "AbCdEfGh==",
      "sha1Hash": "DA39A3EE5E6B4B0D3255BFEF95601890AFD80709"
    }
  }
}
```

> **Note:** `sha1Hash` and `sha256Hash` are not guaranteed for all file types. If absent,
> fall back to `quickXorHash` (always present for OneDrive/SharePoint files).

### Algorithm

```javascript
function buildExactDupGroups(inventory) {
  const hashMap = new Map(); // sha1 → [items]

  for (const item of inventory) {
    if (!item.file?.hashes) continue; // skip folders and items without hashes
    const hash = item.file.hashes.sha1Hash ?? item.file.hashes.quickXorHash;
    if (!hash) continue;
    if (!hashMap.has(hash)) hashMap.set(hash, []);
    hashMap.get(hash).push(item);
  }

  // Return only groups with 2+ items
  return [...hashMap.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([hash, group]) => ({ hash, group }));
}
```

### Selecting the "Keep" Candidate

```javascript
function selectKeep(group) {
  // Prefer: oldest creation date (the original), or primary site over archive
  return [...group].sort((a, b) =>
    new Date(a.createdDateTime) - new Date(b.createdDateTime)
  )[0];
}
```

Alternative strategies:
- **Most recently modified** — keep the most up-to-date version
- **Primary site preference** — keep copies on canonical sites (e.g., `/sites/contracts`) over archive sites
- **Owner preference** — keep copy owned by the document owner, not a guest

---

## Near-Duplicate Detection

### Strategy 1: Name + Size Bucket (±1 KB)

Detects files with the same name in different folders, or copies with minor size differences
(e.g., metadata stripped, re-saved).

```javascript
function buildNearDupGroups(inventory) {
  const bucketMap = new Map(); // "name|sizeBucket" → [items]

  for (const item of inventory) {
    if (!item.file) continue; // folders only
    const name = item.name.toLowerCase().trim();
    const sizeBucket = Math.round((item.size ?? 0) / 1024); // KB bucket
    const key = `${name}|${sizeBucket}`;
    if (!bucketMap.has(key)) bucketMap.set(key, []);
    bucketMap.get(key).push(item);
  }

  return [...bucketMap.values()].filter(g => g.length > 1);
}
```

### Strategy 2: Normalized Name (strip version suffixes)

Catches `Report.docx`, `Report (1).docx`, `Report - Copy.docx`, `Report_v2.docx`:

```javascript
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/\s*\(\d+\)\s*/g, '')       // remove (1), (2)
    .replace(/\s*-\s*copy\s*/gi, '')      // remove "- Copy"
    .replace(/_v\d+(\.\w+)?$/i, '$1')    // remove _v2, _v3
    .replace(/\s+/g, ' ')
    .trim();
}

function buildVersionDupGroups(inventory) {
  const nameMap = new Map();
  for (const item of inventory) {
    if (!item.file) continue;
    const key = normalizeName(item.name);
    if (!nameMap.has(key)) nameMap.set(key, []);
    nameMap.get(key).push(item);
  }
  return [...nameMap.values()].filter(g => g.length > 1);
}
```

### Strategy 3: Owner + Name (cross-drive copies)

Find cases where the same person uploaded the same file to multiple drives (personal OneDrive
and a shared SharePoint site):

```javascript
function buildOwnerNameGroups(inventory) {
  const map = new Map();
  for (const item of inventory) {
    if (!item.file) continue;
    const owner = item.createdBy?.user?.email?.toLowerCase() ?? 'unknown';
    const key = `${owner}|${item.name.toLowerCase()}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return [...map.values()].filter(g => g.length > 1);
}
```

---

## Duplicate Report Format

```
## Duplicate Files Report — 2025-03-02

### Summary
| Type | Groups | Files | Wasted Space |
|------|--------|-------|-------------|
| Exact (SHA-1 match) | 47 | 134 | 2.1 GB |
| Near-dup (name+size) | 23 | 61 | 850 MB |
| Version copies | 18 | 54 | 310 MB |
| **Total** | **88** | **249** | **3.26 GB** |

### Top 10 Duplicate Groups (by wasted space)

| Group | Hash (SHA-1 prefix) | Files | Wasted Size | Keep Candidate |
|-------|---------------------|-------|-------------|----------------|
| 1 | DA39A3EE | 5 | 512 MB | /sites/finance/Q4-Budget.xlsx |
| 2 | 3C59DC04 | 3 | 210 MB | /sites/hr/Handbook-2025.pdf |
...

### Recommended Actions
- P1: Delete 47 exact duplicates (2.1 GB savings, zero data risk)
- P2: Review 23 near-duplicates with owners before deletion
- P3: Archive 18 version copies to a "versions-archive" folder
```

---

## Safe Deletion Principles

1. **Never delete without a keep candidate identified** — always confirm one copy is preserved
2. **Move to recycle bin, never hard-delete** — use `DELETE /drives/{driveId}/items/{itemId}` which sends to recycle bin (93-day retention)
3. **Notify file owners** before any deletion, even for exact duplicates
4. **Export the duplicate report** before executing any moves/deletes
5. **Dry-run first** — generate the action list without executing
6. **Batch deletes in groups of 20** using `$batch` to reduce API calls

---

## Calculating Space Savings

```javascript
function calcSavings(dupGroups) {
  let totalWaste = 0;
  for (const { group } of dupGroups) {
    const keep = selectKeep(group);
    const waste = group.filter(i => i.id !== keep.id).reduce((s, i) => s + (i.size ?? 0), 0);
    totalWaste += waste;
  }
  return {
    bytes: totalWaste,
    mb: (totalWaste / 1_048_576).toFixed(1),
    gb: (totalWaste / 1_073_741_824).toFixed(2)
  };
}
```
