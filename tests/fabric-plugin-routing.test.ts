import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "..");
const matrixPath = path.join(repoRoot, "docs", "fabric-item-coverage-matrix.md");

function rowMap(): Map<string, { plugin: string; commands: string }> {
  const content = fs.readFileSync(matrixPath, "utf8");
  const rows = content
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith("|"))
    .map((line) => line.trim())
    .filter((line) => !line.includes("---"))
    .slice(1)
    .map((line) => line.slice(1, -1).split("|").map((cell) => cell.trim()));

  const map = new Map<string, { plugin: string; commands: string }>();
  for (const cells of rows) {
    map.set(cells[0], { plugin: cells[2], commands: cells[3] });
  }
  return map;
}

function read(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("Fabric plugin routing boundaries", () => {
  test("routes mirrored source families to azure vs external plugins", () => {
    const map = rowMap();

    expect(map.get("Mirrored Azure Cosmos DB")?.plugin).toBe("`fabric-mirroring-azure`");
    expect(map.get("Mirrored Azure Database for PostgreSQL")?.plugin).toBe("`fabric-mirroring-azure`");
    expect(map.get("Mirrored Azure Databricks catalog")?.plugin).toBe("`fabric-mirroring-azure`");
    expect(map.get("Mirrored Azure SQL Database")?.plugin).toBe("`fabric-mirroring-azure`");
    expect(map.get("Mirrored Azure SQL Managed Instance")?.plugin).toBe("`fabric-mirroring-azure`");

    expect(map.get("Mirrored database")?.plugin).toBe("`fabric-mirroring-external`");
    expect(map.get("Mirrored Google Big Query (preview)")?.plugin).toBe("`fabric-mirroring-external`");
    expect(map.get("Mirrored Oracle (preview)")?.plugin).toBe("`fabric-mirroring-external`");
    expect(map.get("Mirrored SAP")?.plugin).toBe("`fabric-mirroring-external`");
    expect(map.get("Mirrored Snowflake")?.plugin).toBe("`fabric-mirroring-external`");
    expect(map.get("Mirrored SQL Server")?.plugin).toBe("`fabric-mirroring-external`");
  });

  test("overlap routing references exist in required README files", () => {
    const mirroring = read("fabric-mirroring/README.md");
    const dataFactory = read("fabric-data-factory/README.md");
    const powerBi = read("powerbi-fabric/README.md");

    expect(mirroring).toContain("fabric-mirroring-azure");
    expect(mirroring).toContain("fabric-mirroring-external");

    expect(dataFactory).toContain("fabric-data-prep-jobs");
    expect(dataFactory.toLowerCase()).toContain("dataflow gen1");
    expect(dataFactory.toLowerCase()).toContain("airflow");
    expect(dataFactory.toLowerCase()).toContain("dbt");

    expect(powerBi).toContain("fabric-graph-geo");
    expect(powerBi).toContain("fabric-data-store");
  });
});
