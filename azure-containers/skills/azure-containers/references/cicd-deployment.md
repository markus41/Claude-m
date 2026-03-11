# Azure Containers CI/CD and Deployment — Deep Reference

## Overview

This reference covers CI/CD pipelines for Azure container workloads: building and pushing images to Azure Container Registry (ACR), deploying to Container Apps, Container Instances, and AKS using GitHub Actions and Azure DevOps pipelines. Patterns include zero-downtime rolling deployments, blue/green, canary releases, and rollback procedures.

## GitHub Actions — Build and Push to ACR

```yaml
# .github/workflows/build-push.yml
name: Build and Push to ACR

on:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - 'Dockerfile'
  pull_request:
    branches: [main]

env:
  REGISTRY: acrprodeastus.azurecr.io
  IMAGE_NAME: api-service

permissions:
  id-token: write   # for OIDC authentication to Azure
  contents: read

jobs:
  build-push:
    runs-on: ubuntu-latest
    outputs:
      image-tag: ${{ steps.meta.outputs.version }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Azure login (OIDC — no secrets stored)
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Login to Azure Container Registry
        run: az acr login --name acrprodeastus

      - name: Extract Docker metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=,format=short
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:buildcache
          cache-to: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:buildcache,mode=max
          build-args: |
            BUILD_DATE=${{ fromJSON(steps.meta.outputs.json).labels['org.opencontainers.image.created'] }}
            GIT_COMMIT=${{ github.sha }}
```

## GitHub Actions — Deploy to Container Apps

```yaml
# .github/workflows/deploy-container-apps.yml
name: Deploy to Container Apps

on:
  workflow_run:
    workflows: ["Build and Push to ACR"]
    types: [completed]
    branches: [main]

env:
  RESOURCE_GROUP: rg-containers
  APP_NAME: api-service
  REGISTRY: acrprodeastus.azurecr.io
  IMAGE_NAME: api-service

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    environment: production

    steps:
      - name: Azure login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Get image tag from triggering workflow
        id: get-tag
        run: |
          # Get the short SHA of the commit that triggered the build
          echo "TAG=${{ github.event.workflow_run.head_sha }}" | cut -c1-7 >> $GITHUB_OUTPUT

      - name: Deploy new revision to Container Apps
        run: |
          az containerapp update \
            --name ${{ env.APP_NAME }} \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --image "${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ steps.get-tag.outputs.TAG }}"

      - name: Wait for revision to be healthy
        run: |
          # Poll until the new revision is active and healthy
          TIMEOUT=300
          ELAPSED=0
          while [ $ELAPSED -lt $TIMEOUT ]; do
            LATEST_REVISION=$(az containerapp revision list \
              --name ${{ env.APP_NAME }} \
              --resource-group ${{ env.RESOURCE_GROUP }} \
              --query "[?properties.active==\`true\`] | sort_by(@, &properties.createdTime) | [-1].name" \
              -o tsv)

            HEALTH=$(az containerapp revision show \
              --name ${{ env.APP_NAME }} \
              --resource-group ${{ env.RESOURCE_GROUP }} \
              --revision "$LATEST_REVISION" \
              --query "properties.healthState" -o tsv)

            if [ "$HEALTH" = "Healthy" ]; then
              echo "Revision $LATEST_REVISION is healthy"
              break
            fi

            echo "Waiting for healthy revision... (${ELAPSED}s elapsed)"
            sleep 15
            ELAPSED=$((ELAPSED + 15))
          done

          if [ "$HEALTH" != "Healthy" ]; then
            echo "Deployment failed — revision not healthy after ${TIMEOUT}s"
            exit 1
          fi
```

## GitHub Actions — Blue/Green with Traffic Splitting

```yaml
# .github/workflows/deploy-blue-green.yml
name: Blue/Green Deployment

jobs:
  deploy-green:
    runs-on: ubuntu-latest
    steps:
      - name: Azure login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      # Deploy new image but keep old revision active (no traffic yet)
      - name: Deploy green revision (0% traffic)
        run: |
          az containerapp update \
            --name api-service \
            --resource-group rg-containers \
            --image acrprodeastus.azurecr.io/api-service:${{ github.sha }}

          # New revision gets 0% traffic by default when traffic is split
          NEW_REVISION=$(az containerapp revision list \
            --name api-service \
            --resource-group rg-containers \
            --query "sort_by(@, &properties.createdTime)[-1].name" \
            -o tsv)
          echo "NEW_REVISION=$NEW_REVISION" >> $GITHUB_ENV

      # Smoke test the new revision directly (using revision-specific URL)
      - name: Smoke test green revision
        run: |
          REVISION_FQDN=$(az containerapp revision show \
            --name api-service \
            --resource-group rg-containers \
            --revision "$NEW_REVISION" \
            --query "properties.fqdn" -o tsv)

          HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$REVISION_FQDN/api/health")
          if [ "$HTTP_STATUS" != "200" ]; then
            echo "Smoke test failed: HTTP $HTTP_STATUS"
            exit 1
          fi

      # Gradually shift traffic
      - name: Shift 10% traffic to green
        run: |
          BLUE_REVISION=$(az containerapp revision list \
            --name api-service \
            --resource-group rg-containers \
            --query "[?name!=\`$NEW_REVISION\` && properties.active==\`true\`][0].name" \
            -o tsv)

          az containerapp ingress traffic set \
            --name api-service \
            --resource-group rg-containers \
            --revision-weight "${BLUE_REVISION}=90" "${NEW_REVISION}=10"

      - name: Wait and monitor (5 minutes at 10%)
        run: sleep 300

      - name: Complete cutover (100% to green)
        run: |
          az containerapp ingress traffic set \
            --name api-service \
            --resource-group rg-containers \
            --revision-weight "${NEW_REVISION}=100"

          # Deactivate old revision
          az containerapp revision deactivate \
            --name api-service \
            --resource-group rg-containers \
            --revision "$BLUE_REVISION"
```

## Azure DevOps Pipeline — ACR Build and Deploy

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include: [main]
  paths:
    include: [src/**, Dockerfile]

pool:
  vmImage: ubuntu-latest

variables:
  REGISTRY: acrprodeastus.azurecr.io
  IMAGE_NAME: api-service
  IMAGE_TAG: $(Build.SourceVersion)

stages:
  - stage: Build
    jobs:
      - job: BuildAndPush
        steps:
          - task: AzureCLI@2
            displayName: Build and push to ACR
            inputs:
              azureSubscription: 'prod-service-connection'
              scriptType: bash
              scriptLocation: inlineScript
              inlineScript: |
                az acr build \
                  --registry acrprodeastus \
                  --image "$(IMAGE_NAME):$(IMAGE_TAG)" \
                  --image "$(IMAGE_NAME):latest" \
                  .

  - stage: Deploy
    dependsOn: Build
    condition: and(succeeded(), eq(variables['Build.SourceBranchName'], 'main'))
    jobs:
      - deployment: DeployToContainerApps
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureCLI@2
                  displayName: Update Container App
                  inputs:
                    azureSubscription: 'prod-service-connection'
                    scriptType: bash
                    scriptLocation: inlineScript
                    inlineScript: |
                      az containerapp update \
                        --name api-service \
                        --resource-group rg-containers \
                        --image "$(REGISTRY)/$(IMAGE_NAME):$(IMAGE_TAG)"
```

## Revision Labels

```bash
# Add a label to a revision (useful for traffic routing and rollback)
az containerapp revision label add \
  --name api-service \
  --resource-group rg-containers \
  --label stable \
  --revision api-service--v1

# Remove a label
az containerapp revision label remove \
  --name api-service \
  --resource-group rg-containers \
  --label canary
```

## Monitoring and Diagnostics

```bash
# Create diagnostic settings to send Container App logs to Log Analytics
az monitor diagnostic-settings create \
  --resource <containerapp-resource-id> \
  --name "ca-diag" \
  --workspace <workspace-id> \
  --logs '[{"categoryGroup":"allLogs","enabled":true}]'

# Create a metric alert for high CPU usage
az monitor metrics alert create \
  --resource-group rg-containers \
  --name "container-cpu-alert" \
  --scopes <containerapp-resource-id> \
  --condition "avg CpuPercentage > 80" \
  --window-size PT5M \
  --evaluation-frequency PT1M \
  --severity 2 \
  --action <action-group-id>
```

## Rollback Procedures

```bash
# Rollback Container App to previous revision
# List recent revisions
az containerapp revision list \
  --name api-service \
  --resource-group rg-containers \
  --query "[].{Name:name, Active:properties.active, Created:properties.createdTime, Health:properties.healthState}" \
  --output table

# Activate previous revision
PREVIOUS_REVISION="api-service--12345"
az containerapp revision activate \
  --name api-service \
  --resource-group rg-containers \
  --revision "$PREVIOUS_REVISION"

# Route 100% traffic back to previous revision
az containerapp ingress traffic set \
  --name api-service \
  --resource-group rg-containers \
  --revision-weight "${PREVIOUS_REVISION}=100"

# Deactivate the bad revision
az containerapp revision deactivate \
  --name api-service \
  --resource-group rg-containers \
  --revision "api-service--bad-revision"

# For ACR: quarantine a bad image tag
az acr repository update \
  --name acrprodeastus \
  --image "api-service:$BAD_TAG" \
  --quarantine-enabled true
```

## OIDC Setup for GitHub Actions (no stored secrets)

```bash
# Create App Registration for GitHub Actions OIDC
APP_ID=$(az ad app create \
  --display-name "github-actions-aca-deploy" \
  --query appId -o tsv)

SP_ID=$(az ad sp create --id "$APP_ID" --query id -o tsv)

# Add federated credential for main branch
az ad app federated-credential create \
  --id "$APP_ID" \
  --parameters '{
    "name": "github-main-branch",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:contoso/myapp:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# Add federated credential for pull requests
az ad app federated-credential create \
  --id "$APP_ID" \
  --parameters '{
    "name": "github-pull-requests",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:contoso/myapp:pull_request",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# Grant required roles
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
az role assignment create \
  --assignee-object-id "$SP_ID" \
  --assignee-principal-type ServicePrincipal \
  --role AcrPush \
  --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-containers/providers/Microsoft.ContainerRegistry/registries/acrprodeastus"

az role assignment create \
  --assignee-object-id "$SP_ID" \
  --assignee-principal-type ServicePrincipal \
  --role Contributor \
  --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-containers"

# Store in GitHub secrets:
# AZURE_CLIENT_ID = $APP_ID
# AZURE_TENANT_ID = $(az account show --query tenantId -o tsv)
# AZURE_SUBSCRIPTION_ID = $SUBSCRIPTION_ID
```

## Error Codes

| Code | Meaning | Remediation |
|---|---|---|
| AADSTS700016 | OIDC application not found | Verify `AZURE_CLIENT_ID` in secrets matches App Registration |
| UNAUTHORIZED (401) | Push to ACR failed | Verify AcrPush role and `az acr login` step |
| ContainerAppRevisionFailed | New revision exited immediately | Check revision logs with `az containerapp logs show` |
| ImagePullFailed | Cannot pull from ACR | Verify managed identity AcrPull role on Container App |
| WorkflowRunTimedOut | CI/CD pipeline exceeded time limit | Optimize build steps; use layer caching |
| FederatedCredentialMismatch | OIDC subject claim does not match | Verify `subject` field in federated credential matches the branch/PR |

## Throttling Limits

| Resource | Limit | Notes |
|---|---|---|
| ACR concurrent builds | 20 simultaneous tasks | Queue builds; use `--no-wait` with polling |
| GitHub Actions concurrent jobs | Depends on plan | Self-hosted runners avoid GitHub quotas |
| Container App revision slots | 100 active revisions | Deactivate old revisions after successful deployment |
| Azure DevOps parallel jobs | 1 (free), unlimited (paid) | Self-hosted agents for high-concurrency pipelines |

## Production Gotchas

- **OIDC over service principal secrets**: Always configure OIDC (federated credentials) for GitHub Actions. This eliminates long-lived client secrets in GitHub secrets, which can be compromised. OIDC tokens are short-lived and scoped to a specific repository and branch.
- **Build caching is critical for speed**: Without Docker layer caching (via registry cache or GitHub Actions cache), every build re-downloads all base image layers. Use `cache-from` and `cache-to` in `docker/build-push-action` to cache layers in ACR.
- **Revision labels for traffic management**: Revisions generated by `az containerapp update` get auto-generated names. Assign explicit revision labels with `--revision-suffix` or `--label` for easier traffic management in blue/green deployments.
- **Zero-downtime requires health probes**: Without a liveness and readiness probe, Container Apps may route traffic to a replica that has not finished starting. Always define health probe endpoints and configure them in the ingress settings.
- **Environment variables are immutable in revisions**: Container Apps creates a new revision when environment variables change. This is by design (immutable revisions). Test configuration changes via a staging revision before routing production traffic.
- **ACR image digest over tags**: Using a mutable tag like `latest` in production means you cannot reproducibly know which exact image version is running. Use the immutable image digest (`@sha256:...`) or a short-SHA tag for production deployments to ensure exact version tracking.
