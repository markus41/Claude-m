# Azure Static Web Apps — PR Preview Environments

## Overview

Azure Static Web Apps automatically creates isolated preview environments for every pull request. Each PR gets a unique URL where the team can review the changes before merging. Preview environments share the same configuration as production but are isolated deployments. They are automatically deleted when the PR is closed or merged. SWA supports up to 3 preview environments on the Free tier and up to 10 on the Standard tier.

---

## REST API Endpoints

Base URL: `https://management.azure.com`
API Version: `2023-12-01`

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| GET | `/.../staticSites/{name}/builds` | Reader | — | List all environments (production + previews) |
| GET | `/.../staticSites/{name}/builds/{buildId}` | Reader | — | Get specific environment details |
| DELETE | `/.../staticSites/{name}/builds/{buildId}` | Contributor | — | Delete a preview environment |
| GET | `/.../staticSites/{name}/builds/{buildId}/linkedBackends` | Reader | — | List backends for a specific environment |
| PUT | `/.../staticSites/{name}/builds/{buildId}/config/appsettings` | Contributor | Body: settings | Set environment-specific app settings |
| POST | `/.../staticSites/{name}/builds/{buildId}/listAppSettings` | Contributor | — | Get env-specific app settings |

**`buildId`**: `default` for production; `pr-{prNumber}` for preview environments.

**Preview URL format**:
```
https://<random-hash>-<pr-number>.<region>.azurestaticapps.net
```
Example: `https://proud-rock-01234567-42.eastus2.azurestaticapps.net`

---

## GitHub Actions Workflow (Auto-Generated)

When you create a SWA resource linked to a GitHub repository, the portal generates a GitHub Actions workflow file. It handles both deployment on push and PR preview creation.

```yaml
# .github/workflows/azure-static-web-apps-<hash>.yml
name: Azure Static Web Apps CI/CD

on:
  push:
    branches:
      - main
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches:
      - main

jobs:
  build_and_deploy_job:
    if: github.event_name == 'push' || (github.event_name == 'pull_request' && github.event.action != 'closed')
    runs-on: ubuntu-latest
    name: Build and Deploy Job
    permissions:
      id-token: write
      contents: read
      pull-requests: write  # Required to post PR comments with preview URL
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: true
          lfs: false

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build And Deploy
        id: builddeploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}  # Used for PR comments
          action: upload
          app_location: "/"
          api_location: "api"
          output_location: "build"
          app_build_command: "npm run build"

      - name: Output preview URL
        if: github.event_name == 'pull_request'
        run: echo "Preview URL - ${{ steps.builddeploy.outputs.static_web_app_url }}"

  close_pull_request_job:
    if: github.event_name == 'pull_request' && github.event.action == 'closed'
    runs-on: ubuntu-latest
    name: Close Pull Request Job
    steps:
      - name: Close Pull Request
        id: closepullrequest
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          action: close
```

---

## Enhanced Workflow with Quality Gates

Extended workflow adding E2E tests, Lighthouse performance checks, and required approvals before merging.

```yaml
name: PR Preview with Quality Gates

on:
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches: [main]

jobs:
  deploy_preview:
    if: github.event.action != 'closed'
    runs-on: ubuntu-latest
    name: Deploy Preview
    permissions:
      id-token: write
      contents: read
      pull-requests: write
    outputs:
      preview_url: ${{ steps.deploy.outputs.static_web_app_url }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Unit tests
        run: npm test -- --coverage

      - name: Build
        run: npm run build
        env:
          REACT_APP_ENV: preview
          REACT_APP_PR_NUMBER: ${{ github.event.pull_request.number }}

      - name: Deploy to SWA preview
        id: deploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: upload
          app_location: "/"
          output_location: "build"
          api_location: "api"

  e2e_tests:
    needs: deploy_preview
    runs-on: ubuntu-latest
    name: E2E Tests on Preview
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install Playwright
        run: npx playwright install --with-deps chromium

      - name: Wait for preview to be ready
        run: |
          url="${{ needs.deploy_preview.outputs.preview_url }}"
          echo "Waiting for $url to be available..."
          for i in $(seq 1 12); do
            status=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
            if [ "$status" = "200" ]; then
              echo "Preview is ready!"
              break
            fi
            echo "Attempt $i: status=$status, retrying in 10s..."
            sleep 10
          done

      - name: Run E2E tests
        run: npx playwright test
        env:
          PLAYWRIGHT_BASE_URL: ${{ needs.deploy_preview.outputs.preview_url }}

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/

  lighthouse_check:
    needs: deploy_preview
    runs-on: ubuntu-latest
    name: Lighthouse Performance Check
    steps:
      - uses: actions/checkout@v4

      - name: Run Lighthouse
        uses: treosh/lighthouse-ci-action@v11
        with:
          urls: ${{ needs.deploy_preview.outputs.preview_url }}
          uploadArtifacts: true
          temporaryPublicStorage: true
          configPath: ./.lighthouserc.json

  close_preview:
    if: github.event.action == 'closed'
    runs-on: ubuntu-latest
    name: Delete Preview
    steps:
      - name: Close Pull Request
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          action: close
```

---

## Lighthouse Configuration (.lighthouserc.json)

```json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:performance": ["warn", { "minScore": 0.8 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "categories:best-practices": ["warn", { "minScore": 0.85 }],
        "categories:seo": ["warn", { "minScore": 0.8 }]
      }
    }
  }
}
```

---

## Preview Environment App Settings

Preview environments inherit production app settings by default. Override settings for specific environments:

```bash
# Set app settings for a specific PR preview environment
az staticwebapp appsettings set \
  --name my-swa \
  --resource-group rg-swa \
  --environment-name "pr-42" \
  --setting-names \
    API_BASE_URL=https://staging-api.example.com \
    FEATURE_FLAG_NEW_CHECKOUT=true

# List environments
az staticwebapp environment list \
  --name my-swa \
  --resource-group rg-swa

# Get specific environment details
az staticwebapp environment show \
  --name my-swa \
  --resource-group rg-swa \
  --environment-name "pr-42"

# Manually delete a preview environment
az staticwebapp environment delete \
  --name my-swa \
  --resource-group rg-swa \
  --environment-name "pr-42" \
  --yes
```

---

## Branch Policies for Preview Environments

Configure GitHub branch protection rules to require preview deployment success before merging.

**Repository Settings → Branch Protection Rules → main branch**:
```yaml
# Required status checks to pass before merging:
- "Azure Static Web Apps CI/CD / Build and Deploy Job"
- "PR Preview with Quality Gates / E2E Tests on Preview"
- "PR Preview with Quality Gates / Lighthouse Performance Check"

# Additional settings:
- Require branches to be up to date before merging: true
- Require pull request reviews before merging: 1 approving review
- Dismiss stale pull request approvals when new commits are pushed: true
```

---

## Custom Domains for Preview Environments

Preview environments cannot have custom domains bound to them directly. Options for branded preview URLs:

**Option 1: Azure Front Door with path-based routing**
Route `https://preview.example.com/pr/{number}` to the preview URL using Front Door rules.

**Option 2: Informational comment only**
The GitHub Actions workflow automatically posts a PR comment with the preview URL. No custom domain needed for internal review.

**Option 3: SWA Standard tier with `staging` named environment**
```yaml
# Deploy to a named staging environment instead of PR-number-based
- name: Deploy to named staging
  uses: Azure/static-web-apps-deploy@v1
  with:
    azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
    action: upload
    deployment_environment: staging  # Named environment (not PR-based)
    app_location: "/"
    output_location: "build"
```

Named environments get predictable URLs: `https://<hash>-staging.<region>.azurestaticapps.net`

---

## Azure DevOps Pipeline Alternative

```yaml
# azure-pipelines.yml
trigger:
  - main

pr:
  - main

variables:
  isMainBranch: $[eq(variables['Build.SourceBranch'], 'refs/heads/main')]
  isPR: $[eq(variables['Build.Reason'], 'PullRequest')]

stages:
  - stage: Build
    jobs:
      - job: BuildAndDeploy
        pool:
          vmImage: ubuntu-latest
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '20.x'

          - script: npm ci
            displayName: 'Install dependencies'

          - script: npm run build
            displayName: 'Build app'

          - task: AzureStaticWebApp@0
            displayName: 'Deploy to SWA'
            inputs:
              azure_static_web_apps_api_token: $(AZURE_STATIC_WEB_APPS_API_TOKEN)
              app_location: '/'
              output_location: 'build'
              api_location: 'api'
              action: 'upload'
            env:
              CI: true

  - stage: Cleanup
    condition: and(eq(variables.isPR, true), eq(variables['Build.Reason'], 'PullRequest'), eq(variables['System.PullRequest.State'], 'abandoned'))
    jobs:
      - job: ClosePreview
        pool:
          vmImage: ubuntu-latest
        steps:
          - task: AzureStaticWebApp@0
            inputs:
              azure_static_web_apps_api_token: $(AZURE_STATIC_WEB_APPS_API_TOKEN)
              action: 'close'
```

---

## Playwright Test Configuration for Preview URLs

```typescript
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:4280";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  reporter: [["html", { open: "never" }], ["github"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Wait for SWA preview to be ready
  webServer: process.env.CI
    ? undefined  // Use deployed preview URL in CI
    : {
        command: "swa start http://localhost:5173 --api-location ./api",
        url: "http://localhost:4280",
        reuseExistingServer: !process.env.CI,
      },
});
```

---

## Error Codes Table

| Code | Meaning | Remediation |
|------|---------|-------------|
| `ActionFailed: close` | PR close action failed | Verify deployment token is valid; check if environment already deleted |
| `TooManyPreviewEnvironments` | Exceeded max environments for tier | Delete stale PR environments; upgrade to Standard tier |
| `BuildFailed: app_location not found` | `appLocation` path in workflow doesn't exist | Update `app_location` to match repo structure |
| `BuildFailed: output_location not found` | Build output directory not found | Verify `output_location` matches your framework's output directory |
| `AZURE_STATIC_WEB_APPS_API_TOKEN invalid` | Deployment token expired or wrong | Regenerate token from SWA resource; update GitHub secret |
| `Preview URL returns 404` | Build not complete or route not found | Wait for workflow to complete; check `navigationFallback` config |
| `Pull request comment not posted` | `GITHUB_TOKEN` lacks write permissions | Add `pull-requests: write` to job permissions; check repo settings |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|---------------|
| Preview environments (Free tier) | 3 concurrent environments | Close merged/stale PRs; use Standard tier for larger teams |
| Preview environments (Standard tier) | 10 concurrent environments | Implement PR environment cleanup automation |
| SWA deployment token validity | No expiry (until regenerated) | Rotate token annually; store in GitHub Secrets as `AZURE_STATIC_WEB_APPS_API_TOKEN` |
| Build queue wait time | Variable (1-10 minutes) | Optimize build time; use `npm ci` caching in workflow |
| GitHub Actions minutes (free) | 2,000/month per org | Use self-hosted runners for heavy test suites |
| E2E test parallelism | Governed by GitHub Actions runner | Use matrix strategy for parallel test sharding |

---

## Common Patterns and Gotchas

**1. Preview environments share production app settings**
By default, preview environments inherit production app settings. This means they may connect to production databases or APIs. Override environment-specific settings using `az staticwebapp appsettings set --environment-name pr-{number}`. For sensitive data, always point preview environments to staging/test backends.

**2. Deployment token security**
The `AZURE_STATIC_WEB_APPS_API_TOKEN` secret grants full deployment access to the SWA resource. Do NOT log it, expose it in PR description, or use it outside GitHub Actions. For public repositories, use OIDC-based authentication instead of deployment tokens (Standard tier feature).

**3. Workflow must handle `closed` event separately**
The PR close job (`action: close`) must be in a separate job with `if: github.event.action == 'closed'`. If it's in the same job as the deploy job, the `close` action deletes the environment that was just deployed. The standard pattern uses two separate jobs.

**4. `repo_token` enables PR comment**
Setting `repo_token: ${{ secrets.GITHUB_TOKEN }}` in the workflow action enables the SWA action to post the preview URL as a PR comment. Without this, you must manually find the preview URL in the workflow logs.

**5. Environment names and PR numbers**
Preview environments are named `pr-{number}` by default. After a PR is merged and the environment deleted, if a new PR gets the same number (edge case in high-PR repos), a new environment is created fresh. There is no accumulation of stale environments for merged PRs.

**6. Long-running PR environments and cost**
Preview environments consume bandwidth (counted toward SWA tier bandwidth). For long-lived PRs (draft PRs, feature branches), consider disabling auto-preview or deleting previews when not actively reviewing to minimize bandwidth costs on Standard tier.

**7. Test isolation from production**
Avoid running destructive E2E tests (creates/updates/deletes) against shared databases — even in preview environments. Use either: (a) a test-specific database connection in preview env settings, (b) isolated test accounts/tenants, or (c) mocked API responses in tests.
