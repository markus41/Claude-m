# Security Recipes

Common security configurations and automation scripts for hardening Azure DevOps.

---

## Recipe 1: Branch Protection Matrix

Recommended branch policies by branch pattern.

### Policy Configuration

| Policy | `main` | `release/*` | `develop` | `feature/*` |
|---|---|---|---|---|
| Minimum reviewers | 2 | 2 | 1 | 0 |
| Reset on push | Yes | Yes | Yes | - |
| Allow requestors to approve | No | No | Yes | - |
| Build validation | Required | Required | Required | Optional |
| Comment resolution | Required | Required | Required | - |
| Merge strategy | Squash only | Merge (no fast-forward) | Squash only | Any |
| Work item linking | Required | Required | Optional | - |
| Path-based reviewers | Infra, Security | Infra, Security | - | - |
| Auto-complete | Disabled | Disabled | Allowed | Allowed |
| Status checks | SonarQube, tests | SonarQube, tests | Tests | - |

### CLI Setup for Main Branch

```bash
# Get repository ID
REPO_ID=$(az repos show --repository myrepo --query id --output tsv)

# Minimum reviewers
az repos policy approver-count create \
  --branch main \
  --repository-id "$REPO_ID" \
  --minimum-approver-count 2 \
  --creator-vote-counts false \
  --reset-on-source-push true \
  --blocking true \
  --enabled true

# Build validation
az repos policy build create \
  --branch main \
  --repository-id "$REPO_ID" \
  --build-definition-id 42 \
  --display-name "CI Build" \
  --queue-on-source-update-only true \
  --manual-queue-only false \
  --valid-duration 720 \
  --blocking true \
  --enabled true

# Comment resolution
az repos policy comment-required create \
  --branch main \
  --repository-id "$REPO_ID" \
  --blocking true \
  --enabled true

# Work item linking
az repos policy work-item-linking create \
  --branch main \
  --repository-id "$REPO_ID" \
  --blocking true \
  --enabled true

# Merge strategy (squash only)
az repos policy merge-strategy create \
  --branch main \
  --repository-id "$REPO_ID" \
  --allow-squash true \
  --allow-no-fast-forward false \
  --allow-rebase false \
  --allow-rebase-merge false \
  --blocking true \
  --enabled true
```

---

## Recipe 2: Least-Privilege Service Connections

Workload Identity Federation (WIF) setup with minimum RBAC roles per deployment scenario.

### Role Matrix

| Scenario | Azure RBAC Role | Scope |
|---|---|---|
| App Service deploy | Website Contributor | Resource group |
| AKS deploy | Azure Kubernetes Service Cluster User Role | Cluster |
| AKS namespace deploy | Azure Kubernetes Service RBAC Writer | Namespace |
| Terraform (plan only) | Reader | Subscription |
| Terraform (plan + apply) | Contributor | Resource group |
| Container Registry push | AcrPush | Registry |
| Key Vault read | Key Vault Secrets User | Vault |
| Storage deploy | Storage Blob Data Contributor | Storage account |

### WIF Service Connection Setup

```bash
# 1. Create Entra app registration
az ad app create --display-name "AzDO-Deploy-AppService"
APP_ID=$(az ad app list --display-name "AzDO-Deploy-AppService" --query "[0].appId" -o tsv)
OBJECT_ID=$(az ad app list --display-name "AzDO-Deploy-AppService" --query "[0].id" -o tsv)

# 2. Create service principal
az ad sp create --id "$APP_ID"
SP_OBJECT_ID=$(az ad sp list --filter "appId eq '$APP_ID'" --query "[0].id" -o tsv)

# 3. Assign minimum RBAC role (scoped to resource group)
az role assignment create \
  --assignee "$SP_OBJECT_ID" \
  --role "Website Contributor" \
  --scope "/subscriptions/<sub-id>/resourceGroups/<rg-name>"

# 4. Add federated credential for Azure DevOps
az ad app federated-credential create --id "$OBJECT_ID" --parameters '{
  "name": "azdo-sc-appservice",
  "issuer": "https://vstoken.dev.azure.com/<org-id>",
  "subject": "sc://<org>/<project>/<service-connection-name>",
  "audiences": ["api://AzureADTokenExchange"]
}'

# 5. Create the service connection in Azure DevOps
# Use Project Settings > Service Connections > New > Azure Resource Manager
# > Workload Identity Federation (manual)
# Enter: App (client) ID, Tenant ID, Subscription details
```

### Security Checklist

- [ ] Service connection is project-scoped (not organization-scoped)
- [ ] Per-pipeline authorization is enabled (not "Grant access to all pipelines")
- [ ] RBAC role uses the narrowest scope possible
- [ ] No client secrets or certificates stored (WIF only)
- [ ] Service connection description documents the intended use

---

## Recipe 3: PAT Rotation Automation

Detect expiring PATs, notify owners, and rotate service account PATs.

### Detection Script

```typescript
// pat-rotation-check.ts
// Queries PATs expiring within N days and sends notifications.
// Usage: npx tsx pat-rotation-check.ts --org myorg --warn-days 30

import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    org: { type: "string" },
    "warn-days": { type: "string", default: "30" },
    pat: { type: "string", default: process.env.AZURE_DEVOPS_PAT },
  },
});

const { org, pat } = values;
const warnDays = parseInt(values["warn-days"]!, 10);

if (!org || !pat) {
  console.error("Usage: --org <org> [--warn-days 30]");
  process.exit(1);
}

const AUTH = Buffer.from(`:${pat}`).toString("base64");
const now = new Date();
const warnDate = new Date(now.getTime() + warnDays * 24 * 60 * 60 * 1000);

// List PATs (requires full-scoped PAT with Token Administration scope)
const resp = await fetch(
  `https://vssps.dev.azure.com/${org}/_apis/tokens/pats?api-version=7.1-preview.1`,
  {
    headers: { Authorization: `Basic ${AUTH}` },
  }
);

if (!resp.ok) {
  console.error(`Failed to list PATs: ${resp.status}`);
  process.exit(1);
}

const data = await resp.json();
const pats = data.patTokens ?? [];

interface PatInfo {
  displayName: string;
  validTo: string;
  scope: string;
  authorizationId: string;
}

const expiring: PatInfo[] = [];
const expired: PatInfo[] = [];

for (const p of pats) {
  const validTo = new Date(p.validTo);
  if (validTo < now) {
    expired.push(p);
  } else if (validTo < warnDate) {
    expiring.push(p);
  }
}

console.log(`PAT Rotation Report for ${org}`);
console.log(`  Total PATs: ${pats.length}`);
console.log(`  Expired: ${expired.length}`);
console.log(`  Expiring within ${warnDays} days: ${expiring.length}`);
console.log("");

if (expiring.length > 0) {
  console.log("EXPIRING SOON:");
  for (const p of expiring) {
    console.log(`  - ${p.displayName} (expires: ${p.validTo}, scope: ${p.scope})`);
  }
}

if (expired.length > 0) {
  console.log("\nALREADY EXPIRED:");
  for (const p of expired) {
    console.log(`  - ${p.displayName} (expired: ${p.validTo})`);
  }
}
```

### Rotation Script

```bash
#!/usr/bin/env bash
# rotate-service-pat.sh — Regenerate a PAT and store in Key Vault.
set -euo pipefail

ORG="${1:?Usage: $0 <org> <pat-name> <keyvault-name>}"
PAT_NAME="${2:?Provide PAT display name}"
VAULT_NAME="${3:?Provide Key Vault name}"

SCOPE="vso.code_write vso.build_execute"
VALID_DAYS=90
EXPIRY=$(date -u -d "+${VALID_DAYS} days" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null \
  || date -u -v+${VALID_DAYS}d +%Y-%m-%dT%H:%M:%SZ)

echo "Creating new PAT: $PAT_NAME (expires: $EXPIRY)"

# Create new PAT via REST API
NEW_PAT=$(curl -s -X POST \
  "https://vssps.dev.azure.com/${ORG}/_apis/tokens/pats?api-version=7.1-preview.1" \
  -H "Authorization: Basic $(echo -n ":${AZURE_DEVOPS_PAT}" | base64)" \
  -H "Content-Type: application/json" \
  -d "{
    \"displayName\": \"${PAT_NAME}\",
    \"scope\": \"${SCOPE}\",
    \"validTo\": \"${EXPIRY}\",
    \"allOrgs\": false
  }" | python3 -c "import sys,json; print(json.load(sys.stdin)['patToken']['token'])")

# Store in Key Vault
az keyvault secret set \
  --vault-name "$VAULT_NAME" \
  --name "azdo-pat-${PAT_NAME}" \
  --value "$NEW_PAT" \
  --expires "$EXPIRY" \
  --output none

echo "PAT stored in Key Vault: azdo-pat-${PAT_NAME}"
```

---

## Recipe 4: Audit Log Queries

REST API and CLI queries for security-relevant events.

### Permission Changes

```bash
# Query audit log for permission changes in the last 7 days
az devops invoke \
  --area audit --resource auditlog \
  --route-parameters organizationId="$ORG" \
  --query-parameters \
    "startTime=$(date -u -d '-7 days' +%Y-%m-%dT%H:%M:%SZ)" \
    "endTime=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --query "decoratedAuditLogEntries[?contains(actionId, 'Security')]" \
  --output table
```

### REST API Query for Key Events

```typescript
// audit-query.ts
// Queries Azure DevOps audit log for security-relevant events.

const SECURITY_ACTIONS = [
  "Security.ModifyPermission",
  "Security.RemovePermission",
  "Policy.PolicyConfigModified",
  "Policy.PolicyConfigRemoved",
  "Git.RefUpdatePoliciesBypassed",
  "Token.PatCreateEvent",
  "Token.PatRevokeEvent",
  "Group.UpdateGroupMembership",
  "Project.AreaPathDelete",
];

async function queryAuditLog(
  org: string,
  pat: string,
  startTime: string
): Promise<void> {
  const AUTH = Buffer.from(`:${pat}`).toString("base64");
  const url = new URL(
    `https://auditservice.dev.azure.com/${org}/_apis/audit/auditlog`
  );
  url.searchParams.set("startTime", startTime);
  url.searchParams.set("api-version", "7.1");

  const resp = await fetch(url.toString(), {
    headers: { Authorization: `Basic ${AUTH}` },
  });

  const data = await resp.json();
  const entries = data.decoratedAuditLogEntries ?? [];

  const securityEvents = entries.filter((e: Record<string, string>) =>
    SECURITY_ACTIONS.some((action) => e.actionId?.includes(action))
  );

  console.log(`Found ${securityEvents.length} security events:`);
  for (const e of securityEvents) {
    console.log(
      `  [${e.timestamp}] ${e.actionId} by ${e.actorDisplayName}: ${e.details}`
    );
  }
}
```

### Key Audit Actions Reference

| Action ID | Description | Severity |
|---|---|---|
| `Security.ModifyPermission` | Permission changed on a resource | High |
| `Git.RefUpdatePoliciesBypassed` | Branch policy bypassed | Critical |
| `Policy.PolicyConfigRemoved` | Branch policy removed | High |
| `Token.PatCreateEvent` | New PAT created | Medium |
| `Group.UpdateGroupMembership` | Group membership changed | High |
| `Project.UpdateProjectVisibility` | Project visibility changed | Critical |
| `Extension.Installed` | Extension installed in org | Medium |

---

## Recipe 5: Conditional Access for DevOps

Entra Conditional Access policy examples targeting Azure DevOps (resource ID `499b84ac-1321-427f-aa17-267ca6975798`).

### Policy 1: Require MFA for Azure DevOps

```json
{
  "displayName": "Require MFA for Azure DevOps",
  "state": "enabled",
  "conditions": {
    "applications": {
      "includeApplications": [
        "499b84ac-1321-427f-aa17-267ca6975798"
      ]
    },
    "users": {
      "includeUsers": ["All"]
    }
  },
  "grantControls": {
    "operator": "OR",
    "builtInControls": ["mfa"]
  }
}
```

### Policy 2: Block Non-Compliant Devices

```json
{
  "displayName": "Block non-compliant devices from Azure DevOps",
  "state": "enabled",
  "conditions": {
    "applications": {
      "includeApplications": [
        "499b84ac-1321-427f-aa17-267ca6975798"
      ]
    },
    "users": {
      "includeUsers": ["All"],
      "excludeGroups": ["service-accounts-group-id"]
    },
    "platforms": {
      "includePlatforms": ["all"]
    }
  },
  "grantControls": {
    "operator": "OR",
    "builtInControls": ["compliantDevice"]
  }
}
```

### Policy 3: Restrict to Named Locations

```json
{
  "displayName": "Restrict Azure DevOps to trusted locations",
  "state": "enabled",
  "conditions": {
    "applications": {
      "includeApplications": [
        "499b84ac-1321-427f-aa17-267ca6975798"
      ]
    },
    "users": {
      "includeUsers": ["All"],
      "excludeGroups": ["emergency-access-group-id"]
    },
    "locations": {
      "includeLocations": ["All"],
      "excludeLocations": ["trusted-office-locations-id"]
    }
  },
  "grantControls": {
    "operator": "OR",
    "builtInControls": ["block"]
  }
}
```

### Deploy via Azure CLI

```bash
# Create a CA policy
az rest --method POST \
  --uri "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
  --headers "Content-Type=application/json" \
  --body @policy-require-mfa.json

# List existing policies targeting Azure DevOps
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
  --query "value[?contains(conditions.applications.includeApplications, '499b84ac-1321-427f-aa17-267ca6975798')].{name:displayName, state:state}" \
  --output table
```

---

## Recipe 6: Secret Scanning

Pipeline task configuration to scan repositories for leaked credentials.

### Using Microsoft Security DevOps

```yaml
# Secret scanning with Microsoft Security DevOps (includes CredScan)
steps:
  - task: MicrosoftSecurityDevOps@1
    displayName: "Run security scans"
    inputs:
      categories: "secrets"
      break: true
```

### Using Gitleaks

```yaml
# Secret scanning with Gitleaks
steps:
  - script: |
      # Install Gitleaks
      curl -sSfL https://github.com/gitleaks/gitleaks/releases/latest/download/gitleaks_8.18.4_linux_x64.tar.gz \
        | tar -xz -C /usr/local/bin gitleaks

      # Run scan
      gitleaks detect \
        --source="$(Build.SourcesDirectory)" \
        --report-path="$(Build.ArtifactStagingDirectory)/gitleaks-report.json" \
        --report-format=json \
        --no-git \
        --verbose
    displayName: "Gitleaks secret scan"
    continueOnError: false

  - task: PublishPipelineArtifact@1
    displayName: "Publish Gitleaks report"
    condition: failed()
    inputs:
      targetPath: "$(Build.ArtifactStagingDirectory)/gitleaks-report.json"
      artifact: "security-scan-results"
```

### Custom Gitleaks Config

```toml
# .gitleaks.toml — Place in repository root
title = "Custom Gitleaks config"

[allowlist]
  paths = [
    '''test/fixtures/''',
    '''docs/examples/''',
  ]

[[rules]]
  id = "azure-storage-key"
  description = "Azure Storage Account Key"
  regex = '''(?i)(?:DefaultEndpointsProtocol|AccountKey)\s*=\s*[A-Za-z0-9+/=]{44,}'''
  tags = ["azure", "storage"]

[[rules]]
  id = "azure-devops-pat"
  description = "Azure DevOps PAT"
  regex = '''(?i)[a-z2-7]{52}'''
  tags = ["azure-devops", "pat"]
  [rules.allowlist]
    regexes = ['''[a-f0-9]{52}''']  # exclude hex-only strings (SHA hashes)

[[rules]]
  id = "connection-string"
  description = "Generic connection string"
  regex = '''(?i)(?:connection[-_]?string|connstr)\s*[:=]\s*["']?[^\s"']{20,}'''
  tags = ["connection-string"]
```

### PR Comment on Findings

```yaml
steps:
  - script: |
      FINDINGS=$(gitleaks detect --source="$(Build.SourcesDirectory)" \
        --report-format=json --no-git 2>&1 | tail -1)
      if [ $? -ne 0 ]; then
        # Post PR comment with findings summary
        az repos pr update \
          --id $(System.PullRequest.PullRequestId) \
          --description "Secret scan found potential credential leaks. Review the Gitleaks report artifact."
      fi
    displayName: "Secret scan with PR feedback"
    condition: eq(variables['Build.Reason'], 'PullRequest')
```
