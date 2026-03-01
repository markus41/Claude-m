import { loadRegistry, findPlugin } from "../src/registry.js";

describe("Registry", () => {
  test("loadRegistry returns all 5 manifests", () => {
    const plugins = loadRegistry();
    expect(plugins).toHaveLength(5);
  });

  test("each manifest has the required fields", () => {
    const plugins = loadRegistry();
    for (const plugin of plugins) {
      expect(typeof plugin.id).toBe("string");
      expect(typeof plugin.name).toBe("string");
      expect(typeof plugin.description).toBe("string");
      expect(typeof plugin.version).toBe("string");
      expect(Array.isArray(plugin.tools)).toBe(true);
      expect(plugin.tools.length).toBeGreaterThan(0);
      expect(Array.isArray(plugin.requiredScopes)).toBe(true);
    }
  });

  test("manifest IDs match expected products", () => {
    const ids = loadRegistry().map((p) => p.id).sort();
    expect(ids).toEqual(["azure", "excel", "outlook", "sharepoint", "teams"]);
  });

  test("findPlugin returns the correct manifest", () => {
    const manifest = findPlugin("teams");
    expect(manifest).toBeDefined();
    expect(manifest?.product).toBe("teams");
    expect(manifest?.id).toBe("teams");
  });

  test("findPlugin returns undefined for unknown plugin", () => {
    expect(findPlugin("unknown-plugin")).toBeUndefined();
  });
});
