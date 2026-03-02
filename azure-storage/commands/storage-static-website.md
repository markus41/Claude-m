---
name: storage-static-website
description: "Enable static website hosting on Azure Blob Storage, deploy content, and configure CDN with custom domain"
argument-hint: "<enable|deploy|configure-cdn|disable> [--account <name>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Static Website Hosting

Host static websites (HTML, CSS, JS, images) directly from Azure Blob Storage with optional CDN and custom domain.

## Instructions

### 1. Parse the Request

- `<action>` -- One of: `enable`, `deploy`, `configure-cdn`, `disable`. Ask if not provided.
- `--account` -- Storage account name. Ask if not provided.
- `--resource-group` -- Resource group name. Ask if not provided.
- `--source` -- Local directory containing static files (for deploy). Ask if not provided for deploy.

### 2. Enable Static Website

```bash
# Enable static website hosting
az storage blob service-properties update \
  --account-name <storage-name> \
  --static-website true \
  --index-document index.html \
  --404-document 404.html

# Verify static website endpoint
az storage account show \
  --name <storage-name> \
  --resource-group <rg-name> \
  --query "primaryEndpoints.web" \
  --output tsv
```

This creates a `$web` container with public read access for serving static content.

**Note**: The storage account itself should still have `allowBlobPublicAccess: false` for all other containers. The `$web` container is a special case handled by the static website feature.

### 3. Deploy Static Content

**Azure CLI**:
```bash
# Upload all files from a build directory
az storage blob upload-batch \
  --account-name <storage-name> \
  --destination '$web' \
  --source <build-dir> \
  --overwrite true \
  --auth-mode login

# Set correct content types for common file types
az storage blob upload-batch \
  --account-name <storage-name> \
  --destination '$web' \
  --source <build-dir> \
  --overwrite true \
  --auth-mode login \
  --content-type "text/html" \
  --pattern "*.html"
```

**Content type mapping** (set explicitly for correct browser rendering):
| Extension | Content-Type |
|-----------|-------------|
| `.html` | `text/html` |
| `.css` | `text/css` |
| `.js` | `application/javascript` |
| `.json` | `application/json` |
| `.png` | `image/png` |
| `.jpg` | `image/jpeg` |
| `.svg` | `image/svg+xml` |
| `.woff2` | `font/woff2` |

### 4. Configure Azure CDN

```bash
# Create a CDN profile
az cdn profile create \
  --name <cdn-profile-name> \
  --resource-group <rg-name> \
  --sku Standard_Microsoft

# Create a CDN endpoint pointing to the static website
az cdn endpoint create \
  --name <cdn-endpoint-name> \
  --resource-group <rg-name> \
  --profile-name <cdn-profile-name> \
  --origin <storage-name>.z13.web.core.windows.net \
  --origin-host-header <storage-name>.z13.web.core.windows.net \
  --enable-compression true \
  --content-types-to-compress "text/html" "text/css" "application/javascript" "application/json" "image/svg+xml"
```

**Custom domain**:
```bash
# Add custom domain (CNAME must be configured in DNS first)
az cdn custom-domain create \
  --name <custom-domain-name> \
  --resource-group <rg-name> \
  --profile-name <cdn-profile-name> \
  --endpoint-name <cdn-endpoint-name> \
  --hostname www.example.com

# Enable HTTPS on custom domain
az cdn custom-domain enable-https \
  --name <custom-domain-name> \
  --resource-group <rg-name> \
  --profile-name <cdn-profile-name> \
  --endpoint-name <cdn-endpoint-name>
```

**CDN caching rules**:
```bash
# Purge CDN cache after deployment
az cdn endpoint purge \
  --name <cdn-endpoint-name> \
  --resource-group <rg-name> \
  --profile-name <cdn-profile-name> \
  --content-paths "/*"
```

### 5. CI/CD Deployment

Example GitHub Actions workflow for automatic deployment:

```yaml
name: Deploy Static Website
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build
        run: npm ci && npm run build
      - name: Azure Login
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      - name: Upload to $web
        uses: azure/CLI@v2
        with:
          inlineScript: |
            az storage blob upload-batch \
              --account-name ${{ vars.STORAGE_ACCOUNT }} \
              --destination '$web' \
              --source ./dist \
              --overwrite true \
              --auth-mode login
      - name: Purge CDN
        uses: azure/CLI@v2
        with:
          inlineScript: |
            az cdn endpoint purge \
              --name ${{ vars.CDN_ENDPOINT }} \
              --resource-group ${{ vars.RESOURCE_GROUP }} \
              --profile-name ${{ vars.CDN_PROFILE }} \
              --content-paths "/*"
```

### 6. Disable Static Website

```bash
az storage blob service-properties update \
  --account-name <storage-name> \
  --static-website false
```

### 7. Display Summary

Show the user:
- Static website URL (`https://<account>.z13.web.core.windows.net`)
- CDN endpoint URL (if configured)
- Custom domain status (if configured)
- Deployment instructions or CI/CD workflow
- Reminder: SPA routing requires setting index.html as both index and error document
