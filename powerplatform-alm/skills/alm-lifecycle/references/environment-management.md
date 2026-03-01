# Environment Management

## Overview

Power Platform environments are isolated containers with their own Dataverse database, security boundary, apps, and flows. Effective ALM requires provisioning and managing environments for each stage of the development lifecycle — Development, Test/QA, UAT/Staging, and Production.

Environment management is performed through three primary interfaces:
1. **Power Platform Admin Center** (UI) — `https://admin.powerplatform.microsoft.com`
2. **Power Platform Admin API** (REST) — programmatic management
3. **PAC CLI** — command-line developer tool

## Admin API

### Base URL

```
https://api.bap.microsoft.com/providers/Microsoft.BusinessAppPlatform/
```

All API calls require an OAuth 2.0 bearer token with appropriate admin permissions. The token audience is `https://api.bap.microsoft.com/`.

### Authentication

Obtain a token using the MSAL library or Azure CLI:

```typescript
import { ConfidentialClientApplication } from "@azure/msal-node";

const msalConfig = {
  auth: {
    clientId: process.env.CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
    clientSecret: process.env.CLIENT_SECRET!,
  },
};

const cca = new ConfidentialClientApplication(msalConfig);
const tokenResponse = await cca.acquireTokenByClientCredential({
  scopes: ["https://api.bap.microsoft.com/.default"],
});
const accessToken = tokenResponse?.accessToken;
```

### Create Environment

**POST** `/scopes/admin/environments`

```typescript
interface CreateEnvironmentRequest {
  location: string; // e.g., "unitedstates", "europe", "asia"
  properties: {
    displayName: string;
    environmentSku: "Sandbox" | "Production" | "Trial" | "Developer";
    linkedEnvironmentMetadata: {
      domainName: string; // becomes {domainName}.crm.dynamics.com
      templates: string[]; // e.g., ["D365_CDSSampleApp"] or []
      baseLanguage: number; // LCID, e.g., 1033 for English
      currency: {
        code: string; // e.g., "USD"
      };
      securityGroupId?: string; // Azure AD security group to restrict access
    };
  };
}

async function createEnvironment(
  accessToken: string,
  request: CreateEnvironmentRequest
): Promise<string> {
  const response = await fetch(
    "https://api.bap.microsoft.com/providers/Microsoft.BusinessAppPlatform/scopes/admin/environments?api-version=2021-04-01",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Create environment failed: ${response.status} — ${errorBody}`);
  }

  const result = await response.json();
  return result.name; // environment ID (GUID)
}
```

**Example call:**

```typescript
const envId = await createEnvironment(accessToken, {
  location: "unitedstates",
  properties: {
    displayName: "Contoso Dev",
    environmentSku: "Sandbox",
    linkedEnvironmentMetadata: {
      domainName: "contoso-dev",
      templates: [],
      baseLanguage: 1033,
      currency: { code: "USD" },
    },
  },
});
console.log(`Created environment: ${envId}`);
```

### Copy Environment

**POST** `/scopes/admin/environments/{environmentId}/copyEnvironment`

Copy types:
- **MinimalCopy** — schema only (tables, security roles, customizations) without data rows
- **FullCopy** — schema plus all data rows, attachments, and audit logs

```typescript
interface CopyEnvironmentRequest {
  sourceEnvironmentId: string;
  targetEnvironmentName: string;
  copyType: "MinimalCopy" | "FullCopy";
  targetSecurityGroupId?: string;
}

async function copyEnvironment(
  accessToken: string,
  sourceEnvId: string,
  request: CopyEnvironmentRequest
): Promise<void> {
  const response = await fetch(
    `https://api.bap.microsoft.com/providers/Microsoft.BusinessAppPlatform/scopes/admin/environments/${sourceEnvId}/copyEnvironment?api-version=2021-04-01`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    throw new Error(`Copy environment failed: ${response.status}`);
  }
}
```

### Reset Environment

**POST** `/scopes/admin/environments/{environmentId}/resetEnvironment`

Resetting removes all data and customizations, restoring the environment to a clean state. Only Sandbox environments can be reset.

```typescript
interface ResetEnvironmentRequest {
  properties: {
    displayName: string;
    linkedEnvironmentMetadata: {
      domainName: string;
      baseLanguage: number;
      currency: { code: string };
      templates: string[];
    };
  };
}

async function resetEnvironment(
  accessToken: string,
  envId: string,
  request: ResetEnvironmentRequest
): Promise<void> {
  const response = await fetch(
    `https://api.bap.microsoft.com/providers/Microsoft.BusinessAppPlatform/scopes/admin/environments/${envId}/resetEnvironment?api-version=2021-04-01`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    throw new Error(`Reset environment failed: ${response.status}`);
  }
}
```

### Delete Environment

**DELETE** `/scopes/admin/environments/{environmentId}`

Always consider taking a backup before deleting. Deletion is permanent.

```typescript
async function deleteEnvironment(
  accessToken: string,
  envId: string
): Promise<void> {
  const response = await fetch(
    `https://api.bap.microsoft.com/providers/Microsoft.BusinessAppPlatform/scopes/admin/environments/${envId}?api-version=2021-04-01`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Delete environment failed: ${response.status}`);
  }
}
```

### List Environments

**GET** `/scopes/admin/environments`

Returns all environments the authenticated principal has access to.

```typescript
interface EnvironmentListResponse {
  value: Array<{
    name: string; // environment ID (GUID)
    properties: {
      displayName: string;
      environmentType: string;
      states: { management: { id: string } };
      linkedEnvironmentMetadata?: {
        instanceUrl: string;
        domainName: string;
        version: string;
      };
      capacity?: Array<{
        capacityType: string;
        actualConsumption: number;
        maxCapacityAllowed: number;
      }>;
    };
  }>;
}

async function listEnvironments(
  accessToken: string
): Promise<EnvironmentListResponse> {
  const response = await fetch(
    "https://api.bap.microsoft.com/providers/Microsoft.BusinessAppPlatform/scopes/admin/environments?api-version=2021-04-01",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`List environments failed: ${response.status}`);
  }

  return response.json();
}
```

## PAC CLI Equivalents

The PAC CLI provides streamlined commands for environment management:

### Create Environment

```bash
pac env create --name "Contoso Dev" --type Sandbox --domain "contoso-dev" --region unitedstates --language 1033 --currency USD
```

Parameters:
- `--name` — display name
- `--type` — Sandbox, Production, Trial, Developer
- `--domain` — subdomain for the environment URL
- `--region` — geographic region (unitedstates, europe, asia, australia, etc.)
- `--language` — base language LCID (1033 = English US)
- `--currency` — ISO currency code

### List Environments

```bash
pac env list
```

Output includes environment ID, display name, URL, type, and organization ID. Add `--filter` for filtering:

```bash
pac env list --filter "Dev"
```

### Select Active Environment

```bash
pac env select --env "contoso-dev"
# or by environment ID
pac env select --env "00000000-0000-0000-0000-000000000001"
```

### Copy Environment

```bash
pac env copy --source-env "contoso-dev" --target-env "contoso-test" --type MinimalCopy
```

### Reset Environment

```bash
pac env reset --env "contoso-test" --domain "contoso-test" --language 1033 --currency USD
```

### Delete Environment

```bash
pac env delete --env "contoso-sandbox"
```

### Backup and Restore

```bash
pac env backup create --env "contoso-prod" --label "Pre-release backup"
pac env backup list --env "contoso-prod"
pac env backup restore --env "contoso-prod" --backup-id "00000000-0000-0000-0000-000000000001" --target-env "contoso-restore"
```

## Admin Roles

Environment management requires one of these Entra ID roles:

| Role | Scope | Capabilities |
|------|-------|-------------|
| **Global Administrator** | Tenant-wide | Full control over all environments |
| **Power Platform Administrator** | All environments | Create, delete, copy, reset; manage settings; view capacity |
| **Dynamics 365 Administrator** | All environments | Same as Power Platform Admin for Dynamics environments |
| **Environment Admin** | Specific environment | Manage settings, users, security within one environment |
| **System Administrator** | Specific environment | Full Dataverse access within one environment |

For service principal (app registration) access, the application user must be assigned the **System Administrator** security role in each target environment.

## Capacity Management

Each tenant has capacity allocations across three categories:

| Capacity Type | Description | Default per User License |
|---------------|-------------|------------------------|
| **Database** | Dataverse table row storage | 1 GB base + per-user allocation |
| **File** | Attachments, images, notes | 2 GB base + per-user allocation |
| **Log** | Audit logs, plugin trace logs | 2 GB base + per-user allocation |

Monitor capacity in the Admin Center under **Resources → Capacity**. Exceeding capacity limits prevents creating new environments and may throttle existing ones.

Add-on capacity packs are available:
- Database: 1 GB increments
- File: 1 GB increments
- Log: 1 GB increments

### Checking Capacity via API

```typescript
async function getCapacity(
  accessToken: string,
  envId: string
): Promise<void> {
  const envData = await fetch(
    `https://api.bap.microsoft.com/providers/Microsoft.BusinessAppPlatform/scopes/admin/environments/${envId}?api-version=2021-04-01&$expand=properties.capacity`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const env = await envData.json();
  const capacities = env.properties.capacity;

  for (const cap of capacities) {
    console.log(
      `${cap.capacityType}: ${cap.actualConsumption}/${cap.maxCapacityAllowed} MB`
    );
  }
}
```

## Environment Settings

Key settings configurable per environment:

| Setting | Description | API Field |
|---------|-------------|-----------|
| Display Name | Human-readable name | `properties.displayName` |
| Domain | URL subdomain | `linkedEnvironmentMetadata.domainName` |
| Security Group | Restrict access to AD group members | `properties.securityGroupId` |
| Base Language | Default language | `linkedEnvironmentMetadata.baseLanguage` |
| Currency | Transaction currency | `linkedEnvironmentMetadata.currency` |
| Admin Mode | Restrict access to admins only | `properties.states.runtime.id = AdminMode` |
| Background Operations | Enable/disable async operations | `properties.states.runtime.id` |

### Enabling Admin Mode

Admin mode restricts environment access to System Administrators only — useful during deployments:

```bash
# Via PAC CLI — set admin mode
pac env update-settings --env "contoso-test" --admin-mode true

# Disable after deployment
pac env update-settings --env "contoso-test" --admin-mode false
```

## Managed Environments

Managed Environments is a premium governance feature that enables additional controls:

- **Solution checker enforcement** — automatically run solution checker on all imports and block solutions with Critical/High issues
- **Sharing limits** — restrict how widely canvas apps can be shared
- **Data policies** — enhanced DLP (Data Loss Prevention) policy enforcement
- **Weekly digest** — email summary of environment activity to admins
- **Maker welcome content** — custom onboarding message for makers entering the environment
- **IP firewall** — restrict Dataverse access to specific IP ranges (with Premium licensing)

Enable Managed Environments in the Power Platform Admin Center under the environment's settings page. This is recommended for all production and shared development environments.

## Geographic Regions

Power Platform environments are hosted in specific geographic regions. The region determines the data residency location and the Dataverse endpoint URL suffix:

| Region | URL Suffix | Region Code |
|--------|-----------|-------------|
| United States | `.crm.dynamics.com` | `unitedstates` |
| Europe (EMEA) | `.crm4.dynamics.com` | `europe` |
| United Kingdom | `.crm11.dynamics.com` | `unitedkingdom` |
| Asia Pacific | `.crm5.dynamics.com` | `asia` |
| Australia | `.crm6.dynamics.com` | `australia` |
| Japan | `.crm7.dynamics.com` | `japan` |
| Canada | `.crm3.dynamics.com` | `canada` |
| India | `.crm8.dynamics.com` | `india` |
| France | `.crm12.dynamics.com` | `france` |
| Germany | `.crm16.dynamics.com` | `germany` |
| Switzerland | `.crm17.dynamics.com` | `switzerland` |
| South America | `.crm2.dynamics.com` | `southamerica` |
| Government (GCC) | `.crm9.dynamics.com` | `gcc` |

Choose the region closest to the majority of users for the best latency. Note that cross-region data movement may have compliance implications under GDPR and other data sovereignty regulations.

## Application User Setup for CI/CD

For automated pipelines, create an Application User in each target environment:

1. Navigate to the Power Platform Admin Center → environment → Settings → Users + permissions → Application users
2. Click "New app user" and select the registered app from Entra ID
3. Select a Business Unit (typically the root BU)
4. Assign the **System Administrator** security role
5. The Application User can now authenticate using client credentials (client ID + secret + tenant ID)

Alternatively, use PAC CLI to verify the connection:

```bash
pac auth create --name Prod \
  --environment "https://contoso.crm.dynamics.com" \
  --applicationId "$CLIENT_ID" \
  --clientSecret "$CLIENT_SECRET" \
  --tenant "$TENANT_ID"

pac auth select --name Prod
pac org who
```

The `pac org who` command confirms the authenticated identity and environment details.

## Best Practices

1. **One environment per lifecycle stage** — never develop in production
2. **Use security groups** — restrict each environment to appropriate users
3. **Automate provisioning** — script environment creation for consistency
4. **Monitor capacity** — set alerts before hitting limits
5. **Enable admin mode during deployments** — prevent user access during imports
6. **Regular backups before major operations** — copy/reset/delete
7. **Use Managed Environments** — enables premium governance features (solution checker enforcement, sharing limits, DLP insights)
8. **Naming convention** — `{org}-{project}-{stage}` (e.g., `contoso-crm-dev`, `contoso-crm-test`, `contoso-crm-prod`)
9. **Developer environments for individual work** — free with Microsoft 365 Developer Plan, reset automatically
10. **Document environment topology** — maintain a map of environments, their purpose, and who owns them
