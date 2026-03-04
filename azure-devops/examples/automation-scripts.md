# Automation Scripts

TypeScript and CLI scripts for automating common Azure DevOps operations.
Each script is self-contained and ready to run.

---

## Script 1: Bulk Work Item Creator

Creates work items from a JSON array with support for parent-child relationships.

```typescript
// bulk-create-work-items.ts
// Usage: npx tsx bulk-create-work-items.ts --org myorg --project myproject --file items.json

import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    org: { type: "string" },
    project: { type: "string" },
    file: { type: "string" },
    pat: { type: "string", default: process.env.AZURE_DEVOPS_PAT },
  },
});

const { org, project, file, pat } = values;
if (!org || !project || !file || !pat) {
  console.error("Usage: --org <org> --project <project> --file <items.json>");
  console.error("Set AZURE_DEVOPS_PAT env var or pass --pat <token>");
  process.exit(1);
}

const BASE_URL = `https://dev.azure.com/${org}/${project}/_apis`;
const AUTH = Buffer.from(`:${pat}`).toString("base64");

interface WorkItemInput {
  type: string; // "User Story", "Task", "Bug"
  title: string;
  description?: string;
  assignedTo?: string;
  areaPath?: string;
  iterationPath?: string;
  tags?: string;
  children?: WorkItemInput[];
}

interface PatchOp {
  op: "add";
  path: string;
  value: string;
}

async function createWorkItem(
  item: WorkItemInput,
  parentId?: number
): Promise<number> {
  const ops: PatchOp[] = [
    { op: "add", path: "/fields/System.Title", value: item.title },
  ];

  if (item.description) {
    ops.push({
      op: "add",
      path: "/fields/System.Description",
      value: item.description,
    });
  }
  if (item.assignedTo) {
    ops.push({
      op: "add",
      path: "/fields/System.AssignedTo",
      value: item.assignedTo,
    });
  }
  if (item.areaPath) {
    ops.push({
      op: "add",
      path: "/fields/System.AreaPath",
      value: item.areaPath,
    });
  }
  if (item.iterationPath) {
    ops.push({
      op: "add",
      path: "/fields/System.IterationPath",
      value: item.iterationPath,
    });
  }
  if (item.tags) {
    ops.push({ op: "add", path: "/fields/System.Tags", value: item.tags });
  }

  if (parentId) {
    ops.push({
      op: "add",
      path: "/relations/-",
      value: JSON.stringify({
        rel: "System.LinkTypes.Hierarchy-Reverse",
        url: `${BASE_URL}/wit/workitems/${parentId}`,
      }),
    } as unknown as PatchOp);
  }

  const encodedType = encodeURIComponent(`$${item.type}`);
  const resp = await fetch(
    `${BASE_URL}/wit/workitems/${encodedType}?api-version=7.1`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${AUTH}`,
        "Content-Type": "application/json-patch+json",
      },
      body: JSON.stringify(ops),
    }
  );

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Failed to create "${item.title}": ${resp.status} ${text}`);
  }

  const result = await resp.json();
  const id: number = result.id;
  console.log(`Created ${item.type} #${id}: ${item.title}`);
  return id;
}

async function processItems(
  items: WorkItemInput[],
  parentId?: number
): Promise<void> {
  for (const item of items) {
    const id = await createWorkItem(item, parentId);
    if (item.children?.length) {
      await processItems(item.children, id);
    }
  }
}

// --- Main ---
const { readFileSync } = await import("node:fs");
const items: WorkItemInput[] = JSON.parse(readFileSync(file, "utf-8"));
console.log(`Creating ${items.length} top-level work items...`);
await processItems(items);
console.log("Done.");
```

**Sample input file** (`items.json`):

```json
[
  {
    "type": "User Story",
    "title": "Implement authentication flow",
    "description": "Add OAuth 2.0 authentication with PKCE",
    "tags": "security;sprint-1",
    "children": [
      { "type": "Task", "title": "Configure Entra app registration" },
      { "type": "Task", "title": "Implement MSAL login component" },
      { "type": "Task", "title": "Add token refresh middleware" }
    ]
  },
  {
    "type": "Bug",
    "title": "Session timeout not redirecting to login",
    "assignedTo": "user@example.com",
    "tags": "bug;priority-1"
  }
]
```

---

## Script 2: Pipeline Trigger Script

Triggers a pipeline run with parameters and polls until completion.

```typescript
// trigger-pipeline.ts
// Usage: npx tsx trigger-pipeline.ts --org myorg --project myproject --pipeline-id 42

import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    org: { type: "string" },
    project: { type: "string" },
    "pipeline-id": { type: "string" },
    branch: { type: "string", default: "refs/heads/main" },
    pat: { type: "string", default: process.env.AZURE_DEVOPS_PAT },
    param: { type: "string", multiple: true },
    "poll-interval": { type: "string", default: "15" },
    timeout: { type: "string", default: "1800" },
  },
});

const org = values.org!;
const project = values.project!;
const pipelineId = values["pipeline-id"]!;
const branch = values.branch!;
const pat = values.pat!;
const pollInterval = parseInt(values["poll-interval"]!, 10) * 1000;
const timeout = parseInt(values.timeout!, 10) * 1000;

if (!org || !project || !pipelineId || !pat) {
  console.error("Missing required args. Use --org, --project, --pipeline-id");
  process.exit(1);
}

const BASE_URL = `https://dev.azure.com/${org}/${project}/_apis`;
const AUTH = Buffer.from(`:${pat}`).toString("base64");
const headers = {
  Authorization: `Basic ${AUTH}`,
  "Content-Type": "application/json",
};

// Parse key=value parameters
const templateParams: Record<string, string> = {};
for (const p of values.param ?? []) {
  const [key, ...rest] = p.split("=");
  templateParams[key] = rest.join("=");
}

// Queue the run
const body = {
  resources: { repositories: { self: { refName: branch } } },
  templateParameters: templateParams,
};

console.log(`Triggering pipeline ${pipelineId} on ${branch}...`);
const triggerResp = await fetch(
  `${BASE_URL}/pipelines/${pipelineId}/runs?api-version=7.1`,
  { method: "POST", headers, body: JSON.stringify(body) }
);

if (!triggerResp.ok) {
  const err = await triggerResp.text();
  console.error(`Trigger failed: ${triggerResp.status} ${err}`);
  process.exit(1);
}

const run = await triggerResp.json();
const runId: number = run.id;
console.log(`Run #${runId} queued. Polling for completion...`);

// Poll for completion
const startTime = Date.now();
let state = run.state;

while (state !== "completed") {
  if (Date.now() - startTime > timeout) {
    console.error(`Timeout after ${timeout / 1000}s`);
    process.exit(1);
  }

  await new Promise((r) => setTimeout(r, pollInterval));

  const statusResp = await fetch(
    `${BASE_URL}/pipelines/${pipelineId}/runs/${runId}?api-version=7.1`,
    { headers }
  );
  const status = await statusResp.json();
  state = status.state;
  console.log(`  State: ${state} | Result: ${status.result ?? "pending"}`);
}

// Final result
const finalResp = await fetch(
  `${BASE_URL}/pipelines/${pipelineId}/runs/${runId}?api-version=7.1`,
  { headers }
);
const final = await finalResp.json();
console.log(`\nRun #${runId} completed: ${final.result}`);
process.exit(final.result === "succeeded" ? 0 : 1);
```

---

## Script 3: PR Automation

CLI script to create a branch, commit, push, and open a PR with auto-complete.

```bash
#!/usr/bin/env bash
# pr-automation.sh — Create branch, commit, push, and open PR with auto-complete.
# Usage: ./pr-automation.sh "feature/my-change" "Add new feature" "Description of changes"
set -euo pipefail

BRANCH_NAME="${1:?Usage: $0 <branch-name> <pr-title> [description]}"
PR_TITLE="${2:?Provide PR title as second argument}"
PR_DESC="${3:-}"
TARGET_BRANCH="${TARGET_BRANCH:-main}"

# Validate Azure DevOps CLI extension
if ! az extension show --name azure-devops &>/dev/null; then
  echo "Installing azure-devops CLI extension..."
  az extension add --name azure-devops
fi

# Create and switch to new branch
echo "Creating branch: $BRANCH_NAME"
git checkout -b "$BRANCH_NAME"

# Stage and commit (assumes changes are already made)
if [[ -z $(git status --porcelain) ]]; then
  echo "No changes to commit. Make your changes first."
  exit 1
fi

git add -A
git commit -m "$PR_TITLE"

# Push branch to remote
echo "Pushing branch to origin..."
git push -u origin "$BRANCH_NAME"

# Create pull request
echo "Creating pull request..."
PR_ID=$(az repos pr create \
  --title "$PR_TITLE" \
  --description "${PR_DESC:-$PR_TITLE}" \
  --source-branch "$BRANCH_NAME" \
  --target-branch "$TARGET_BRANCH" \
  --auto-complete true \
  --merge-commit-message "$PR_TITLE" \
  --delete-source-branch true \
  --squash true \
  --query "pullRequestId" \
  --output tsv)

echo "Pull request #${PR_ID} created with auto-complete enabled."

# Add required reviewers if configured
if [[ -n "${REVIEWERS:-}" ]]; then
  IFS=',' read -ra REVIEWER_ARRAY <<< "$REVIEWERS"
  for reviewer in "${REVIEWER_ARRAY[@]}"; do
    az repos pr reviewer add \
      --id "$PR_ID" \
      --reviewers "$reviewer" \
      --output none
    echo "  Added reviewer: $reviewer"
  done
fi

# Show PR URL
PR_URL=$(az repos pr show --id "$PR_ID" --query "url" --output tsv)
echo "PR URL: $PR_URL"
```

---

## Script 4: Sprint Report Generator

Queries the current sprint's work items and generates a Markdown report table.

```typescript
// sprint-report.ts
// Usage: npx tsx sprint-report.ts --org myorg --project myproject --team "My Team"

import { parseArgs } from "node:util";
import { writeFileSync } from "node:fs";

const { values } = parseArgs({
  options: {
    org: { type: "string" },
    project: { type: "string" },
    team: { type: "string" },
    pat: { type: "string", default: process.env.AZURE_DEVOPS_PAT },
    output: { type: "string", default: "sprint-report.md" },
  },
});

const { org, project, team, pat, output } = values;
if (!org || !project || !team || !pat) {
  console.error("Usage: --org <org> --project <project> --team <team>");
  process.exit(1);
}

const BASE_URL = `https://dev.azure.com/${org}/${project}`;
const AUTH = Buffer.from(`:${pat}`).toString("base64");
const headers = { Authorization: `Basic ${AUTH}` };

// Get current iteration
const encodedTeam = encodeURIComponent(team);
const iterResp = await fetch(
  `${BASE_URL}/${encodedTeam}/_apis/work/teamsettings/iterations?$timeframe=current&api-version=7.1`,
  { headers }
);
const iterData = await iterResp.json();
const currentIter = iterData.value?.[0];

if (!currentIter) {
  console.error("No current iteration found for this team.");
  process.exit(1);
}

console.log(`Sprint: ${currentIter.name}`);
console.log(`  Path: ${currentIter.path}`);
console.log(
  `  Dates: ${currentIter.attributes.startDate} - ${currentIter.attributes.finishDate}`
);

// Query work items in current sprint
const wiql = {
  query: `
    SELECT [System.Id], [System.Title], [System.State],
           [System.AssignedTo], [System.WorkItemType],
           [Microsoft.VSTS.Scheduling.StoryPoints],
           [Microsoft.VSTS.Scheduling.RemainingWork]
    FROM WorkItems
    WHERE [System.TeamProject] = @project
      AND [System.IterationPath] = '${currentIter.path}'
      AND [System.WorkItemType] IN ('User Story', 'Bug', 'Task')
    ORDER BY [System.WorkItemType], [System.State]
  `,
};

const wiqlResp = await fetch(
  `${BASE_URL}/_apis/wit/wiql?api-version=7.1`,
  {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(wiql),
  }
);
const wiqlData = await wiqlResp.json();
const ids: number[] = wiqlData.workItems?.map(
  (wi: { id: number }) => wi.id
) ?? [];

if (ids.length === 0) {
  console.log("No work items in current sprint.");
  process.exit(0);
}

// Fetch work item details in batches of 200
const allItems: Array<Record<string, unknown>> = [];
for (let i = 0; i < ids.length; i += 200) {
  const batch = ids.slice(i, i + 200);
  const detailResp = await fetch(
    `${BASE_URL}/_apis/wit/workitems?ids=${batch.join(",")}&$expand=none&api-version=7.1`,
    { headers }
  );
  const detailData = await detailResp.json();
  allItems.push(...detailData.value);
}

// Build report
const lines: string[] = [];
lines.push(`# Sprint Report: ${currentIter.name}`);
lines.push("");
lines.push(
  `**Period**: ${currentIter.attributes.startDate} to ${currentIter.attributes.finishDate}`
);
lines.push(`**Team**: ${team}`);
lines.push(`**Total items**: ${allItems.length}`);
lines.push("");

// Summary counters
const byState: Record<string, number> = {};
const byType: Record<string, number> = {};
let totalPoints = 0;
let completedPoints = 0;

for (const item of allItems) {
  const f = item.fields as Record<string, unknown>;
  const state = (f["System.State"] as string) ?? "Unknown";
  const type = (f["System.WorkItemType"] as string) ?? "Unknown";
  const points = (f["Microsoft.VSTS.Scheduling.StoryPoints"] as number) ?? 0;

  byState[state] = (byState[state] ?? 0) + 1;
  byType[type] = (byType[type] ?? 0) + 1;
  totalPoints += points;
  if (state === "Closed" || state === "Done") completedPoints += points;
}

lines.push("## Summary");
lines.push("");
lines.push("| Metric | Value |");
lines.push("|---|---|");
lines.push(`| Total story points | ${totalPoints} |`);
lines.push(`| Completed points | ${completedPoints} |`);
lines.push(
  `| Completion rate | ${totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0}% |`
);
lines.push("");

lines.push("### By State");
lines.push("");
lines.push("| State | Count |");
lines.push("|---|---|");
for (const [state, count] of Object.entries(byState).sort()) {
  lines.push(`| ${state} | ${count} |`);
}
lines.push("");

lines.push("### By Type");
lines.push("");
lines.push("| Type | Count |");
lines.push("|---|---|");
for (const [type, count] of Object.entries(byType).sort()) {
  lines.push(`| ${type} | ${count} |`);
}
lines.push("");

// Detailed table
lines.push("## Work Items");
lines.push("");
lines.push("| ID | Type | Title | State | Assigned To | Points |");
lines.push("|---|---|---|---|---|---|");

for (const item of allItems) {
  const f = item.fields as Record<string, unknown>;
  const id = item.id;
  const type = f["System.WorkItemType"] ?? "";
  const title = f["System.Title"] ?? "";
  const state = f["System.State"] ?? "";
  const assigned =
    (f["System.AssignedTo"] as Record<string, unknown>)?.displayName ?? "Unassigned";
  const points = f["Microsoft.VSTS.Scheduling.StoryPoints"] ?? "-";
  lines.push(`| ${id} | ${type} | ${title} | ${state} | ${assigned} | ${points} |`);
}

const report = lines.join("\n") + "\n";
writeFileSync(output!, report);
console.log(`\nReport written to ${output}`);
```

---

## Script 5: Stale Branch Cleanup

Finds and deletes branches with no commits in the last 90 days.

```bash
#!/usr/bin/env bash
# stale-branch-cleanup.sh — Find and delete branches with no commits in 90 days.
# Usage: ./stale-branch-cleanup.sh [--dry-run] [--days 90] [--org myorg] [--project myproj]
set -euo pipefail

DRY_RUN=false
STALE_DAYS=90
ORG=""
PROJECT=""
REPO=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)   DRY_RUN=true; shift ;;
    --days)      STALE_DAYS="$2"; shift 2 ;;
    --org)       ORG="$2"; shift 2 ;;
    --project)   PROJECT="$2"; shift 2 ;;
    --repo)      REPO="$2"; shift 2 ;;
    *)           echo "Unknown arg: $1"; exit 1 ;;
  esac
done

if [[ -z "$ORG" || -z "$PROJECT" ]]; then
  echo "Usage: $0 --org <org> --project <project> [--repo <repo>] [--dry-run] [--days 90]"
  exit 1
fi

# Configure defaults
az devops configure --defaults organization="https://dev.azure.com/$ORG" project="$PROJECT"

# Get repository ID if not specified
if [[ -z "$REPO" ]]; then
  REPO=$(az repos list --query "[0].name" --output tsv)
  echo "Using repository: $REPO"
fi

CUTOFF_DATE=$(date -u -d "-${STALE_DAYS} days" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null \
  || date -u -v-${STALE_DAYS}d +%Y-%m-%dT%H:%M:%SZ)

echo "Finding branches with no commits since $CUTOFF_DATE..."
echo "Stale threshold: $STALE_DAYS days"
echo "Dry run: $DRY_RUN"
echo ""

# Protected branch patterns (never delete these)
PROTECTED_PATTERNS=("refs/heads/main" "refs/heads/master" "refs/heads/develop" "refs/heads/release/*")

is_protected() {
  local branch="$1"
  for pattern in "${PROTECTED_PATTERNS[@]}"; do
    if [[ "$branch" == $pattern ]]; then
      return 0
    fi
  done
  return 1
}

# List all branches
BRANCHES=$(az repos ref list \
  --repository "$REPO" \
  --filter "heads/" \
  --query "[].{name:name, objectId:objectId}" \
  --output tsv)

STALE_COUNT=0
TOTAL_COUNT=0

while IFS=$'\t' read -r BRANCH_NAME OBJECT_ID; do
  [[ -z "$BRANCH_NAME" ]] && continue
  TOTAL_COUNT=$((TOTAL_COUNT + 1))

  # Skip protected branches
  if is_protected "$BRANCH_NAME"; then
    continue
  fi

  # Get last commit date
  SHORT_REF="${BRANCH_NAME#refs/heads/}"
  LAST_COMMIT_DATE=$(az repos ref list \
    --repository "$REPO" \
    --filter "heads/$SHORT_REF" \
    --query "[0].statuses[0].creationDate // ''" \
    --output tsv 2>/dev/null || echo "")

  # Fallback: use Git log for last commit date
  if [[ -z "$LAST_COMMIT_DATE" ]]; then
    COMMIT_INFO=$(az devops invoke \
      --area git --resource commits \
      --route-parameters \
        project="$PROJECT" \
        repositoryId="$REPO" \
      --query-parameters \
        "searchCriteria.itemVersion.version=$SHORT_REF" \
        "searchCriteria.\$top=1" \
      --query "value[0].committer.date" \
      --output tsv 2>/dev/null || echo "")
    LAST_COMMIT_DATE="$COMMIT_INFO"
  fi

  if [[ -z "$LAST_COMMIT_DATE" ]]; then
    echo "  SKIP  $SHORT_REF (could not determine last commit date)"
    continue
  fi

  if [[ "$LAST_COMMIT_DATE" < "$CUTOFF_DATE" ]]; then
    STALE_COUNT=$((STALE_COUNT + 1))

    if [[ "$DRY_RUN" == true ]]; then
      echo "  STALE $SHORT_REF (last commit: $LAST_COMMIT_DATE)"
    else
      echo "  DELETE $SHORT_REF (last commit: $LAST_COMMIT_DATE)"
      az repos ref delete \
        --name "$BRANCH_NAME" \
        --repository "$REPO" \
        --object-id "$OBJECT_ID" \
        --output none
    fi
  fi
done <<< "$BRANCHES"

echo ""
echo "Summary:"
echo "  Total branches: $TOTAL_COUNT"
echo "  Stale branches: $STALE_COUNT"
if [[ "$DRY_RUN" == true ]]; then
  echo "  (Dry run — no branches deleted)"
else
  echo "  Deleted: $STALE_COUNT"
fi
```
