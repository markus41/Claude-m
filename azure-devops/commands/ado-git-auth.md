---
name: ado-git-auth
description: Configure passwordless Git authentication for Azure DevOps repositories
argument-hint: "--method gcm|ssh|managed-identity|wif [--org <organization>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Configure Git Authentication

Set up passwordless Git authentication for Azure DevOps repositories. Supports GCM OAuth, SSH keys, managed identity, and Workload Identity Federation.

## Prerequisites

- Git installed (`git --version`)
- Azure DevOps organization with at least one repository

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--method` | Yes | Auth method: `gcm`, `ssh`, `managed-identity`, `wif` |
| `--org` | No | Azure DevOps organization name |
| `--repo` | No | Test repository name for verification |

## Instructions

### Method A — Git Credential Manager (GCM) with OAuth

1. **Check GCM installed**: `git credential-manager --version`. If missing:
   - Windows: bundled with Git for Windows (2.39+)
   - macOS: `brew install --cask git-credential-manager`
   - Linux: download from [GCM releases](https://github.com/git-ecosystem/git-credential-manager/releases)

2. **Configure GCM**:
   ```bash
   git config --global credential.helper manager
   git config --global credential.azreposCredentialType oauth
   ```

3. **Set credential store** (Linux):
   ```bash
   git config --global credential.credentialStore secretservice
   # or: gpg, plaintext, cache
   ```

4. **First clone triggers browser OAuth login**:
   ```bash
   git clone https://dev.azure.com/{org}/{project}/_git/{repo}
   ```

### Method B — SSH Keys

1. **Generate key**:
   ```bash
   ssh-keygen -t ed25519 -C "azure-devops" -f ~/.ssh/ado_ed25519
   ```

2. **Add public key to Azure DevOps**:
   - Navigate to User Settings > SSH Public Keys > New Key
   - Paste contents of `~/.ssh/ado_ed25519.pub`

3. **Configure SSH config** (`~/.ssh/config`):
   ```
   Host ssh.dev.azure.com
     IdentityFile ~/.ssh/ado_ed25519
     IdentitiesOnly yes
     HostkeyAlgorithms +ssh-rsa
     PubkeyAcceptedAlgorithms +ssh-rsa
   ```

4. **Test connection**: `ssh -T git@ssh.dev.azure.com`

5. **Clone via SSH**: `git clone git@ssh.dev.azure.com:v3/{org}/{project}/{repo}`

### Method C — Managed Identity (Azure VMs, App Service, Container Apps)

1. **Assign managed identity** to the compute resource in Azure Portal.
2. **Grant ADO access**: Add the managed identity to the Azure DevOps organization users with appropriate license.
3. **Configure Git**:
   ```bash
   git config --global credential.helper manager
   git config --global credential.azreposManagedIdentity true
   ```

### Method D — Workload Identity Federation (CI/CD)

1. **Create federated credential** on an Entra ID app registration or managed identity.
2. **Configure OIDC issuer** matching your CI platform (GitHub Actions, Azure Pipelines).
3. **In pipeline**, use `AzureCLI@2` with `addSpnToEnvironment: true` to get a token.
4. **Set Git header**:
   ```bash
   git -c http.extraheader="AUTHORIZATION: bearer $(System.AccessToken)" clone ...
   ```

## Verification

After configuring any method, verify by cloning a test repo:
```bash
git clone https://dev.azure.com/{org}/{project}/_git/{repo} /tmp/test-clone
cd /tmp/test-clone && echo "test" > test.txt && git add . && git commit -m "test" && git push
```

## Error Handling

- **Credential prompt loop (GCM)**: Clear cache with `git credential reject` then re-auth. On Windows, clear from Credential Manager.
- **401 Unauthorized**: Token expired or wrong scope — re-authenticate or regenerate PAT.
- **SSH `Permission denied (publickey)`**: Key not registered or wrong file — check `ssh -vT git@ssh.dev.azure.com` for details.
- **SSH host key verification failed**: Add `ssh.dev.azure.com` fingerprint: `ssh-keyscan ssh.dev.azure.com >> ~/.ssh/known_hosts`.
- **GCM not found**: Install or update Git for Windows to 2.39+.
