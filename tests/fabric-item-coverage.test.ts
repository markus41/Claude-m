import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "..");
const matrixPath = path.join(repoRoot, "docs", "fabric-item-coverage-matrix.md");

type MatrixRow = {
  item: string;
  status: string;
  plugin: string;
  commands: string;
  preview: string;
  notes: string;
};

function parseMatrixRows(): MatrixRow[] {
  const content = fs.readFileSync(matrixPath, "utf8");
  return content
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith("|"))
    .map((line) => line.trim())
    .filter((line) => !line.includes("---"))
    .slice(1)
    .map((line) => {
      const cells = line
        .slice(1, -1)
        .split("|")
        .map((cell) => cell.trim());

      return {
        item: cells[0],
        status: cells[1],
        plugin: cells[2],
        commands: cells[3],
        preview: cells[4],
        notes: cells[5]
      };
    });
}

describe("Fabric item coverage matrix", () => {
  const expectedItems = [
    "Copy job",
    "Dataflow Gen1",
    "Dataflow Gen2",
    "Eventstream",
    "Notebook",
    "Pipeline",
    "Spark Job Definition",
    "Mirrored Azure Cosmos DB",
    "Mirrored Azure Database for PostgreSQL",
    "Mirrored Azure Databricks catalog",
    "Mirrored Azure SQL Database",
    "Mirrored Azure SQL Managed Instance",
    "Mirrored database",
    "Mirrored Google Big Query (preview)",
    "Mirrored Oracle (preview)",
    "Mirrored SAP",
    "Mirrored Snowflake",
    "Mirrored SQL Server",
    "Cosmos DB database",
    "Datamart (preview)",
    "Event Schema Set (preview)",
    "Eventhouse",
    "Lakehouse",
    "Sample warehouse",
    "Semantic model",
    "Snowflake database",
    "SQL database",
    "Warehouse",
    "Apache Airflow job",
    "Azure Data Factory",
    "dbt job (preview)",
    "Anomaly detector (preview)",
    "Data agent (preview)",
    "Environment",
    "Experiment",
    "Graph model (preview)",
    "ML model",
    "Ontology (preview)",
    "Operations agent (preview)",
    "API for GraphQL",
    "User data functions",
    "Variable library",
    "Dashboard",
    "Exploration (preview)",
    "Graph queryset (preview)",
    "Map (preview)",
    "Paginated Report (preview)",
    "Real-Time Dashboard",
    "Report",
    "Scorecard",
    "Activator",
    "Digital Twin Builder (preview)",
    "KQL Queryset",
    "Org app (preview)"
  ];

  test("includes every Fabric item from the plan exactly once", () => {
    const rows = parseMatrixRows();
    const rowsByItem = new Map<string, MatrixRow[]>();

    for (const row of rows) {
      const list = rowsByItem.get(row.item) ?? [];
      list.push(row);
      rowsByItem.set(row.item, list);
    }

    for (const item of expectedItems) {
      const entries = rowsByItem.get(item) ?? [];
      expect(entries.length).toBe(1);
    }
  });

  test("maps every item to one owning plugin and command surface", () => {
    const rows = parseMatrixRows();

    for (const row of rows) {
      expect(row.plugin.length).toBeGreaterThan(0);
      expect(row.commands.length).toBeGreaterThan(0);
      expect(row.status.length).toBeGreaterThan(0);
    }
  });
});
