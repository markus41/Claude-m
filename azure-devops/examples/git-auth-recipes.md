# Git Authentication Recipes

Step-by-step passwordless Git setup recipes for Azure DevOps Repos.
Each recipe includes prerequisites, commands, verification, and troubleshooting.

---

## Recipe 1: Developer Workstation (Windows)

Git Credential Manager (GCM) with Entra OAuth broker mode for seamless Windows desktop authentication.

### Prerequisites

- Windows 10/11
- Git for Windows 2.39+ (includes GCM)
- Microsoft Entra account with Azure DevOps access

### Setup

```powershell
# 1. Verify GCM is installed
git credential-manager --version
# Expected: 2.5.x or later

# 2. Configure Entra OAuth with broker mode
git config --global credential.azreposCredentialType oauth
git config --global credential.msauthUseBroker true
git config --global credential.msauthUseDefaultAccount true

# 3. (Optional) Set the default Entra tenant to avoid tenant picker
git config --global credential.azureAuthority https://login.microsoftonline.com/<tenant-id>
```

### Verification

```powershell
# First clone triggers browser-based Entra authentication
git clone https://dev.azure.com/myorg/myproject/_git/myrepo

# Subsequent operations use cached token silently
cd myrepo
git pull
```

### Troubleshooting

| Symptom | Fix |
|---|---|
| Prompted every time | Run `git credential-manager diagnose` and check token cache |
| Wrong account selected | Clear cache: `git credential-manager erase` then re-auth |
| MFA loop | Ensure conditional access allows the device; check device compliance |
| `broker not available` | Update GCM: `git credential-manager upgrade` |

---

## Recipe 2: Developer Workstation (macOS / Linux)

GCM with OS credential store or SSH key authentication.

### Option A: GCM with OS Credential Store

```bash
# macOS — install via Homebrew
brew install git-credential-manager
git-credential-manager configure

# Linux — install from .deb/.rpm
# Download from https://github.com/git-ecosystem/git-credential-manager/releases
sudo dpkg -i gcm-linux_amd64.*.deb
git-credential-manager configure

# Configure credential store
# macOS: keychain is default, no extra config needed
# Linux: use secretservice (GNOME Keyring) or GPG
git config --global credential.credentialStore secretservice  # Linux with GNOME
# git config --global credential.credentialStore gpg           # headless Linux

# Configure Entra OAuth
git config --global credential.azreposCredentialType oauth
```

### Option B: SSH Key

```bash
# 1. Generate Ed25519 key
ssh-keygen -t ed25519 -C "user@example.com" -f ~/.ssh/azdo_ed25519

# 2. Add to SSH agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/azdo_ed25519

# 3. Copy public key
cat ~/.ssh/azdo_ed25519.pub | pbcopy    # macOS
# cat ~/.ssh/azdo_ed25519.pub | xclip   # Linux

# 4. Add to Azure DevOps
#    User Settings > SSH Public Keys > Add
#    Paste the copied public key

# 5. Configure SSH host (optional, avoids port issues)
cat >> ~/.ssh/config << 'EOF'
Host ssh.dev.azure.com
  IdentityFile ~/.ssh/azdo_ed25519
  IdentitiesOnly yes
EOF

# 6. Clone via SSH
git clone git@ssh.dev.azure.com:v3/myorg/myproject/myrepo
```

### Verification

```bash
# GCM: first clone opens browser
git clone https://dev.azure.com/myorg/myproject/_git/myrepo

# SSH: test connectivity
ssh -T git@ssh.dev.azure.com
# Expected: "remote: Shell access is not supported."
```

### Troubleshooting

| Symptom | Fix |
|---|---|
| `secretservice` errors on Linux | Install `gnome-keyring` and start the daemon |
| SSH `Permission denied` | Verify key is added: `ssh-add -l`; check key in DevOps portal |
| `unable to access` HTTPS | Check proxy: `git config --global http.proxy` |

---

## Recipe 3: CI/CD Pipeline (Workload Identity Federation)

Passwordless authentication in Azure Pipelines using Workload Identity Federation (WIF).

### Prerequisites

- Azure DevOps service connection with WIF (Entra app registration with federated credential)
- Pipeline uses `AzureCLI@2` or `AzurePowerShell@5` tasks

### Setup

1. **Create the service connection** with Workload Identity Federation in Project Settings > Service Connections > New > Azure Resource Manager > Workload Identity Federation (automatic).

2. **Pipeline YAML**:

```yaml
# azure-pipelines.yml
pool:
  vmImage: "ubuntu-latest"

steps:
  - task: AzureCLI@2
    displayName: "Clone repo using federated identity"
    inputs:
      azureSubscription: "WIF-ServiceConnection"
      scriptType: bash
      addSpnToEnvironment: true
      scriptLocation: inlineScript
      inlineScript: |
        # Get access token for Azure DevOps
        AZDO_TOKEN=$(az account get-access-token \
          --resource 499b84ac-1321-427f-aa17-267ca6975798 \
          --query accessToken --output tsv)

        # Configure Git to use the token
        git config --global http.extraHeader "Authorization: Bearer $AZDO_TOKEN"

        # Clone another repo
        git clone https://dev.azure.com/myorg/myproject/_git/shared-lib

        # Clean up header after use
        git config --global --unset http.extraHeader
```

### Verification

- Pipeline should complete without PAT or stored credentials.
- Check the service connection shows "Workload Identity Federation" under authentication scheme.

### Troubleshooting

| Symptom | Fix |
|---|---|
| `AADSTS700024` federated credential error | Check subject/issuer match in Entra app federated credentials |
| Token scope insufficient | Resource must be `499b84ac-1321-427f-aa17-267ca6975798` (Azure DevOps) |
| `TF401019: unauthorized` | Verify the app's service principal has access to the Azure DevOps org |

---

## Recipe 4: GitHub Actions (Federated)

OIDC federation from GitHub Actions to Azure DevOps without storing secrets.

### Prerequisites

- Entra app registration with federated credential for GitHub Actions
- Azure DevOps org connected to the Entra tenant

### Setup

1. **Create Entra app with federated credential**:

```bash
# Create app registration
az ad app create --display-name "GitHub-Actions-AzDO"
APP_ID=$(az ad app list --display-name "GitHub-Actions-AzDO" --query "[0].appId" -o tsv)

# Create service principal
az ad sp create --id "$APP_ID"

# Add federated credential for GitHub
az ad app federated-credential create --id "$APP_ID" --parameters '{
  "name": "github-main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:myorg/myrepo:ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}'
```

2. **Grant Azure DevOps access**: Add the service principal to the Azure DevOps organization with appropriate permissions.

3. **GitHub Actions workflow**:

```yaml
# .github/workflows/sync.yml
name: Sync to Azure DevOps
on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Azure Login (OIDC)
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Clone Azure DevOps repo
        run: |
          TOKEN=$(az account get-access-token \
            --resource 499b84ac-1321-427f-aa17-267ca6975798 \
            --query accessToken -o tsv)
          git clone -c http.extraHeader="Authorization: Bearer $TOKEN" \
            https://dev.azure.com/myorg/myproject/_git/target-repo
```

### Troubleshooting

| Symptom | Fix |
|---|---|
| OIDC token request fails | Ensure `permissions: id-token: write` is set |
| Federated credential mismatch | Subject must match exactly: `repo:org/repo:ref:refs/heads/main` |
| `az login` succeeds but DevOps token fails | SP must be added to Azure DevOps org |

---

## Recipe 5: Containerized Builds

Token injection via environment variable for builds running in containers.

### Pipeline-provided Token

```yaml
# azure-pipelines.yml
pool:
  vmImage: "ubuntu-latest"

container:
  image: myregistry.azurecr.io/build-image:latest
  endpoint: "ACR-ServiceConnection"

steps:
  - script: |
      # System.AccessToken is automatically available
      git config --global http.extraHeader \
        "Authorization: Bearer $(System.AccessToken)"

      # Clone another repository
      git clone https://dev.azure.com/myorg/myproject/_git/shared-lib

      # Run build commands using the cloned repo
      cd shared-lib && make build
    displayName: "Clone and build"
    env:
      SYSTEM_ACCESSTOKEN: $(System.AccessToken)
```

### Docker-in-Docker Builds

```yaml
steps:
  - task: Docker@2
    displayName: "Build in container"
    inputs:
      command: build
      Dockerfile: Dockerfile
      arguments: >-
        --build-arg GIT_TOKEN=$(System.AccessToken)
    env:
      SYSTEM_ACCESSTOKEN: $(System.AccessToken)
```

```dockerfile
# Dockerfile
FROM node:20 AS builder
ARG GIT_TOKEN
RUN git config --global http.extraHeader "Authorization: Bearer ${GIT_TOKEN}" && \
    git clone https://dev.azure.com/myorg/myproject/_git/shared-lib /shared && \
    git config --global --unset http.extraHeader
WORKDIR /app
COPY . .
RUN npm ci && npm run build
```

### Troubleshooting

| Symptom | Fix |
|---|---|
| `System.AccessToken` is empty | Add `env: SYSTEM_ACCESSTOKEN: $(System.AccessToken)` to the step |
| Token lacks repo access | Check "Allow scripts to access the OAuth token" in pipeline settings or `job.pool` settings |
| Token scope too narrow | By default, scoped to current project. For cross-project, set "Limit job authorization scope" to off in org settings |

---

## Recipe 6: Managed Identity (Azure VM / Container)

Use Azure Managed Identity for Git operations from Azure-hosted compute.

### Prerequisites

- Azure VM, Container Instance, or App Service with system-assigned or user-assigned managed identity
- Managed identity granted access to Azure DevOps organization

### Setup

1. **Grant the managed identity access to Azure DevOps**:

```bash
# Get the managed identity's object ID
MI_OBJECT_ID=$(az vm identity show \
  --resource-group myRG \
  --name myVM \
  --query principalId -o tsv)

# Add the service principal to the Azure DevOps organization
# This must be done via the Azure DevOps portal:
#   Organization Settings > Users > Add > paste the MI's Application (client) ID
```

2. **Acquire token and use Git on the VM**:

```bash
#!/usr/bin/env bash
# git-with-managed-identity.sh
set -euo pipefail

# Acquire token for Azure DevOps using managed identity
# Resource: 499b84ac-1321-427f-aa17-267ca6975798 = Azure DevOps
TOKEN=$(curl -s -H "Metadata: true" \
  "http://169.254.169.254/metadata/identity/oauth2/token?\
api-version=2018-02-01&\
resource=499b84ac-1321-427f-aa17-267ca6975798" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Configure Git
git config --global http.extraHeader "Authorization: Bearer $TOKEN"

# Clone and operate
git clone https://dev.azure.com/myorg/myproject/_git/myrepo
cd myrepo
git pull

# Clean up
git config --global --unset http.extraHeader
```

### For Azure Container Instances / App Service

```bash
# Use the Azure Identity SDK instead of IMDS directly
# Python example:
python3 -c "
from azure.identity import ManagedIdentityCredential
cred = ManagedIdentityCredential()
token = cred.get_token('499b84ac-1321-427f-aa17-267ca6975798/.default')
print(token.token)
"
```

### Verification

```bash
# Test from the VM
curl -s -H "Metadata: true" \
  "http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=499b84ac-1321-427f-aa17-267ca6975798" \
  | python3 -c "import sys,json; t=json.load(sys.stdin); print('Token acquired, expires:', t['expires_on'])"
```

### Troubleshooting

| Symptom | Fix |
|---|---|
| `IMDS` returns 400 | Managed identity not enabled on the resource |
| Token acquired but Git fails | MI not added to Azure DevOps org as a user |
| User-assigned MI not picked up | Pass `client_id` to IMDS: `&client_id=<mi-client-id>` |
| Token expired mid-operation | Tokens are valid for ~1 hour; re-acquire before long operations |
