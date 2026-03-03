---
name: dataverse-setup
description: Set up the Dataverse Schema plugin — configure environment URL, auth credentials, publisher prefix, and verify Web API connectivity
argument-hint: "[--minimal] [--with-pac-cli]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Set Up the Dataverse Schema Plugin

You are guiding the user through configuring their Dataverse environment access. Follow these steps in order, adapting based on flags:

- `--minimal`: Only run steps 1-2, then create a skeleton `.env` for the user to fill in manually.
- `--with-pac-cli`: Also run step 8 to install PAC CLI.

## Step 1: Check Prerequisites

Verify the development environment is ready:

1. **Node.js 18+**: Run `node --version` and confirm the major version is >= 18. If not installed or too old, instruct the user to install Node.js 18 LTS or later.
2. **PAC CLI** (optional check): Run `pac --version`. If available, report the version. If not found, note it — offer to install in step 8.

## Step 2: Install Node Dependencies

Run the following in the project directory:

```bash
npm init -y 2>/dev/null || true
npm install @azure/identity dotenv
```

Report which packages were installed and their versions.

## Step 3: Configure Dataverse Environment

Ask the user for their Dataverse environment URL:
- Prompt: "What is your Dataverse environment URL? (e.g., `https://contoso-dev.crm.dynamics.com`)"
- Validate the URL format: must start with `https://` and end with `.dynamics.com` (or `.dynamics.cn`, `.dynamics.de`, `.dynamics365.us` for sovereign clouds)

Ask the user which authentication method they prefer:

**Option A — App registration (service principal):**
- Prompt for Azure tenant ID (GUID)
- Prompt for client ID (GUID)
- Prompt for client secret
- These will be stored in the `.env` file

**Option B — Interactive / DefaultAzureCredential:**
- Guide the user to run `az login` or confirm they are already logged in
- Run `az account show` to verify the active subscription and tenant
- Note that `AZURE_TENANT_ID` and `AZURE_CLIENT_ID`/`AZURE_CLIENT_SECRET` will be left blank in `.env`

## Step 4: Configure Publisher Prefix

Ask the user for their publisher prefix:
- Prompt: "What is your publisher prefix? (2-5 lowercase characters, e.g., `contoso`, `cr123`)"
- Validate: must be 2-5 lowercase alphanumeric characters, starting with a letter
- This is applied to every SchemaName in the plugin's commands

## Step 5: Configure Solution Context (Optional)

Ask the user if they want to set a default solution:
- Prompt: "What is the unique name of your default solution? (Leave blank to skip)"
- If provided, this will be stored as `DEFAULT_SOLUTION` in `.env` and used as the default `MSCRM.SolutionUniqueName` header

## Step 6: Create `.env` File

Generate a `.env` file in the project root with the following content:

```env
# Dataverse Environment
DATAVERSE_ENV_URL=https://contoso-dev.crm.dynamics.com

# Azure Authentication (Option A: App Registration)
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=

# Publisher
PUBLISHER_PREFIX=cr123

# Solution (optional)
DEFAULT_SOLUTION=
```

Fill in values from the user's responses. If `--minimal` was used, leave credential fields blank with comments indicating they must be filled in.

Before writing, check if a `.env` file already exists. If it does, ask the user whether to overwrite or merge values.

Also ensure `.env` is listed in `.gitignore`. If `.gitignore` does not exist, create one with `.env` and `node_modules/`. If it exists but does not include `.env`, append it.

## Step 7: Verify Connectivity

Test the connection to the Dataverse environment:

1. Call `GET {envUrl}/api/data/v9.2/WhoAmI` using the configured credentials
2. On success, extract and report:
   - **UserId** (the authenticated user/app's SystemUser GUID)
   - **BusinessUnitId**
   - **OrganizationId**
3. On failure, report the error and suggest troubleshooting steps:
   - 401: Check credentials, ensure the app registration has Dataverse API permissions
   - 403: Check security role assignments
   - Network error: Check the environment URL

Generate a small TypeScript or Node.js script to perform this verification so the user can re-run it later.

## Step 8: Install PAC CLI (Optional)

Only run this step if `--with-pac-cli` was passed, or if the user opts in when asked.

Offer two installation methods:

**npm (recommended for Node.js projects):**
```bash
npm install -g @microsoft/powerplatform-cli
```

**dotnet tool (if .NET SDK is installed):**
```bash
dotnet tool install --global Microsoft.PowerApps.CLI.Tool
```

After installation, verify with `pac --version` and `pac auth list`.

## Step 9: Output

Present a Markdown summary report:

```markdown
## Dataverse Schema Plugin — Setup Complete

| Setting              | Value                                      |
|----------------------|--------------------------------------------|
| Environment URL      | https://contoso-dev.crm.dynamics.com       |
| Auth Method          | App Registration / DefaultAzureCredential  |
| Publisher Prefix     | cr123                                      |
| Default Solution     | contoso_solution (or _not set_)            |
| Authenticated User   | {UserId}                                   |
| Business Unit        | {BusinessUnitId}                           |
| Organization         | {OrganizationId}                           |
| PAC CLI              | Installed v1.x.x / Not installed           |
| Node.js              | v18.x.x                                    |

### Next Steps
- Use `/dataverse-table-create <name>` to create your first table
- Use `/dataverse-query <description>` to query existing data
- Use `/dataverse-solution-export <name>` to export your solution
```

If any step failed, include a **Warnings** section listing what needs manual attention.
