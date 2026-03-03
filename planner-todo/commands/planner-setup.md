---
name: planner-setup
description: Set up the Planner & To Do plugin — configure Azure auth and verify Graph API access to plans and task lists
argument-hint: "[--minimal]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Planner & To Do Setup

Guide the user through a complete setup of Microsoft Planner and To Do API access via
Microsoft Graph. This command configures authentication, verifies permissions, and runs
smoke-test API calls to confirm the environment is working.

If `--minimal` is passed, stop after Step 2 (dependency installation only).

---

## Step 1: Check Prerequisites

Verify the required runtime and packages are available.

### Node.js Version

```bash
node --version
```

Node.js **18.0.0 or higher** is required. The `@azure/identity` SDK uses ES2022 features
and the `node-fetch` package requires Node.js 18+ for native fetch support.

If Node.js is missing or out of date, direct the user to https://nodejs.org/en/download
to install the LTS version.

### Check for Existing Installation

```bash
ls package.json 2>/dev/null && npm list @azure/identity @azure/msal-node node-fetch 2>/dev/null
```

If `@azure/identity` ≥ 3.0.0 and `@azure/msal-node` are already installed, skip Step 2.

---

## Step 2: Install Dependencies

```bash
npm install @azure/identity @azure/msal-node node-fetch
```

Package purposes:
- `@azure/identity` — provides `InteractiveBrowserCredential`, `DeviceCodeCredential`,
  and other credential types compatible with Microsoft Graph delegated auth
- `@azure/msal-node` — MSAL (Microsoft Authentication Library) for Node.js; required
  internally by `@azure/identity`
- `node-fetch` — HTTP client for making Graph API calls (or use built-in `fetch` in
  Node.js 18+)

If `--minimal` is passed, stop here and display:
```
Minimal setup complete. Dependencies installed.
Run planner-setup (without --minimal) to complete Azure configuration.
```

---

## Step 3: Configure Azure App Registration

The user must register an application in Microsoft Entra ID (formerly Azure AD).

### Why Delegated Auth Only

Planner and To Do **require delegated (user context) tokens**. App-only (client
credentials) flow is explicitly not supported by these APIs. The signed-in user's
identity determines which plans, tasks, and lists are accessible.

### Required API Permissions

Navigate to: Azure Portal → Microsoft Entra ID → App Registrations → New Registration

After creating the app, go to **API Permissions → Add a permission → Microsoft Graph →
Delegated permissions** and add:

| Permission | Type | Purpose |
|---|---|---|
| `Tasks.ReadWrite` | Delegated | Read and write Planner tasks, plans, buckets; read and write To Do lists and tasks |
| `Group.ReadWrite.All` | Delegated | Create Planner plans (plans require a group owner) |
| `User.Read` | Delegated | Read signed-in user profile (required for `/me` endpoint) |

Click **Grant admin consent** for the tenant after adding permissions (requires a
Global Administrator or Privileged Role Administrator).

### Redirect URI (for Interactive Auth)

For `InteractiveBrowserCredential`, add a redirect URI:
- Platform: **Web** or **Single-page application**
- URI: `http://localhost:3000/auth/callback`

For `DeviceCodeCredential`, no redirect URI is needed.

### Collect Credentials

From the app registration overview page, collect:
- **Tenant ID** (also called Directory ID) — from Overview → Directory (tenant) ID
- **Client ID** (also called Application ID) — from Overview → Application (client) ID
- **Client Secret** — from Certificates & Secrets → New client secret (note the value
  immediately; it is not shown again)

---

## Step 4: Configure Environment

Create a `.env` file in the project root:

```
# Microsoft Entra ID / Azure AD
AZURE_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_ID=yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy
AZURE_CLIENT_SECRET=your-client-secret-value-here

# Optional: specify the user to authenticate as (for DeviceCode flow logging)
AZURE_USERNAME=user@yourdomain.com
```

Add `.env` to `.gitignore` to prevent committing credentials:

```bash
echo ".env" >> .gitignore
```

**Security note:** The `AZURE_CLIENT_SECRET` grants access to your Azure app
registration. Never commit it to source control or share it in chat.

---

## Step 5: Acquire a Delegated Token

Use `DeviceCodeCredential` or `InteractiveBrowserCredential` — not `ClientSecretCredential`,
which performs app-only authentication and is rejected by Planner/To Do endpoints.

### JavaScript Token Acquisition Example

```javascript
import { DeviceCodeCredential } from "@azure/identity";

const credential = new DeviceCodeCredential({
  tenantId: process.env.AZURE_TENANT_ID,
  clientId: process.env.AZURE_CLIENT_ID,
  userPromptCallback: (info) => {
    console.log(info.message); // Prints: "Go to https://microsoft.com/devicelogin and enter code XXXX"
  }
});

const tokenResponse = await credential.getToken(
  "https://graph.microsoft.com/.default"
);
const accessToken = tokenResponse.token;
```

For interactive browser auth (opens a browser window automatically):

```javascript
import { InteractiveBrowserCredential } from "@azure/identity";

const credential = new InteractiveBrowserCredential({
  tenantId: process.env.AZURE_TENANT_ID,
  clientId: process.env.AZURE_CLIENT_ID,
  redirectUri: "http://localhost:3000/auth/callback"
});
```

---

## Step 6: Verify API Access

Run the following verification calls and display results in tables.

### Verify Planner Access

```
GET https://graph.microsoft.com/v1.0/me/planner/plans
Authorization: Bearer <token>
```

Display results:
```
Planner Plans accessible to signed-in user:
┌─────────────────────────────────┬──────────────────────┬──────────────────────┐
│ Plan ID                         │ Title                │ Owner Group          │
├─────────────────────────────────┼──────────────────────┼──────────────────────┤
│ xqQg5sBW50SbCiiojQqDjGQAD1IN   │ Q2 Sprint Board      │ contoso-dev-team     │
└─────────────────────────────────┴──────────────────────┴──────────────────────┘
```

### Verify To Do Access

```
GET https://graph.microsoft.com/v1.0/me/todo/lists
Authorization: Bearer <token>
```

Display results:
```
To Do Lists for signed-in user:
┌──────────────────────────┬──────────────────┬─────────┬──────────┐
│ List ID (truncated)      │ Display Name     │ Is Owner│ Is Shared│
├──────────────────────────┼──────────────────┼─────────┼──────────┤
│ AQMkADZhMWM5NGI5...      │ Tasks (default)  │ true    │ false    │
│ AQMkADZhMWM5NGI5...      │ Work Tasks       │ true    │ false    │
└──────────────────────────┴──────────────────┴─────────┴──────────┘
```

---

## Step 7: Troubleshooting

| Error | Cause | Solution |
|---|---|---|
| `403 Forbidden` on `/me/planner/plans` | `Tasks.ReadWrite` scope not granted or admin consent not given | Re-check API permissions in Entra ID and grant admin consent |
| `403 Forbidden` on plan creation | User is not a member of the specified M365 Group | Add the user to the group or choose a group they belong to |
| `401 Unauthorized` | Token is expired or missing | Re-run the token acquisition flow |
| `AADSTS50076: MFA required` | Tenant requires multi-factor authentication | Use `InteractiveBrowserCredential` which handles MFA prompts interactively |
| `AADSTS700016: Application not found` | Wrong tenant ID or client ID in `.env` | Verify both values against the App Registration in Entra ID |
| `AADSTS65001: User has not consented` | Admin consent not granted | A Global Admin must click "Grant admin consent" in the API Permissions blade |
| `AADSTS90134: No permission match` | App-only token used for delegated-only endpoint | Switch from `ClientSecretCredential` to `DeviceCodeCredential` or `InteractiveBrowserCredential` |

---

## Setup Complete

When all verification calls succeed, display:

```
Planner & To Do setup complete
─────────────────────────────────────────────────
Auth:     Delegated (user context)  OK
Planner:  GET /me/planner/plans     OK  (N plans found)
To Do:    GET /me/todo/lists        OK  (N lists found)

Available commands:
  planner-plan-create    Create a Planner plan with buckets
  planner-task-create    Create a task in a plan
  planner-task-assign    Assign a task to users
  planner-bucket-create  Add a bucket to an existing plan
  todo-list-create       Create a To Do list
  todo-task-create       Create a task in a To Do list
─────────────────────────────────────────────────
```
