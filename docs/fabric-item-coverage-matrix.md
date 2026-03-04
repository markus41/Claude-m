# Fabric Item Coverage Matrix

This matrix maps each Fabric item from the requested catalog to exactly one owning plugin and command surface.

| Fabric Item | Status (existing/new) | Plugin | Command(s) | Preview | Notes |
|---|---|---|---|---|---|
| Copy job | existing (extended) | `fabric-data-factory` | `copy-job-manage` | no | Explicit item-level command added for parity. |
| Dataflow Gen1 | new | `fabric-data-prep-jobs` | `dataflow-gen1-manage` | no | Gen1 ownership moved to focused prep plugin. |
| Dataflow Gen2 | existing (extended) | `fabric-data-factory` | `dataflow-gen2-manage` | no | Gen2 remains with Data Factory plugin. |
| Eventstream | existing | `fabric-real-time-analytics` | `eventstream-create` | no | Shared streaming primitive across domains. |
| Notebook | existing | `fabric-data-engineering` | `notebook-create` | no | Primary engineering ownership for notebook workflows. |
| Pipeline | existing | `fabric-data-factory` | `pipeline-create`, `pipeline-schedule`, `pipeline-monitor` | no | Pipeline orchestration remains in Data Factory plugin. |
| Spark Job Definition | existing (extended) | `fabric-data-engineering` | `spark-job-definition-manage` | no | Explicit Spark Job Definition coverage added. |
| Mirrored Azure Cosmos DB | new | `fabric-mirroring-azure` | `mirror-azure-cosmosdb` | no | Azure-native mirroring ownership. |
| Mirrored Azure Database for PostgreSQL | new | `fabric-mirroring-azure` | `mirror-azure-postgresql` | no | Azure-native mirroring ownership. |
| Mirrored Azure Databricks catalog | new | `fabric-mirroring-azure` | `mirror-azure-databricks-catalog` | no | Azure-native mirroring ownership. |
| Mirrored Azure SQL Database | new | `fabric-mirroring-azure` | `mirror-azure-sql-database` | no | Azure-native mirroring ownership. |
| Mirrored Azure SQL Managed Instance | new | `fabric-mirroring-azure` | `mirror-azure-sql-managed-instance` | no | Azure-native mirroring ownership. |
| Mirrored database | new | `fabric-mirroring-external` | `mirror-external-generic-database` | no | Generic external mirrored source ownership. |
| Mirrored Google Big Query (preview) | new | `fabric-mirroring-external` | `mirror-external-bigquery` | yes | Preview guardrails required. |
| Mirrored Oracle (preview) | new | `fabric-mirroring-external` | `mirror-external-oracle` | yes | Preview guardrails required. |
| Mirrored SAP | new | `fabric-mirroring-external` | `mirror-external-sap` | no | External-source mirroring ownership. |
| Mirrored Snowflake | new | `fabric-mirroring-external` | `mirror-external-snowflake` | no | External-source mirroring ownership. |
| Mirrored SQL Server | new | `fabric-mirroring-external` | `mirror-external-sql-server` | no | External-source mirroring ownership. |
| Cosmos DB database | new | `fabric-data-store` | `fabric-cosmos-db-database-manage` | no | Store-domain owner for Fabric Cosmos DB database items. |
| Datamart (preview) | new | `fabric-data-store` | `datamart-manage` | yes | Preview guardrails required. |
| Event Schema Set (preview) | new | `fabric-data-store` | `event-schema-set-manage` | yes | Shared dependency used by prep/visualize/track domains. |
| Eventhouse | existing | `fabric-real-time-analytics` | `eventhouse-create` | no | Real-time storage and query ownership. |
| Lakehouse | existing | `fabric-data-engineering` | `lakehouse-create` | no | Lakehouse lifecycle owner remains data engineering plugin. |
| Sample warehouse | existing (extended) | `fabric-data-warehouse` | `sample-warehouse-bootstrap` | no | Explicit sample warehouse bootstrap command added. |
| Semantic model | existing | `fabric-semantic-models` | existing semantic model command surface | no | Semantic model ownership remains dedicated plugin. |
| Snowflake database | new | `fabric-data-store` | `fabric-snowflake-database-link` | no | Store-domain ownership for linked Snowflake database item. |
| SQL database | new | `fabric-data-store` | `fabric-sql-database-manage` | no | Store-domain ownership for Fabric SQL database item. |
| Warehouse | existing | `fabric-data-warehouse` | `warehouse-create`, `warehouse-load`, `warehouse-monitor` | no | Warehouse lifecycle remains dedicated plugin. |
| Apache Airflow job | new | `fabric-data-prep-jobs` | `airflow-job-manage` | no | Prep-domain owner for Airflow jobs. |
| Azure Data Factory | new | `fabric-data-prep-jobs` | `adf-mount-manage` | no | ADF mount governance owned by prep plugin. |
| dbt job (preview) | new | `fabric-data-prep-jobs` | `dbt-job-manage` | yes | Preview guardrails required. |
| Anomaly detector (preview) | new | `fabric-ai-agents` | `anomaly-detector-manage` | yes | AI-agent domain preview item. |
| Data agent (preview) | new | `fabric-ai-agents` | `data-agent-manage` | yes | AI-agent domain preview item. |
| Environment | new | `fabric-developer-runtime` | `environment-manage` | no | Shared runtime environment owner in developer runtime plugin. |
| Experiment | existing | `fabric-data-science` | existing experiment command surface | no | Data science ownership remains unchanged. |
| Graph model (preview) | new | `fabric-graph-geo` | `graph-model-manage` | yes | Graph/geo preview ownership. |
| ML model | existing | `fabric-data-science` | existing ML model command surface | no | Data science ownership remains unchanged. |
| Ontology (preview) | new | `fabric-ai-agents` | `ontology-manage` | yes | AI-agent domain preview item. |
| Operations agent (preview) | new | `fabric-ai-agents` | `operations-agent-manage` | yes | AI-agent domain preview item. |
| API for GraphQL | new | `fabric-developer-runtime` | `graphql-api-manage` | no | Developer runtime owner for Fabric GraphQL APIs. |
| User data functions | new | `fabric-developer-runtime` | `user-data-function-manage` | no | Developer runtime owner for UDF items. |
| Variable library | new | `fabric-developer-runtime` | `variable-library-manage` | no | Developer runtime owner for variable libraries. |
| Dashboard | existing (extended) | `powerbi-fabric` | `pbi-dashboard-create` | no | Explicit dashboard command added. |
| Exploration (preview) | new | `fabric-graph-geo` | `exploration-manage` | yes | Graph/geo preview ownership. |
| Graph queryset (preview) | new | `fabric-graph-geo` | `graph-queryset-manage` | yes | Graph/geo preview ownership. |
| Map (preview) | new | `fabric-graph-geo` | `map-manage` | yes | Graph/geo preview ownership. |
| Paginated Report (preview) | existing | `powerbi-paginated-reports` | existing paginated report command surface | yes | Existing dedicated plugin owner. |
| Real-Time Dashboard | existing | `fabric-real-time-analytics` | `rt-dashboard-create` | no | Real-time analytics owner. |
| Report | existing (extended) | `powerbi-fabric` | `pbi-report-create` | no | Explicit report command added. |
| Scorecard | existing (extended) | `powerbi-fabric` | `pbi-scorecard-manage` | no | Explicit scorecard command added. |
| Activator | existing | `fabric-data-activator` | existing activator command surface | no | Existing dedicated plugin owner. |
| Digital Twin Builder (preview) | new | `fabric-ai-agents` | `digital-twin-builder-manage` | yes | AI-agent domain preview item. |
| KQL Queryset | existing (extended) | `fabric-real-time-analytics` | `kql-queryset-manage` | no | Explicit queryset command added. |
| Org app (preview) | new | `fabric-distribution-apps` | `org-app-setup`, `org-app-release` | yes | Distribution-domain preview ownership. |
