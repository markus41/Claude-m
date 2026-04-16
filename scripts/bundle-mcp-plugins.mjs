#!/usr/bin/env node
// Copy the repo-root dist/ into each MCP-backed plugin so the plugin is a
// self-contained installable unit for Claude Cowork on desktop and web.
// Runs after `tsc` as part of `npm run build`.

import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MCP_PLUGINS = ["teams", "excel", "outlook", "sharepoint", "azure"];

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");
const srcDist = join(repoRoot, "dist");

if (!existsSync(srcDist)) {
  console.error("bundle:mcp-plugins: dist/ missing — run `tsc` first.");
  process.exit(1);
}

for (const name of MCP_PLUGINS) {
  const target = join(repoRoot, "plugins", name, "dist");
  rmSync(target, { recursive: true, force: true });
  cpSync(srcDist, target, { recursive: true });
  console.log(`bundled dist → plugins/${name}/dist`);
}
