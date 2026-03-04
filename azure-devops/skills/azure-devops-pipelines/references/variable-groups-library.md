# Azure DevOps Variable Groups and Library Reference

## Overview

Variable groups store collections of variables that can be shared across multiple pipelines. They support plain-text variables, secret variables, and Azure Key Vault-linked variables. The pipeline library also includes secure files for certificates, provisioning profiles, and SSH keys. This reference covers CRUD operations, Key Vault integration, secure files, permissions, and pipeline authorization.

---

## REST API Endpoints

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/_apis/distributedtask/variablegroups?api-version=7.1` | Variable Groups (Read) | `groupName`, `$top`, `continuationToken` | List variable groups |
| GET | `/_apis/distributedtask/variablegroups/{groupId}?api-version=7.1` | Variable Groups (Read) | — | Get variable group details |
| POST | `/_apis/distributedtask/variablegroups?api-version=7.1` | Variable Groups (Read & Write) | Body: full group definition | Create variable group |
| PUT | `/_apis/distributedtask/variablegroups/{groupId}?api-version=7.1` | Variable Groups (Read & Write) | Body: full group definition | Update variable group (replace) |
| DELETE | `/_apis/distributedtask/variablegroups/{groupId}?api-version=7.1` | Variable Groups (Read & Write) | — | Delete variable group |
| GET | `/_apis/distributedtask/securefiles?api-version=7.1` | Secure Files (Read) | `namePattern`, `$top` | List secure files |
| POST | `/_apis/distributedtask/securefiles?api-version=7.1` | Secure Files (Read & Write) | Body: multipart/form-data | Upload secure file |
| GET | `/_apis/distributedtask/securefiles/{fileId}?api-version=7.1` | Secure Files (Read) | — | Get secure file metadata |
| DELETE | `/_apis/distributedtask/securefiles/{fileId}?api-version=7.1` | Secure Files (Read & Write) | — | Delete secure file |

---

## Creating a Variable Group

### Plain-Text Variables

```typescript
import axios from "axios";

const ORG = "myorg";
const PROJECT = "myproject";
const PAT = process.env.ADO_PAT!;
const auth = Buffer.from(`:${PAT}`).toString("base64");
const BASE = `https://dev.azure.com/${ORG}/${PROJECT}/_apis/distributedtask`;
const HEADERS = {
  Authorization: `Basic ${auth}`,
  "Content-Type": "application/json",
};

async function createVariableGroup(name: string) {
  const body = {
    name,
    description: "Build configuration variables",
    type: "Vsts",
    variables: {
      buildConfiguration: {
        value: "Release",
        isSecret: false,
      },
      apiBaseUrl: {
        value: "https://api.example.com",
        isSecret: false,
      },
      apiKey: {
        value: "sk-abc123",
        isSecret: true,    // Marked as secret — value masked in logs
      },
    },
    variableGroupProjectReferences: [
      {
        projectReference: {
          id: "<project-guid>",
          name: PROJECT,
        },
        name,
        description: "Build configuration variables",
      },
    ],
  };

  const response = await axios.post(
    `${BASE}/variablegroups?api-version=7.1`,
    body,
    { headers: HEADERS }
  );

  return response.data;
}
```

### Secret Variables

| Property | Value | Behavior |
|----------|-------|----------|
| `isSecret: false` | Plain text | Value visible in UI, API responses, and logs |
| `isSecret: true` | Secret | Value masked in logs (`***`), not returned by GET API, UI shows dots |

**Important**: Once a variable is marked as secret, you cannot retrieve its value via the API. You can only update it by setting a new value.

---

## Azure Key Vault-Linked Variable Groups

Link a variable group to an Azure Key Vault to dynamically fetch secrets at pipeline runtime.

### Create Key Vault-Linked Group

```json
POST /_apis/distributedtask/variablegroups?api-version=7.1
{
  "name": "Production-Secrets",
  "description": "Secrets from Azure Key Vault",
  "type": "AzureKeyVault",
  "variables": {},
  "providerData": {
    "serviceEndpointId": "<azure-service-connection-id>",
    "vault": "my-keyvault-name",
    "lastRefreshedOn": ""
  },
  "variableGroupProjectReferences": [
    {
      "projectReference": {
        "id": "<project-guid>",
        "name": "myproject"
      },
      "name": "Production-Secrets",
      "description": "Secrets from Azure Key Vault"
    }
  ]
}
```

### How Key Vault Integration Works

1. The variable group references a Key Vault via an Azure service connection.
2. At pipeline queue time, Azure DevOps fetches the selected secrets from Key Vault.
3. Secrets are injected as pipeline variables with `isSecret: true`.
4. You select which Key Vault secrets to expose — not all secrets are automatically included.

### Key Vault Variable Selection

After creating the linked group, select secrets via the UI or update the `variables` field:

```json
PUT /_apis/distributedtask/variablegroups/{groupId}?api-version=7.1
{
  "name": "Production-Secrets",
  "type": "AzureKeyVault",
  "variables": {
    "database-connection-string": {
      "isSecret": true,
      "value": null,
      "contentType": ""
    },
    "api-signing-key": {
      "isSecret": true,
      "value": null,
      "contentType": ""
    }
  },
  "providerData": {
    "serviceEndpointId": "<azure-service-connection-id>",
    "vault": "my-keyvault-name"
  }
}
```

---

## Using Variable Groups in YAML

```yaml
variables:
  - group: Build-Config              # Plain-text variable group
  - group: Production-Secrets        # Key Vault-linked group
  - name: additionalVar              # Inline variable
    value: myValue

steps:
  - script: echo "Config: $(buildConfiguration)"
  - script: ./deploy.sh
    env:
      API_KEY: $(apiKey)                          # Secret: map to env var
      DB_CONN: $(database-connection-string)      # Key Vault secret
```

### Conditional Variable Group Inclusion

```yaml
variables:
  - ${{ if eq(variables['Build.SourceBranch'], 'refs/heads/main') }}:
    - group: Production-Secrets
  - ${{ else }}:
    - group: Staging-Secrets
```

---

## Secure Files Library

Secure files store binary files (certificates, SSH keys, provisioning profiles) that can be downloaded during pipeline execution.

### Upload a Secure File

```bash
# Via REST API (multipart upload)
curl -X POST \
  "https://dev.azure.com/myorg/myproject/_apis/distributedtask/securefiles?api-version=7.1&name=my-certificate.pfx" \
  -H "Authorization: Basic $(echo -n ":$ADO_PAT" | base64)" \
  -F "file=@my-certificate.pfx"
```

### Use Secure Files in Pipeline

```yaml
steps:
  - task: DownloadSecureFile@1
    name: sslCert
    inputs:
      secureFile: my-certificate.pfx
      retryCount: 3

  - script: |
      echo "Certificate downloaded to: $(sslCert.secureFilePath)"
      cp $(sslCert.secureFilePath) /etc/ssl/certs/
    displayName: Install certificate

  # iOS provisioning profile
  - task: InstallAppleProvisioningProfile@1
    inputs:
      provisioningProfileLocation: secureFiles
      provProfileSecureFile: my-app.mobileprovision

  # SSH key
  - task: InstallSSHKey@0
    inputs:
      knownHostsEntry: $(knownHosts)
      sshKeySecureFile: deploy_key
      sshPublicKey: $(sshPublicKey)
```

### Secure File Properties

| Property | Description |
|----------|-------------|
| `name` | File name (used to reference in YAML) |
| `id` | GUID for API operations |
| `properties.authorizedPipelines` | Pipelines authorized to use this file |

---

## Variable Group Permissions

| Role | Capabilities |
|------|-------------|
| Reader | View variable group names and non-secret values |
| User | Read + use in pipelines |
| Creator | User + create new variable groups |
| Administrator | Full management including deletion |

### Pipeline Authorization

Variable groups are "protected resources" — each pipeline must be explicitly authorized to use them.

```yaml
# First use of a variable group in a pipeline triggers an authorization prompt
# Or pre-authorize via REST:
POST /_apis/pipelines/pipelinepermissions/variablegroup/{groupId}?api-version=7.1-preview
{
  "pipelines": [
    { "id": 42, "authorized": true },
    { "id": 43, "authorized": true }
  ]
}
```

### Open Access (All Pipelines)

```json
PATCH /_apis/pipelines/pipelinepermissions/variablegroup/{groupId}?api-version=7.1-preview
{
  "allPipelines": {
    "authorized": true
  }
}
```

---

## CLI Commands

```bash
# List variable groups
az pipelines variable-group list --output table

# Create a variable group
az pipelines variable-group create \
  --name "Build-Config" \
  --variables buildConfiguration=Release apiBaseUrl=https://api.example.com

# Add a variable (including secrets)
az pipelines variable-group variable create \
  --group-id 1 \
  --name apiKey \
  --value "sk-abc123" \
  --secret true

# Update a variable
az pipelines variable-group variable update \
  --group-id 1 \
  --name apiBaseUrl \
  --value "https://api-v2.example.com"

# Delete a variable group
az pipelines variable-group delete --group-id 1 --yes
```

---

## Error Codes

| Error | Meaning | Remediation |
|-------|---------|-------------|
| `VariableGroupNotFound` | Group ID or name not found | Verify group exists in project Library |
| `TF400813` | Unauthorized | Ensure PAT has Variable Groups (Read & Write) scope |
| `PipelineNotAuthorized` | Pipeline not authorized to use the variable group | Authorize via UI or REST API |
| `KeyVaultAccessDenied` | Service connection cannot access Key Vault | Verify RBAC: Key Vault Secrets User role |
| `SecretNotFound` | Key Vault secret name does not match | Check secret name in Key Vault matches variable group selection |
| `SecureFileNotFound` | Secure file not found or unauthorized | Verify file exists and pipeline is authorized |
| `VariableGroupAlreadyExists` | Duplicate name in project | Use a unique name or update the existing group |

---

## Common Patterns and Gotchas

**1. Variable group changes take effect on next run**
Updating a variable group value does not affect in-flight pipeline runs. Values are captured at queue time.

**2. Key Vault secrets must be individually selected**
Creating a Key Vault-linked group does not automatically include all secrets. You must select each secret to expose.

**3. Secret variables cannot be read back via API**
Once marked `isSecret: true`, the value is write-only. GET responses return `null` for the value field.

**4. Variable names with hyphens become environment variables with underscores**
Key Vault secret `my-api-key` becomes environment variable `MY_API_KEY` in pipeline steps (hyphens replaced with underscores, uppercased).

**5. Secure files are project-scoped and require per-pipeline authorization**
Like variable groups, secure files are protected resources. Each pipeline must be explicitly authorized.

**6. Key Vault refresh happens at queue time**
If a Key Vault secret is rotated, existing pipeline runs use the old value. Only new runs pick up the rotated secret.
