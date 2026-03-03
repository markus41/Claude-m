---
name: excel-setup
description: Set up the Excel Automation plugin — install Python dependencies, configure auth, and verify connectivity
argument-hint: "[--minimal] [--with-dataverse] [--with-power-automate]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# /setup — Excel Automation Plugin Setup

## Purpose

Guides the user through setting up everything needed for the excel-automation plugin: Python environment, dependencies, optional Dataverse connectivity, optional Power Automate configuration, and verification.

## Arguments

| Flag | Description |
|------|-------------|
| *(none)* | Full guided setup — walks through all steps, asking the user which optional features to enable |
| `--minimal` | Python dependencies only — skip Dataverse, Power Automate, and `.env` configuration |
| `--with-dataverse` | Include Dataverse-aware mode configuration (environment URL, connectivity test) |
| `--with-power-automate` | Include Power Automate flow creation configuration (Azure app registration) |

Flags can be combined: `/setup --with-dataverse --with-power-automate`

## Instructions

When this command is invoked, walk the user through each step below. For the full guided setup (no flags), ask the user at each optional step whether they want to configure it. For `--minimal`, skip straight to steps 1-2 and 7. For `--with-dataverse` and `--with-power-automate`, include those sections without asking.

---

### Step 1: Check Python Environment

1. Run `python --version` (fall back to `python3 --version` on macOS/Linux) to verify Python is installed.
2. If Python is not found, tell the user to install Python 3.8+ from https://www.python.org/downloads/ and stop.
3. If the version is below 3.8, warn the user that Python 3.8+ is required and stop.
4. Ask the user if they want to create a virtual environment for this project:
   - If yes, run:
     ```
     python -m venv .venv
     ```
   - Then instruct the user on how to activate it:
     - Windows: `.venv\Scripts\activate`
     - macOS/Linux: `source .venv/bin/activate`
   - After the user confirms activation, verify the venv is active by checking `python -c "import sys; print(sys.prefix)"`.
   - If the user declines, proceed with the system Python but note that a virtual environment is recommended.

### Step 2: Install Python Dependencies

1. Run the following command:
   ```bash
   pip install pandas openpyxl xlrd pyxlsb pyarrow
   ```
2. If the install fails, check for common issues:
   - **Permission errors**: Suggest using `pip install --user` or activating a virtual environment.
   - **Network errors**: Ask the user to check their internet connection or proxy settings.
   - **Build errors for pyarrow**: Suggest installing a pre-built wheel with `pip install pyarrow --prefer-binary`, or note that pyarrow is optional (only needed for `.parquet` files) and can be skipped.
3. Verify each package imported successfully:
   ```bash
   python -c "import pandas; print(f'pandas {pandas.__version__}')"
   python -c "import openpyxl; print(f'openpyxl {openpyxl.__version__}')"
   python -c "import xlrd; print(f'xlrd {xlrd.__version__}')"
   python -c "import pyxlsb; print(f'pyxlsb {pyxlsb.__version__}')"
   python -c "import pyarrow; print(f'pyarrow {pyarrow.__version__}')"
   ```
4. If any package fails to import, report the specific failure and suggest remediation.

### Step 3: Verify Office Scripts Access

1. Tell the user:
   > Office Scripts require a Microsoft 365 Business Standard/Premium, Enterprise E3/E5, or Education license. Scripts run in Excel on the web or Excel desktop (Windows/Mac).
2. Ask the user to confirm they have a qualifying license.
3. Provide the link to verify access:
   > Open Excel on the web at https://www.office.com/launch/excel, open any workbook, and check for the **Automate** tab in the ribbon. If you see it, Office Scripts are available.
4. If the user does not have access, note this in the final report as requiring manual action. The plugin can still generate `.ts` script files -- they just cannot be run without Office Scripts access.

### Step 4: Configure Dataverse-Aware Mode (Optional)

Skip this step if `--minimal` is passed. Run this step if `--with-dataverse` is passed or if the user opts in during guided setup.

1. Ask the user for their Dataverse environment URL, e.g.:
   ```
   https://org12345.crm.dynamics.com
   ```
2. Validate the URL format (must start with `https://` and end with a Dynamics 365 domain like `.crm.dynamics.com`, `.crm2.dynamics.com`, etc.).
3. Test basic connectivity by attempting a GET request (via Python or curl) to the environment's `api/data/v9.2/` endpoint. Note: this will likely return a 401 Unauthorized without auth, which is fine -- it confirms the endpoint exists. A DNS failure or timeout indicates a bad URL.
4. Set the environment variable `DATAVERSE_ENV_URL` in the `.env` file (created in Step 6).
5. If connectivity fails, report the error and note that Dataverse-aware mode can still be used for offline cleaning (it just will not be able to resolve option sets or lookups from the live environment).

### Step 5: Configure Power Automate (Optional)

Skip this step if `--minimal` is passed. Run this step if `--with-power-automate` is passed or if the user opts in during guided setup.

1. Explain to the user:
   > To create Power Automate flows programmatically, you need an Azure AD app registration with the following API permissions:
   > - `Flows.Manage.All` (Delegated)
   > - `Flows.Read.All` (Delegated)
   >
   > If you have not created an app registration, follow this guide:
   > https://learn.microsoft.com/en-us/power-automate/web-api
2. Ask the user for:
   - **Tenant ID** (GUID format, e.g., `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
   - **Client ID** (GUID format)
   - **Client Secret** (string)
3. Validate the GUID formats for Tenant ID and Client ID (must match the pattern `^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`).
4. Store these values in the `.env` file as:
   ```
   POWER_AUTOMATE_TENANT_ID=<tenant-id>
   POWER_AUTOMATE_CLIENT_ID=<client-id>
   POWER_AUTOMATE_CLIENT_SECRET=<client-secret>
   ```
5. **Do NOT echo the client secret** to the terminal or include it in any output summaries. When displaying configuration, mask it as `****`.

### Step 6: Create `.env` File

1. Check if a `.env` file already exists in the project root. If it does, ask the user whether to overwrite or merge.
2. Generate the `.env` file with the following template, filling in any values collected in previous steps:

```env
# ============================================================
# Excel Automation Plugin — Environment Configuration
# ============================================================
# This file is auto-generated by /setup. Edit as needed.
# IMPORTANT: Add .env to your .gitignore to avoid leaking secrets.

# --- Python ---
# Path to Python interpreter (optional, defaults to system Python)
# PYTHON_PATH=python

# --- Dataverse Configuration ---
# Dataverse environment URL for --source dataverse mode
# DATAVERSE_ENV_URL=https://org12345.crm.dynamics.com

# --- Power Automate Configuration ---
# Azure AD app registration for flow creation via /create-flow
# POWER_AUTOMATE_TENANT_ID=
# POWER_AUTOMATE_CLIENT_ID=
# POWER_AUTOMATE_CLIENT_SECRET=

# --- Output Defaults ---
# Default output directory for generated files (optional)
# OUTPUT_DIR=./output

# Default timezone for Dataverse timestamp conversion (optional)
# TIMEZONE=America/Chicago
```

3. Uncomment and fill in any lines where the user provided values during setup.
4. Check if `.gitignore` exists and contains `.env`. If not, warn the user:
   > **Warning:** Your `.gitignore` does not include `.env`. Add it to avoid committing secrets to version control.

   Offer to add `.env` to `.gitignore` automatically.

### Step 7: Run Verification

Run a comprehensive verification of all configured components:

```bash
python -c "
import sys
print(f'Python: {sys.version}')

results = []

# Core dependencies
for pkg in ['pandas', 'openpyxl', 'xlrd', 'pyxlsb', 'pyarrow']:
    try:
        mod = __import__(pkg)
        ver = getattr(mod, '__version__', 'unknown')
        results.append((pkg, 'OK', ver))
    except ImportError:
        results.append((pkg, 'MISSING', ''))

for name, status, ver in results:
    mark = '[x]' if status == 'OK' else '[ ]'
    print(f'  {mark} {name} {ver}')
"
```

If Dataverse was configured, also test:
```bash
python -c "
import urllib.request
url = '<DATAVERSE_ENV_URL>/api/data/v9.2/'
try:
    urllib.request.urlopen(url, timeout=10)
except urllib.error.HTTPError as e:
    if e.code == 401:
        print('[x] Dataverse endpoint reachable (auth required)')
    else:
        print(f'[ ] Dataverse endpoint returned HTTP {e.code}')
except Exception as e:
    print(f'[ ] Dataverse endpoint unreachable: {e}')
"
```

### Step 8: Output Setup Report

After all steps are complete, generate a markdown summary and display it to the user. Format:

```markdown
## Excel Automation — Setup Report

### Environment
- **Python**: 3.x.x (venv: yes/no)
- **Location**: /path/to/python

### Dependencies
| Package   | Status | Version |
|-----------|--------|---------|
| pandas    | OK     | x.x.x   |
| openpyxl  | OK     | x.x.x   |
| xlrd      | OK     | x.x.x   |
| pyxlsb    | OK     | x.x.x   |
| pyarrow   | OK     | x.x.x   |

### Features
| Feature           | Status      | Notes                        |
|-------------------|-------------|------------------------------|
| Data cleaning     | Ready       | All dependencies installed   |
| Office Scripts    | Ready / N/A | Automate tab verified / not  |
| Dataverse mode    | Ready / N/A | URL configured / skipped     |
| Power Automate    | Ready / N/A | App registered / skipped     |

### Files Created
- `.env` — environment configuration
- `.venv/` — virtual environment (if created)

### Manual Action Needed
- (list anything that still requires user action, or "None — all set!")
```

## Error Handling

- **Python not found**: Stop immediately and direct the user to install Python.
- **pip install failures**: Report the specific package that failed, suggest `--prefer-binary` or `--user` flags, and continue with remaining packages.
- **Network errors**: Note the failure and explain that offline functionality (script generation) still works.
- **Invalid GUIDs**: Re-prompt the user up to 2 times, then offer to skip the step.
- **Existing `.env` file**: Always ask before overwriting. Offer to merge new values into the existing file.
- **Missing `.gitignore`**: Offer to create one with `.env` as the first entry.

## Example Usage

```bash
# Full guided setup — walks through everything interactively
/setup

# Minimal setup — just Python deps, no config prompts
/setup --minimal

# Set up with Dataverse support
/setup --with-dataverse

# Set up with Power Automate support
/setup --with-power-automate

# Set up with both optional features
/setup --with-dataverse --with-power-automate
```
