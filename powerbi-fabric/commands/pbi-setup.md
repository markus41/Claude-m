---
name: pbi-setup
description: Set up the Power BI / Fabric plugin — configure Azure auth, verify workspace access, and optionally set up Fabric notebook environment
argument-hint: "[--minimal] [--with-fabric] [--with-desktop-check]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Power BI / Fabric Setup

Guide the user through setting up Power BI and Fabric access. Follow each step in order, asking for input where needed. Respect flag arguments:

- `--minimal` -- Only run steps 1-2 (prerequisites and Node dependencies), then output the summary.
- `--with-fabric` -- Include steps 6-7 (Fabric capacity and Python dependencies).
- `--with-desktop-check` -- Include step 8 (Power BI Desktop verification).
- No flags -- Run steps 1-5, then ask whether to continue with optional steps 6-8.

---

## Step 1: Check Prerequisites

Verify that required tools are installed:

1. **Node.js 18+** -- Run `node --version` and confirm the major version is 18 or higher. If missing or too old, stop and tell the user to install Node.js 18+ from https://nodejs.org.
2. **Python 3.8+** (needed for Fabric notebooks) -- Run `python --version` or `python3 --version`. If missing, note it as a warning but do not block setup. Python is only required for Fabric notebook workflows.

Report the detected versions to the user before continuing.

---

## Step 2: Install Node Dependencies

Run the following in the project root (or the user's chosen working directory):

```bash
npm init -y && npm install @azure/identity @azure/msal-node node-fetch
```

Confirm that `package.json` exists and the three packages appear in `dependencies`. Report any errors to the user.

---

## Step 3: Configure Azure App Registration

Walk the user through registering an application in Microsoft Entra ID (Azure AD). Ask the user to perform these actions in the Azure portal, or confirm they have already done so:

1. **Register the app** in Microsoft Entra ID > App registrations > New registration.
2. **Add API permissions** for the Power BI Service (`https://analysis.windows.net/powerbi/api`):
   - `Dataset.ReadWrite.All`
   - `Workspace.ReadWrite.All`
   - `Report.ReadWrite.All`
   - `Content.Create`
3. **Set the scope** to `https://analysis.windows.net/powerbi/api/.default`.
4. **Generate a client secret** under Certificates & secrets > New client secret.

Ask the user to provide:
- Tenant ID (Directory ID)
- Client ID (Application ID)
- Client Secret value

Do **not** log the client secret to the console or store it in any file other than `.env`. Remind the user to add `.env` to `.gitignore`.

---

## Step 4: Configure Environment

Create a `.env` file in the project root with the values collected in Step 3:

```
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<client-secret>
PBI_WORKSPACE_ID=<optional-default-workspace-id>
```

- `PBI_WORKSPACE_ID` is optional. Ask the user if they have a default workspace ID they would like to set.
- Verify that `.gitignore` exists and contains `.env`. If not, add it.

---

## Step 5: Verify Power BI Access

Authenticate using the configured credentials and call:

```
GET https://api.powerbi.com/v1.0/myorg/groups
```

Use `@azure/identity` with `ClientSecretCredential` to obtain a token for scope `https://analysis.windows.net/powerbi/api/.default`, then make the HTTP request.

- On success: list the accessible workspaces (name and ID) in a table.
- On failure: display the error, suggest checking permissions and admin consent, and offer to retry.

---

## Step 6: Configure Fabric (Optional)

Only run this step if `--with-fabric` is passed or the user opts in when prompted.

Ask the user:
1. Do you have a Microsoft Fabric capacity? (F2, F4, F8, etc.)
2. What is the Fabric workspace name or ID?
3. What is the lakehouse name?

Append the following to `.env`:

```
FABRIC_WORKSPACE_ID=<fabric-workspace-id>
FABRIC_LAKEHOUSE_NAME=<lakehouse-name>
```

---

## Step 7: Install Python Dependencies (Optional)

Only run this step if `--with-fabric` is passed or the user opts in.

Requires Python 3.8+ (verified in Step 1). Run:

```bash
pip install pyspark delta-spark semantic-link
```

Report installed versions and any errors.

---

## Step 8: Check Power BI Desktop (Optional)

Only run this step if `--with-desktop-check` is passed or the user opts in.

Check whether Power BI Desktop is installed:

- On Windows: look for `PBIDesktop.exe` in the default install paths (`C:\Program Files\Microsoft Power BI Desktop\bin\` or the Microsoft Store variant).
- On macOS/Linux: Power BI Desktop is not natively available; note this to the user.

Report whether PBIP/PBIX local authoring is available.

---

## Step 9: Output Summary

Generate a Markdown summary report with:

| Item | Status |
|------|--------|
| Node.js version | e.g. v20.11.0 |
| Python version | e.g. 3.11.4 or "not installed" |
| Node packages | installed / failed |
| Azure app registration | configured / not configured |
| Power BI API access | verified (N workspaces) / failed |
| Fabric capacity | configured / skipped |
| Python packages | installed / skipped |
| Power BI Desktop | found / not found / skipped |

List the accessible workspaces if Step 5 succeeded:

| Workspace | ID |
|-----------|----|
| Sales Analytics | xxxxxxxx-xxxx-... |
| Finance Reports | xxxxxxxx-xxxx-... |

End with next-step suggestions:
- Use `/pbi-workspace-create` to create a new workspace.
- Use `/pbi-scaffold` to scaffold a PBIP project.
- Use `/pbi-fabric-notebook` to generate a Fabric notebook.
