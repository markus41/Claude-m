# Azure Containers Plugin

Azure Container Apps, Container Instances, and Container Registry — build, push, deploy, and scale containerized workloads with ACR, Container Apps (with Dapr and KEDA), ACI for one-off tasks, and full CI/CD pipelines.

## What This Plugin Provides

This is a **knowledge plugin** — it gives Claude deep expertise in Azure container services so it can scaffold Dockerfiles, build and push images to ACR, create and deploy Container Apps with Dapr and KEDA autoscaling, run one-off containers in ACI, and guide CI/CD pipelines. It does not contain runtime code, MCP servers, or executable scripts.

## Setup

Run `/setup` to install Docker, Azure CLI, and create an ACR and Container Apps environment:

```
/setup              # Full guided setup
/setup --minimal    # Dependencies only
```

Requires an Azure subscription with Contributor access.

## Commands

| Command | Description |
|---------|-------------|
| `/setup` | Install Docker, Azure CLI, create ACR and Container Apps environment |
| `/acr-build-push` | Build and push a container image to Azure Container Registry |
| `/container-app-create` | Create a new Container App with ingress and scaling |
| `/container-app-deploy` | Deploy a new revision, manage traffic splitting |
| `/container-app-scale` | Configure KEDA scale rules (HTTP, queue, custom) |
| `/aci-run` | Run a container in ACI (quick one-off or scheduled) |

## Agent

| Agent | Description |
|-------|-------------|
| **Container Reviewer** | Reviews container projects for Dockerfile best practices, Container App configuration, security, networking, and resilience |

## Trigger Keywords

The skill activates automatically when conversations mention: `azure container`, `container apps`, `container instances`, `aci`, `acr`, `container registry`, `docker azure`, `dapr`, `container deploy`, `microservices azure`, `keda`, `revision`.

## Author

Markus Ahling
