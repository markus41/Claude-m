import { loadRegistry, findPlugin } from "../src/registry.js";

describe("Registry", () => {
  test("loadRegistry returns plugins from both registry and marketplace", () => {
    const plugins = loadRegistry();
    // Must include at least the 5 core registry plugins
    expect(plugins.length).toBeGreaterThanOrEqual(5);
    // Must also include marketplace plugins (94 total in marketplace.json,
    // minus duplicates that overlap with the 5 registry plugins)
    expect(plugins.length).toBeGreaterThan(5);
  });

  test("core registry manifests have rich metadata (tools, scopes)", () => {
    const coreIds = ["teams", "excel", "outlook", "azure", "sharepoint"];
    const plugins = loadRegistry();
    for (const id of coreIds) {
      const plugin = plugins.find((p) => p.id === id);
      expect(plugin).toBeDefined();
      expect(typeof plugin!.name).toBe("string");
      expect(typeof plugin!.description).toBe("string");
      expect(typeof plugin!.version).toBe("string");
      expect(Array.isArray(plugin!.tools)).toBe(true);
      expect(plugin!.tools!.length).toBeGreaterThan(0);
      expect(Array.isArray(plugin!.requiredScopes)).toBe(true);
    }
  });

  test("marketplace plugins have required base fields", () => {
    const plugins = loadRegistry();
    for (const plugin of plugins) {
      expect(typeof plugin.id).toBe("string");
      expect(typeof plugin.name).toBe("string");
      expect(typeof plugin.description).toBe("string");
      expect(typeof plugin.version).toBe("string");
    }
  });

  test("core registry IDs are present in the combined list", () => {
    const ids = loadRegistry().map((p) => p.id);
    expect(ids).toContain("azure");
    expect(ids).toContain("excel");
    expect(ids).toContain("outlook");
    expect(ids).toContain("sharepoint");
    expect(ids).toContain("teams");
  });

  test("marketplace-only plugins are also present", () => {
    const ids = loadRegistry().map((p) => p.id);
    // Spot-check a few marketplace-only plugins
    expect(ids).toContain("excel-office-scripts");
    expect(ids).toContain("azure-cost-governance");
    expect(ids).toContain("entra-id-security");
    expect(ids).toContain("powerbi-fabric");
  });

  test("findPlugin returns the correct manifest", () => {
    const manifest = findPlugin("teams");
    expect(manifest).toBeDefined();
    expect(manifest?.product).toBe("teams");
    expect(manifest?.id).toBe("teams");
  });

  test("findPlugin finds marketplace-only plugins", () => {
    const manifest = findPlugin("azure-cost-governance");
    expect(manifest).toBeDefined();
    expect(manifest?.category).toBe("cloud");
  });

  test("findPlugin returns undefined for unknown plugin", () => {
    expect(findPlugin("unknown-plugin")).toBeUndefined();
  });

  test("no duplicate plugin IDs", () => {
    const plugins = loadRegistry();
    const ids = plugins.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });
});
