---
name: sql-query
description: "Run T-SQL queries against Azure SQL, analyze execution plans, and get index recommendations"
argument-hint: "<query|--file <path>> --server <server> --db <database> [--plan] [--index-advice]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Run T-SQL Queries

Execute T-SQL queries against Azure SQL Database, analyze execution plans, and retrieve index recommendations.

## Instructions

### 1. Validate Inputs

- `<query>` — Inline T-SQL query, or `--file <path>` to read from a `.sql` file.
- `--server` — SQL server FQDN (e.g., `myserver.database.windows.net`). Read from `.env` if not provided.
- `--db` — Database name. Read from `.env` if not provided.
- `--plan` — Include estimated execution plan analysis.
- `--index-advice` — Query missing index DMVs for recommendations.

If server/db are not provided and `.env` does not exist, ask the user.

### 2. Execute the Query

**Via sqlcmd**:
```bash
sqlcmd -S <server> -d <db> -U <user> -P '<password>' -Q "<query>" -s "," -W
```

**Via Azure AD auth (preferred)**:
```bash
sqlcmd -S <server> -d <db> --authentication-method=ActiveDirectoryDefault -Q "<query>"
```

For multi-statement scripts from a file:
```bash
sqlcmd -S <server> -d <db> -U <user> -P '<password>' -i <file-path>
```

### 3. Analyze Execution Plan (when --plan)

Get the estimated execution plan:
```sql
SET SHOWPLAN_XML ON;
GO
<user-query>
GO
SET SHOWPLAN_XML OFF;
GO
```

Analyze the plan for:
- **Table scans**: Flag full table scans on large tables. Recommend covering indexes.
- **Key lookups**: Flag key lookups with high estimated rows. Recommend INCLUDE columns.
- **Sort operations**: Flag expensive sorts not backed by an index.
- **Parallelism**: Note if the query uses parallel plans and the DOP.
- **Estimated vs actual rows**: Flag large discrepancies (stale statistics).

### 4. Get Index Recommendations (when --index-advice)

Query the missing index DMVs:
```sql
SELECT
    CONVERT(DECIMAL(18,2), migs.avg_user_impact) AS avg_impact_pct,
    migs.user_seeks,
    migs.user_scans,
    CONCAT(mid.statement, ' (',
        ISNULL(mid.equality_columns, ''),
        CASE WHEN mid.equality_columns IS NOT NULL AND mid.inequality_columns IS NOT NULL THEN ', ' ELSE '' END,
        ISNULL(mid.inequality_columns, ''),
        ') INCLUDE (',
        ISNULL(mid.included_columns, ''),
        ')') AS index_suggestion
FROM sys.dm_db_missing_index_group_stats AS migs
INNER JOIN sys.dm_db_missing_index_groups AS mig
    ON migs.group_handle = mig.index_group_handle
INNER JOIN sys.dm_db_missing_index_details AS mid
    ON mig.index_handle = mid.index_handle
WHERE mid.database_id = DB_ID()
ORDER BY migs.avg_user_impact * (migs.user_seeks + migs.user_scans) DESC;
```

Also check Query Store for top resource-consuming queries:
```sql
SELECT TOP 10
    qt.query_sql_text,
    rs.avg_duration / 1000.0 AS avg_duration_ms,
    rs.avg_cpu_time / 1000.0 AS avg_cpu_ms,
    rs.avg_logical_io_reads,
    rs.count_executions
FROM sys.query_store_query_text AS qt
JOIN sys.query_store_query AS q ON qt.query_text_id = q.query_text_id
JOIN sys.query_store_plan AS p ON q.query_id = p.query_id
JOIN sys.query_store_runtime_stats AS rs ON p.plan_id = rs.plan_id
WHERE rs.last_execution_time > DATEADD(hour, -24, GETUTCDATE())
ORDER BY rs.avg_duration DESC;
```

### 5. Display Results

Show the user:
- Query results in a formatted table
- Execution plan analysis (when `--plan`) with specific recommendations
- Missing index suggestions (when `--index-advice`) ranked by impact
- Estimated cost savings from recommended indexes
- Next steps: create recommended indexes, update statistics, or tune the query
