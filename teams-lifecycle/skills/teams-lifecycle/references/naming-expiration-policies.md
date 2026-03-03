# Teams Naming & Expiration Policies — Graph API Reference

## Overview

This reference covers group naming policies (prefix/suffix/blocked words), expiration policies
(auto-renewal and renewal notifications), Microsoft 365 group lifecycle management, and
PowerShell enforcement for Teams and Microsoft 365 Groups.

Base URL: `https://graph.microsoft.com/v1.0`

---

## API Endpoint Table

### Naming Policy (Directory Settings)

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/groupSettings` | `Directory.Read.All` | — | List all directory settings |
| GET | `/groupSettings/{settingId}` | `Directory.Read.All` | — | Get specific setting |
| POST | `/groupSettings` | `Directory.ReadWrite.All` | `templateId`, `values` | Create group settings |
| PATCH | `/groupSettings/{settingId}` | `Directory.ReadWrite.All` | `values` array | Update naming policy |
| GET | `/groupSettingTemplates` | `Directory.Read.All` | — | List setting templates |
| GET | `/groupSettingTemplates/{templateId}` | `Directory.Read.All` | — | Get Group.Unified template |

### Expiration Policies

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/groupLifecyclePolicies` | `Directory.Read.All` | — | List expiration policies |
| GET | `/groupLifecyclePolicies/{policyId}` | `Directory.Read.All` | — | Get policy details |
| POST | `/groupLifecyclePolicies` | `Directory.ReadWrite.All` | `groupLifetimeInDays`, `managedGroupTypes` | Create expiration policy |
| PATCH | `/groupLifecyclePolicies/{policyId}` | `Directory.ReadWrite.All` | Policy properties | Update policy |
| POST | `/groupLifecyclePolicies/{policyId}/addGroup` | `Directory.ReadWrite.All` | `groupId` | Add specific group to policy |
| POST | `/groupLifecyclePolicies/{policyId}/removeGroup` | `Directory.ReadWrite.All` | `groupId` | Remove group from policy |

---

## Code Snippets

### TypeScript — Read Current Naming Policy

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

interface NamingPolicy {
  prefixSuffixNamingRequirement: string;
  customBlockedWordsList: string;
}

async function getNamingPolicy(client: Client): Promise<NamingPolicy | null> {
  const settings = await client
    .api("/groupSettings")
    .get();

  const unifiedSetting = settings.value.find(
    (s: any) => s.displayName === "Group.Unified"
  );

  if (!unifiedSetting) {
    console.log("No group naming policy configured");
    return null;
  }

  const getValue = (key: string) =>
    unifiedSetting.values.find((v: any) => v.name === key)?.value ?? "";

  return {
    prefixSuffixNamingRequirement: getValue("PrefixSuffixNamingRequirement"),
    customBlockedWordsList: getValue("CustomBlockedWordsList"),
  };
}
```

### TypeScript — Set Naming Policy

```typescript
const GROUP_UNIFIED_TEMPLATE_ID = "62375ab9-6b52-47ed-826b-58e47e0e304b";

async function setNamingPolicy(
  client: Client,
  prefixSuffix: string,
  blockedWords: string[]
): Promise<void> {
  // Check if Group.Unified setting already exists
  const existing = await client.api("/groupSettings").get();
  const unifiedSetting = existing.value.find(
    (s: any) => s.displayName === "Group.Unified"
  );

  const values = [
    { name: "PrefixSuffixNamingRequirement", value: prefixSuffix },
    { name: "CustomBlockedWordsList", value: blockedWords.join(",") },
    { name: "EnableMSStandardBlockedWords", value: "true" },
  ];

  if (unifiedSetting) {
    // Update existing setting
    await client
      .api(`/groupSettings/${unifiedSetting.id}`)
      .patch({ values });
    console.log("Naming policy updated");
  } else {
    // Create new setting
    await client.api("/groupSettings").post({
      templateId: GROUP_UNIFIED_TEMPLATE_ID,
      values,
    });
    console.log("Naming policy created");
  }
}

// Example: PRJ- prefix for project teams
// PrefixSuffixNamingRequirement format: [Prefix][GroupName][Suffix]
// Supported attributes: [Department], [Company], [Office], [StateOrProvince], [CountryOrRegion], [Title]
await setNamingPolicy(
  client,
  "PRJ-[GroupName]",       // All groups get PRJ- prefix
  ["Test", "Delete", "Temp"] // Words blocked from group names
);
```

### TypeScript — Create an Expiration Policy

```typescript
async function createExpirationPolicy(
  client: Client,
  lifetimeDays: number,
  managedGroupTypes: "All" | "Selected" | "None",
  notificationEmails: string[]
): Promise<string> {
  const policy = await client
    .api("/groupLifecyclePolicies")
    .post({
      groupLifetimeInDays: lifetimeDays,
      managedGroupTypes,
      alternateNotificationEmails: notificationEmails.join(";"),
    });

  console.log(`Expiration policy created: ${policy.id}`);
  console.log(`Lifetime: ${lifetimeDays} days for ${managedGroupTypes} groups`);
  return policy.id;
}

// Example: 180-day expiration for all M365 groups
const policyId = await createExpirationPolicy(
  client,
  180,
  "All",
  ["m365-admin@contoso.com", "governance@contoso.com"]
);
```

### TypeScript — Update Expiration Policy

```typescript
async function updateExpirationPolicy(
  client: Client,
  policyId: string,
  updates: {
    lifetimeDays?: number;
    managedGroupTypes?: "All" | "Selected" | "None";
    notificationEmails?: string[];
  }
): Promise<void> {
  const patch: Record<string, unknown> = {};

  if (updates.lifetimeDays) patch.groupLifetimeInDays = updates.lifetimeDays;
  if (updates.managedGroupTypes) patch.managedGroupTypes = updates.managedGroupTypes;
  if (updates.notificationEmails) {
    patch.alternateNotificationEmails = updates.notificationEmails.join(";");
  }

  await client.api(`/groupLifecyclePolicies/${policyId}`).patch(patch);
  console.log(`Policy ${policyId} updated`);
}
```

### TypeScript — Add Specific Groups to Expiration Policy

```typescript
async function addGroupsToExpirationPolicy(
  client: Client,
  policyId: string,
  groupIds: string[]
): Promise<void> {
  for (const groupId of groupIds) {
    await client
      .api(`/groupLifecyclePolicies/${policyId}/addGroup`)
      .post({ groupId });
    console.log(`Group ${groupId} added to expiration policy`);
  }
}
```

### TypeScript — Find Teams Approaching Expiration

```typescript
async function findTeamsNearExpiration(
  client: Client,
  warningDays = 30
): Promise<Array<{ teamId: string; displayName: string; expirationDateTime: string }>> {
  const now = new Date();
  const threshold = new Date(now.getTime() + warningDays * 86400000);

  const groups = await client
    .api("/groups")
    .filter("resourceProvisioningOptions/Any(x:x eq 'Team')")
    .select("id,displayName,expirationDateTime,renewedDateTime")
    .get();

  const nearExpiry: Array<{
    teamId: string;
    displayName: string;
    expirationDateTime: string;
  }> = [];

  for (const group of groups.value) {
    if (!group.expirationDateTime) continue;
    const expiry = new Date(group.expirationDateTime);

    if (expiry <= threshold) {
      nearExpiry.push({
        teamId: group.id,
        displayName: group.displayName,
        expirationDateTime: group.expirationDateTime,
      });
    }
  }

  return nearExpiry.sort(
    (a, b) =>
      new Date(a.expirationDateTime).getTime() -
      new Date(b.expirationDateTime).getTime()
  );
}
```

### TypeScript — Validate Team Name Against Policy

```typescript
function validateTeamNameAgainstPolicy(
  proposedName: string,
  blockedWords: string[],
  prefixSuffixPattern: string
): { valid: boolean; reason?: string } {
  // Check blocked words
  const nameLower = proposedName.toLowerCase();
  for (const word of blockedWords) {
    if (nameLower.includes(word.toLowerCase())) {
      return { valid: false, reason: `Name contains blocked word: "${word}"` };
    }
  }

  // Check prefix/suffix (simplified — assumes pattern like "PRJ-[GroupName]")
  const prefix = prefixSuffixPattern.split("[GroupName]")[0] ?? "";
  const suffix = prefixSuffixPattern.split("[GroupName]")[1] ?? "";

  if (prefix && !proposedName.startsWith(prefix)) {
    return {
      valid: false,
      reason: `Name must start with: "${prefix}". Got: "${proposedName.substring(0, prefix.length)}"`,
    };
  }

  if (suffix && !proposedName.endsWith(suffix)) {
    return { valid: false, reason: `Name must end with: "${suffix}"` };
  }

  return { valid: true };
}
```

### PowerShell — Naming and Expiration Policy Management

```powershell
# Requires AzureAD or Microsoft.Graph PowerShell module
Connect-MgGraph -Scopes "Directory.ReadWrite.All"

# Get current naming policy
$settings = Invoke-MgGraphRequest -Method GET `
    -Uri "https://graph.microsoft.com/v1.0/groupSettings"
$unifiedSettings = $settings.value | Where-Object { $_.displayName -eq "Group.Unified" }

if ($unifiedSettings) {
    $policy = $unifiedSettings.values | Where-Object { $_.name -eq "PrefixSuffixNamingRequirement" }
    $blocked = $unifiedSettings.values | Where-Object { $_.name -eq "CustomBlockedWordsList" }
    Write-Host "Naming pattern: $($policy.value)"
    Write-Host "Blocked words: $($blocked.value)"
} else {
    Write-Host "No naming policy configured"
}

# Create expiration policy
$policyBody = @{
    groupLifetimeInDays = 180
    managedGroupTypes = "Selected"
    alternateNotificationEmails = "admin@contoso.com;governance@contoso.com"
} | ConvertTo-Json

$policy = Invoke-MgGraphRequest -Method POST `
    -Uri "https://graph.microsoft.com/v1.0/groupLifecyclePolicies" `
    -Body $policyBody -ContentType "application/json"

Write-Host "Policy created: $($policy.id)"

# List all Teams near expiration (next 30 days)
$threshold = (Get-Date).AddDays(30).ToString("o")
$groups = Invoke-MgGraphRequest -Method GET `
    -Uri "https://graph.microsoft.com/v1.0/groups?`$filter=resourceProvisioningOptions/Any(x:x eq 'Team') and expirationDateTime le $threshold&`$select=id,displayName,expirationDateTime"

$groups.value | Sort-Object expirationDateTime | ForEach-Object {
    $days = [Math]::Round(([DateTime]$_.expirationDateTime - (Get-Date)).TotalDays)
    Write-Host "$($_.displayName) — expires in $days days ($($_.expirationDateTime))"
}

# Renew a group's expiration
$groupId = "GROUP_ID"
Invoke-MgGraphRequest -Method POST `
    -Uri "https://graph.microsoft.com/v1.0/groups/$groupId/renew"
Write-Host "Group $groupId renewed"

# Get all group settings templates to find Group.Unified template ID
$templates = Invoke-MgGraphRequest -Method GET `
    -Uri "https://graph.microsoft.com/v1.0/groupSettingTemplates"
$unifiedTemplate = $templates.value | Where-Object { $_.displayName -eq "Group.Unified" }
Write-Host "Group.Unified template ID: $($unifiedTemplate.id)"
```

---

## Naming Policy Format Reference

### PrefixSuffixNamingRequirement Syntax

```
[Prefix1][Prefix2][GroupName][Suffix1][Suffix2]
```

Supported attributes that expand to user directory values:
- `[Department]` — User's department
- `[Company]` — User's company
- `[Office]` — User's office
- `[StateOrProvince]` — User's state/province
- `[CountryOrRegion]` — User's country/region
- `[Title]` — User's job title

### Examples

| Pattern | Result Example |
|---------|---------------|
| `PRJ-[GroupName]` | `PRJ-Q2Campaign` |
| `[Company]-[GroupName]-TEAM` | `Contoso-Marketing-TEAM` |
| `[Department]-[GroupName]` | `Engineering-BackendAPI` |
| `GRP-[GroupName]-[CountryOrRegion]` | `GRP-TechSupport-US` |

---

## Error Codes Table

| HTTP Status / Code | Meaning | Remediation |
|--------------------|---------|-------------|
| 400 BadRequest | Invalid policy values | Check setting value types match template definitions |
| 403 Forbidden | Insufficient permissions | Require `Directory.ReadWrite.All` with admin consent |
| 404 NotFound | Setting or policy ID not found | Verify ID via GET list |
| 409 Conflict | Only one Group.Unified setting allowed | Update existing setting rather than creating new one |
| 429 TooManyRequests | Rate limited | Respect `Retry-After` |
| NamePolicyViolation | Group name violates naming policy | Check prefix/suffix and blocked word requirements |
| ExpirationNotEnabled | Cannot add group to policy when managedGroupTypes is "All" | Use "Selected" mode for per-group control |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|----------------|
| Directory settings reads | Standard Graph limits | Cache settings |
| Expiration policy management | Low volume — typically 1 policy | Cache policy ID |
| `addGroup`/`removeGroup` | ~100 per minute | Process groups in batches |
| Group renewal | One renewal per group per day | Rate limit renewal requests |

---

## Common Patterns and Gotchas

### 1. Only One Group.Unified Setting Per Tenant

You can only create ONE `Group.Unified` directory setting per tenant. All group naming and
related settings (allowed groups, guest permissions, classification) live in this single object.
Always PATCH the existing one rather than creating a new one.

### 2. Naming Policy Applies at Group Create Time, Not at Update Time

The naming policy enforces the prefix/suffix when a new group (or Team) is created. It does NOT
retroactively rename existing groups when the policy changes. Existing non-compliant teams must
be manually renamed.

### 3. Expiration Policy "All" vs "Selected" Mode

`managedGroupTypes: "All"` applies the expiration to every M365 group in the tenant.
`managedGroupTypes: "Selected"` requires you to explicitly add each group via `addGroup`.
Start with `"Selected"` for a pilot, then switch to `"All"` after validation.

### 4. Group Owners Receive Expiration Notifications, Not Admins

Renewal notification emails go to group OWNERS (not the `alternateNotificationEmails`). The
`alternateNotificationEmails` field receives notifications only when a group has NO owners
(orphaned group). Ensure all teams have active owners.

### 5. Renewing a Group Does Not Change the Expiration Date Immediately

After `POST /groups/{id}/renew`, the `expirationDateTime` is updated to `now + policyLifetime`.
This is an async operation. Query the group after a short delay to confirm the new expiry.

### 6. Policy Blocked Words Apply to the Entire Name

Blocked words are checked against the full group display name (after prefix/suffix application).
If "Test" is blocked and your prefix pattern produces "PRJ-TestProject", the creation fails.
Plan prefixes/suffixes to avoid collisions with blocked words.
