---
name: Azure DevOps Admin
description: >
  Deep expertise in Azure DevOps administration — security namespaces and permissions,
  dashboards and widgets, wiki management, service hooks and webhooks, Analytics OData,
  Azure DevOps CLI, extensions and marketplace, and artifact feed governance.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - ado security
  - ado permissions
  - ado wiki
  - service hook
  - webhook azure devops
  - ado dashboard
  - ado analytics
  - odata azure devops
  - az devops cli
  - ado extensions
  - ado audit
  - artifact feed
---

# Azure DevOps Admin

## Shared Workflow Routing
- Use the shared workflow spec for deterministic multi-plugin routing: [`workflows/multi-plugin-workflows.md`](../../../workflows/multi-plugin-workflows.md#incident-triage-azure-monitor--azure-functions--azure-devops).

## Overview

Azure DevOps administration covers security, governance, integration, and observability. Security namespaces define granular ACL-based permissions for every resource type (repos, pipelines, areas, iterations). Dashboards aggregate project health via configurable widgets. Wikis provide documentation as code. Service hooks enable event-driven integrations with external systems.

Analytics OData provides rich querying across work items, pipelines, and test results for Power BI dashboards and trend analysis. The Azure DevOps CLI (`az devops`) offers a complete command-line interface. Extensions from the Visual Studio Marketplace add custom functionality.

## REST API — Security

| Method | Endpoint | Key Parameters |
|--------|----------|----------------|
| GET | `/_apis/securitynamespaces?api-version=7.1` | — |
| GET | `/_apis/accesscontrollists/{namespaceId}?api-version=7.1` | `token`, `descriptors` |
| POST | `/_apis/accesscontrolentries/{namespaceId}?api-version=7.1` | Body: `token`, `merge`, `accessControlEntries` |
| DELETE | `/_apis/accesscontrolentries/{namespaceId}?api-version=7.1` | `token`, `descriptors` |

### Key Security Namespace GUIDs

| Namespace | GUID | Token Format |
|-----------|------|--------------|
| Git Repositories | `2e9eb7ed-3c0a-47d4-87c1-0ffdd275fd87` | `repoV2/{projectId}/{repoId}` |
| Build | `33344d9c-fc72-4d6f-aba5-fa317c3b7be8` | `{projectId}` |
| ReleaseManagement | `c788c36e-058b-4f2e-8dac-b15712483ed1` | `{projectId}` |
| CSS (Area paths) | `83e28ad4-2d72-4ceb-97b0-c7726d5502c3` | `vstfs:///Classification/Node/{nodeId}` |
| Iteration | `bf7bfa03-b2b7-47db-8113-fa2e002cc5b1` | `vstfs:///Classification/Node/{nodeId}` |
| ServiceEndpoints | `49b48001-ca20-4adc-8111-5b60c903a50c` | `endpoints/{projectId}/{endpointId}` |

## REST API — Dashboards

| Method | Endpoint | Key Parameters |
|--------|----------|----------------|
| GET | `/_apis/dashboard/dashboards?api-version=7.1-preview` | — |
| POST | `/_apis/dashboard/dashboards?api-version=7.1-preview` | Body: `name`, `description` |
| GET | `/_apis/dashboard/dashboards/{dashboardId}/widgets?api-version=7.1-preview` | — |
| POST | `/_apis/dashboard/dashboards/{dashboardId}/widgets?api-version=7.1-preview` | Body: widget configuration |

## REST API — Wikis

| Method | Endpoint | Key Parameters |
|--------|----------|----------------|
| GET | `/_apis/wiki/wikis?api-version=7.1` | — |
| POST | `/_apis/wiki/wikis?api-version=7.1` | Body: `name`, `type` (projectWiki / codeWiki) |
| GET | `/_apis/wiki/wikis/{wikiId}/pages?path={path}&api-version=7.1` | `path`, `includeContent` |
| PUT | `/_apis/wiki/wikis/{wikiId}/pages?path={path}&api-version=7.1` | Body: `content`; Header: `If-Match: {eTag}` |
| DELETE | `/_apis/wiki/wikis/{wikiId}/pages?path={path}&api-version=7.1` | `comment` |

## REST API — Service Hooks

| Method | Endpoint | Key Parameters |
|--------|----------|----------------|
| GET | `/_apis/hooks/subscriptions?api-version=7.1` | — |
| POST | `/_apis/hooks/subscriptions?api-version=7.1` | Body: `publisherId`, `eventType`, `consumerActionId`, `consumerInputs` |
| GET | `/_apis/hooks/publishers?api-version=7.1` | — |
| GET | `/_apis/hooks/consumers?api-version=7.1` | — |
| POST | `/_apis/hooks/testnotifications/{subscriptionId}?api-version=7.1` | — |

## REST API — Extensions

| Method | Endpoint | Key Parameters |
|--------|----------|----------------|
| GET | `/_apis/extensionmanagement/installedextensions?api-version=7.1-preview` | — |
| POST | `/_apis/extensionmanagement/installedextensions?api-version=7.1-preview` | Body: `publisherName`, `extensionName` |
| DELETE | `/_apis/extensionmanagement/installedextensions/{publisher}/{extension}?api-version=7.1-preview` | — |

## REST API — Artifacts

| Method | Endpoint | Key Parameters |
|--------|----------|----------------|
| GET | `/_apis/packaging/feeds?api-version=7.1` | `$top`, `includeUrls` |
| POST | `/_apis/packaging/feeds?api-version=7.1` | Body: `name`, `upstreamEnabled` |
| GET | `/_apis/packaging/feeds/{feedId}/packages?api-version=7.1` | `protocolType`, `packageNameQuery` |

## Analytics OData

Endpoint: `https://analytics.dev.azure.com/{org}/{project}/_odata/v4.0-preview/`

Key entity sets: `WorkItems`, `WorkItemRevisions`, `PipelineRuns`, `TestRuns`, `TestResults`, `TestResultsDaily`.

Query operators: `$filter`, `$select`, `$expand`, `$orderby`, `$top`, `$apply` (for aggregations).

## Azure DevOps CLI

```bash
# Install
az extension add --name azure-devops

# Configure defaults
az devops configure --defaults organization=https://dev.azure.com/{org} project={project}

# Key command groups
az repos list / create / show
az repos pr create / list / update / complete
az pipelines list / show / run / create
az boards work-item create / show / update
az artifacts universal publish / download

# Escape hatch for any REST API
az devops invoke --area git --resource repositories --api-version 7.1
```

## Best Practices

- Use security namespaces for granular permission control — avoid broad group assignments.
- Configure service hooks for real-time notifications to Teams/Slack channels.
- Create project wikis for living documentation; use code wikis for API docs.
- Use ETag-based concurrency for wiki page updates to prevent lost edits.
- Build custom dashboards per team with sprint burndown, build health, and test trend widgets.
- Use Analytics OData for Power BI dashboards — narrow filters and use `$select` for performance.
- Prefer `az devops` CLI for scripting over raw REST API calls.
- Review extension permissions before installing — extensions can access project data.

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| API surface map, failure modes, limits, safe-default patterns | [`references/operational-knowledge.md`](./references/operational-knowledge.md) |
| Artifact feeds, package types, upstreams, retention, symbols | [`references/artifact-feeds.md`](./references/artifact-feeds.md) |
| Security namespaces, token formats, ACL/ACE patterns, permissions | [`references/security-namespaces.md`](./references/security-namespaces.md) |
| Wiki types, page CRUD, ETag concurrency, page analytics | [`references/wiki-management.md`](./references/wiki-management.md) |
| Service hooks, event types, webhook targets, subscriptions | [`references/service-hooks.md`](./references/service-hooks.md) |
| Dashboard CRUD, widget types, configuration, custom widgets | [`references/dashboards-widgets.md`](./references/dashboards-widgets.md) |
| OData endpoints, entity sets, aggregation queries, Power BI | [`references/analytics-odata.md`](./references/analytics-odata.md) |
| az devops CLI, command groups, invoke escape hatch, recipes | [`references/devops-cli.md`](./references/devops-cli.md) |
| Extension management, marketplace, pipeline decorators, SDK | [`references/extensions-marketplace.md`](./references/extensions-marketplace.md) |
