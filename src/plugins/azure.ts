import { z } from "zod";
import { PluginAuth, PluginResult } from "../types.js";
import { BasePlugin } from "./base.js";

const ARM = "https://management.azure.com";

// API versions per resource type
const API_GENERAL = "2022-12-01";
const API_RBAC = "2022-04-01";
const API_TAGS = "2021-04-01";
const API_DEPLOYMENTS = "2021-04-01";
const API_VM = "2023-03-01";
const API_PROVIDERS = "2021-04-01";
const API_POLICY_ASSIGN = "2023-04-01";
const API_POLICY_STATES = "2019-10-01";
const API_METRICS = "2021-05-01-preview";
const API_HEALTH = "2022-10-01";

// ---------------------------------------------------------------------------
// Argument schemas
// ---------------------------------------------------------------------------

const SubscriptionArgs = z.object({
  subscriptionId: z.string().describe("Azure subscription ID"),
});

const ResourceGroupArgs = SubscriptionArgs.extend({
  resourceGroup: z.string().describe("Resource group name"),
});

const GetResourceArgs = ResourceGroupArgs.extend({
  provider: z.string().describe("Resource provider namespace, e.g. Microsoft.Compute"),
  resourceType: z.string().describe("Resource type, e.g. virtualMachines"),
  resourceName: z.string().describe("Resource name"),
  apiVersion: z
    .string()
    .optional()
    .describe("API version override (defaults to 2022-12-01)"),
});

const CreateResourceGroupArgs = SubscriptionArgs.extend({
  name: z.string().describe("Resource group name"),
  location: z.string().describe("Azure region, e.g. eastus"),
  tags: z.record(z.string()).optional().describe("Optional key-value tags"),
});

const CreateOrUpdateResourceArgs = ResourceGroupArgs.extend({
  provider: z.string().describe("Resource provider namespace, e.g. Microsoft.Storage"),
  resourceType: z.string().describe("Resource type, e.g. storageAccounts"),
  resourceName: z.string().describe("Resource name"),
  apiVersion: z.string().describe("API version for this resource type"),
  body: z.record(z.unknown()).describe("Resource definition object (location, sku, properties, etc.)"),
});

const DeleteResourceArgs = ResourceGroupArgs.extend({
  provider: z.string().describe("Resource provider namespace"),
  resourceType: z.string().describe("Resource type"),
  resourceName: z.string().describe("Resource name"),
  apiVersion: z.string().optional().describe("API version override"),
});

const ListResourcesBySubscriptionArgs = SubscriptionArgs.extend({
  filter: z.string().optional().describe("OData $filter expression"),
  top: z.number().int().optional().describe("Max number of results"),
});

const MoveResourcesArgs = SubscriptionArgs.extend({
  sourceResourceGroup: z.string().describe("Source resource group name"),
  targetResourceGroupId: z.string().describe("Target resource group full resource ID"),
  resourceIds: z.array(z.string()).describe("Array of resource IDs to move"),
});

// RBAC
const RoleAssignmentScopeArgs = SubscriptionArgs.extend({
  scope: z.string().optional().describe("Scope path, e.g. /subscriptions/{id}/resourceGroups/{rg}. Defaults to subscription scope."),
});

const CreateRoleAssignmentArgs = SubscriptionArgs.extend({
  scope: z.string().describe("Full scope path for the assignment"),
  principalId: z.string().describe("Object ID of the principal (user, group, or service principal)"),
  roleDefinitionId: z.string().describe("Full resource ID of the role definition"),
  roleAssignmentId: z.string().optional().describe("Optional GUID for the role assignment (auto-generated if omitted)"),
});

const DeleteRoleAssignmentArgs = SubscriptionArgs.extend({
  scope: z.string().describe("Full scope path where the assignment exists"),
  roleAssignmentId: z.string().describe("Role assignment GUID or resource ID"),
});

// Tags
const UpdateResourceTagsArgs = ResourceGroupArgs.extend({
  provider: z.string().describe("Resource provider namespace"),
  resourceType: z.string().describe("Resource type"),
  resourceName: z.string().describe("Resource name"),
  apiVersion: z.string().optional().describe("API version override"),
  tags: z.record(z.string()).describe("Tags to apply"),
  operation: z.enum(["merge", "replace"]).describe("merge: add/update tags; replace: replace all tags"),
});

const ListResourcesByTagArgs = SubscriptionArgs.extend({
  tagName: z.string().describe("Tag key to filter by"),
  tagValue: z.string().optional().describe("Optional tag value to match"),
});

// Locks
const LockScopeArgs = SubscriptionArgs.extend({
  resourceGroup: z.string().optional().describe("Resource group name (omit for subscription-level lock)"),
  scope: z.string().optional().describe("Additional scope path below the resource group"),
});

const CreateLockArgs = SubscriptionArgs.extend({
  resourceGroup: z.string().optional().describe("Resource group name (omit for subscription-level lock)"),
  lockName: z.string().describe("Lock name"),
  level: z.enum(["CanNotDelete", "ReadOnly"]).describe("Lock level"),
  notes: z.string().optional().describe("Optional notes about why the lock exists"),
});

const DeleteLockArgs = SubscriptionArgs.extend({
  resourceGroup: z.string().optional().describe("Resource group name (omit for subscription-level lock)"),
  lockName: z.string().describe("Lock name"),
});

// Deployments
const DeploymentBaseArgs = ResourceGroupArgs.extend({
  deploymentName: z.string().describe("Deployment name"),
});

const CreateDeploymentArgs = DeploymentBaseArgs.extend({
  template: z.record(z.unknown()).describe("ARM template object"),
  parameters: z.record(z.unknown()).optional().describe("ARM parameters object"),
  mode: z.enum(["Incremental", "Complete"]).optional().default("Incremental").describe("Deployment mode (default: Incremental)"),
});

const ValidateDeploymentArgs = DeploymentBaseArgs.extend({
  template: z.record(z.unknown()).describe("ARM template object"),
  parameters: z.record(z.unknown()).optional().describe("ARM parameters object"),
});

// VMs
const VmArgs = ResourceGroupArgs.extend({
  vmName: z.string().describe("Virtual machine name"),
});

const StopVmArgs = VmArgs.extend({
  deallocate: z.boolean().optional().describe("If true, deallocate (stop billing); if false, power off without deallocation (default: true)"),
});

// Discovery
const ListProvidersArgs = SubscriptionArgs.extend({
  expand: z.string().optional().describe("Optional expand parameter, e.g. 'resourceTypes/aliases'"),
});

// Policy
const PolicyScopeArgs = SubscriptionArgs.extend({
  scope: z.string().optional().describe("Scope path for policy assignments. Defaults to subscription scope."),
});

// Metrics
const MetricDefinitionsArgs = z.object({
  resourceId: z.string().describe("Full Azure resource ID"),
});

const GetMetricsArgs = z.object({
  resourceId: z.string().describe("Full Azure resource ID"),
  metricNames: z.array(z.string()).describe("List of metric names to retrieve"),
  timespan: z.string().describe("ISO 8601 interval, e.g. PT1H or 2024-01-01T00:00:00Z/2024-01-02T00:00:00Z"),
  interval: z.string().optional().describe("Aggregation granularity, e.g. PT1M, PT5M, PT1H"),
  aggregation: z.enum(["Average", "Count", "Maximum", "Minimum", "Total"]).optional().describe("Aggregation type"),
});

// Service Health
const ServiceHealthArgs = SubscriptionArgs.extend({
  filter: z.string().optional().describe("OData $filter expression, e.g. \"EventType eq 'ServiceIssue'\""),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resourceUrl(
  subscriptionId: string,
  resourceGroup: string,
  provider: string,
  resourceType: string,
  resourceName: string,
  apiVersion: string
): string {
  return `${ARM}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/${provider}/${resourceType}/${resourceName}?api-version=${apiVersion}`;
}

function rgLockBase(subscriptionId: string, resourceGroup?: string): string {
  if (resourceGroup) {
    return `${ARM}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Authorization/locks`;
  }
  return `${ARM}/subscriptions/${subscriptionId}/providers/Microsoft.Authorization/locks`;
}

/**
 * Microsoft Azure plugin.
 *
 * Exposes tools for subscription, resource group, resource, RBAC, tags,
 * locks, deployments, VMs, discovery, policy, metrics, and service health.
 */
export class AzurePlugin extends BasePlugin {
  constructor(auth: PluginAuth) {
    super(auth);
  }

  async callTool(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<PluginResult> {
    try {
      switch (toolName) {
        // ---------------------------------------------------------------
        // Subscriptions
        // ---------------------------------------------------------------
        case "azure_list_subscriptions": {
          const url = `${ARM}/subscriptions?api-version=${API_GENERAL}`;
          return this.ok(await this.graphGet(url));
        }

        // ---------------------------------------------------------------
        // Resource Groups
        // ---------------------------------------------------------------
        case "azure_list_resource_groups": {
          const { subscriptionId } = SubscriptionArgs.parse(args);
          const url = `${ARM}/subscriptions/${subscriptionId}/resourcegroups?api-version=${API_GENERAL}`;
          return this.ok(await this.graphGet(url));
        }

        case "azure_create_resource_group": {
          const { subscriptionId, name, location, tags } = CreateResourceGroupArgs.parse(args);
          const url = `${ARM}/subscriptions/${subscriptionId}/resourcegroups/${name}?api-version=${API_GENERAL}`;
          return this.ok(await this.graphPut(url, { location, tags: tags ?? {} }));
        }

        case "azure_delete_resource_group": {
          const { subscriptionId, resourceGroup } = ResourceGroupArgs.parse(args);
          const url = `${ARM}/subscriptions/${subscriptionId}/resourcegroups/${resourceGroup}?api-version=${API_GENERAL}`;
          await this.graphDelete(url);
          return this.ok({ deleted: true, resourceGroup });
        }

        // ---------------------------------------------------------------
        // Resources
        // ---------------------------------------------------------------
        case "azure_list_resources": {
          const { subscriptionId, resourceGroup } = ResourceGroupArgs.parse(args);
          const url = `${ARM}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/resources?api-version=${API_GENERAL}`;
          return this.ok(await this.graphGet(url));
        }

        case "azure_list_resources_by_subscription": {
          const { subscriptionId, filter, top } = ListResourcesBySubscriptionArgs.parse(args);
          let url = `${ARM}/subscriptions/${subscriptionId}/resources?api-version=${API_GENERAL}`;
          if (filter) url += `&$filter=${encodeURIComponent(filter)}`;
          if (top) url += `&$top=${top}`;
          return this.ok(await this.graphGet(url));
        }

        case "azure_get_resource": {
          const { subscriptionId, resourceGroup, provider, resourceType, resourceName, apiVersion } =
            GetResourceArgs.parse(args);
          const url = resourceUrl(subscriptionId, resourceGroup, provider, resourceType, resourceName, apiVersion ?? API_GENERAL);
          return this.ok(await this.graphGet(url));
        }

        case "azure_create_or_update_resource": {
          const { subscriptionId, resourceGroup, provider, resourceType, resourceName, apiVersion, body } =
            CreateOrUpdateResourceArgs.parse(args);
          const url = resourceUrl(subscriptionId, resourceGroup, provider, resourceType, resourceName, apiVersion);
          return this.ok(await this.graphPut(url, body));
        }

        case "azure_delete_resource": {
          const { subscriptionId, resourceGroup, provider, resourceType, resourceName, apiVersion } =
            DeleteResourceArgs.parse(args);
          const url = resourceUrl(subscriptionId, resourceGroup, provider, resourceType, resourceName, apiVersion ?? API_GENERAL);
          await this.graphDelete(url);
          return this.ok({ deleted: true, resourceName });
        }

        case "azure_move_resources": {
          const { subscriptionId, sourceResourceGroup, targetResourceGroupId, resourceIds } =
            MoveResourcesArgs.parse(args);
          const url = `${ARM}/subscriptions/${subscriptionId}/resourceGroups/${sourceResourceGroup}/moveResources?api-version=${API_GENERAL}`;
          return this.ok(await this.graphPost(url, { targetResourceGroup: targetResourceGroupId, resources: resourceIds }));
        }

        // ---------------------------------------------------------------
        // RBAC
        // ---------------------------------------------------------------
        case "azure_list_role_assignments": {
          const { subscriptionId, scope } = RoleAssignmentScopeArgs.parse(args);
          const scopePath = scope ?? `/subscriptions/${subscriptionId}`;
          const url = `${ARM}${scopePath}/providers/Microsoft.Authorization/roleAssignments?api-version=${API_RBAC}`;
          return this.ok(await this.graphGet(url));
        }

        case "azure_create_role_assignment": {
          const { scope, principalId, roleDefinitionId, roleAssignmentId } =
            CreateRoleAssignmentArgs.parse(args);
          const assignmentId = roleAssignmentId ?? crypto.randomUUID();
          const url = `${ARM}${scope}/providers/Microsoft.Authorization/roleAssignments/${assignmentId}?api-version=${API_RBAC}`;
          return this.ok(await this.graphPut(url, {
            properties: { roleDefinitionId, principalId },
          }));
        }

        case "azure_delete_role_assignment": {
          const { scope, roleAssignmentId } = DeleteRoleAssignmentArgs.parse(args);
          const url = `${ARM}${scope}/providers/Microsoft.Authorization/roleAssignments/${roleAssignmentId}?api-version=${API_RBAC}`;
          await this.graphDelete(url);
          return this.ok({ deleted: true, roleAssignmentId });
        }

        case "azure_list_role_definitions": {
          const { subscriptionId, scope } = RoleAssignmentScopeArgs.parse(args);
          const scopePath = scope ?? `/subscriptions/${subscriptionId}`;
          const url = `${ARM}${scopePath}/providers/Microsoft.Authorization/roleDefinitions?api-version=${API_RBAC}`;
          return this.ok(await this.graphGet(url));
        }

        // ---------------------------------------------------------------
        // Tags
        // ---------------------------------------------------------------
        case "azure_list_tag_names": {
          const { subscriptionId } = SubscriptionArgs.parse(args);
          const url = `${ARM}/subscriptions/${subscriptionId}/tagNames?api-version=${API_TAGS}`;
          return this.ok(await this.graphGet(url));
        }

        case "azure_update_resource_tags": {
          const { subscriptionId, resourceGroup, provider, resourceType, resourceName, apiVersion, tags, operation } =
            UpdateResourceTagsArgs.parse(args);
          const url = resourceUrl(subscriptionId, resourceGroup, provider, resourceType, resourceName, apiVersion ?? API_GENERAL);
          const method = operation === "replace" ? this.graphPut.bind(this) : this.graphPatch.bind(this);
          return this.ok(await method(url, { tags }));
        }

        case "azure_list_resources_by_tag": {
          const { subscriptionId, tagName, tagValue } = ListResourcesByTagArgs.parse(args);
          let filter = `tagName eq '${tagName}'`;
          if (tagValue) filter += ` and tagValue eq '${tagValue}'`;
          const url = `${ARM}/subscriptions/${subscriptionId}/resources?api-version=${API_GENERAL}&$filter=${encodeURIComponent(filter)}`;
          return this.ok(await this.graphGet(url));
        }

        // ---------------------------------------------------------------
        // Locks
        // ---------------------------------------------------------------
        case "azure_list_locks": {
          const { subscriptionId, resourceGroup } = LockScopeArgs.parse(args);
          const url = `${rgLockBase(subscriptionId, resourceGroup)}?api-version=${API_GENERAL}`;
          return this.ok(await this.graphGet(url));
        }

        case "azure_create_lock": {
          const { subscriptionId, resourceGroup, lockName, level, notes } = CreateLockArgs.parse(args);
          const url = `${rgLockBase(subscriptionId, resourceGroup)}/${lockName}?api-version=${API_GENERAL}`;
          return this.ok(await this.graphPut(url, {
            properties: { level, notes: notes ?? "" },
          }));
        }

        case "azure_delete_lock": {
          const { subscriptionId, resourceGroup, lockName } = DeleteLockArgs.parse(args);
          const url = `${rgLockBase(subscriptionId, resourceGroup)}/${lockName}?api-version=${API_GENERAL}`;
          await this.graphDelete(url);
          return this.ok({ deleted: true, lockName });
        }

        // ---------------------------------------------------------------
        // Deployments
        // ---------------------------------------------------------------
        case "azure_validate_deployment": {
          const { subscriptionId, resourceGroup, deploymentName, template, parameters } =
            ValidateDeploymentArgs.parse(args);
          const url = `${ARM}/subscriptions/${subscriptionId}/resourcegroups/${resourceGroup}/providers/Microsoft.Resources/deployments/${deploymentName}/validate?api-version=${API_DEPLOYMENTS}`;
          return this.ok(await this.graphPost(url, {
            properties: {
              mode: "Incremental",
              template,
              parameters: parameters ?? {},
            },
          }));
        }

        case "azure_create_deployment": {
          const { subscriptionId, resourceGroup, deploymentName, template, parameters, mode } =
            CreateDeploymentArgs.parse(args);
          const url = `${ARM}/subscriptions/${subscriptionId}/resourcegroups/${resourceGroup}/providers/Microsoft.Resources/deployments/${deploymentName}?api-version=${API_DEPLOYMENTS}`;
          return this.ok(await this.graphPut(url, {
            properties: {
              mode: mode ?? "Incremental",
              template,
              parameters: parameters ?? {},
            },
          }));
        }

        case "azure_get_deployment_status": {
          const { subscriptionId, resourceGroup, deploymentName } = DeploymentBaseArgs.parse(args);
          const deployUrl = `${ARM}/subscriptions/${subscriptionId}/resourcegroups/${resourceGroup}/providers/Microsoft.Resources/deployments/${deploymentName}?api-version=${API_DEPLOYMENTS}`;
          const opsUrl = `${ARM}/subscriptions/${subscriptionId}/resourcegroups/${resourceGroup}/providers/Microsoft.Resources/deployments/${deploymentName}/operations?api-version=${API_DEPLOYMENTS}`;
          const [deployment, operations] = await Promise.all([
            this.graphGet(deployUrl),
            this.graphGet(opsUrl),
          ]);
          return this.ok({ deployment, operations });
        }

        case "azure_list_deployments": {
          const { subscriptionId, resourceGroup } = ResourceGroupArgs.parse(args);
          const url = `${ARM}/subscriptions/${subscriptionId}/resourcegroups/${resourceGroup}/providers/Microsoft.Resources/deployments?api-version=${API_DEPLOYMENTS}`;
          return this.ok(await this.graphGet(url));
        }

        // ---------------------------------------------------------------
        // Virtual Machines
        // ---------------------------------------------------------------
        case "azure_list_vms": {
          const { subscriptionId, resourceGroup } = ResourceGroupArgs.parse(args);
          const url = `${ARM}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Compute/virtualMachines?api-version=${API_VM}`;
          return this.ok(await this.graphGet(url));
        }

        case "azure_get_vm_status": {
          const { subscriptionId, resourceGroup, vmName } = VmArgs.parse(args);
          const url = `${ARM}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Compute/virtualMachines/${vmName}/instanceView?api-version=${API_VM}`;
          return this.ok(await this.graphGet(url));
        }

        case "azure_start_vm": {
          const { subscriptionId, resourceGroup, vmName } = VmArgs.parse(args);
          const url = `${ARM}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Compute/virtualMachines/${vmName}/start?api-version=${API_VM}`;
          return this.ok(await this.graphPost(url, {}));
        }

        case "azure_stop_vm": {
          const { subscriptionId, resourceGroup, vmName, deallocate } = StopVmArgs.parse(args);
          const action = (deallocate ?? true) ? "deallocate" : "powerOff";
          const url = `${ARM}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Compute/virtualMachines/${vmName}/${action}?api-version=${API_VM}`;
          return this.ok(await this.graphPost(url, {}));
        }

        case "azure_restart_vm": {
          const { subscriptionId, resourceGroup, vmName } = VmArgs.parse(args);
          const url = `${ARM}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Compute/virtualMachines/${vmName}/restart?api-version=${API_VM}`;
          return this.ok(await this.graphPost(url, {}));
        }

        // ---------------------------------------------------------------
        // Discovery
        // ---------------------------------------------------------------
        case "azure_list_locations": {
          const { subscriptionId } = SubscriptionArgs.parse(args);
          const url = `${ARM}/subscriptions/${subscriptionId}/locations?api-version=${API_GENERAL}`;
          return this.ok(await this.graphGet(url));
        }

        case "azure_list_providers": {
          const { subscriptionId, expand } = ListProvidersArgs.parse(args);
          let url = `${ARM}/subscriptions/${subscriptionId}/providers?api-version=${API_PROVIDERS}`;
          if (expand) url += `&$expand=${encodeURIComponent(expand)}`;
          return this.ok(await this.graphGet(url));
        }

        case "azure_get_provider_resource_types": {
          const { subscriptionId, ...rest } = ListProvidersArgs.parse(args);
          const provider = (args as Record<string, string>).provider;
          const url = `${ARM}/subscriptions/${subscriptionId}/providers/${provider}?api-version=${API_PROVIDERS}&$expand=resourceTypes/aliases`;
          return this.ok(await this.graphGet(url));
        }

        // ---------------------------------------------------------------
        // Policy
        // ---------------------------------------------------------------
        case "azure_list_policy_assignments": {
          const { subscriptionId, scope } = PolicyScopeArgs.parse(args);
          const scopePath = scope ?? `/subscriptions/${subscriptionId}`;
          const url = `${ARM}${scopePath}/providers/Microsoft.Authorization/policyAssignments?api-version=${API_POLICY_ASSIGN}`;
          return this.ok(await this.graphGet(url));
        }

        case "azure_get_policy_compliance_summary": {
          const { subscriptionId } = SubscriptionArgs.parse(args);
          const url = `${ARM}/subscriptions/${subscriptionId}/providers/Microsoft.PolicyInsights/policyStates/latest/summarize?api-version=${API_POLICY_STATES}`;
          return this.ok(await this.graphPost(url, {}));
        }

        // ---------------------------------------------------------------
        // Metrics
        // ---------------------------------------------------------------
        case "azure_list_metric_definitions": {
          const { resourceId } = MetricDefinitionsArgs.parse(args);
          const url = `${ARM}${resourceId}/providers/Microsoft.Insights/metricDefinitions?api-version=${API_METRICS}`;
          return this.ok(await this.graphGet(url));
        }

        case "azure_get_resource_metrics": {
          const { resourceId, metricNames, timespan, interval, aggregation } = GetMetricsArgs.parse(args);
          let url = `${ARM}${resourceId}/providers/Microsoft.Insights/metrics?api-version=${API_METRICS}`;
          url += `&metricnames=${encodeURIComponent(metricNames.join(","))}`;
          url += `&timespan=${encodeURIComponent(timespan)}`;
          if (interval) url += `&interval=${interval}`;
          if (aggregation) url += `&aggregation=${aggregation}`;
          return this.ok(await this.graphGet(url));
        }

        // ---------------------------------------------------------------
        // Service Health
        // ---------------------------------------------------------------
        case "azure_list_service_health_events": {
          const { subscriptionId, filter } = ServiceHealthArgs.parse(args);
          let url = `${ARM}/subscriptions/${subscriptionId}/providers/Microsoft.ResourceHealth/events?api-version=${API_HEALTH}`;
          if (filter) url += `&$filter=${encodeURIComponent(filter)}`;
          return this.ok(await this.graphGet(url));
        }

        default:
          return this.fail(`Unknown tool: ${toolName}`);
      }
    } catch (err) {
      return this.fail(err instanceof Error ? err.message : String(err));
    }
  }
}
