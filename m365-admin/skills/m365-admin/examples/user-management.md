# User Management Examples

Complete TypeScript examples for user lifecycle operations via Microsoft Graph API.

## 1. Create a New User with Password and License

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

interface CreateUserInput {
  displayName: string;
  givenName: string;
  surname: string;
  userPrincipalName: string;
  mailNickname: string;
  department: string;
  jobTitle: string;
  usageLocation: string;
  password: string;
  licenseSkuId: string;
}

interface CreatedUser {
  id: string;
  displayName: string;
  userPrincipalName: string;
  mail: string | null;
}

interface LicenseAssignmentResult {
  userId: string;
  skuId: string;
  success: boolean;
}

async function createUserWithLicense(
  graphClient: Client,
  input: CreateUserInput,
): Promise<{ user: CreatedUser; license: LicenseAssignmentResult }> {
  // Step 1: Create the user
  const userPayload = {
    accountEnabled: true,
    displayName: input.displayName,
    givenName: input.givenName,
    surname: input.surname,
    userPrincipalName: input.userPrincipalName,
    mailNickname: input.mailNickname,
    department: input.department,
    jobTitle: input.jobTitle,
    usageLocation: input.usageLocation,
    passwordProfile: {
      forceChangePasswordNextSignIn: true,
      password: input.password,
    },
  };

  const user: CreatedUser = await graphClient.api("/users").post(userPayload);

  // Step 2: Assign license
  const licensePayload = {
    addLicenses: [{ skuId: input.licenseSkuId }],
    removeLicenses: [],
  };

  let licenseResult: LicenseAssignmentResult;
  try {
    await graphClient.api(`/users/${user.id}/assignLicense`).post(licensePayload);
    licenseResult = { userId: user.id, skuId: input.licenseSkuId, success: true };
  } catch (error) {
    licenseResult = { userId: user.id, skuId: input.licenseSkuId, success: false };
  }

  return { user, license: licenseResult };
}

// Usage
const result = await createUserWithLicense(graphClient, {
  displayName: "Jane Doe",
  givenName: "Jane",
  surname: "Doe",
  userPrincipalName: "jane.doe@contoso.com",
  mailNickname: "jane.doe",
  department: "Engineering",
  jobTitle: "Software Engineer",
  usageLocation: "US",
  password: "TempP@ssw0rd!2025",
  licenseSkuId: "6fd2c87f-b296-42f0-b197-1e91e994b900", // Office 365 E3
});

console.log(`Created user: ${result.user.id}`);
console.log(`License assigned: ${result.license.success}`);
```

## 2. Bulk Create Users from CSV with Validation

```typescript
import { Client } from "@microsoft/microsoft-graph-client";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";

interface CsvUserRow {
  displayName: string;
  givenName: string;
  surname: string;
  userPrincipalName: string;
  mailNickname: string;
  department: string;
  jobTitle: string;
  usageLocation: string;
  licenseSkuId: string;
}

interface RowValidation {
  row: number;
  upn: string;
  valid: boolean;
  errors: string[];
}

interface BulkResult {
  row: number;
  upn: string;
  status: "created" | "failed" | "skipped";
  userId?: string;
  error?: string;
}

function validateRows(rows: CsvUserRow[]): RowValidation[] {
  const upnSeen = new Set<string>();
  return rows.map((row, idx) => {
    const errors: string[] = [];

    if (!row.displayName?.trim()) errors.push("displayName is required");
    if (!row.userPrincipalName?.trim()) errors.push("userPrincipalName is required");
    if (row.userPrincipalName && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(row.userPrincipalName)) {
      errors.push("userPrincipalName is not a valid email format");
    }
    if (!row.mailNickname?.trim()) errors.push("mailNickname is required");
    if (row.mailNickname && /[^a-zA-Z0-9._-]/.test(row.mailNickname)) {
      errors.push("mailNickname contains invalid characters");
    }
    if (!row.usageLocation?.trim()) errors.push("usageLocation is required");
    if (row.usageLocation && !/^[A-Z]{2}$/.test(row.usageLocation)) {
      errors.push("usageLocation must be a 2-letter country code");
    }
    if (upnSeen.has(row.userPrincipalName)) {
      errors.push("Duplicate userPrincipalName in CSV");
    }
    upnSeen.add(row.userPrincipalName);

    return { row: idx, upn: row.userPrincipalName, valid: errors.length === 0, errors };
  });
}

function generatePassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%&*";
  const all = upper + lower + digits + special;

  let pwd = upper[Math.floor(Math.random() * upper.length)]
    + lower[Math.floor(Math.random() * lower.length)]
    + digits[Math.floor(Math.random() * digits.length)]
    + special[Math.floor(Math.random() * special.length)];

  for (let i = 4; i < 16; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }
  return pwd.split("").sort(() => Math.random() - 0.5).join("");
}

async function bulkCreateUsersFromCsv(
  graphClient: Client,
  csvPath: string,
  dryRun: boolean = false,
): Promise<string> {
  const csv = readFileSync(csvPath, "utf-8");
  const rows: CsvUserRow[] = parse(csv, { columns: true, skip_empty_lines: true, trim: true });
  const validations = validateRows(rows);
  const invalidCount = validations.filter(v => !v.valid).length;

  // Build report header
  const report: string[] = [];
  report.push(`# Bulk User Creation ${dryRun ? "(Dry Run)" : "Report"}`);
  report.push("");
  report.push(`**Timestamp**: ${new Date().toISOString()}`);
  report.push(`**CSV rows**: ${rows.length}`);
  report.push(`**Valid**: ${rows.length - invalidCount}`);
  report.push(`**Invalid**: ${invalidCount}`);
  report.push("");

  if (dryRun || invalidCount > 0) {
    report.push("| Row | UPN | Status | Notes |");
    report.push("|-----|-----|--------|-------|");
    for (const v of validations) {
      const status = v.valid ? "READY" : "BLOCKED";
      const notes = v.errors.length > 0 ? v.errors.join("; ") : "OK";
      report.push(`| ${v.row + 1} | ${v.upn} | ${status} | ${notes} |`);
    }
    if (dryRun) return report.join("\n");
    if (invalidCount > 0) {
      report.push("");
      report.push("> Fix validation errors and re-run.");
      return report.join("\n");
    }
  }

  // Execute creation
  const results: BulkResult[] = [];
  const passwords: Map<string, string> = new Map();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const password = generatePassword();
    try {
      const user = await graphClient.api("/users").post({
        accountEnabled: true,
        displayName: row.displayName,
        givenName: row.givenName,
        surname: row.surname,
        userPrincipalName: row.userPrincipalName,
        mailNickname: row.mailNickname,
        department: row.department || undefined,
        jobTitle: row.jobTitle || undefined,
        usageLocation: row.usageLocation,
        passwordProfile: { forceChangePasswordNextSignIn: true, password },
      });

      passwords.set(row.userPrincipalName, password);

      // Assign license if specified
      if (row.licenseSkuId) {
        await graphClient.api(`/users/${user.id}/assignLicense`).post({
          addLicenses: [{ skuId: row.licenseSkuId }],
          removeLicenses: [],
        });
      }

      results.push({ row: i, upn: row.userPrincipalName, status: "created", userId: user.id });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      results.push({ row: i, upn: row.userPrincipalName, status: "failed", error: msg });
    }
  }

  // Build results table
  report.push("| Row | UPN | Status | Details |");
  report.push("|-----|-----|--------|---------|");
  for (const r of results) {
    const detail = r.status === "created" ? `ID: ${r.userId}` : r.error;
    report.push(`| ${r.row + 1} | ${r.upn} | ${r.status.toUpperCase()} | ${detail} |`);
  }

  const created = results.filter(r => r.status === "created").length;
  const failed = results.filter(r => r.status === "failed").length;
  report.push("");
  report.push(`**Created**: ${created} | **Failed**: ${failed}`);

  return report.join("\n");
}
```

## 3. Offboard User

Complete offboarding: disable, revoke licenses, remove from groups, set auto-reply, convert to shared mailbox.

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

interface OffboardStep {
  step: string;
  status: "success" | "failed" | "skipped";
  detail: string;
}

interface GroupMembership {
  id: string;
  displayName: string;
}

interface AssignedLicense {
  skuId: string;
  disabledPlans: string[];
}

async function offboardUser(
  graphClient: Client,
  userPrincipalName: string,
  managerUpn: string,
  autoReplyMessage: string,
): Promise<string> {
  const steps: OffboardStep[] = [];

  // Step 1: Get user ID
  let userId: string;
  try {
    const user = await graphClient
      .api(`/users/${userPrincipalName}`)
      .select("id,displayName,assignedLicenses")
      .get();
    userId = user.id;
    steps.push({ step: "Lookup user", status: "success", detail: `Found: ${user.displayName} (${userId})` });
  } catch {
    return `# Offboard Report\n\nUser ${userPrincipalName} not found.`;
  }

  // Step 2: Disable account
  try {
    await graphClient.api(`/users/${userId}`).patch({ accountEnabled: false });
    steps.push({ step: "Disable account", status: "success", detail: "accountEnabled set to false" });
  } catch (error) {
    steps.push({ step: "Disable account", status: "failed", detail: String(error) });
  }

  // Step 3: Revoke sign-in sessions
  try {
    await graphClient.api(`/users/${userId}/revokeSignInSessions`).post({});
    steps.push({ step: "Revoke sessions", status: "success", detail: "All sessions revoked" });
  } catch (error) {
    steps.push({ step: "Revoke sessions", status: "failed", detail: String(error) });
  }

  // Step 4: Set auto-reply
  try {
    await graphClient.api(`/users/${userId}/mailboxSettings`).patch({
      automaticRepliesSetting: {
        status: "alwaysEnabled",
        externalAudience: "all",
        internalReplyMessage: autoReplyMessage,
        externalReplyMessage: autoReplyMessage,
      },
    });
    steps.push({ step: "Set auto-reply", status: "success", detail: "OOF message configured" });
  } catch (error) {
    steps.push({ step: "Set auto-reply", status: "failed", detail: String(error) });
  }

  // Step 5: Remove from all groups
  try {
    const groups = await graphClient
      .api(`/users/${userId}/memberOf`)
      .select("id,displayName")
      .get();
    const memberships: GroupMembership[] = groups.value;

    for (const group of memberships) {
      try {
        await graphClient.api(`/groups/${group.id}/members/${userId}/$ref`).delete();
      } catch {
        // May fail for dynamic groups or role groups — continue
      }
    }
    steps.push({
      step: "Remove from groups",
      status: "success",
      detail: `Removed from ${memberships.length} group(s)`,
    });
  } catch (error) {
    steps.push({ step: "Remove from groups", status: "failed", detail: String(error) });
  }

  // Step 6: Revoke all licenses
  try {
    const user = await graphClient
      .api(`/users/${userId}`)
      .select("assignedLicenses")
      .get();
    const licenses: AssignedLicense[] = user.assignedLicenses;

    if (licenses.length > 0) {
      await graphClient.api(`/users/${userId}/assignLicense`).post({
        addLicenses: [],
        removeLicenses: licenses.map((l: AssignedLicense) => l.skuId),
      });
      steps.push({
        step: "Revoke licenses",
        status: "success",
        detail: `Removed ${licenses.length} license(s)`,
      });
    } else {
      steps.push({ step: "Revoke licenses", status: "skipped", detail: "No licenses assigned" });
    }
  } catch (error) {
    steps.push({ step: "Revoke licenses", status: "failed", detail: String(error) });
  }

  // Step 7: Transfer OneDrive to manager
  try {
    // Note: OneDrive transfer is typically done via SharePoint Admin
    // or by granting the manager access to the user's OneDrive
    const drive = await graphClient.api(`/users/${userId}/drive`).select("webUrl").get();
    steps.push({
      step: "OneDrive handoff",
      status: "success",
      detail: `OneDrive URL: ${drive.webUrl} — grant ${managerUpn} access via SharePoint Admin`,
    });
  } catch (error) {
    steps.push({ step: "OneDrive handoff", status: "failed", detail: String(error) });
  }

  // Generate report
  const report: string[] = [];
  report.push(`# Offboard Report: ${userPrincipalName}`);
  report.push("");
  report.push(`**Timestamp**: ${new Date().toISOString()}`);
  report.push(`**Manager**: ${managerUpn}`);
  report.push("");
  report.push("| Step | Status | Detail |");
  report.push("|------|--------|--------|");
  for (const s of steps) {
    report.push(`| ${s.step} | ${s.status.toUpperCase()} | ${s.detail} |`);
  }
  report.push("");
  report.push("> **Note**: Mailbox conversion to shared requires Exchange Online PowerShell:");
  report.push("> `Set-Mailbox -Identity \"" + userPrincipalName + "\" -Type Shared`");

  return report.join("\n");
}
```

## 4. Update User Properties in Bulk

```typescript
import { Client } from "@microsoft/microsoft-graph-client";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";

interface UpdateRow {
  userPrincipalName: string;
  [key: string]: string;
}

interface UpdateResult {
  upn: string;
  status: "updated" | "failed";
  fields: string[];
  error?: string;
}

const UPDATABLE_FIELDS = new Set([
  "displayName", "givenName", "surname", "department", "jobTitle",
  "usageLocation", "companyName", "officeLocation", "mobilePhone",
  "streetAddress", "city", "state", "postalCode", "country",
  "employeeId", "employeeType",
]);

async function bulkUpdateUsers(
  graphClient: Client,
  csvPath: string,
): Promise<string> {
  const csv = readFileSync(csvPath, "utf-8");
  const rows: UpdateRow[] = parse(csv, { columns: true, skip_empty_lines: true, trim: true });
  const results: UpdateResult[] = [];

  for (const row of rows) {
    const updatePayload: Record<string, string> = {};
    const updatedFields: string[] = [];

    for (const [key, value] of Object.entries(row)) {
      if (key === "userPrincipalName") continue;
      if (UPDATABLE_FIELDS.has(key) && value?.trim()) {
        updatePayload[key] = value.trim();
        updatedFields.push(key);
      }
    }

    if (updatedFields.length === 0) {
      results.push({ upn: row.userPrincipalName, status: "updated", fields: [], error: "No fields to update" });
      continue;
    }

    try {
      await graphClient.api(`/users/${row.userPrincipalName}`).patch(updatePayload);
      results.push({ upn: row.userPrincipalName, status: "updated", fields: updatedFields });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      results.push({ upn: row.userPrincipalName, status: "failed", fields: updatedFields, error: msg });
    }
  }

  const report: string[] = [];
  report.push("# Bulk User Update Report");
  report.push("");
  report.push(`**Timestamp**: ${new Date().toISOString()}`);
  report.push(`**Total**: ${results.length}`);
  report.push("");
  report.push("| UPN | Status | Fields Updated | Error |");
  report.push("|-----|--------|----------------|-------|");
  for (const r of results) {
    report.push(`| ${r.upn} | ${r.status.toUpperCase()} | ${r.fields.join(", ") || "none"} | ${r.error || ""} |`);
  }
  return report.join("\n");
}
```

## 5. Password Reset with Force Change

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

interface PasswordResetResult {
  userPrincipalName: string;
  success: boolean;
  temporaryPassword: string;
  error?: string;
}

async function resetUserPassword(
  graphClient: Client,
  userPrincipalName: string,
  temporaryPassword: string,
  forceChangeOnNextSignIn: boolean = true,
): Promise<PasswordResetResult> {
  try {
    await graphClient.api(`/users/${userPrincipalName}`).patch({
      passwordProfile: {
        forceChangePasswordNextSignIn: forceChangeOnNextSignIn,
        password: temporaryPassword,
      },
    });

    return {
      userPrincipalName,
      success: true,
      temporaryPassword,
    };
  } catch (error) {
    return {
      userPrincipalName,
      success: false,
      temporaryPassword,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Usage
const result = await resetUserPassword(
  graphClient,
  "jane.doe@contoso.com",
  "NewTempP@ss2025!",
  true,
);
```

## 6. Get User Group Memberships and Licenses

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

interface UserDetails {
  id: string;
  displayName: string;
  userPrincipalName: string;
  accountEnabled: boolean;
  department: string | null;
  jobTitle: string | null;
  usageLocation: string | null;
}

interface GroupInfo {
  id: string;
  displayName: string;
  groupType: string;
}

interface LicenseInfo {
  skuId: string;
  skuPartNumber: string;
  disabledPlans: string[];
}

interface SubscribedSku {
  skuId: string;
  skuPartNumber: string;
}

interface UserProfile {
  user: UserDetails;
  groups: GroupInfo[];
  licenses: LicenseInfo[];
}

async function getUserProfile(
  graphClient: Client,
  userPrincipalName: string,
): Promise<string> {
  // Fetch user details
  const user: UserDetails = await graphClient
    .api(`/users/${userPrincipalName}`)
    .select("id,displayName,userPrincipalName,accountEnabled,department,jobTitle,usageLocation,assignedLicenses")
    .get();

  // Fetch group memberships
  const memberOf = await graphClient
    .api(`/users/${user.id}/memberOf`)
    .select("id,displayName,groupTypes,mailEnabled,securityEnabled")
    .top(100)
    .get();

  const groups: GroupInfo[] = memberOf.value.map((g: Record<string, unknown>) => {
    const groupTypes = g.groupTypes as string[] | undefined;
    let groupType = "Security";
    if (groupTypes?.includes("Unified")) groupType = "M365";
    else if (g.mailEnabled && !g.securityEnabled) groupType = "Distribution";
    else if (g.mailEnabled && g.securityEnabled) groupType = "Mail-enabled Security";
    return { id: g.id as string, displayName: g.displayName as string, groupType };
  });

  // Fetch SKU details to map skuId to name
  const skus = await graphClient.api("/subscribedSkus").select("skuId,skuPartNumber").get();
  const skuMap = new Map<string, string>(
    skus.value.map((s: SubscribedSku) => [s.skuId, s.skuPartNumber])
  );

  const userFull = await graphClient
    .api(`/users/${user.id}`)
    .select("assignedLicenses")
    .get();

  const licenses: LicenseInfo[] = userFull.assignedLicenses.map(
    (l: { skuId: string; disabledPlans: string[] }) => ({
      skuId: l.skuId,
      skuPartNumber: skuMap.get(l.skuId) ?? "Unknown",
      disabledPlans: l.disabledPlans,
    })
  );

  // Build report
  const report: string[] = [];
  report.push(`# User Profile: ${user.displayName}`);
  report.push("");
  report.push(`| Property | Value |`);
  report.push(`|----------|-------|`);
  report.push(`| UPN | ${user.userPrincipalName} |`);
  report.push(`| ID | ${user.id} |`);
  report.push(`| Enabled | ${user.accountEnabled} |`);
  report.push(`| Department | ${user.department ?? "N/A"} |`);
  report.push(`| Job Title | ${user.jobTitle ?? "N/A"} |`);
  report.push(`| Usage Location | ${user.usageLocation ?? "N/A"} |`);
  report.push("");

  report.push("## Licenses");
  report.push("");
  if (licenses.length === 0) {
    report.push("No licenses assigned.");
  } else {
    report.push("| SKU | Part Number | Disabled Plans |");
    report.push("|-----|-------------|----------------|");
    for (const l of licenses) {
      report.push(`| ${l.skuId} | ${l.skuPartNumber} | ${l.disabledPlans.length > 0 ? l.disabledPlans.join(", ") : "none"} |`);
    }
  }
  report.push("");

  report.push("## Group Memberships");
  report.push("");
  if (groups.length === 0) {
    report.push("No group memberships.");
  } else {
    report.push("| Group | Type | ID |");
    report.push("|-------|------|----|");
    for (const g of groups) {
      report.push(`| ${g.displayName} | ${g.groupType} | ${g.id} |`);
    }
  }

  return report.join("\n");
}
```
