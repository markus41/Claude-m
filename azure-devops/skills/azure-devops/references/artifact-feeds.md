# Azure Artifacts — Feeds, Packages, and Upstreams Reference

## Overview

Azure Artifacts provides hosted package feeds for NuGet, npm, pip, Maven, Cargo, and Universal Packages. This reference covers the Artifacts REST API, feed permissions, package type configuration, upstream sources, retention policies, symbol server, and how to consume authenticated feeds in CI/CD pipelines.

---

## Artifacts REST API

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/_apis/packaging/feeds?api-version=7.1` | Packaging (Read) | `$top`, `includeUrls` | Lists feeds accessible to caller |
| GET | `/_apis/packaging/feeds/{feedId}?api-version=7.1` | Packaging (Read) | — | Feed GUID or name |
| POST | `/_apis/packaging/feeds?api-version=7.1` | Packaging (Read & Write) | Body: `name`, `upstreamEnabled`, `upstreamSources` | Creates a new feed |
| PATCH | `/_apis/packaging/feeds/{feedId}?api-version=7.1` | Feed Admin | Body: `name`, `description`, `upstreamSources` | Update feed settings |
| DELETE | `/_apis/packaging/feeds/{feedId}?api-version=7.1` | Feed Admin | — | Permanently deletes the feed |
| GET | `/_apis/packaging/feeds/{feedId}/packages?api-version=7.1` | Packaging (Read) | `protocolType`, `$top`, `packageNameQuery` | List packages in a feed |
| GET | `/_apis/packaging/feeds/{feedId}/packages/{packageId}?api-version=7.1` | Packaging (Read) | `includeAllVersions` | Get package details |
| GET | `/_apis/packaging/feeds/{feedId}/packages/{packageId}/versions?api-version=7.1` | Packaging (Read) | `$top`, `isRelease`, `isPrerelease` | List versions of a package |
| PATCH | `/_apis/packaging/feeds/{feedId}/packages/{packageId}/versions/{version}?api-version=7.1` | Packaging (Read & Write) | Body: `views`, `isListed` | Promote a version to a view |
| DELETE | `/_apis/packaging/feeds/{feedId}/packages/{packageId}/versions/{version}?api-version=7.1` | Packaging (Read & Write) | — | Unlists (deprecates) a version |
| GET | `/_apis/packaging/feeds/{feedId}/permissions?api-version=7.1` | Packaging (Read) | — | Get feed permissions |
| PATCH | `/_apis/packaging/feeds/{feedId}/permissions?api-version=7.1` | Feed Admin | Body: array of role assignments | Update feed permissions |
| GET | `/_apis/packaging/feeds/{feedId}/retentionpolicies?api-version=7.1` | Packaging (Read) | — | Get retention policy |
| PUT | `/_apis/packaging/feeds/{feedId}/retentionpolicies?api-version=7.1` | Feed Admin | Body: `countLimit`, `daysToKeepRecentlyDownloadedPackages` | Set retention policy |

---

## Creating a Feed

```typescript
import axios from "axios";

const ORG = "myorg";
const PROJECT = "myproject";
const PAT = process.env.ADO_PAT!;
const auth = Buffer.from(`:${PAT}`).toString("base64");

const HEADERS = {
  Authorization: `Basic ${auth}`,
  "Content-Type": "application/json",
};

const BASE = `https://feeds.dev.azure.com/${ORG}/${PROJECT}/_apis/packaging`;

async function createFeed(name: string) {
  const body = {
    name,
    description: "Corporate package feed",
    upstreamEnabled: true,
    upstreamSources: [
      {
        name: "npmjs.com",
        protocol: "npm",
        location: "https://registry.npmjs.org/",
        upstreamSourceType: "public",
      },
      {
        name: "nuget.org",
        protocol: "nuget",
        location: "https://api.nuget.org/v3/index.json",
        upstreamSourceType: "public",
      },
      {
        name: "pypi.org",
        protocol: "pypi",
        location: "https://pypi.org/simple/",
        upstreamSourceType: "public",
      },
    ],
    hideDeletedPackageVersions: true,
    badgesEnabled: true,
  };

  const response = await axios.post(
    `${BASE}/feeds?api-version=7.1`,
    body,
    { headers: HEADERS }
  );

  return response.data;
}
```

---

## Feed Permissions (Role Assignments)

| Role | Capabilities |
|------|-------------|
| `reader` | Install/download packages only |
| `contributor` | Publish new packages and versions |
| `collaborator` | Contributor + manage package metadata |
| `administrator` | Full feed management including deletion |

```typescript
async function updateFeedPermissions(feedId: string) {
  const permissions = [
    {
      role: "contributor",
      identityDescriptor: "Microsoft.TeamFoundation.ServiceIdentity;<build-service-id>",
      isInheritedRole: false,
    },
    {
      role: "reader",
      identityDescriptor: "Microsoft.TeamFoundation.Group;<project-reader-group-id>",
      isInheritedRole: false,
    },
  ];

  const response = await axios.patch(
    `${BASE}/feeds/${feedId}/permissions?api-version=7.1`,
    permissions,
    { headers: HEADERS }
  );

  return response.data;
}
```

---

## Package Types and Protocol Support

| Protocol | Package Format | Registry URL Pattern |
|----------|---------------|---------------------|
| NuGet | `.nupkg` | `https://pkgs.dev.azure.com/{org}/{project}/_packaging/{feed}/nuget/v3/index.json` |
| npm | `tarball` | `https://pkgs.dev.azure.com/{org}/{project}/_packaging/{feed}/npm/registry/` |
| pip (PyPI) | `.whl`, `.tar.gz` | `https://pkgs.dev.azure.com/{org}/{project}/_packaging/{feed}/pypi/simple/` |
| Maven | `.jar`, `.pom` | `https://pkgs.dev.azure.com/{org}/{project}/_packaging/{feed}/maven/v1` |
| Cargo (Rust) | `.crate` | Sparse registry via `https://pkgs.dev.azure.com/{org}/{project}/_packaging/{feed}/cargo/registry/` |
| Universal Packages | any files | Via `az artifacts universal` CLI |

---

## Upstream Sources

Upstream sources allow a feed to proxy public registries. Packages fetched through upstream are cached in the feed.

```typescript
async function addUpstreamSource(feedId: string) {
  const upstream = {
    upstreamSources: [
      {
        name: "maven-central",
        protocol: "maven",
        location: "https://repo1.maven.org/maven2/",
        upstreamSourceType: "public",
      },
    ],
  };

  const response = await axios.patch(
    `${BASE}/feeds/${feedId}?api-version=7.1`,
    upstream,
    { headers: HEADERS }
  );

  return response.data;
}
```

**Upstream source behavior:**
- First request for a package version fetches from upstream and caches it in the feed permanently.
- Cached copies are immutable — even if deleted upstream, the cached version remains.
- Upstream resolution order matters; list higher-priority upstreams first.

---

## Package Views (Promotion)

Views allow staged release promotion. Default views: `@local` (all published), `@prerelease`, `@release`.

```typescript
async function promotePackage(
  feedId: string,
  packageName: string,
  version: string,
  targetView: "@prerelease" | "@release"
) {
  // First find the packageId
  const pkgList = await axios.get(
    `${BASE}/feeds/${feedId}/packages?protocolType=npm&packageNameQuery=${packageName}&api-version=7.1`,
    { headers: HEADERS }
  );
  const pkg = pkgList.data.value.find(
    (p: { name: string }) => p.name === packageName
  );
  if (!pkg) throw new Error(`Package ${packageName} not found`);

  // Promote to view
  const body = {
    views: {
      op: "add",
      path: "/views/-",
      value: targetView,
    },
  };

  const response = await axios.patch(
    `${BASE}/feeds/${feedId}/npm/packages/${packageName}/versions/${version}?api-version=7.1`,
    body,
    { headers: HEADERS }
  );

  return response.data;
}
```

---

## Retention Policies

```typescript
async function setRetentionPolicy(feedId: string) {
  const policy = {
    countLimit: 10,                                     // Keep last N versions per package
    daysToKeepRecentlyDownloadedPackages: 30,           // Extend retention for recently used
  };

  const response = await axios.put(
    `${BASE}/feeds/${feedId}/retentionpolicies?api-version=7.1`,
    policy,
    { headers: HEADERS }
  );

  return response.data;
}
```

**Retention behavior:**
- Only unlisted versions are subject to automatic deletion.
- Versions promoted to `@prerelease` or `@release` views are pinned and exempt from retention.
- Retention runs asynchronously; deleted packages appear in the recycle bin for 30 days.

---

## Symbol Server

Azure Artifacts includes a symbol server for PDB (Windows) and portable PDB (.NET) publishing.

```yaml
# Publish symbols in a pipeline
- task: PublishSymbols@2
  inputs:
    symbolsFolder: $(Build.SourcesDirectory)
    searchPattern: '**\bin\**\*.pdb'
    symbolServerType: TeamServices
    indexSources: true
    publishSymbols: true
    symbolsArtifactName: Symbols_$(BuildConfiguration)

# Configure Visual Studio to use Azure Artifacts symbol server
# Add to Tools > Options > Debugging > Symbols:
# https://artifacts.dev.azure.com/{org}/_apis/symbol/symsrv
```

---

## Authenticated Feeds in Pipelines

### NuGet (nuget.config)

```xml
<!-- nuget.config at repo root -->
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <packageSources>
    <clear />
    <add key="corporate-feed" value="https://pkgs.dev.azure.com/myorg/myproject/_packaging/corporate-feed/nuget/v3/index.json" />
    <add key="nuget.org" value="https://api.nuget.org/v3/index.json" />
  </packageSources>
</configuration>
```

```yaml
# Pipeline: restore with feed credentials
- task: NuGetAuthenticate@1   # Injects credentials into nuget.config automatically
- task: DotNetCoreCLI@2
  inputs:
    command: restore
    projects: '**/*.csproj'
    feedsToUse: config
    nugetConfigPath: nuget.config
```

### npm (.npmrc)

```ini
# .npmrc at repo root — reference the scope and feed, NOT the PAT
@mycompany:registry=https://pkgs.dev.azure.com/myorg/myproject/_packaging/corporate-feed/npm/registry/
always-auth=true
```

```yaml
# Pipeline: authenticate npm
- task: npmAuthenticate@0
  inputs:
    workingFile: .npmrc
- script: npm install
```

### pip (pip.ini / pip.conf)

```ini
# pip.ini (Windows) or pip.conf (Linux/macOS)
[global]
index-url = https://pkgs.dev.azure.com/myorg/myproject/_packaging/corporate-feed/pypi/simple/
```

```yaml
# Pipeline: authenticate pip
- task: PipAuthenticate@1
  inputs:
    artifactFeeds: myproject/corporate-feed
- script: pip install -r requirements.txt
```

### Maven (settings.xml)

```xml
<!-- settings.xml -->
<settings>
  <servers>
    <server>
      <id>corporate-feed</id>
      <username>AZURE_DEVOPS_TOKEN</username>
      <password>${env.SYSTEM_ACCESSTOKEN}</password>
    </server>
  </servers>
</settings>
```

```yaml
# Pipeline
- task: MavenAuthenticate@0
  inputs:
    artifactFeeds: myproject/corporate-feed
- task: Maven@4
  inputs:
    goals: package
```

---

## Universal Packages

```bash
# Publish a Universal Package
az artifacts universal publish \
  --organization https://dev.azure.com/myorg \
  --project myproject \
  --scope project \
  --feed corporate-feed \
  --name my-tools \
  --version 1.2.3 \
  --description "Internal tools bundle" \
  --path ./dist/

# Download a Universal Package
az artifacts universal download \
  --organization https://dev.azure.com/myorg \
  --project myproject \
  --scope project \
  --feed corporate-feed \
  --name my-tools \
  --version 1.2.3 \
  --path ./tools/
```

---

## Error Codes

| Code / Error | Meaning | Remediation |
|---|---|---|
| `PackageNotFoundException` | Package name or version does not exist | Verify name and version; check if upstream is configured |
| `FeedNotFoundException` | Feed GUID or name not found | Confirm feed scope (project vs. organization-scoped) |
| 401 Unauthorized | PAT missing Packaging scope | Add `Packaging (Read & Write)` to PAT |
| 403 Forbidden | User role insufficient | Grant `contributor` role for publish, `reader` for install |
| `UpstreamSourceUnavailable` | Upstream registry unreachable | Check network/proxy; upstream may be rate-limiting |
| `PackageVersionAlreadyExists` | Immutable version pushed again | Increment version; Azure Artifacts does not allow overwrite |
| `RetentionPolicyViolation` | Version scheduled for deletion | Promote to a view to pin it |
| `SymbolsIndexingFailed` | PDB path mismatch during indexing | Ensure `indexSources: true` and sources are reachable |
| `NuGetAuthorizationException` | nuget.config credentials not injected | Add `NuGetAuthenticate@1` task before restore |
| npm `E401` | npm registry credentials expired | Re-run `npmAuthenticate@0`; check PAT expiry |

---

## Limits

| Resource | Limit | Notes |
|---|---|---|
| Feeds per organization | 1,000 | Contact support for increase |
| Package size (NuGet, npm, pip, Maven) | 1 GB per package file | Universal Packages support up to 4 GB per file |
| Universal Package file count | 200 files per version | Zip or tar the contents to stay under limit |
| Retention: minimum versions to keep | 1 | Cannot set 0; at least 1 version always retained |
| Upstream sources per feed | 50 | Combine internal feeds as upstreams |
| Package name length | 128 characters | Package manager protocols may impose stricter limits |
| Symbol file size | 4 GB | Practical limit for PDB publishing |
| Recycle bin retention | 30 days | Permanently deleted after 30 days |
| API rate limiting | 12,000 requests/5 min | Per user; use `Retry-After` header on 429 |

---

## Common Patterns and Gotchas

**1. Organization-scoped vs. project-scoped feeds**
Feeds can be organization-scoped (shared across all projects) or project-scoped (isolated to a project). The REST API base URL differs: project-scoped uses `{org}/{project}/_apis/packaging/feeds`; organization-scoped uses `{org}/_apis/packaging/feeds`. Mixing them in pipeline tasks causes authentication failures.

**2. `NuGetAuthenticate` must run before any NuGet task**
If you use `DotNetCoreCLI@2` for restore, still add `NuGetAuthenticate@1` first. Without it, the build service identity cannot authenticate even if it has feed permissions.

**3. Upstream packages become immutable after first cache**
Once a package is fetched through upstream and cached, it cannot be updated even if the upstream source releases a newer version with the same version string. This is intentional for build reproducibility.

**4. Package version overwrite is not supported**
Azure Artifacts treats versions as immutable. Publishing the same `name@version` a second time returns a conflict error. Always increment the version number.

**5. Feed views control what consumers see**
By default, packages in `@local` view include all uploaded versions, including pre-release. Consumers pointed at `@release` view only see explicitly promoted versions. Document which view each team should use.

**6. The build service identity needs `contributor` role for publish**
In pipeline tasks, authentication uses the build service identity (`{org} Build Service ({project})`). Grant this identity at least `contributor` role on the feed for publish operations.

**7. Retention policies do not apply to promoted versions**
A version promoted to `@prerelease` or `@release` is exempt from retention cleanup. Only unviewed (unpromoted) versions in `@local` are eligible for automatic deletion.

**8. npm `always-auth=true` is required for Azure Artifacts**
Azure Artifacts npm feeds require authentication for every request (including installs from cache). Set `always-auth=true` in `.npmrc`; without it, the feed returns 401 on first unauthenticated request.

**9. Universal Packages do not support semantic version ranges**
Unlike NuGet or npm, Universal Package downloads require an exact version. You cannot use `>=1.0.0` or `~1.2.3`. Pin exact versions in your pipeline and use feed retention to manage old versions.

**10. Symbols are indexed only when `indexSources: true` is set**
Symbol publishing without source indexing stores the PDBs but does not link them to source files. Debugging with step-through requires source indexing enabled at publish time.
