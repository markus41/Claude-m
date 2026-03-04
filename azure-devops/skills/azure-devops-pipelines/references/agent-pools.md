# Azure DevOps Agent Pools Reference

## Overview

Agent pools provide the compute resources that run pipeline jobs. Azure DevOps supports Microsoft-hosted agents (managed VMs), self-hosted agents (your own machines), and scale set agents (VMSS-based auto-scaling). This reference covers agent types, setup, capabilities, pool management, container jobs, and the REST API.

---

## REST API Endpoints

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/_apis/distributedtask/pools?api-version=7.1` | Agent Pools (Read) | `poolName`, `poolType`, `$top` | List pools (org-scoped) |
| GET | `/_apis/distributedtask/pools/{poolId}?api-version=7.1` | Agent Pools (Read) | — | Get pool details |
| POST | `/_apis/distributedtask/pools?api-version=7.1` | Agent Pools (Manage) | Body: `name`, `poolType` | Create a pool |
| PATCH | `/_apis/distributedtask/pools/{poolId}?api-version=7.1` | Agent Pools (Manage) | Body: `name`, `autoProvision` | Update pool settings |
| DELETE | `/_apis/distributedtask/pools/{poolId}?api-version=7.1` | Agent Pools (Manage) | — | Delete a pool |
| GET | `/_apis/distributedtask/pools/{poolId}/agents?api-version=7.1` | Agent Pools (Read) | `includeCapabilities`, `includeAssignedRequest` | List agents in pool |
| GET | `/_apis/distributedtask/pools/{poolId}/agents/{agentId}?api-version=7.1` | Agent Pools (Read) | `includeCapabilities` | Get agent details |
| PATCH | `/_apis/distributedtask/pools/{poolId}/agents/{agentId}?api-version=7.1` | Agent Pools (Manage) | Body: `enabled`, `userCapabilities` | Enable/disable agent or set capabilities |
| DELETE | `/_apis/distributedtask/pools/{poolId}/agents/{agentId}?api-version=7.1` | Agent Pools (Manage) | — | Remove agent from pool |

**Note**: Pool endpoints are organization-scoped. Use `https://dev.azure.com/{org}/_apis/distributedtask/pools`.

Project-scoped queue endpoints:
```
GET /_apis/distributedtask/queues?api-version=7.1
```

---

## Microsoft-Hosted Agents

Microsoft-hosted agents are managed VMs provisioned fresh for each pipeline job.

### Available Images

| `vmImage` Value | OS | Key Software |
|-----------------|----|-------------|
| `ubuntu-latest` | Ubuntu 22.04 LTS | Docker, Node 18/20, Python 3.10+, .NET 6/8, Java 17/21, Go, Azure CLI |
| `ubuntu-22.04` | Ubuntu 22.04 LTS | Same as ubuntu-latest |
| `ubuntu-24.04` | Ubuntu 24.04 LTS | Latest Ubuntu LTS with updated toolchains |
| `windows-latest` | Windows Server 2022 | Visual Studio 2022, .NET Framework 4.8, Node 18/20, Docker, Azure CLI |
| `windows-2022` | Windows Server 2022 | Same as windows-latest |
| `windows-2019` | Windows Server 2019 | Visual Studio 2019, .NET Framework 4.8 |
| `macos-latest` | macOS 14 (Sonoma) | Xcode 15+, Node 18/20, Python 3.10+, CocoaPods |
| `macos-14` | macOS 14 (Sonoma) | Same as macos-latest |
| `macos-13` | macOS 13 (Ventura) | Xcode 14+, older toolchains |

### Usage in YAML

```yaml
pool:
  vmImage: ubuntu-latest

# Or per-job
jobs:
  - job: BuildLinux
    pool:
      vmImage: ubuntu-latest
  - job: BuildWindows
    pool:
      vmImage: windows-latest
  - job: BuildMac
    pool:
      vmImage: macos-latest
```

### Microsoft-Hosted Agent Characteristics

| Aspect | Value |
|--------|-------|
| Provisioning | Fresh VM per job; clean state guaranteed |
| Disk space | ~14 GB free (Linux), ~10 GB (Windows) |
| RAM | 7 GB (Linux/Windows), 14 GB (macOS) |
| Max job duration (free) | 60 minutes |
| Max job duration (paid) | 360 minutes |
| Network | Azure datacenter; cannot access private VNets without additional config |
| Caching | Use `Cache@2` task for package/dependency caching between runs |

---

## Self-Hosted Agents

Self-hosted agents run on your own infrastructure, giving full control over the environment.

### Setup (Linux)

```bash
# 1. Download the agent
mkdir ~/myagent && cd ~/myagent
curl -fL https://vstsagentpackage.azureedge.net/agent/3.232.1/vsts-agent-linux-x64-3.232.1.tar.gz -o agent.tar.gz
tar xzf agent.tar.gz

# 2. Configure the agent
./config.sh \
  --unattended \
  --url https://dev.azure.com/myorg \
  --auth pat \
  --token $ADO_PAT \
  --pool "Self-Hosted Linux" \
  --agent "$(hostname)" \
  --acceptTeeEula \
  --work _work

# 3. Run as a service
sudo ./svc.sh install
sudo ./svc.sh start
```

### Setup (Windows)

```powershell
# 1. Download and extract the agent
Invoke-WebRequest -Uri "https://vstsagentpackage.azureedge.net/agent/3.232.1/vsts-agent-win-x64-3.232.1.zip" -OutFile agent.zip
Expand-Archive -Path agent.zip -DestinationPath C:\agent

# 2. Configure
cd C:\agent
.\config.cmd --unattended --url https://dev.azure.com/myorg --auth pat --token $env:ADO_PAT --pool "Self-Hosted Windows" --agent $env:COMPUTERNAME --runAsService
```

### Setup (macOS)

```bash
mkdir ~/myagent && cd ~/myagent
curl -fL https://vstsagentpackage.azureedge.net/agent/3.232.1/vsts-agent-osx-x64-3.232.1.tar.gz -o agent.tar.gz
tar xzf agent.tar.gz
./config.sh --url https://dev.azure.com/myorg --auth pat --token $ADO_PAT --pool "Self-Hosted Mac" --agent "$(hostname)"
./svc.sh install
./svc.sh start
```

### Self-Hosted Agent Configuration Options

| Flag | Description |
|------|-------------|
| `--pool` | Agent pool name (must exist) |
| `--agent` | Agent display name |
| `--auth` | Auth type: `pat`, `negotiate`, `alt`, `integrated` |
| `--token` | PAT for authentication |
| `--replace` | Replace existing agent with same name |
| `--acceptTeeEula` | Accept the TEE EULA (Linux/macOS) |
| `--runAsService` | Install as Windows service |
| `--work` | Working directory for builds |
| `--deploymentGroup` | Join a deployment group instead of pool |

---

## Agent Capabilities and Demands

### System Capabilities (Auto-Detected)

Agents auto-detect installed software and report capabilities:
```
Agent.OS: Linux
Agent.Version: 3.232.1
node: /usr/bin/node
npm: /usr/bin/npm
docker: /usr/bin/docker
dotnet: /usr/bin/dotnet
python3: /usr/bin/python3
```

### User Capabilities (Custom)

```bash
# Set via REST API
PATCH /_apis/distributedtask/pools/{poolId}/agents/{agentId}?api-version=7.1
{
  "userCapabilities": {
    "gpu": "nvidia-a100",
    "region": "eastus",
    "tier": "premium"
  }
}
```

### Demands in YAML

```yaml
pool:
  name: Self-Hosted Linux
  demands:
    - docker          # Agent must have docker capability
    - gpu -equals nvidia-a100
    - region -equals eastus
```

---

## Scale Set Agents (VMSS)

Scale set agents use Azure Virtual Machine Scale Sets for auto-scaling.

### Setup

1. Create a VMSS in Azure (use a supported image with the agent pre-installed or auto-install via custom script extension).
2. In Azure DevOps: Organization Settings > Agent Pools > Add pool > Azure virtual machine scale set.
3. Configure scaling:

| Setting | Description |
|---------|-------------|
| Max agents | Maximum VMSS instances |
| Min idle agents | Minimum agents kept warm (idle) |
| Max idle agents | Maximum idle agents before scaling down |
| Recycle after each use | Fresh VM per job (like hosted agents) |
| Grace period | Minutes to wait before deallocating idle agents |

### VMSS Pool in YAML

```yaml
pool:
  name: MyVMSSPool
  demands:
    - Agent.OS -equals Linux
```

---

## Container Jobs

Run a pipeline job inside a Docker container, using the agent as the container host.

```yaml
jobs:
  - job: BuildInContainer
    pool:
      vmImage: ubuntu-latest     # Host agent
    container:
      image: node:20-slim        # Container image
      options: --memory 4g       # Docker run options
    steps:
      - script: node --version
      - script: npm ci
      - script: npm test

# Multiple containers (services)
resources:
  containers:
    - container: redis
      image: redis:7
      ports:
        - 6379:6379
    - container: postgres
      image: postgres:16
      ports:
        - 5432:5432
      env:
        POSTGRES_PASSWORD: testpass

jobs:
  - job: IntegrationTest
    pool:
      vmImage: ubuntu-latest
    services:
      redis: redis
      postgres: postgres
    steps:
      - script: npm run test:integration
        env:
          REDIS_URL: redis://localhost:6379
          DATABASE_URL: postgresql://postgres:testpass@localhost:5432/test
```

---

## Pool Management

### Maintenance Jobs

Configure periodic cleanup on self-hosted agent pools:

```
Organization Settings > Agent Pools > [Pool] > Settings > Maintenance
```

| Setting | Description |
|---------|-------------|
| Enabled | Turn maintenance on/off |
| Schedule | Cron expression (e.g., every Sunday at 2 AM) |
| Max retention | Days to keep working directories |
| Max concurrent | Number of agents running maintenance simultaneously |

### Pool Permissions

| Role | Capabilities |
|------|-------------|
| Reader | View pool and agents |
| Service Account | Use pool in pipelines |
| User | Use pool + manage agents |
| Administrator | Full management including deletion |

```bash
# Grant pipeline access to a pool (project-scoped)
# Navigate: Project Settings > Agent Pools > [Pool] > Security
# Or use the REST API for pipeline authorization
POST /_apis/pipelines/pipelinepermissions/queue/{queueId}?api-version=7.1-preview
{
  "pipelines": [
    { "id": 42, "authorized": true }
  ]
}
```

---

## Error Codes

| Error | Meaning | Remediation |
|-------|---------|-------------|
| `No hosted agents available` | Parallel job limit reached | Wait or purchase additional parallel jobs |
| `Pool does not exist` | Pool name mismatch | Verify pool name in Organization Settings |
| `Agent is offline` | Self-hosted agent not running | Check agent service status; restart if needed |
| `Demands not met` | No agent matches the demands | Install required software or remove demand |
| `Job timeout` | Job exceeded max duration | Optimize job or increase timeoutInMinutes |
| `Container image pull failed` | Docker image not accessible | Verify image name and registry authentication |
| `VMSS provisioning failed` | Azure VMSS cannot scale up | Check Azure subscription quota and VMSS health |

---

## Common Patterns and Gotchas

**1. Microsoft-hosted agents have no persistent state**
Each job gets a fresh VM. Use `Cache@2` task for dependency caching and `PublishPipelineArtifact` to persist outputs between stages.

**2. Self-hosted agents accumulate disk usage**
Configure maintenance jobs to clean working directories. Without maintenance, agents fill up disk space from repeated builds.

**3. Parallel job limits are per-organization**
Free tier: 1 parallel job for private projects (Microsoft-hosted). Self-hosted agents: unlimited parallel jobs but need enough agents.

**4. Container jobs require Docker on the host agent**
The agent must have Docker installed. Microsoft-hosted Ubuntu and Windows agents include Docker. macOS agents do not.

**5. VMSS agents support "fresh agent per job"**
Enable "Recycle after each use" for clean build environments similar to Microsoft-hosted agents but with your custom image.

**6. Agent version updates are automatic for Microsoft-hosted**
Self-hosted agents should be updated manually or via the auto-update feature (enabled by default). Outdated agents may not support new pipeline features.
