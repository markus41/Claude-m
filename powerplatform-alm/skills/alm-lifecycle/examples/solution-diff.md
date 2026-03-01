# Solution Diff Examples

## Example 1: Compare Two Exported Solution Zips

Unpack both solutions and use standard diff tooling to compare component-level changes.

### Bash Script

```bash
#!/bin/bash
set -euo pipefail

# ─── Configuration ────────────────────────────────────────────
SOLUTION_V1="$1"  # Path to first solution zip (e.g., ./v1/MySolution.zip)
SOLUTION_V2="$2"  # Path to second solution zip (e.g., ./v2/MySolution.zip)
OUTPUT_DIR="${3:-./diff-output}"

if [ -z "$SOLUTION_V1" ] || [ -z "$SOLUTION_V2" ]; then
  echo "Usage: $0 <solution_v1.zip> <solution_v2.zip> [output_dir]"
  exit 1
fi

echo "Comparing solutions:"
echo "  V1: $SOLUTION_V1"
echo "  V2: $SOLUTION_V2"
echo ""

# Create output directories
mkdir -p "$OUTPUT_DIR/v1" "$OUTPUT_DIR/v2" "$OUTPUT_DIR/report"

# Unpack both solutions
echo "Unpacking V1..."
pac solution unpack --zipfile "$SOLUTION_V1" --folder "$OUTPUT_DIR/v1" --packagetype Both --allowDelete true --allowWrite true
echo ""

echo "Unpacking V2..."
pac solution unpack --zipfile "$SOLUTION_V2" --folder "$OUTPUT_DIR/v2" --packagetype Both --allowDelete true --allowWrite true
echo ""

# ─── Find Added Files ────────────────────────────────────────
echo "=== Added Files (in V2 but not in V1) ==="
ADDED_FILES=$(diff -rq "$OUTPUT_DIR/v1" "$OUTPUT_DIR/v2" 2>/dev/null | grep "Only in $OUTPUT_DIR/v2" | sed "s|Only in $OUTPUT_DIR/v2||" || true)
if [ -n "$ADDED_FILES" ]; then
  echo "$ADDED_FILES"
else
  echo "  None"
fi
echo ""

# ─── Find Removed Files ──────────────────────────────────────
echo "=== Removed Files (in V1 but not in V2) ==="
REMOVED_FILES=$(diff -rq "$OUTPUT_DIR/v1" "$OUTPUT_DIR/v2" 2>/dev/null | grep "Only in $OUTPUT_DIR/v1" | sed "s|Only in $OUTPUT_DIR/v1||" || true)
if [ -n "$REMOVED_FILES" ]; then
  echo "$REMOVED_FILES"
else
  echo "  None"
fi
echo ""

# ─── Find Modified Files ─────────────────────────────────────
echo "=== Modified Files ==="
MODIFIED_FILES=$(diff -rq "$OUTPUT_DIR/v1" "$OUTPUT_DIR/v2" 2>/dev/null | grep "Files .* differ" || true)
if [ -n "$MODIFIED_FILES" ]; then
  echo "$MODIFIED_FILES"
else
  echo "  None"
fi
echo ""

# ─── Generate Detailed Diff Report ───────────────────────────
REPORT_FILE="$OUTPUT_DIR/report/diff-report.md"
echo "Generating detailed report: $REPORT_FILE"

cat > "$REPORT_FILE" << 'HEADER'
# Solution Diff Report

HEADER

echo "| Property | Value |" >> "$REPORT_FILE"
echo "|----------|-------|" >> "$REPORT_FILE"
echo "| Solution V1 | $(basename "$SOLUTION_V1") |" >> "$REPORT_FILE"
echo "| Solution V2 | $(basename "$SOLUTION_V2") |" >> "$REPORT_FILE"
echo "| Generated | $(date -u '+%Y-%m-%dT%H:%M:%SZ') |" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Count changes
ADDED_COUNT=$(echo "$ADDED_FILES" | grep -c "." || echo "0")
REMOVED_COUNT=$(echo "$REMOVED_FILES" | grep -c "." || echo "0")
MODIFIED_COUNT=$(echo "$MODIFIED_FILES" | grep -c "." || echo "0")

echo "## Summary" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "| Change Type | Count |" >> "$REPORT_FILE"
echo "|-------------|-------|" >> "$REPORT_FILE"
echo "| Added | $ADDED_COUNT |" >> "$REPORT_FILE"
echo "| Removed | $REMOVED_COUNT |" >> "$REPORT_FILE"
echo "| Modified | $MODIFIED_COUNT |" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Add detailed sections
echo "## Added Components" >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"
echo "${ADDED_FILES:-None}" >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "## Removed Components" >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"
echo "${REMOVED_FILES:-None}" >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "## Modified Components" >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"
echo "${MODIFIED_FILES:-None}" >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Generate unified diff for modified XML files
echo "## Detailed Changes" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if [ -n "$MODIFIED_FILES" ]; then
  echo "$MODIFIED_FILES" | while IFS= read -r line; do
    FILE_PATH=$(echo "$line" | sed 's/Files //;s/ and .*//' | sed "s|$OUTPUT_DIR/v1/||")
    echo "### $FILE_PATH" >> "$REPORT_FILE"
    echo '```diff' >> "$REPORT_FILE"
    diff -u "$OUTPUT_DIR/v1/$FILE_PATH" "$OUTPUT_DIR/v2/$FILE_PATH" 2>/dev/null >> "$REPORT_FILE" || true
    echo '```' >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
  done
fi

echo ""
echo "Done. Report: $REPORT_FILE"
echo "  Added: $ADDED_COUNT | Removed: $REMOVED_COUNT | Modified: $MODIFIED_COUNT"
```

---

## Example 2: TypeScript Script to Compare Entity Metadata

Connects to two environments and compares entity (table) metadata to find schema differences.

```typescript
import { ConfidentialClientApplication } from "@azure/msal-node";

// ─── Types ───────────────────────────────────────────────────

interface EntityMetadata {
  LogicalName: string;
  DisplayName: { UserLocalizedLabel: { Label: string } | null };
  SchemaName: string;
  EntitySetName: string;
  PrimaryIdAttribute: string;
  PrimaryNameAttribute: string;
  IsManaged: boolean;
  IsCustomEntity: boolean;
}

interface AttributeMetadata {
  LogicalName: string;
  DisplayName: { UserLocalizedLabel: { Label: string } | null };
  AttributeType: string;
  SchemaName: string;
  MaxLength?: number;
  RequiredLevel: { Value: string };
  IsManaged: boolean;
}

interface EntityComparison {
  entityName: string;
  displayName: string;
  status: "added" | "removed" | "modified" | "unchanged";
  attributeChanges: AttributeComparison[];
}

interface AttributeComparison {
  attributeName: string;
  displayName: string;
  status: "added" | "removed" | "modified" | "unchanged";
  differences: string[];
}

// ─── Authentication ──────────────────────────────────────────

async function getToken(orgUrl: string): Promise<string> {
  const cca = new ConfidentialClientApplication({
    auth: {
      clientId: process.env.CLIENT_ID!,
      authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
      clientSecret: process.env.CLIENT_SECRET!,
    },
  });

  const result = await cca.acquireTokenByClientCredential({
    scopes: [`${orgUrl}/.default`],
  });

  if (!result?.accessToken) {
    throw new Error(`Token acquisition failed for ${orgUrl}`);
  }

  return result.accessToken;
}

// ─── Fetch Metadata ──────────────────────────────────────────

async function fetchEntities(
  orgUrl: string,
  token: string,
  publisherPrefix: string
): Promise<EntityMetadata[]> {
  const response = await fetch(
    `${orgUrl}/api/data/v9.2/EntityDefinitions?$select=LogicalName,DisplayName,SchemaName,EntitySetName,PrimaryIdAttribute,PrimaryNameAttribute,IsManaged,IsCustomEntity&$filter=startswith(LogicalName,'${publisherPrefix}_')`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch entities: ${response.status}`);
  }

  const data = await response.json();
  return data.value;
}

async function fetchAttributes(
  orgUrl: string,
  token: string,
  entityLogicalName: string
): Promise<AttributeMetadata[]> {
  const response = await fetch(
    `${orgUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes?$select=LogicalName,DisplayName,AttributeType,SchemaName,MaxLength,RequiredLevel,IsManaged`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch attributes for ${entityLogicalName}: ${response.status}`);
  }

  const data = await response.json();
  return data.value;
}

// ─── Comparison Logic ────────────────────────────────────────

function compareAttributes(
  sourceAttrs: AttributeMetadata[],
  targetAttrs: AttributeMetadata[]
): AttributeComparison[] {
  const results: AttributeComparison[] = [];
  const sourceMap = new Map(sourceAttrs.map((a) => [a.LogicalName, a]));
  const targetMap = new Map(targetAttrs.map((a) => [a.LogicalName, a]));

  // Check each source attribute
  for (const [name, sourceAttr] of sourceMap) {
    const targetAttr = targetMap.get(name);

    if (!targetAttr) {
      results.push({
        attributeName: name,
        displayName: sourceAttr.DisplayName?.UserLocalizedLabel?.Label ?? name,
        status: "added",
        differences: ["Exists only in source environment"],
      });
      continue;
    }

    const differences: string[] = [];

    if (sourceAttr.AttributeType !== targetAttr.AttributeType) {
      differences.push(
        `Type: ${sourceAttr.AttributeType} -> ${targetAttr.AttributeType}`
      );
    }

    if (sourceAttr.RequiredLevel?.Value !== targetAttr.RequiredLevel?.Value) {
      differences.push(
        `Required: ${sourceAttr.RequiredLevel?.Value} -> ${targetAttr.RequiredLevel?.Value}`
      );
    }

    if (
      sourceAttr.MaxLength !== undefined &&
      targetAttr.MaxLength !== undefined &&
      sourceAttr.MaxLength !== targetAttr.MaxLength
    ) {
      differences.push(
        `MaxLength: ${sourceAttr.MaxLength} -> ${targetAttr.MaxLength}`
      );
    }

    if (differences.length > 0) {
      results.push({
        attributeName: name,
        displayName: sourceAttr.DisplayName?.UserLocalizedLabel?.Label ?? name,
        status: "modified",
        differences,
      });
    }
  }

  // Check for attributes only in target
  for (const [name, targetAttr] of targetMap) {
    if (!sourceMap.has(name)) {
      results.push({
        attributeName: name,
        displayName: targetAttr.DisplayName?.UserLocalizedLabel?.Label ?? name,
        status: "removed",
        differences: ["Exists only in target environment"],
      });
    }
  }

  return results.filter((r) => r.status !== "unchanged");
}

// ─── Main Comparison ─────────────────────────────────────────

async function compareEnvironments(
  sourceUrl: string,
  targetUrl: string,
  publisherPrefix: string
): Promise<EntityComparison[]> {
  console.log(`Comparing entities with prefix "${publisherPrefix}_":`);
  console.log(`  Source: ${sourceUrl}`);
  console.log(`  Target: ${targetUrl}`);
  console.log("");

  const sourceToken = await getToken(sourceUrl);
  const targetToken = await getToken(targetUrl);

  const sourceEntities = await fetchEntities(sourceUrl, sourceToken, publisherPrefix);
  const targetEntities = await fetchEntities(targetUrl, targetToken, publisherPrefix);

  console.log(`  Source entities: ${sourceEntities.length}`);
  console.log(`  Target entities: ${targetEntities.length}`);
  console.log("");

  const sourceEntityMap = new Map(sourceEntities.map((e) => [e.LogicalName, e]));
  const targetEntityMap = new Map(targetEntities.map((e) => [e.LogicalName, e]));
  const results: EntityComparison[] = [];

  // Compare each source entity
  for (const [name, sourceEntity] of sourceEntityMap) {
    const targetEntity = targetEntityMap.get(name);
    const displayName = sourceEntity.DisplayName?.UserLocalizedLabel?.Label ?? name;

    if (!targetEntity) {
      results.push({
        entityName: name,
        displayName,
        status: "added",
        attributeChanges: [],
      });
      console.log(`  [ADDED] ${displayName} (${name})`);
      continue;
    }

    // Compare attributes
    console.log(`  Comparing attributes for ${displayName}...`);
    const sourceAttrs = await fetchAttributes(sourceUrl, sourceToken, name);
    const targetAttrs = await fetchAttributes(targetUrl, targetToken, name);
    const attrChanges = compareAttributes(sourceAttrs, targetAttrs);

    if (attrChanges.length > 0) {
      results.push({
        entityName: name,
        displayName,
        status: "modified",
        attributeChanges: attrChanges,
      });
      console.log(`  [MODIFIED] ${displayName} — ${attrChanges.length} attribute change(s)`);
    }
  }

  // Find entities only in target
  for (const [name, targetEntity] of targetEntityMap) {
    if (!sourceEntityMap.has(name)) {
      const displayName = targetEntity.DisplayName?.UserLocalizedLabel?.Label ?? name;
      results.push({
        entityName: name,
        displayName,
        status: "removed",
        attributeChanges: [],
      });
      console.log(`  [REMOVED] ${displayName} (${name})`);
    }
  }

  return results;
}

// ─── Report Generation ───────────────────────────────────────

function generateMarkdownReport(
  comparisons: EntityComparison[],
  sourceUrl: string,
  targetUrl: string
): string {
  let report = `# Entity Metadata Diff Report\n\n`;
  report += `| Property | Value |\n|----------|-------|\n`;
  report += `| Source | ${sourceUrl} |\n`;
  report += `| Target | ${targetUrl} |\n`;
  report += `| Generated | ${new Date().toISOString()} |\n\n`;

  const added = comparisons.filter((c) => c.status === "added");
  const removed = comparisons.filter((c) => c.status === "removed");
  const modified = comparisons.filter((c) => c.status === "modified");

  report += `## Summary\n\n`;
  report += `| Change | Count |\n|--------|-------|\n`;
  report += `| Tables Added | ${added.length} |\n`;
  report += `| Tables Removed | ${removed.length} |\n`;
  report += `| Tables Modified | ${modified.length} |\n\n`;

  if (added.length > 0) {
    report += `## Added Tables\n\n`;
    report += `| Table | Logical Name |\n|-------|------|\n`;
    added.forEach((e) => {
      report += `| ${e.displayName} | ${e.entityName} |\n`;
    });
    report += `\n`;
  }

  if (removed.length > 0) {
    report += `## Removed Tables\n\n`;
    report += `| Table | Logical Name |\n|-------|------|\n`;
    removed.forEach((e) => {
      report += `| ${e.displayName} | ${e.entityName} |\n`;
    });
    report += `\n`;
  }

  if (modified.length > 0) {
    report += `## Modified Tables\n\n`;
    modified.forEach((entity) => {
      report += `### ${entity.displayName} (\`${entity.entityName}\`)\n\n`;
      report += `| Column | Status | Changes |\n`;
      report += `|--------|--------|----------|\n`;
      entity.attributeChanges.forEach((attr) => {
        const changes = attr.differences.join("; ");
        report += `| ${attr.displayName} (\`${attr.attributeName}\`) | ${attr.status.toUpperCase()} | ${changes} |\n`;
      });
      report += `\n`;
    });
  }

  return report;
}

// ─── Run ─────────────────────────────────────────────────────

async function main(): Promise<void> {
  const sourceUrl = process.env.SOURCE_URL || "https://contoso-dev.crm.dynamics.com";
  const targetUrl = process.env.TARGET_URL || "https://contoso-test.crm.dynamics.com";
  const prefix = process.env.PUBLISHER_PREFIX || "cr";

  const comparisons = await compareEnvironments(sourceUrl, targetUrl, prefix);
  const report = generateMarkdownReport(comparisons, sourceUrl, targetUrl);

  const reportPath = "./entity-diff-report.md";
  const fs = await import("fs");
  fs.writeFileSync(reportPath, report);
  console.log(`\nReport written to: ${reportPath}`);
}

main().catch((err) => {
  console.error("Comparison failed:", err);
  process.exit(1);
});
```

---

## Example 3: Solution Component Inventory Comparison

Generates a component-level inventory from two solution zips and compares them.

```typescript
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// ─── Types ───────────────────────────────────────────────────

interface SolutionComponent {
  type: string;
  name: string;
  displayName: string;
  filePath: string;
}

interface ComponentDiff {
  added: SolutionComponent[];
  removed: SolutionComponent[];
  modified: Array<{
    component: SolutionComponent;
    changeDescription: string;
  }>;
}

// ─── Unpack Solution ─────────────────────────────────────────

function unpackSolution(zipPath: string, outputDir: string): void {
  fs.mkdirSync(outputDir, { recursive: true });
  execSync(
    `pac solution unpack --zipfile "${zipPath}" --folder "${outputDir}" --packagetype Both --allowWrite true --allowDelete true`,
    { stdio: "pipe" }
  );
}

// ─── Inventory Components ────────────────────────────────────

function inventoryComponents(solutionDir: string): SolutionComponent[] {
  const components: SolutionComponent[] = [];

  // Entities (Tables)
  const entitiesDir = path.join(solutionDir, "Entities");
  if (fs.existsSync(entitiesDir)) {
    for (const entityFolder of fs.readdirSync(entitiesDir)) {
      const entityPath = path.join(entitiesDir, entityFolder);
      if (fs.statSync(entityPath).isDirectory()) {
        components.push({
          type: "Entity",
          name: entityFolder,
          displayName: entityFolder,
          filePath: entityPath,
        });

        // Sub-components: Forms, Views, Charts
        const formsDir = path.join(entityPath, "FormXml");
        if (fs.existsSync(formsDir)) {
          for (const formFile of walkDir(formsDir)) {
            components.push({
              type: "Form",
              name: `${entityFolder}/${path.basename(formFile)}`,
              displayName: `${entityFolder} - ${path.basename(formFile, ".xml")}`,
              filePath: formFile,
            });
          }
        }

        const viewsDir = path.join(entityPath, "SavedQueries");
        if (fs.existsSync(viewsDir)) {
          for (const viewFile of walkDir(viewsDir)) {
            components.push({
              type: "View",
              name: `${entityFolder}/${path.basename(viewFile)}`,
              displayName: `${entityFolder} - ${path.basename(viewFile, ".xml")}`,
              filePath: viewFile,
            });
          }
        }
      }
    }
  }

  // Workflows (Cloud Flows)
  const workflowsDir = path.join(solutionDir, "Workflows");
  if (fs.existsSync(workflowsDir)) {
    for (const file of fs.readdirSync(workflowsDir)) {
      components.push({
        type: "Workflow",
        name: file,
        displayName: path.basename(file, path.extname(file)),
        filePath: path.join(workflowsDir, file),
      });
    }
  }

  // Canvas Apps
  const canvasDir = path.join(solutionDir, "CanvasApps");
  if (fs.existsSync(canvasDir)) {
    for (const file of fs.readdirSync(canvasDir)) {
      components.push({
        type: "CanvasApp",
        name: file,
        displayName: path.basename(file, path.extname(file)),
        filePath: path.join(canvasDir, file),
      });
    }
  }

  // Web Resources
  const webResDir = path.join(solutionDir, "WebResources");
  if (fs.existsSync(webResDir)) {
    for (const file of walkDir(webResDir)) {
      components.push({
        type: "WebResource",
        name: path.relative(webResDir, file),
        displayName: path.relative(webResDir, file),
        filePath: file,
      });
    }
  }

  // Roles
  const rolesDir = path.join(solutionDir, "Roles");
  if (fs.existsSync(rolesDir)) {
    for (const file of fs.readdirSync(rolesDir)) {
      components.push({
        type: "SecurityRole",
        name: file,
        displayName: path.basename(file, ".xml"),
        filePath: path.join(rolesDir, file),
      });
    }
  }

  // Plugin Assemblies
  const pluginsDir = path.join(solutionDir, "PluginAssemblies");
  if (fs.existsSync(pluginsDir)) {
    for (const folder of fs.readdirSync(pluginsDir)) {
      components.push({
        type: "PluginAssembly",
        name: folder,
        displayName: folder,
        filePath: path.join(pluginsDir, folder),
      });
    }
  }

  return components;
}

function walkDir(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDir(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

// ─── Compare Inventories ─────────────────────────────────────

function compareInventories(
  source: SolutionComponent[],
  target: SolutionComponent[]
): ComponentDiff {
  const sourceMap = new Map(source.map((c) => [`${c.type}::${c.name}`, c]));
  const targetMap = new Map(target.map((c) => [`${c.type}::${c.name}`, c]));

  const added: SolutionComponent[] = [];
  const removed: SolutionComponent[] = [];
  const modified: Array<{ component: SolutionComponent; changeDescription: string }> = [];

  // Find added and modified
  for (const [key, sourceComp] of sourceMap) {
    const targetComp = targetMap.get(key);
    if (!targetComp) {
      added.push(sourceComp);
    } else if (
      fs.existsSync(sourceComp.filePath) &&
      fs.existsSync(targetComp.filePath) &&
      fs.statSync(sourceComp.filePath).isFile() &&
      fs.statSync(targetComp.filePath).isFile()
    ) {
      const sourceContent = fs.readFileSync(sourceComp.filePath, "utf-8");
      const targetContent = fs.readFileSync(targetComp.filePath, "utf-8");
      if (sourceContent !== targetContent) {
        const sizeDiff = sourceContent.length - targetContent.length;
        modified.push({
          component: sourceComp,
          changeDescription: `Content changed (${sizeDiff > 0 ? "+" : ""}${sizeDiff} chars)`,
        });
      }
    }
  }

  // Find removed
  for (const [key, targetComp] of targetMap) {
    if (!sourceMap.has(key)) {
      removed.push(targetComp);
    }
  }

  return { added, removed, modified };
}

// ─── Generate Report ─────────────────────────────────────────

function generateDiffReport(
  diff: ComponentDiff,
  v1Label: string,
  v2Label: string
): string {
  let report = `# Solution Component Diff Report\n\n`;
  report += `Comparing **${v1Label}** (target) with **${v2Label}** (source)\n\n`;
  report += `## Summary\n\n`;
  report += `| Change | Count |\n|--------|-------|\n`;
  report += `| Components Added | ${diff.added.length} |\n`;
  report += `| Components Removed | ${diff.removed.length} |\n`;
  report += `| Components Modified | ${diff.modified.length} |\n\n`;

  if (diff.added.length > 0) {
    report += `## Added Components\n\n`;
    report += `| Type | Name |\n|------|------|\n`;
    diff.added.forEach((c) => {
      report += `| ${c.type} | ${c.displayName} |\n`;
    });
    report += `\n`;
  }

  if (diff.removed.length > 0) {
    report += `## Removed Components\n\n`;
    report += `| Type | Name |\n|------|------|\n`;
    diff.removed.forEach((c) => {
      report += `| ${c.type} | ${c.displayName} |\n`;
    });
    report += `\n`;
  }

  if (diff.modified.length > 0) {
    report += `## Modified Components\n\n`;
    report += `| Type | Name | Change |\n|------|------|--------|\n`;
    diff.modified.forEach((m) => {
      report += `| ${m.component.type} | ${m.component.displayName} | ${m.changeDescription} |\n`;
    });
    report += `\n`;
  }

  // Group by type for overview
  const allChanges = [
    ...diff.added.map((c) => ({ ...c, change: "added" })),
    ...diff.removed.map((c) => ({ ...c, change: "removed" })),
    ...diff.modified.map((m) => ({ ...m.component, change: "modified" })),
  ];

  const byType = new Map<string, number>();
  allChanges.forEach((c) => {
    byType.set(c.type, (byType.get(c.type) ?? 0) + 1);
  });

  report += `## Changes by Component Type\n\n`;
  report += `| Component Type | Changes |\n|----------------|----------|\n`;
  for (const [type, count] of byType) {
    report += `| ${type} | ${count} |\n`;
  }

  return report;
}

// ─── Main ────────────────────────────────────────────────────

function main(): void {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log("Usage: ts-node solution-diff.ts <v1.zip> <v2.zip> [output.md]");
    process.exit(1);
  }

  const v1Zip = args[0];
  const v2Zip = args[1];
  const outputFile = args[2] || "./solution-diff-report.md";
  const tempDir = "./temp-diff";

  console.log("Unpacking solutions...");
  unpackSolution(v1Zip, path.join(tempDir, "v1"));
  unpackSolution(v2Zip, path.join(tempDir, "v2"));

  console.log("Inventorying components...");
  const v1Components = inventoryComponents(path.join(tempDir, "v1"));
  const v2Components = inventoryComponents(path.join(tempDir, "v2"));

  console.log(`  V1 components: ${v1Components.length}`);
  console.log(`  V2 components: ${v2Components.length}`);

  console.log("Comparing...");
  const diff = compareInventories(v2Components, v1Components);

  console.log(`  Added: ${diff.added.length}`);
  console.log(`  Removed: ${diff.removed.length}`);
  console.log(`  Modified: ${diff.modified.length}`);

  const report = generateDiffReport(
    diff,
    path.basename(v1Zip),
    path.basename(v2Zip)
  );
  fs.writeFileSync(outputFile, report);
  console.log(`\nReport: ${outputFile}`);

  // Cleanup
  fs.rmSync(tempDir, { recursive: true, force: true });
}

main();
```
