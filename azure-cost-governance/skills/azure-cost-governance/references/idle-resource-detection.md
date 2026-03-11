# Azure Idle Resource Detection — Deep Reference

## Overview

Idle resource detection identifies underutilized or abandoned Azure resources to reduce unnecessary costs. This reference covers detection patterns for the most common idle resource categories: stopped VMs with premium disks, unattached managed disks, unused public IPs, empty App Service Plans, and orphaned load balancers. Includes reversibility classification and estimated savings calculations.

## REST API Endpoints for Resource Inventory

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|---|---|---|---|---|
| POST | `/subscriptions/{id}/providers/Microsoft.CostManagement/query` | Cost Management Reader | Group by ResourceId | Find resources with near-zero cost |
| GET | `/subscriptions/{id}/providers/Microsoft.Compute/disks` | Reader | `$filter=diskState eq 'Unattached'` | Find unattached managed disks |
| GET | `/subscriptions/{id}/providers/Microsoft.Compute/virtualMachines` | Reader | `$expand=instanceView` | Get VM power states |
| GET | `/subscriptions/{id}/providers/Microsoft.Network/publicIPAddresses` | Reader | `$filter=properties/ipConfiguration eq null` | Find unassociated PIPs |
| GET | `/subscriptions/{id}/providers/Microsoft.Network/loadBalancers` | Reader | — | Find LBs with empty backend pools |
| GET | `/subscriptions/{id}/providers/Microsoft.Web/serverFarms` | Reader | — | Find empty App Service Plans |
| GET | `/subscriptions/{id}/providers/Microsoft.Advisor/recommendations` | Reader | `$filter=category eq 'Cost'` | Get Advisor cost recommendations |

Base: `https://management.azure.com`

## Azure CLI Detection Patterns

```bash
# Find stopped (deallocated) VMs — billed for premium disk, not compute
az vm list \
  --subscription "$SUBSCRIPTION_ID" \
  --show-details \
  --query "[?powerState=='VM deallocated'].{Name:name, RG:resourceGroup, OS:storageProfile.osDisk.managedDisk.storageAccountType, Size:hardwareProfile.vmSize}" \
  --output table

# Find VMs running with low CPU utilization (requires metrics — use Advisor instead)
az advisor recommendation list \
  --category Cost \
  --output table \
  --query "[?impactedField=='Microsoft.Compute/virtualMachines'].{Name:impactedValue, Description:shortDescription.solution, Savings:extendedProperties.savingsAmount}"

# Find unattached managed disks
az disk list \
  --subscription "$SUBSCRIPTION_ID" \
  --query "[?diskState=='Unattached'].{Name:name, RG:resourceGroup, SKU:sku.name, SizeGB:diskSizeGb}" \
  --output table

# Estimate cost of unattached disks
az disk list \
  --subscription "$SUBSCRIPTION_ID" \
  --query "[?diskState=='Unattached'].{Name:name, SKU:sku.name, SizeGB:diskSizeGb}" \
  --output json | \
  jq -r '.[] | "\(.Name): \(.SKU) \(.SizeGB)GB"'
# Premium_LRS P10 (128GB) = ~$18/month, P30 (1TB) = ~$135/month

# Find unassociated public IP addresses
az network public-ip list \
  --subscription "$SUBSCRIPTION_ID" \
  --query "[?!ipConfiguration].{Name:name, RG:resourceGroup, SKU:sku.name, AllocationMethod:publicIpAllocationMethod}" \
  --output table
# Standard SKU unattached PIP: ~$3.65/month

# Find load balancers with empty backend pools
az network lb list \
  --subscription "$SUBSCRIPTION_ID" \
  --output json | \
  jq -r '.[] | select(.backendAddressPools | all(.backendIPConfigurations == null or .backendIPConfigurations == [])) | "\(.name): \(.resourceGroup)"'

# Find empty App Service Plans (no web apps)
az appservice plan list \
  --subscription "$SUBSCRIPTION_ID" \
  --query "[].{Name:name, RG:resourceGroup, SKU:sku.tier, Apps:numberOfSites}" \
  --output table
# Filter for Apps=0 or low number

# Find unused NAT Gateways (no subnet associations)
az network nat gateway list \
  --subscription "$SUBSCRIPTION_ID" \
  --query "[?!subnets || subnets==[]].{Name:name, RG:resourceGroup}" \
  --output table

# Find empty Storage Accounts (zero blobs, minimal cost)
az storage account list \
  --subscription "$SUBSCRIPTION_ID" \
  --query "[].{Name:name, RG:resourceGroup, Kind:kind, AccessTier:accessTier}" \
  --output table
# Follow up: check blob count and last write time per account
```

## Azure Resource Graph Queries for Idle Resources

Resource Graph queries run across all subscriptions in a single call and are faster than per-resource ARM list calls.

```bash
# Unattached managed disks
az graph query -q "Resources | where type == 'microsoft.compute/disks' | where properties.diskState == 'Unattached' | project name, resourceGroup, sku.name, properties.diskSizeGB, location" --output table

# Deallocated VMs still incurring disk costs
az graph query -q "Resources | where type == 'microsoft.compute/virtualMachines' | where properties.extended.instanceView.powerState.code == 'PowerState/deallocated' | project name, resourceGroup, location" --output table

# Empty App Service Plans (no hosted apps)
az graph query -q "Resources | where type == 'microsoft.web/serverfarms' | where properties.numberOfSites == 0 | project name, resourceGroup, sku.name, location" --output table

# Public IPs with no association
az graph query -q "Resources | where type == 'microsoft.network/publicipaddresses' | where isnull(properties.ipConfiguration) | project name, resourceGroup, properties.ipAddress, location" --output table
```

## Azure Advisor Cost Recommendations (CLI)

```bash
# List all cost recommendations
az advisor recommendation list --category Cost --output table

# Detailed view with savings estimates
az advisor recommendation list --category Cost \
  --query "[].{Impact:impact, Problem:shortDescription.problem, Solution:shortDescription.solution, Savings:extendedProperties.annualSavingsAmount}" \
  --output table

# Lower the CPU threshold for right-sizing recommendations
az advisor configuration update --low-cpu-threshold 5
```

## Reservation Recommendations and Utilization (CLI)

```bash
# Reservation purchase recommendations (shared scope, 30-day lookback)
az consumption reservation recommendation list --scope Shared --look-back-period Last30Days --output table

# Reservation usage details for a specific order
az consumption reservation detail list --reservation-order-id <order-id> \
  --start-date 2026-01-01 --end-date 2026-01-31 --output table

# Daily reservation utilization summaries
az consumption reservation summary list --reservation-order-id <order-id> \
  --grain daily --start-date 2026-01-01 --end-date 2026-01-31 --output table
```

## TypeScript SDK — Idle Resource Scanner

```typescript
import { ComputeManagementClient } from "@azure/arm-compute";
import { NetworkManagementClient } from "@azure/arm-network";
import { ResourceManagementClient } from "@azure/arm-resources";
import { AdvisorManagementClient } from "@azure/arm-advisor";
import { DefaultAzureCredential } from "@azure/identity";

const credential = new DefaultAzureCredential();
const subscriptionId = process.env.SUBSCRIPTION_ID!;

interface IdleResource {
  name: string;
  resourceGroup: string;
  type: string;
  issue: string;
  estimatedMonthlyCost: number;
  reversibility: "safe-to-delete" | "safe-to-stop" | "needs-review";
  action: string;
}

// Find unattached managed disks
async function findUnattachedDisks(): Promise<IdleResource[]> {
  const computeClient = new ComputeManagementClient(credential, subscriptionId);
  const idleDisks: IdleResource[] = [];

  for await (const disk of computeClient.disks.list()) {
    if (disk.diskState === "Unattached") {
      // Estimate monthly cost based on SKU and size
      const monthlyCost = estimateDiskCost(disk.sku?.name ?? "", disk.diskSizeGB ?? 0);

      idleDisks.push({
        name: disk.name ?? "unknown",
        resourceGroup: disk.id?.split("/resourceGroups/")[1]?.split("/")[0] ?? "",
        type: "Managed Disk",
        issue: `Unattached disk (${disk.sku?.name}, ${disk.diskSizeGB} GB)`,
        estimatedMonthlyCost: monthlyCost,
        reversibility: "safe-to-delete",
        action: `az disk delete --name "${disk.name}" --resource-group <rg> --yes`,
      });
    }
  }

  return idleDisks;
}

// Find unused public IPs
async function findUnusedPublicIPs(): Promise<IdleResource[]> {
  const networkClient = new NetworkManagementClient(credential, subscriptionId);
  const unusedPIPs: IdleResource[] = [];

  for await (const pip of networkClient.publicIPAddresses.listAll()) {
    // An unattached Standard SKU PIP costs ~$3.65/month
    if (!pip.ipConfiguration) {
      unusedPIPs.push({
        name: pip.name ?? "unknown",
        resourceGroup: pip.id?.split("/resourceGroups/")[1]?.split("/")[0] ?? "",
        type: "Public IP",
        issue: `Unassociated public IP (${pip.sku?.name} SKU, ${pip.publicIPAllocationMethod})`,
        estimatedMonthlyCost: pip.sku?.name === "Standard" ? 3.65 : 0,
        reversibility: "safe-to-delete",
        action: `az network public-ip delete --name "${pip.name}" --resource-group <rg>`,
      });
    }
  }

  return unusedPIPs;
}

// Find stopped VMs (deallocated but still have premium disks)
async function findStoppedVMs(): Promise<IdleResource[]> {
  const computeClient = new ComputeManagementClient(credential, subscriptionId);
  const stoppedVMs: IdleResource[] = [];

  for await (const vm of computeClient.virtualMachines.listAll()) {
    const instanceView = await computeClient.virtualMachines.instanceView(
      vm.id?.split("/resourceGroups/")[1]?.split("/")[0] ?? "",
      vm.name ?? ""
    );

    const powerState = instanceView.statuses?.find(s => s.code?.startsWith("PowerState/"))?.code;
    if (powerState === "PowerState/deallocated") {
      // Stopped VMs still pay for premium disks
      const hasPremiumDisk = vm.storageProfile?.osDisk?.managedDisk?.storageAccountType?.includes("Premium");
      stoppedVMs.push({
        name: vm.name ?? "unknown",
        resourceGroup: vm.id?.split("/resourceGroups/")[1]?.split("/")[0] ?? "",
        type: "Virtual Machine",
        issue: `Stopped VM with ${hasPremiumDisk ? "Premium" : "Standard"} disk`,
        estimatedMonthlyCost: hasPremiumDisk ? 50 : 5, // rough estimate
        reversibility: "safe-to-stop",
        action: `Consider deallocating or deleting if no longer needed`,
      });
    }
  }

  return stoppedVMs;
}

// Get Azure Advisor cost recommendations
async function getAdvisorRecommendations(): Promise<IdleResource[]> {
  const advisorClient = new AdvisorManagementClient(credential, subscriptionId);
  const recommendations: IdleResource[] = [];

  for await (const rec of advisorClient.recommendations.list()) {
    if (rec.category === "Cost" && rec.impactedField?.includes("virtualMachines")) {
      const savings = (rec as any).extendedProperties?.savingsAmount ?? 0;
      recommendations.push({
        name: rec.impactedValue ?? "unknown",
        resourceGroup: rec.id?.split("/resourceGroups/")[1]?.split("/")[0] ?? "",
        type: "VM (Advisor)",
        issue: rec.shortDescription?.solution ?? "Underutilized",
        estimatedMonthlyCost: savings,
        reversibility: "needs-review",
        action: rec.shortDescription?.problem ?? "Review and right-size",
      });
    }
  }

  return recommendations;
}

// Main scanner
async function scanForIdleResources() {
  const [disks, pips, vms, advisorRecs] = await Promise.all([
    findUnattachedDisks(),
    findUnusedPublicIPs(),
    findStoppedVMs(),
    getAdvisorRecommendations(),
  ]);

  const all = [...disks, ...pips, ...vms, ...advisorRecs]
    .sort((a, b) => b.estimatedMonthlyCost - a.estimatedMonthlyCost);

  const totalMonthlySavings = all.reduce((sum, r) => sum + r.estimatedMonthlyCost, 0);

  console.log(`Found ${all.length} potentially idle resources`);
  console.log(`Estimated monthly savings: $${totalMonthlySavings.toFixed(2)}`);
  console.log(`Estimated annual savings: $${(totalMonthlySavings * 12).toFixed(2)}`);

  return { resources: all, totalMonthlySavings };
}

function estimateDiskCost(sku: string, sizeGB: number): number {
  // Approximate monthly costs (East US, 2026)
  if (sku.includes("Premium_LRS")) {
    if (sizeGB <= 4) return 0.60;
    if (sizeGB <= 8) return 1.09;
    if (sizeGB <= 16) return 1.96;
    if (sizeGB <= 32) return 3.50;
    if (sizeGB <= 64) return 6.09;
    if (sizeGB <= 128) return 17.92;
    if (sizeGB <= 256) return 31.75;
    if (sizeGB <= 512) return 58.24;
    if (sizeGB <= 1024) return 135.17;
    return 268.10;
  }
  if (sku.includes("StandardSSD_LRS")) return sizeGB * 0.08;
  if (sku.includes("Standard_LRS")) return sizeGB * 0.04;
  return 0;
}
```

## Reversibility Classification

| Resource Type | Reversibility | Caution |
|---|---|---|
| Unattached managed disk | Safe to delete | Verify no manual detach for recovery; check if snapshot exists |
| Unused public IP | Safe to delete | IP may be referenced in external DNS; verify before deletion |
| Empty App Service Plan | Safe to delete | Verify no apps will be deployed shortly |
| Stopped (deallocated) VM | Needs review | VM data and config preserved; disk costs continue until deleted |
| Idle Load Balancer | Needs review | May be reserved for DR; check deployment scripts |
| Unused NAT Gateway | Needs review | May be associated with future subnets |
| Old snapshots | Safe to delete (after review) | Verify no restore requirement; check age policy |
| Empty AKS node pools | Needs review | Scale-down vs removal depends on cluster usage patterns |

## Azure Advisor Integration

```bash
# Get all Cost recommendations with savings
az advisor recommendation list \
  --category Cost \
  --output json | jq -r \
  '.[] | "\(.impactedField): \(.impactedValue) — \(.shortDescription.solution) — Savings: $\(.extendedProperties.savingsAmount // "unknown")/month"'

# Get recommendations for specific resource type
az advisor recommendation list \
  --category Cost \
  --output json | jq -r \
  '.[] | select(.impactedField | contains("virtualMachines")) | "\(.impactedValue): \(.shortDescription.solution)"'

# Apply a specific Advisor recommendation
az advisor recommendation enable \
  --recommendation-id "<recommendation-id>"
```

## Error Codes

| Code | Meaning | Remediation |
|---|---|---|
| ResourceNotFound (404) | Resource was deleted between inventory and action | Re-run scan; skip missing resources |
| ResourceInUse (409) | Disk is attached or PIP is in use | Resource state changed; re-check before deleting |
| DeleteNotAllowed (403) | Resource locked or policy prevents deletion | Remove Azure Policy lock or request exception |
| AuthorizationFailed (403) | Missing Reader or Contributor role | Assign appropriate RBAC role at subscription level |
| RequestThrottled (429) | ARM API rate limit | Add delay between API calls; batch list operations |

## Throttling Limits

| Resource | Limit | Notes |
|---|---|---|
| ARM list calls | 15,000/hour per subscription | Batch scans; avoid polling per-resource |
| Azure Advisor recommendations | Refreshed every 24 hours | Results may be up to 1 day old |
| Cost Management query | ~30/minute | Cache inventory results; don't query per resource |
| Compute instance view | 100/minute | Batch VM power state checks |

## Production Gotchas

- **Stopped VMs still incur disk costs**: A deallocated VM does not pay for compute but continues to pay for OS and data disks. Premium P30 (1 TB) costs ~$135/month even for stopped VMs. Delete VMs that have been stopped for more than 30 days with no scheduled reactivation.
- **Standard public IPs now have a cost when unattached**: As of 2025, all Standard SKU public IP addresses incur an hourly charge ($0.004/hour ≈ $2.90/month) regardless of attachment. This change means previously "free" idle PIPs now accumulate costs.
- **Advisor recommendations lag by up to 14 days**: Azure Advisor refreshes recommendations every 7–14 days. A VM you right-sized last week may still appear in recommendations. Cross-reference with current resource state before acting.
- **Snapshot orphans**: When a VM or disk is deleted, its snapshots are NOT automatically deleted. These can accumulate for years and cost significant money at scale (Standard HDD snapshots are cheap but Premium SSD snapshots are expensive).
- **Empty App Service Plans still cost**: An App Service Plan charges for the underlying VMs even if no apps are running. A P2v3 plan (~$0.20/hour = ~$146/month) costs the same whether it hosts 0 or 10 apps.
- **ACI groups billed per second after start**: Azure Container Instances bill from the moment a container group starts, not when it completes work. Containers that hang or fail to exit incur continuous charges. Implement timeouts and health checks in all ACI jobs.
