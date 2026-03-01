# License Management Examples

Complete TypeScript examples for Microsoft 365 license administration via Microsoft Graph API.

## 1. List Available SKUs with Consumed/Total Counts

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

interface SubscribedSku {
  id: string;
  skuId: string;
  skuPartNumber: string;
  appliesTo: string;
  capabilityStatus: "Enabled" | "Suspended" | "Deleted";
  consumedUnits: number;
  prepaidUnits: {
    enabled: number;
    suspended: number;
    warning: number;
  };
  servicePlans: Array<{
    servicePlanId: string;
    servicePlanName: string;
    provisioningStatus: string;
    appliesTo: string;
  }>;
}

interface LicenseSummary {
  skuId: string;
  skuPartNumber: string;
  status: string;
  total: number;
  consumed: number;
  available: number;
  utilizationPercent: number;
}

async function listLicenseInventory(graphClient: Client): Promise<string> {
  const response = await graphClient.api("/subscribedSkus").get();
  const skus: SubscribedSku[] = response.value;

  const summaries: LicenseSummary[] = skus
    .filter(sku => sku.appliesTo === "User" && sku.capabilityStatus === "Enabled")
    .map(sku => ({
      skuId: sku.skuId,
      skuPartNumber: sku.skuPartNumber,
      status: sku.capabilityStatus,
      total: sku.prepaidUnits.enabled,
      consumed: sku.consumedUnits,
      available: sku.prepaidUnits.enabled - sku.consumedUnits,
      utilizationPercent: sku.prepaidUnits.enabled > 0
        ? Math.round((sku.consumedUnits / sku.prepaidUnits.enabled) * 100)
        : 0,
    }))
    .sort((a, b) => b.utilizationPercent - a.utilizationPercent);

  const report: string[] = [];
  report.push("# License Inventory Report");
  report.push("");
  report.push(`**Timestamp**: ${new Date().toISOString()}`);
  report.push(`**Total SKUs**: ${summaries.length}`);
  report.push("");
  report.push("| SKU Part Number | Total | Consumed | Available | Utilization |");
  report.push("|-----------------|-------|----------|-----------|-------------|");

  for (const s of summaries) {
    const bar = s.utilizationPercent >= 90 ? " !!!" : s.utilizationPercent >= 75 ? " !" : "";
    report.push(
      `| ${s.skuPartNumber} | ${s.total} | ${s.consumed} | ${s.available} | ${s.utilizationPercent}%${bar} |`
    );
  }

  report.push("");

  const critical = summaries.filter(s => s.available <= 0);
  const warning = summaries.filter(s => s.available > 0 && s.available <= 5);

  if (critical.length > 0) {
    report.push("## Exhausted Licenses");
    report.push("");
    for (const c of critical) {
      report.push(`- **${c.skuPartNumber}**: ${c.consumed}/${c.total} consumed — no licenses available`);
    }
    report.push("");
  }

  if (warning.length > 0) {
    report.push("## Low Availability Warning");
    report.push("");
    for (const w of warning) {
      report.push(`- **${w.skuPartNumber}**: ${w.available} license(s) remaining`);
    }
  }

  return report.join("\n");
}

// Usage
const report = await listLicenseInventory(graphClient);
console.log(report);
```

## 2. Assign License to User (with Disabled Plans)

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

interface LicenseAssignmentInput {
  userPrincipalName: string;
  skuId: string;
  disabledPlanIds?: string[];
}

interface ServicePlanInfo {
  servicePlanId: string;
  servicePlanName: string;
}

interface AssignResult {
  userPrincipalName: string;
  skuId: string;
  skuPartNumber: string;
  success: boolean;
  disabledPlans: string[];
  error?: string;
}

async function assignLicenseWithDisabledPlans(
  graphClient: Client,
  input: LicenseAssignmentInput,
): Promise<AssignResult> {
  // Step 1: Verify SKU exists and has availability
  const skusResponse = await graphClient.api("/subscribedSkus").get();
  const targetSku = skusResponse.value.find(
    (s: SubscribedSku) => s.skuId === input.skuId
  );

  if (!targetSku) {
    return {
      userPrincipalName: input.userPrincipalName,
      skuId: input.skuId,
      skuPartNumber: "Unknown",
      success: false,
      disabledPlans: [],
      error: `SKU ${input.skuId} not found in tenant`,
    };
  }

  const available = targetSku.prepaidUnits.enabled - targetSku.consumedUnits;
  if (available <= 0) {
    return {
      userPrincipalName: input.userPrincipalName,
      skuId: input.skuId,
      skuPartNumber: targetSku.skuPartNumber,
      success: false,
      disabledPlans: [],
      error: `No available licenses for ${targetSku.skuPartNumber} (${targetSku.consumedUnits}/${targetSku.prepaidUnits.enabled} consumed)`,
    };
  }

  // Step 2: Verify user has usageLocation set
  const user = await graphClient
    .api(`/users/${input.userPrincipalName}`)
    .select("id,usageLocation")
    .get();

  if (!user.usageLocation) {
    return {
      userPrincipalName: input.userPrincipalName,
      skuId: input.skuId,
      skuPartNumber: targetSku.skuPartNumber,
      success: false,
      disabledPlans: [],
      error: "User does not have usageLocation set — required for license assignment",
    };
  }

  // Step 3: Validate disabled plan IDs
  const validPlanIds = new Set(
    targetSku.servicePlans.map((p: ServicePlanInfo) => p.servicePlanId)
  );
  const disabledPlans = input.disabledPlanIds ?? [];
  const invalidPlans = disabledPlans.filter(id => !validPlanIds.has(id));
  if (invalidPlans.length > 0) {
    return {
      userPrincipalName: input.userPrincipalName,
      skuId: input.skuId,
      skuPartNumber: targetSku.skuPartNumber,
      success: false,
      disabledPlans,
      error: `Invalid service plan IDs: ${invalidPlans.join(", ")}`,
    };
  }

  // Step 4: Assign the license
  try {
    await graphClient.api(`/users/${user.id}/assignLicense`).post({
      addLicenses: [{
        skuId: input.skuId,
        disabledPlans,
      }],
      removeLicenses: [],
    });

    return {
      userPrincipalName: input.userPrincipalName,
      skuId: input.skuId,
      skuPartNumber: targetSku.skuPartNumber,
      success: true,
      disabledPlans,
    };
  } catch (error) {
    return {
      userPrincipalName: input.userPrincipalName,
      skuId: input.skuId,
      skuPartNumber: targetSku.skuPartNumber,
      success: false,
      disabledPlans,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Usage: Assign E3 with Yammer and Sway disabled
const result = await assignLicenseWithDisabledPlans(graphClient, {
  userPrincipalName: "jane.doe@contoso.com",
  skuId: "6fd2c87f-b296-42f0-b197-1e91e994b900",
  disabledPlanIds: [
    "7547a3fe-08ee-4ccb-b430-5077c5899571", // Yammer
    "a23b959c-7ce8-4e57-9140-b90eb88a9e97", // Sway
  ],
});
```

## 3. Bulk License Reassignment (E3 to E5 Migration) from CSV

```typescript
import { Client } from "@microsoft/microsoft-graph-client";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";

// CSV format: userPrincipalName,removeSkuId,addSkuId
// Example:    user@contoso.com,6fd2c87f-...,c7df2760-...

interface MigrationRow {
  userPrincipalName: string;
  removeSkuId: string;
  addSkuId: string;
}

interface MigrationResult {
  row: number;
  upn: string;
  status: "migrated" | "failed";
  detail: string;
}

async function bulkLicenseMigration(
  graphClient: Client,
  csvPath: string,
  dryRun: boolean = false,
): Promise<string> {
  const csv = readFileSync(csvPath, "utf-8");
  const rows: MigrationRow[] = parse(csv, { columns: true, skip_empty_lines: true, trim: true });

  // Pre-flight: check SKU availability
  const skusResponse = await graphClient.api("/subscribedSkus").get();
  const skuMap = new Map<string, { partNumber: string; available: number }>();
  for (const sku of skusResponse.value) {
    skuMap.set(sku.skuId, {
      partNumber: sku.skuPartNumber,
      available: sku.prepaidUnits.enabled - sku.consumedUnits,
    });
  }

  // Count how many new licenses we need
  const addSkuCounts = new Map<string, number>();
  for (const row of rows) {
    addSkuCounts.set(row.addSkuId, (addSkuCounts.get(row.addSkuId) ?? 0) + 1);
  }

  const report: string[] = [];
  report.push(`# License Migration ${dryRun ? "(Dry Run)" : "Report"}`);
  report.push("");
  report.push(`**Timestamp**: ${new Date().toISOString()}`);
  report.push(`**Users to migrate**: ${rows.length}`);
  report.push("");

  // Check capacity
  let capacityOk = true;
  report.push("## Capacity Check");
  report.push("");
  for (const [skuId, needed] of addSkuCounts) {
    const sku = skuMap.get(skuId);
    if (!sku) {
      report.push(`- **${skuId}**: SKU not found in tenant`);
      capacityOk = false;
    } else {
      // Available count will increase as we remove old licenses, but verify conservatively
      const status = sku.available >= needed ? "OK" : "INSUFFICIENT";
      report.push(`- **${sku.partNumber}**: need ${needed}, available ${sku.available} — ${status}`);
      if (sku.available < needed) capacityOk = false;
    }
  }
  report.push("");

  if (!capacityOk) {
    report.push("> Migration blocked: insufficient license capacity. Purchase additional licenses before retrying.");
    return report.join("\n");
  }

  if (dryRun) {
    report.push("## Migration Preview");
    report.push("");
    report.push("| Row | UPN | Remove | Add | Status |");
    report.push("|-----|-----|--------|-----|--------|");
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const removeName = skuMap.get(row.removeSkuId)?.partNumber ?? row.removeSkuId;
      const addName = skuMap.get(row.addSkuId)?.partNumber ?? row.addSkuId;
      report.push(`| ${i + 1} | ${row.userPrincipalName} | ${removeName} | ${addName} | READY |`);
    }
    return report.join("\n");
  }

  // Execute migration
  const results: MigrationResult[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      // Assign new and remove old in a single call to avoid a gap
      await graphClient.api(`/users/${row.userPrincipalName}/assignLicense`).post({
        addLicenses: [{ skuId: row.addSkuId }],
        removeLicenses: [row.removeSkuId],
      });

      const removeName = skuMap.get(row.removeSkuId)?.partNumber ?? row.removeSkuId;
      const addName = skuMap.get(row.addSkuId)?.partNumber ?? row.addSkuId;
      results.push({
        row: i,
        upn: row.userPrincipalName,
        status: "migrated",
        detail: `${removeName} -> ${addName}`,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      results.push({ row: i, upn: row.userPrincipalName, status: "failed", detail: msg });
    }
  }

  report.push("## Results");
  report.push("");
  report.push("| Row | UPN | Status | Detail |");
  report.push("|-----|-----|--------|--------|");
  for (const r of results) {
    report.push(`| ${r.row + 1} | ${r.upn} | ${r.status.toUpperCase()} | ${r.detail} |`);
  }

  const migrated = results.filter(r => r.status === "migrated").length;
  const failed = results.filter(r => r.status === "failed").length;
  report.push("");
  report.push(`**Migrated**: ${migrated} | **Failed**: ${failed}`);

  return report.join("\n");
}

// Usage
const migrationReport = await bulkLicenseMigration(graphClient, "./license-migration.csv", false);
console.log(migrationReport);
```

## 4. License Usage Report Generation

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

interface UserLicense {
  userId: string;
  displayName: string;
  userPrincipalName: string;
  accountEnabled: boolean;
  assignedLicenses: Array<{
    skuId: string;
    disabledPlans: string[];
  }>;
  lastSignInDateTime: string | null;
}

interface LicenseUsageEntry {
  skuPartNumber: string;
  skuId: string;
  totalAssigned: number;
  assignedToDisabled: number;
  assignedToInactive: number;
  potentialSavings: number;
}

async function generateLicenseUsageReport(
  graphClient: Client,
  inactiveDays: number = 30,
): Promise<string> {
  // Step 1: Get all SKUs
  const skusResponse = await graphClient.api("/subscribedSkus").get();
  const skuMap = new Map<string, { partNumber: string; total: number; consumed: number }>();
  for (const sku of skusResponse.value) {
    if (sku.appliesTo === "User" && sku.capabilityStatus === "Enabled") {
      skuMap.set(sku.skuId, {
        partNumber: sku.skuPartNumber,
        total: sku.prepaidUnits.enabled,
        consumed: sku.consumedUnits,
      });
    }
  }

  // Step 2: Get all users with licenses and sign-in activity
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

  let allUsers: UserLicense[] = [];
  let nextLink: string | null = "/users?$select=id,displayName,userPrincipalName,accountEnabled,assignedLicenses,signInActivity&$top=100&$filter=assignedLicenses/$count ne 0&$count=true";

  const headers: Record<string, string> = { ConsistencyLevel: "eventual" };

  while (nextLink) {
    const response = await graphClient.api(nextLink).headers(headers).get();
    allUsers = allUsers.concat(response.value);
    nextLink = response["@odata.nextLink"] ?? null;
  }

  // Step 3: Analyze license usage
  const usageMap = new Map<string, LicenseUsageEntry>();

  for (const [skuId, skuInfo] of skuMap) {
    usageMap.set(skuId, {
      skuPartNumber: skuInfo.partNumber,
      skuId,
      totalAssigned: 0,
      assignedToDisabled: 0,
      assignedToInactive: 0,
      potentialSavings: 0,
    });
  }

  for (const user of allUsers) {
    for (const license of user.assignedLicenses) {
      const entry = usageMap.get(license.skuId);
      if (!entry) continue;

      entry.totalAssigned++;

      if (!user.accountEnabled) {
        entry.assignedToDisabled++;
        entry.potentialSavings++;
      } else {
        const lastSignIn = (user as unknown as Record<string, { lastSignInDateTime?: string }>)
          .signInActivity?.lastSignInDateTime;
        if (lastSignIn) {
          const signInDate = new Date(lastSignIn);
          if (signInDate < cutoffDate) {
            entry.assignedToInactive++;
            entry.potentialSavings++;
          }
        }
      }
    }
  }

  // Step 4: Build report
  const report: string[] = [];
  report.push("# License Usage Report");
  report.push("");
  report.push(`**Timestamp**: ${new Date().toISOString()}`);
  report.push(`**Inactive threshold**: ${inactiveDays} days`);
  report.push(`**Total licensed users**: ${allUsers.length}`);
  report.push("");

  report.push("## Inventory Summary");
  report.push("");
  report.push("| License | Total | Consumed | Available | Disabled Accts | Inactive Users | Potential Savings |");
  report.push("|---------|-------|----------|-----------|----------------|----------------|-------------------|");

  const entries = Array.from(usageMap.values()).sort((a, b) => b.potentialSavings - a.potentialSavings);
  let totalSavings = 0;

  for (const e of entries) {
    const skuInfo = skuMap.get(e.skuId);
    const available = skuInfo ? skuInfo.total - skuInfo.consumed : 0;
    report.push(
      `| ${e.skuPartNumber} | ${skuInfo?.total ?? 0} | ${skuInfo?.consumed ?? 0} | ${available} | ${e.assignedToDisabled} | ${e.assignedToInactive} | ${e.potentialSavings} |`
    );
    totalSavings += e.potentialSavings;
  }

  report.push("");
  report.push(`## Recommendations`);
  report.push("");

  if (totalSavings > 0) {
    report.push(`- **${totalSavings} licenses** could potentially be reclaimed from disabled or inactive accounts`);
    report.push("- Review inactive users and confirm they no longer need access");
    report.push("- Revoke licenses from disabled accounts that have completed offboarding");
  } else {
    report.push("- All assigned licenses appear to be actively used");
    report.push("- No immediate optimization opportunities identified");
  }

  const nearCapacity = entries.filter(e => {
    const skuInfo = skuMap.get(e.skuId);
    return skuInfo && (skuInfo.total - skuInfo.consumed) < 5;
  });

  if (nearCapacity.length > 0) {
    report.push("");
    report.push("## Low Availability Alerts");
    report.push("");
    for (const e of nearCapacity) {
      const skuInfo = skuMap.get(e.skuId);
      const avail = skuInfo ? skuInfo.total - skuInfo.consumed : 0;
      report.push(`- **${e.skuPartNumber}**: only ${avail} license(s) remaining`);
    }
  }

  return report.join("\n");
}

// Usage
const usageReport = await generateLicenseUsageReport(graphClient, 30);
console.log(usageReport);
```
