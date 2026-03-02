---
name: acr-build-push
description: "Build and push a container image to Azure Container Registry"
argument-hint: "--image <name:tag> [--dockerfile <path>] [--acr <registry-name>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Build and Push to ACR

Build a container image and push it to Azure Container Registry.

## Instructions

### 1. Validate Inputs

- `--image` — Image name and tag (e.g., `myapp:1.0.0` or `myapp:latest`). Ask if not provided.
- `--dockerfile` — Path to Dockerfile (default: `./Dockerfile`). Verify it exists.
- `--acr` — ACR registry name (without `.azurecr.io`). Read from `.env` `ACR_NAME` if not provided.

### 2. Option A: ACR Build (Recommended — no local Docker needed)

Use `az acr build` to build the image in the cloud:

```bash
az acr build \
  --registry <acr-name> \
  --image <name:tag> \
  --file <dockerfile-path> \
  .
```

This sends the build context to ACR, builds the image remotely, and stores it in the registry. No local Docker daemon required.

For multi-platform builds:
```bash
az acr build \
  --registry <acr-name> \
  --image <name:tag> \
  --platform linux/amd64,linux/arm64 \
  --file <dockerfile-path> \
  .
```

### 3. Option B: Local Build + Push

If the user prefers local builds:

```bash
# Log in to ACR
az acr login --name <acr-name>

# Build locally
docker build -t <acr-name>.azurecr.io/<name:tag> -f <dockerfile-path> .

# Push to ACR
docker push <acr-name>.azurecr.io/<name:tag>
```

### 4. Verify the Push

```bash
# List repositories
az acr repository list --name <acr-name> --output table

# Show tags for the image
az acr repository show-tags --name <acr-name> --repository <name> --output table

# Show image manifest details
az acr manifest list-metadata --registry <acr-name> --name <name> --output table
```

### 5. Set Up ACR Tasks (Optional)

For automated builds on git push:

```bash
az acr task create \
  --registry <acr-name> \
  --name build-on-push \
  --image <name>:{{.Run.ID}} \
  --context https://github.com/<org>/<repo>.git \
  --file <dockerfile-path> \
  --git-access-token <pat>
```

### 6. Display Summary

Show the user:
- Full image URI: `<acr-name>.azurecr.io/<name:tag>`
- Image digest (from the push output)
- Next steps: deploy with `/container-app-create` or `/container-app-deploy`
