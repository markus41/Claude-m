---
name: alm-env-create
description: Create and configure a Power Platform environment with specified settings (type, region, language, currency, security group).
argument-hint: "[name] [--type Sandbox|Production] [--region unitedstates|europe] [--domain subdomain]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Create Power Platform Environment

Generate a script or PAC CLI command to create and configure a Power Platform environment.

## What You Need

1. **Environment name** — display name (e.g., "Contoso Dev")
2. **Type** — Sandbox, Production, Trial, or Developer
3. **Region** — unitedstates, europe, asia, australia, japan, canada, etc.
4. **Domain** — subdomain for the URL (becomes `{domain}.crm.dynamics.com`)
5. **Language** — LCID (1033 = English US, 1031 = German, 1036 = French)
6. **Currency** — ISO code (USD, EUR, GBP, etc.)
7. **Security group** (optional) — Azure AD group ID to restrict access

## PAC CLI Command

```bash
pac env create \
  --name "{name}" \
  --type {Sandbox|Production} \
  --domain "{domain}" \
  --region {region} \
  --language {lcid} \
  --currency {currency_code}
```

## Steps

1. Gather the required parameters from the user
2. Generate the appropriate PAC CLI command or Admin API script
3. If the user wants a TypeScript/PowerShell script, generate the Admin API version with proper authentication
4. Include post-creation steps: verify with `pac env list`, select with `pac env select`
5. Remind about creating an Application User if this environment will be used in CI/CD pipelines

## Post-Creation Checklist

- Verify environment is ready: `pac env list`
- Create Application User for service principal access
- Assign System Administrator role to the Application User
- Configure DLP policies if needed
- Set up security group restriction if required
