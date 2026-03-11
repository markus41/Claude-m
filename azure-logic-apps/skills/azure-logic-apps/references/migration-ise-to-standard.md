# Migration: ISE to Standard Logic Apps Reference

## ISE Deprecation Timeline

| Date | Milestone |
|---|---|
| November 2022 | ISE deprecation announced; no new ISE creation in most regions |
| August 31, 2024 | Full ISE retirement; all ISE instances decommissioned |
| Ongoing | Standard Logic Apps (single-tenant) is the designated successor |

After retirement, ISE-hosted workflows stop executing. All must be migrated beforehand.

## ISE vs Standard Feature Parity

| Feature | ISE | Standard | Notes |
|---|---|---|---|
| Dedicated compute | ISE units | App Service Plan WS1-WS3 | Standard uses elastic App Service |
| VNet access | VNet injection (full) | VNet integration + private endpoints | Different networking model |
| Built-in connectors | ISE-versioned | In-process built-in | Standard built-ins are faster |
| Multiple workflows/resource | No (1:1) | Yes (many per app) | Key architectural difference |
| Stateless workflows | No | Yes | Low-latency option |
| Local dev (VS Code) | No | Yes | Full local debug experience |
| Custom .NET code | No | Yes (NuGet) | Custom assemblies |
| Integration account | Dedicated (included) | Linked (separate) | Must relink post-migration |
| Scaling | Manual (ISE units) | Elastic autoscale | More granular |
| Deployment slots | No | Yes | Blue-green support |
| B2B (AS2/X12/EDIFACT) | Yes | Yes | Equivalent |

## Pre-Migration Assessment Checklist

- [ ] Inventory all Logic Apps in the ISE (count, frequency, criticality)
- [ ] Catalog all connectors (built-in, ISE-versioned, managed)
- [ ] Identify ISE-specific connectors needing Standard mapping
- [ ] Document integration account dependencies (schemas, maps, partners, agreements)
- [ ] Map VNet dependencies (subnets, NSGs, private endpoints, on-prem routes)
- [ ] Identify cross-workflow dependencies
- [ ] Catalog API connections and authentication methods
- [ ] Review custom connectors for OpenAPI compatibility
- [ ] Document SLA requirements and performance baselines
- [ ] Inventory monitoring/alerting referencing ISE resources
- [ ] Estimate Standard plan sizing based on ISE unit consumption
- [ ] Plan downtime windows or parallel run strategy

## Inventory ISE Workflows

```bash
# List all workflows referencing the ISE
az rest --method GET \
  --uri "https://management.azure.com/subscriptions/{sub}/providers/Microsoft.Logic/workflows?api-version=2019-05-01" \
  | jq '.value[] | select(.properties.integrationServiceEnvironment.id | test("ISE_NAME"; "i")) | {name, state: .properties.state}'

# Export workflow definitions
for WF in $(az rest --method GET --uri "..." | jq -r '.value[].name'); do
  az rest --method GET --uri ".../workflows/$WF?api-version=2019-05-01" > "export/${WF}.json"
done
```

## Connector Mapping: ISE to Standard

| ISE Connector | Standard Equivalent | Type | Effort |
|---|---|---|---|
| HTTP (ISE) | HTTP (built-in) | Built-in | Minimal |
| Service Bus (ISE) | Service Bus (built-in) | Built-in | Update config |
| Azure Queues (ISE) | Azure Queues (built-in) | Built-in | Update config |
| Azure Blob (ISE) | Azure Blob (built-in) | Built-in | Update config |
| Event Hubs (ISE) | Event Hubs (built-in) | Built-in | Update config |
| SQL Server (ISE) | SQL Server (built-in) | Built-in | Update config |
| Cosmos DB (ISE) | Cosmos DB (built-in) | Built-in | Update config |
| SFTP-SSH (ISE) | SFTP (built-in) | Built-in | Update config |
| IBM MQ (ISE) | IBM MQ (built-in) | Built-in | Update config |
| Office 365 (ISE) | Office 365 (managed) | Managed | Recreate connection |
| SharePoint (ISE) | SharePoint (managed) | Managed | Recreate connection |
| SAP (ISE) | SAP (managed + VNet) | Managed | Requires VNet integration |
| AS2/X12/EDIFACT (ISE) | AS2/X12/EDIFACT (managed) | Managed | Relink integration account |
| Custom connector (ISE) | Custom connector (Standard) | Custom | Recreate with updated auth |

## WDL Conversion Requirements

### Trigger Type Changes

ISE uses `ApiConnection`; Standard built-ins use `ServiceProvider`:

**Before (ISE):**
```json
{ "type": "ApiConnection", "inputs": { "host": { "connection": { "name": "@parameters('$connections')['servicebus']['connectionId']" } }, "method": "get", "path": "/@{encodeURIComponent('myqueue')}/messages/head" }, "recurrence": { "frequency": "Minute", "interval": 1 } }
```

**After (Standard):**
```json
{ "type": "ServiceProvider", "kind": "ServiceBus", "inputs": { "parameters": { "queueName": "myqueue", "isSessionsEnabled": false }, "serviceProviderConfiguration": { "connectionName": "serviceBus", "operationId": "receiveQueueMessages", "serviceProviderId": "/serviceProviders/serviceBus" } } }
```

### Connection Reference Changes

ISE uses `$connections` parameter for all connectors. Standard separates into `connections.json`:

```json
{
  "serviceProviderConnections": {
    "serviceBus": { "parameterValues": { "connectionString": "@appsetting('ServiceBus_ConnectionString')" }, "serviceProvider": { "id": "/serviceProviders/serviceBus" } }
  },
  "managedApiConnections": {
    "office365": { "api": { "id": ".../managedApis/office365" }, "connection": { "id": ".../connections/office365-std" }, "authentication": { "type": "ManagedServiceIdentity" } }
  }
}
```

## Integration Account Migration

1. Integration accounts survive ISE deletion (standalone resources).
2. Link to Standard via app setting: `WORKFLOWS_INTEGRATION_ACCOUNT_ID=...`
3. Verify all schemas, maps, partners, agreements remain intact.
4. Test B2B workflows end-to-end after relinking.
5. Consider upgrading Free tier to Basic/Standard for production SLA.

## VNet Integration

ISE used VNet injection (dedicated /27 subnet). Standard uses:

**Outbound:** VNet integration with `vnetRouteAllEnabled: true`. Subnet: minimum /28, delegated to `Microsoft.Web/serverFarms`.

**Inbound:** Private endpoints targeting the Logic App's `sites` group.

```bicep
resource pe 'Microsoft.Network/privateEndpoints@2023-04-01' = {
  name: '${logicAppName}-pe'
  properties: { subnet: { id: peSubnetId }, privateLinkServiceConnections: [{ name: 'plsc', properties: { privateLinkServiceId: logicApp.id, groupIds: ['sites'] } }] }
}
```

## Step-by-Step Migration (10 Steps)

1. **Assess** -- Run inventory scripts, catalog connectors and dependencies.
2. **Provision infrastructure** -- Deploy App Service Plan (WS1+), Storage, App Insights, VNet integration.
3. **Recreate API connections** -- Create managed connections, authorize OAuth, configure built-in connection strings.
4. **Export ISE definitions** -- Export each workflow's definition JSON.
5. **Convert WDL** -- Replace ISE connector references; change `ApiConnection` to `ServiceProvider` for built-ins.
6. **Create Standard workflows** -- Place `workflow.json` files in project folders.
7. **Deploy and test** -- ZIP deploy; run with test data; compare against ISE baseline.
8. **Update integrations** -- Update webhook URLs, resource IDs referenced by external systems.
9. **Parallel run (optional)** -- Route partial traffic to Standard via APIM or Traffic Manager.
10. **Cutover** -- Disable ISE workflows; route all traffic; monitor 48-72h; decommission ISE.

## Post-Migration Validation

- [ ] All workflows enabled in Standard
- [ ] Trigger URLs updated in all calling systems
- [ ] Each workflow tested with production-like data
- [ ] Connector authentications verified
- [ ] B2B EDI message flow confirmed
- [ ] Integration account linked correctly
- [ ] VNet connectivity to private/on-prem resources validated
- [ ] Monitoring dashboards and alerts target new resources
- [ ] Performance baselines met
- [ ] RBAC and cost monitoring configured

## Rollback Strategy

1. Re-enable ISE workflow (if ISE still running).
2. Revert webhook URLs to ISE callbacks.
3. Disable Standard workflow.
4. Investigate, fix, and retry.

Keep ISE running until all Standard workflows are validated. Do not decommission until validation period completes.

## Common Migration Issues

| Issue | Cause | Solution |
|---|---|---|
| `ConnectionNotFound` | Connection ID not updated | Fix `connections.json` IDs |
| `Unauthorized` | Managed identity not authorized | Add access policy on API connection |
| `Forbidden` on trigger | VNet blocking | Configure private endpoints / access restrictions |
| Different expression results | Minor engine differences | Test edge cases; use `coalesce()` for nulls |
| Higher managed connector latency | ISE had dedicated infra | Switch to built-in connectors where possible |
| Workflow not triggering | Trigger type mismatch | Change `ApiConnection` to `ServiceProvider` |
| B2B decode failures | Integration account not linked | Set `WORKFLOWS_INTEGRATION_ACCOUNT_ID` |
| Missing run history | No diagnostic settings | Create diagnostic settings for Standard app |
| Custom connector auth fails | ISE-scoped config not migrated | Recreate custom connector for Standard |

## Assessment Script

```bash
#!/bin/bash
SUB="your-sub-id"; ISE_RG="your-rg"; ISE_NAME="your-ise"
echo "=== ISE Migration Report ==="

WF_COUNT=$(az rest --method GET --uri "https://management.azure.com/subscriptions/$SUB/providers/Microsoft.Logic/workflows?api-version=2019-05-01" \
  | jq "[.value[] | select(.properties.integrationServiceEnvironment.id | test(\"$ISE_NAME\"; \"i\"))] | length")
echo "Workflows: $WF_COUNT"

echo "=== Connector Usage ==="
az rest --method GET --uri "https://management.azure.com/subscriptions/$SUB/providers/Microsoft.Logic/workflows?api-version=2019-05-01" \
  | jq -r "[.value[] | select(.properties.integrationServiceEnvironment.id | test(\"$ISE_NAME\"; \"i\")) | .properties.parameters.\"\$connections\".value // {} | to_entries[].key] | group_by(.) | .[] | \"\(.[0]): \(length)\"" | sort -t: -k2 -rn

echo "=== Integration Accounts ==="
az rest --method GET --uri "https://management.azure.com/subscriptions/$SUB/resourceGroups/$ISE_RG/providers/Microsoft.Logic/integrationAccounts?api-version=2019-05-01" \
  | jq -r '.value[] | "\(.name) | \(.sku.name) | Partners: \(.properties.partnerCount // 0)"'

echo "=== Workflow States ==="
az rest --method GET --uri "https://management.azure.com/subscriptions/$SUB/providers/Microsoft.Logic/workflows?api-version=2019-05-01" \
  | jq -r "[.value[] | select(.properties.integrationServiceEnvironment.id | test(\"$ISE_NAME\"; \"i\")) | .properties.state] | group_by(.) | .[] | \"\(.[0]): \(length)\""
echo "=== Assessment Complete ==="
```
