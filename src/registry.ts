import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { PluginManifest } from "./types.js";

/**
 * Resolve the registry directory relative to this file at runtime.
 * Works in both ESM (Node 18+, import.meta.url) and CJS (ts-jest, __dirname).
 */
function registryDir(): string {
  // ESM – import.meta is defined
  // Use Function constructor to prevent ts-jest / tsc from rejecting the
  // syntax in CJS mode; the branch is only reached at runtime in ESM.
  try {
    // eslint-disable-next-line no-new-func
    const url: string = new Function("return import.meta.url")() as string;
    const { fileURLToPath } = require("url") as { fileURLToPath: (u: string) => string };
    const { dirname } = require("path") as { dirname: (p: string) => string };
    return join(dirname(fileURLToPath(url)), "..", "registry");
  } catch {
    // CJS / ts-jest – fall back to __dirname (injected by Node's CJS wrapper)
    return join(__dirname, "..", "registry");
  }
}

const REGISTRY_DIR = registryDir();

/**
 * Load every JSON manifest from the registry directory and return
 * them as an array of {@link PluginManifest} objects.
 */
export function loadRegistry(): PluginManifest[] {
  const files = readdirSync(REGISTRY_DIR).filter((f) => f.endsWith(".json"));
  return files.map((file) => {
    const raw = readFileSync(join(REGISTRY_DIR, file), "utf-8");
    return JSON.parse(raw) as PluginManifest;
  });
}

/**
 * Find a single plugin manifest by its ID, or `undefined` if not found.
 */
export function findPlugin(id: string): PluginManifest | undefined {
  return loadRegistry().find((p) => p.id === id);
}
