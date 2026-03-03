---
name: alm-setup
description: Set up the Power Platform ALM plugin — install PAC CLI, configure environments, authenticate, and optionally set up CI/CD pipelines and PCF development
argument-hint: "[--minimal] [--with-cicd] [--with-pcf]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Power Platform ALM Setup

Guide the user through setting up their Power Platform ALM tooling, authentication, and optional CI/CD and PCF development environments.

## Flags

| Flag | Behavior |
|------|----------|
| `--minimal` | PAC CLI install + authentication only (steps 1-4, 9) |
| `--with-cicd` | Include CI/CD pipeline setup (step 7) |
| `--with-pcf` | Include PCF control development environment (step 8) |
| *(no flags)* | Full guided setup (all steps) |

## Steps

### 1. Check Prerequisites

Verify the following are installed and meet minimum versions:

- **Node.js 18+** — run `node --version` and confirm the major version is >= 18
- **.NET SDK 6+** — run `dotnet --version` and confirm the major version is >= 6
- **PowerShell 7+** — run `pwsh --version` and confirm the major version is >= 7

Report each as installed (with version) or missing. If Node.js is missing, warn that the preferred PAC CLI install method (npm) will not work. If .NET SDK is missing, warn that the dotnet fallback install method will not work. If both are missing, halt and ask the user to install at least one.

### 2. Install PAC CLI

Install the PAC CLI using the best available method:

- **Preferred** (requires Node.js): `npm install -g @microsoft/powerplatform-cli`
- **Fallback** (requires .NET SDK): `dotnet tool install --global Microsoft.PowerApps.CLI.Tool`

If the PAC CLI is already installed, skip installation and move to verification.

### 3. Verify PAC CLI

Run `pac --version` and report the installed version. If the command fails, troubleshoot:

- Check that the npm global bin or dotnet tools directory is on the PATH
- Suggest restarting the terminal if just installed

### 4. Authenticate PAC CLI

Ask the user which authentication method to use:

#### Interactive (developer)

For local development with a user account:

```bash
pac auth create --environment {url}
```

Prompt for the environment URL (e.g., `https://org12345.crm.dynamics.com`). This opens a browser-based login flow.

#### Service Principal (CI/CD)

For automated pipelines and non-interactive use:

1. Prompt for **Tenant ID** (Azure AD / Entra ID tenant GUID)
2. Prompt for **Client ID** (App registration application ID)
3. Prompt for **Client Secret** (App registration secret value)
4. Prompt for **Environment URL**

```bash
pac auth create \
  --applicationId {clientId} \
  --clientSecret {secret} \
  --tenant {tenantId} \
  --environment {url}
```

### 5. Configure Environments

Prompt the user for environment URLs for each deployment stage:

- **Dev** environment URL (required)
- **Test** environment URL (optional, recommended)
- **Prod** environment URL (optional, recommended)

Store the values in a `.env` file in the project root:

```env
PP_DEV_URL=https://orgdev.crm.dynamics.com
PP_TEST_URL=https://orgtest.crm.dynamics.com
PP_PROD_URL=https://orgprod.crm.dynamics.com
```

If a `.env` file already exists, merge the new values without overwriting unrelated entries.

### 6. Configure Solution Context

Prompt the user for:

- **Solution unique name** — the internal name of the solution (e.g., `ContosoCore`)
- **Publisher prefix** — the customization prefix (e.g., `contoso`)

Append to the `.env` file:

```env
PP_SOLUTION_NAME=ContosoCore
PP_PUBLISHER_PREFIX=contoso
```

### 7. Set Up CI/CD (Optional)

Skip this step if `--minimal` is passed. Only run if `--with-cicd` is passed or the user confirms during full setup.

Ask the user which CI/CD platform they use:

#### Azure DevOps

1. Check if the Azure CLI is installed: `az --version`
2. Check if the Azure DevOps extension is installed: `az extension list --query "[?name=='azure-devops']"`
3. If not installed, offer to install it: `az extension add --name azure-devops`
4. Guide through creating a service connection:
   - Prompt for Azure DevOps organization URL and project name
   - Explain the steps to create a Power Platform service connection in Project Settings > Service Connections
   - Provide the required values: tenant ID, application ID, client secret, environment URL

#### GitHub

1. Guide through setting up repository secrets:
   - `TENANT_ID` — Azure AD tenant GUID
   - `CLIENT_ID` — App registration application ID
   - `CLIENT_SECRET` — App registration secret value
   - Dev/Test/Prod environment URLs as secrets
2. If `gh` CLI is available, offer to set secrets directly:
   ```bash
   gh secret set TENANT_ID --body "{tenantId}"
   gh secret set CLIENT_ID --body "{clientId}"
   gh secret set CLIENT_SECRET --body "{secret}"
   gh secret set PP_DEV_URL --body "{devUrl}"
   gh secret set PP_TEST_URL --body "{testUrl}"
   gh secret set PP_PROD_URL --body "{prodUrl}"
   ```

### 8. Set Up PCF Development (Optional)

Skip this step if `--minimal` is passed. Only run if `--with-pcf` is passed or the user confirms during full setup.

1. Install PCF development dependencies:
   ```bash
   npm install -g pcf-scripts pcf-start
   ```
2. Verify TypeScript compiler is available: `npx tsc --version` (or `tsc --version` if globally installed)
3. If TypeScript is not available, install it: `npm install -g typescript`
4. Create an initial PCF project structure if the user wants one:
   ```bash
   pac pcf init --namespace {publisherPrefix} --name {controlName} --template field --run-npm-install
   ```

### 9. Verify Connectivity

Run `pac org who` to confirm the authenticated connection works. Report:

- Organization name
- Environment URL
- Organization ID
- Logged-in user or service principal

If the command fails, troubleshoot authentication issues and offer to re-run step 4.

### 10. Output Summary

Generate a Markdown report summarizing everything that was set up:

```markdown
## Power Platform ALM Setup — Summary

| Item | Status |
|------|--------|
| PAC CLI version | v1.xx.x |
| Auth profile | user@org.com (interactive) |
| Dev environment | https://orgdev.crm.dynamics.com |
| Test environment | https://orgtest.crm.dynamics.com |
| Prod environment | https://orgprod.crm.dynamics.com |
| Solution | ContosoCore (prefix: contoso) |
| CI/CD | GitHub Actions configured |
| PCF tooling | Installed (TypeScript 5.x) |
```

Include any warnings or items that need follow-up (e.g., missing optional tools, environments not yet provisioned).
