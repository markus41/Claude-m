# Git Authentication for Azure Repos

## Overview

Azure Repos supports multiple Git authentication mechanisms. This reference covers every supported method — from Git Credential Manager (GCM) for interactive use, to Workload Identity Federation and managed identities for CI/CD — along with configuration, troubleshooting, and cross-platform differences.

---

## Authentication Methods Summary

| Method | Use Case | Credential Lifetime | Setup Complexity |
|--------|----------|-------------------|-----------------|
| Git Credential Manager (GCM) | Developer workstations | Session-based with refresh | Low |
| Entra OAuth token | CLI automation, scripts | 1 hour (refreshable) | Medium |
| SSH key | Developer workstations, CI | Until key revocation | Medium |
| Personal Access Token (PAT) | Scripts, legacy CI | Configurable (up to 1 year) | Low |
| Workload Identity Federation (WIF) | CI/CD pipelines (Azure-hosted) | Per-pipeline run | High (one-time) |
| Managed Identity | Azure-hosted compute | Automatic rotation | Medium |
| `SYSTEM_ACCESSTOKEN` | Azure Pipelines (built-in) | Pipeline run duration | None |

---

## Git Credential Manager (GCM)

GCM is the recommended authentication method for developer workstations. It handles OAuth token acquisition, caching, and refresh automatically.

### Installation

```bash
# Windows — bundled with Git for Windows 2.39+
# Verify GCM is installed
git credential-manager --version

# macOS
brew install --cask git-credential-manager

# Linux (Debian/Ubuntu)
curl -L https://aka.ms/gcm/linux-install-source.sh | sh
git-credential-manager configure
```

### Configuration

```bash
# Set GCM as the credential helper (usually automatic)
git config --global credential.helper manager

# Azure Repos-specific: use OAuth broker mode (recommended)
git config --global credential.azreposCredentialType oauth

# Alternative: use PAT-based auth through GCM
git config --global credential.azreposCredentialType pat

# Enable GUI prompt (default on Windows/macOS)
git config --global credential.guiPrompt true

# Disable GUI for headless/SSH sessions
git config --global credential.guiPrompt false
git config --global credential.gitHubAuthModes devicecode
```

### OAuth Broker Mode

GCM supports brokered authentication via the system's identity provider:

```bash
# Windows: uses WAM (Web Account Manager) for SSO
git config --global credential.msauthUseDefaultAccount true

# macOS: uses system keychain
# Linux: uses Secret Service API (GNOME Keyring / KDE Wallet)

# Force interactive login (clear cached credentials)
git credential-manager erase
# Then paste:
# protocol=https
# host=dev.azure.com
# (blank line to end)
```

### GCM Troubleshooting

```bash
# Enable verbose GCM logging
export GCM_TRACE=1
export GCM_TRACE_SECRETS=0   # Never set to 1 in shared environments
git fetch origin

# Check credential store
git config --global credential.credentialStore
# Possible values: gpg, secretservice, keychain, plaintext, cache

# Reset GCM for a specific remote
git credential-manager erase <<EOF
protocol=https
host=dev.azure.com
EOF
```

---

## Entra OAuth Tokens for Git Operations

Use Azure CLI to obtain short-lived OAuth tokens for Git operations in scripts or automation.

```bash
# Get an access token for Azure DevOps
az account get-access-token \
  --resource 499b84ac-1321-427f-aa17-267ca6975798 \
  --query accessToken -o tsv

# Use the token inline with Git
GIT_TOKEN=$(az account get-access-token --resource 499b84ac-1321-427f-aa17-267ca6975798 --query accessToken -o tsv)
git -c http.extraHeader="Authorization: Bearer $GIT_TOKEN" clone https://dev.azure.com/myorg/myproject/_git/my-repo

# Configure Git to use the token for all Azure DevOps repos
git config --global credential.https://dev.azure.com.helper \
  '!f() { echo "protocol=https\nhost=dev.azure.com\nusername=token\npassword=$(az account get-access-token --resource 499b84ac-1321-427f-aa17-267ca6975798 --query accessToken -o tsv)"; }; f'
```

### Token Refresh Pattern for Long-Running Scripts

```bash
#!/bin/bash
# Refresh token before each Git operation
refresh_and_run() {
  local token
  token=$(az account get-access-token \
    --resource 499b84ac-1321-427f-aa17-267ca6975798 \
    --query accessToken -o tsv)
  git -c http.extraHeader="Authorization: Bearer $token" "$@"
}

refresh_and_run fetch origin
refresh_and_run push origin main
```

---

## SSH Key Authentication

### Generate an SSH Key

```bash
# Ed25519 (recommended)
ssh-keygen -t ed25519 -C "user@company.com" -f ~/.ssh/id_ed25519_ado

# RSA (fallback for older systems)
ssh-keygen -t rsa -b 4096 -C "user@company.com" -f ~/.ssh/id_rsa_ado
```

### Add SSH Key to Azure DevOps

1. Copy the public key: `cat ~/.ssh/id_ed25519_ado.pub`
2. In Azure DevOps: User Settings > SSH Public Keys > Add
3. Paste the public key and save

Or via REST API:
```bash
# Add SSH key via API
POST https://dev.azure.com/{org}/_apis/accounts/{accountId}/keys?api-version=7.1
{
  "publicData": "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIG... user@company.com",
  "description": "Work laptop"
}
```

### Configure SSH Config

```
# ~/.ssh/config
Host ssh.dev.azure.com
  HostName ssh.dev.azure.com
  User git
  IdentityFile ~/.ssh/id_ed25519_ado
  IdentitiesOnly yes
  # Required on some systems to avoid host key issues
  HostKeyAlgorithms +ssh-rsa
  PubkeyAcceptedAlgorithms +ssh-rsa
```

### Clone with SSH

```bash
# SSH clone URL format
git clone git@ssh.dev.azure.com:v3/myorg/myproject/my-repo

# Verify SSH connectivity
ssh -T git@ssh.dev.azure.com
# Expected: "remote: Shell access is not supported."
```

### SSH Troubleshooting

```bash
# Verbose SSH to debug connection issues
ssh -vT git@ssh.dev.azure.com

# Common issues:
# 1. "Permission denied (publickey)" — key not added to ADO or wrong key file
# 2. "Host key verification failed" — add ssh.dev.azure.com to known_hosts
ssh-keyscan ssh.dev.azure.com >> ~/.ssh/known_hosts

# 3. Multiple SSH keys — ensure IdentitiesOnly yes and correct IdentityFile
# 4. SSH agent not running
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519_ado
```

---

## Personal Access Token (PAT) Authentication

### Create a PAT

1. Azure DevOps > User Settings > Personal Access Tokens > New Token
2. Set scopes: `Code (Read & Write)` for Git operations
3. Set expiry: Maximum 1 year; recommend 90 days

### Use PAT with Git

```bash
# Clone with PAT in URL (not recommended for shared environments)
git clone https://pat:$ADO_PAT@dev.azure.com/myorg/myproject/_git/my-repo

# Better: configure credential helper to use PAT
git config --global credential.helper store
echo "https://pat:${ADO_PAT}@dev.azure.com" >> ~/.git-credentials

# Best: use GCM with PAT mode
git config --global credential.azreposCredentialType pat
```

### PAT Rotation Best Practices

- Set calendar reminders 2 weeks before expiry.
- Use Azure DevOps PAT lifecycle management API to automate rotation:
  ```
  POST https://vssps.dev.azure.com/{org}/_apis/tokens/pats?api-version=7.1-preview
  ```
- For CI/CD, prefer Workload Identity Federation or managed identities over PATs.
- Revoke compromised PATs immediately via User Settings or API.

---

## Workload Identity Federation (WIF) for Git in CI/CD

WIF eliminates secrets for Azure-hosted CI/CD by using federated identity credentials.

### Setup

1. Create an Entra ID app registration.
2. Add a federated credential for Azure DevOps:
   - Issuer: `https://vstoken.dev.azure.com/{org-id}`
   - Subject: `sc://{org}/{project}/{service-connection-name}`
   - Audience: `api://AzureADTokenExchange`
3. Create an Azure DevOps service connection using WIF.

### Use in Pipeline

```yaml
# Pipeline using WIF service connection for Git operations
steps:
  - checkout: self
    persistCredentials: true   # Keeps auth for subsequent Git commands

  - script: |
      git config user.email "pipeline@company.com"
      git config user.name "CI Pipeline"
      git checkout -b auto-update
      echo "update" >> data.txt
      git add data.txt
      git commit -m "Automated update"
      git push origin auto-update
    displayName: Push via WIF credentials
```

---

## Managed Identity for Git on Azure Compute

Azure VMs, App Service, and Container Instances can use managed identities for Git operations.

```bash
# Get token using managed identity (system-assigned)
TOKEN=$(curl -s "http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=499b84ac-1321-427f-aa17-267ca6975798" \
  -H "Metadata: true" | jq -r '.access_token')

# Clone using the token
git -c http.extraHeader="Authorization: Bearer $TOKEN" \
  clone https://dev.azure.com/myorg/myproject/_git/my-repo

# For user-assigned managed identity, add client_id parameter
TOKEN=$(curl -s "http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=499b84ac-1321-427f-aa17-267ca6975798&client_id=<mi-client-id>" \
  -H "Metadata: true" | jq -r '.access_token')
```

**Prerequisites:**
- The managed identity must be added to the Azure DevOps organization (Organization Settings > Users).
- Grant the MI appropriate project-level permissions.

---

## `SYSTEM_ACCESSTOKEN` in Azure Pipelines

The built-in pipeline identity can be used for Git operations within a pipeline run.

```yaml
steps:
  - checkout: self
    persistCredentials: true   # Required for subsequent git push

  # Or manually configure Git to use the system token
  - script: |
      git -c http.extraHeader="Authorization: Bearer $(System.AccessToken)" \
        push origin HEAD:refs/heads/main
    displayName: Push with system token
    env:
      SYSTEM_ACCESSTOKEN: $(System.AccessToken)
```

**Notes:**
- `System.AccessToken` is scoped to the current project.
- The build service identity (`{Project Name} Build Service ({org})`) needs Code (Read & Write) permission on the repo.
- Token expires when the pipeline run completes.

---

## `credential.azreposCredentialType` Configuration

| Value | Behavior |
|-------|----------|
| `oauth` | GCM obtains Entra OAuth tokens via browser/broker (recommended) |
| `pat` | GCM prompts for a PAT and stores it in the credential store |
| (not set) | GCM auto-detects; defaults to OAuth on supported platforms |

```bash
# Set for all Azure Repos
git config --global credential.https://dev.azure.com.azreposCredentialType oauth

# Set per-remote
git config credential.https://dev.azure.com/myorg.azreposCredentialType pat
```

---

## Cross-Platform Differences

| Aspect | Windows | macOS | Linux |
|--------|---------|-------|-------|
| GCM credential store | Windows Credential Manager (WCM) | macOS Keychain | Secret Service API or GPG |
| OAuth broker | WAM (Web Account Manager) | System browser | System browser or device code |
| SSH default location | `%USERPROFILE%\.ssh\` | `~/.ssh/` | `~/.ssh/` |
| Line endings | `core.autocrlf=true` recommended | `core.autocrlf=input` | `core.autocrlf=input` |
| Path length | 260 char limit (enable long paths) | No practical limit | No practical limit |
| GCM GUI prompts | Native Windows dialog | Native macOS dialog | Terminal-based or browser |

### Windows Long Path Support

```bash
# Enable long paths (required for deeply nested repos)
git config --global core.longpaths true
# Also enable in Windows: Registry or Group Policy
# HKLM\SYSTEM\CurrentControlSet\Control\FileSystem\LongPathsEnabled = 1
```

---

## Troubleshooting Common Auth Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `401 Unauthorized` on clone/push | Expired PAT or invalid OAuth token | Regenerate PAT or re-authenticate with `az login` |
| `403 Forbidden` on push | Insufficient permissions | Grant Code (Read & Write) on the repo |
| Credential prompt loop | Stale cached credentials | Run `git credential-manager erase` for the remote |
| `Permission denied (publickey)` | SSH key not registered or wrong key | Add key to Azure DevOps; check `~/.ssh/config` |
| `Host key verification failed` | `ssh.dev.azure.com` not in `known_hosts` | Run `ssh-keyscan ssh.dev.azure.com >> ~/.ssh/known_hosts` |
| `fatal: Authentication failed` | GCM not installed or misconfigured | Install GCM; verify `git config credential.helper` |
| `TF400813` on Git operations | PAT scope missing Code permission | Create new PAT with `Code (Read & Write)` scope |
| `AADSTS50076` MFA required | Conditional access policy requiring MFA | Use GCM with broker mode (WAM on Windows) for MFA compliance |
| `SSL certificate problem` | Corporate proxy/firewall | Configure `git config http.sslCAInfo /path/to/ca-bundle.crt` |
| Token expired mid-operation | Long-running clone/push with short-lived token | Use GCM (auto-refreshes) or refresh token before each operation |
