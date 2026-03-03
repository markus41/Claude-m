# Azure SQL Database Backup and Disaster Recovery — Deep Reference

## Overview

Azure SQL Database provides automated backups (full, differential, transaction log), geo-replication, failover groups, and point-in-time restore. This reference covers backup configuration, geo-replication setup, failover group management, and the restore process.

## REST API Endpoints

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|---|---|---|---|---|
| GET | `/servers/{server}/databases/{db}/backupShortTermRetentionPolicies/default` | SQL DB Reader | — | Get current backup retention policy |
| PUT | `/servers/{server}/databases/{db}/backupShortTermRetentionPolicies/default` | SQL DB Contributor | `retentionDays` (1–35) | Set PITR retention |
| PUT | `/servers/{server}/databases/{db}/backupLongTermRetentionPolicies/default` | SQL DB Contributor | `weeklyRetention`, `monthlyRetention`, `yearlyRetention`, `weekOfYear` | Set LTR policy |
| GET | `/servers/{server}/databases/{db}/restorePoints` | SQL DB Reader | — | List available PITR restore points |
| POST | `/servers/{server}/databases` | SQL Server Contributor | `createMode: PointInTimeRestore`, `restorePointInTime` | Restore to new database |
| GET | `/servers/{server}/recoverableDatabases` | SQL DB Reader | — | List geo-redundant backups |
| POST | `/servers/{server}/databases` | SQL Server Contributor | `createMode: Restore`, `sourceDatabaseId` | Geo-restore from backup |
| PUT | `/servers/{server}/databases/{db}/replicationLinks/{id}` | SQL Server Contributor | — | Add geo-replication |
| GET | `/servers/{server}/databases/{db}/replicationLinks` | SQL DB Reader | — | List active replication links |
| POST | `/servers/{server}/failoverGroups/{group}` | SQL Server Contributor | `failoverPolicy`, `gracePeriodWithDataLossHours` | Trigger failover |
| PUT | `/resourceGroups/{rg}/providers/Microsoft.Sql/instanceFailoverGroups/{group}` | SQL Server Contributor | Primary/secondary server, databases list | Create failover group |

Base: `https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}`

## Azure CLI Patterns — Backup Configuration

```bash
# Set short-term backup retention (PITR) — 1-35 days
az sql db str-policy set \
  --server sql-prod-eastus \
  --resource-group rg-databases \
  --name db-app-prod \
  --retention-days 35

# Get PITR window
az sql db str-policy show \
  --server sql-prod-eastus \
  --resource-group rg-databases \
  --name db-app-prod

# Set long-term retention (LTR)
az sql db ltr-policy set \
  --server sql-prod-eastus \
  --resource-group rg-databases \
  --name db-app-prod \
  --weekly-retention P4W \    # keep last 4 weekly backups
  --monthly-retention P12M \  # keep last 12 monthly backups
  --yearly-retention P5Y \    # keep last 5 yearly backups
  --week-of-year 1            # which week counts as the yearly backup (week 1 = first week of year)

# List LTR backups
az sql db ltr-backup list \
  --location eastus \
  --server sql-prod-eastus \
  --database db-app-prod \
  --output table

# List PITR restore points
az sql db restore-point list \
  --server sql-prod-eastus \
  --resource-group rg-databases \
  --name db-app-prod \
  --output table
```

## Azure CLI Patterns — Point-in-Time Restore

```bash
# PITR restore to same region (creates new database)
RESTORE_POINT="2026-02-15T14:30:00Z"

az sql db restore \
  --server sql-prod-eastus \
  --resource-group rg-databases \
  --name db-app-prod \
  --dest-name db-app-restored-20260215 \
  --time "$RESTORE_POINT" \
  --edition GeneralPurpose \
  --family Gen5 \
  --capacity 8

# Geo-restore (restore from geo-redundant backup to different region)
az sql db restore \
  --server sql-prod-westus \     # target server in different region
  --resource-group rg-databases-westus \
  --name db-app-prod \
  --dest-name db-app-georestored \
  --geo-backup-id \
    "/subscriptions/<sub>/resourceGroups/rg-databases/providers/Microsoft.Sql/servers/sql-prod-eastus/recoverableDatabases/db-app-prod"

# LTR restore (restore from long-term backup)
LTR_BACKUP_ID=$(az sql db ltr-backup list \
  --location eastus \
  --server sql-prod-eastus \
  --database db-app-prod \
  --query "[0].id" -o tsv)

az sql db ltr-backup restore \
  --backup-id "$LTR_BACKUP_ID" \
  --dest-server sql-prod-eastus \
  --dest-resource-group rg-databases \
  --dest-database db-app-ltr-restored \
  --edition GeneralPurpose \
  --family Gen5 \
  --capacity 8
```

## Geo-Replication and Failover Groups

```bash
# Create active geo-replication (manual failover)
az sql db replica create \
  --server sql-prod-eastus \
  --resource-group rg-databases \
  --name db-app-prod \
  --partner-server sql-prod-westus \
  --partner-resource-group rg-databases-westus \
  --secondary-type Geo

# Check replication lag
az sql db replication-link list \
  --server sql-prod-eastus \
  --resource-group rg-databases \
  --database db-app-prod \
  --output table

# Manual failover (for planned maintenance — no data loss)
az sql db replica set-primary \
  --server sql-prod-westus \
  --resource-group rg-databases-westus \
  --name db-app-prod

# Create Auto-Failover Group (preferred for automatic failover)
az sql failover-group create \
  --name fog-app-prod \
  --resource-group rg-databases \
  --server sql-prod-eastus \
  --partner-server sql-prod-westus \
  --failover-policy Automatic \
  --grace-period 1 \  # failover after 1 hour of primary unavailability
  --add-db db-app-prod

# Get failover group endpoint (use in connection string)
az sql failover-group show \
  --name fog-app-prod \
  --resource-group rg-databases \
  --server sql-prod-eastus \
  --query "{readWrite: readWriteEndpoint.failoverPolicy, fqdn: name}" \
  --output table
# Listener FQDN: fog-app-prod.database.windows.net (read-write)
# Listener FQDN: fog-app-prod.secondary.database.windows.net (read-only)

# Force failover (for DR drill — may cause data loss)
az sql failover-group set-primary \
  --name fog-app-prod \
  --resource-group rg-databases-westus \
  --server sql-prod-westus \
  --allow-data-loss

# Monitor failover group status
az sql failover-group show \
  --name fog-app-prod \
  --resource-group rg-databases \
  --server sql-prod-eastus \
  --query "replicationRole" \
  --output tsv
```

## TypeScript — Failover-Aware Connection String

```typescript
import sql from "mssql";
import { DefaultAzureCredential } from "@azure/identity";

// Use the Auto-Failover Group listener endpoint instead of server FQDN
// This transparently routes to the primary replica, even after failover
const FAILOVER_GROUP_LISTENER = "fog-app-prod.database.windows.net"; // read-write
const FAILOVER_GROUP_SECONDARY = "fog-app-prod.secondary.database.windows.net"; // read-only replicas

async function createReadWritePool(): Promise<sql.ConnectionPool> {
  const credential = new DefaultAzureCredential();
  const token = await credential.getToken("https://database.windows.net/.default");

  return new sql.ConnectionPool({
    server: FAILOVER_GROUP_LISTENER,
    database: "db-app-prod",
    authentication: {
      type: "azure-active-directory-access-token",
      options: { token: token!.token },
    },
    options: {
      encrypt: true,
      connectTimeout: 30000,
      // IMPORTANT: Enable connection retry for post-failover reconnect
      enableArithAbort: true,
    },
    pool: {
      max: 20,
      min: 2,
      idleTimeoutMillis: 30000,
      acquireTimeoutMillis: 30000,
    },
  }).connect();
}

async function createReadOnlyPool(): Promise<sql.ConnectionPool> {
  const credential = new DefaultAzureCredential();
  const token = await credential.getToken("https://database.windows.net/.default");

  return new sql.ConnectionPool({
    server: FAILOVER_GROUP_SECONDARY, // route reads to secondary
    database: "db-app-prod",
    authentication: {
      type: "azure-active-directory-access-token",
      options: { token: token!.token },
    },
    options: {
      encrypt: true,
      readOnlyIntent: true, // declare read-only intent
    },
    pool: { max: 20, min: 2 },
  }).connect();
}
```

## Backup Retention Reference

| Backup Type | Frequency | Retention | Notes |
|---|---|---|---|
| Full backup | Weekly | 7–35 days (configurable) | First backup after creation is full |
| Differential backup | Every 12 hours | 7–35 days | Reduces restore time |
| Transaction log backup | Every 5–10 minutes | 7–35 days | Supports PITR to any point |
| LTR weekly | Weekly | Up to 10 years | User-configured |
| LTR monthly | Monthly | Up to 10 years | User-configured |
| LTR yearly | Yearly | Up to 10 years | User-configured |

## RTO and RPO Reference

| Scenario | RPO | RTO | Notes |
|---|---|---|---|
| PITR (same region) | 5–10 minutes | 30–120 minutes | Depends on database size |
| PITR (cross-region via geo-backup) | Up to 1 hour | 30–120 minutes | Geo-backup can lag up to 1 hour |
| Active geo-replication (manual failover) | Near-zero (planned) | < 30 seconds | Manual failover with no data loss |
| Auto-Failover Group (automatic) | < 5 seconds (lag-dependent) | 60–120 seconds | grace-period controls trigger time |
| Geo-restore (from backup) | 1 hour | Hours | Last resort; no replication configured |

## Error Codes

| Code | Meaning | Remediation |
|---|---|---|
| DatabaseAlreadyExists (409) | Restore target database already exists | Use different destination database name |
| RestorePointNotFound (404) | PITR timestamp outside retention window | Choose a time within the retention window |
| GeoBackupNotAvailable (404) | No geo-redundant backup available | Wait for first geo-backup (up to 1 hour after creation); set `backupStorageRedundancy: Geo` |
| ReplicationLinkExists (409) | Geo-replication link already exists | Remove existing link before creating new one |
| FailoverGroupInTransition (409) | Failover operation already in progress | Wait for current operation to complete |
| ReplicationLagTooHigh (500) | Replication lag too high for failover | Wait for lag to decrease; use `--allow-data-loss` for emergency failover |
| SourceDatabaseDoesNotExist (404) | Source database for restore not found | Verify source database ID and subscription |

## Throttling Limits

| Resource | Limit | Notes |
|---|---|---|
| Concurrent restores per subscription | 10 | Queue restores; avoid simultaneous PITR for multiple databases |
| LTR backup copies | 1 backup per policy interval | LTR stores one backup per week/month/year slot |
| Geo-replication secondary count | 4 secondaries per primary | Use Hyperscale for up to 30 named replicas |
| PITR window | 7–35 days (configurable) | Set 35 days for production compliance requirements |
| LTR retention maximum | 10 years | Verify regulatory requirements; SOX/HIPAA may require 7+ years |

## Production Gotchas

- **Failover group listener is the right connection string**: Always connect applications to the failover group listener FQDN (`fog-name.database.windows.net`) instead of the individual server FQDN. After failover, the listener transparently routes to the new primary without application changes.
- **Failover group grace period**: The `--grace-period` controls how long Azure waits after detecting primary unavailability before triggering automatic failover. Default is 1 hour. For `RPO < 1 hour`, reduce to 30–60 minutes. Very short grace periods risk spurious failovers during brief outages.
- **Read-intent connections**: Declare read-only intent in connection strings for connections to the secondary replica. Without `readOnlyIntent=true`, connections to the secondary listener may be rejected or routed back to the primary.
- **LTR is not the same as geo-backup**: Long-term retention backups are stored in the backup storage account configured for the SQL server. Geo-restore uses the latest geo-redundant backup (different from LTR). Ensure your DR plan specifies which backup type to use.
- **PITR restores to a new database**: Point-in-time restore always creates a *new* database. To replace the production database, you must rename or swap the restored database into the production connection. Plan the cutover carefully to minimize application downtime.
- **Zone-redundant replicas for HA**: For single-region HA, use zone-redundant databases (Business Critical tier). For cross-region DR, add an Auto-Failover Group. Zone-redundancy alone does not protect against regional outages.
- **Backup storage redundancy**: Set `--backup-storage-redundancy Geo` for production databases to ensure backups survive a regional disaster. The default is geo-redundant (GRS) for most tiers, but verify explicitly.
