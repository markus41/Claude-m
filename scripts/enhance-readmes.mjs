#!/usr/bin/env node
/**
 * Premium README enhancer — wraps each plugin's existing README.md with a
 * top-1% presentation: centered hero, metadata block, navigation, mermaid
 * architecture diagram, GitHub alerts, progressive disclosure, and a
 * category-aware "See also" footer. Preserves original body content.
 *
 * Idempotent: detects existing enhancement marker and replaces only the
 * generated wrapper, leaving body content intact.
 */

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MARKETPLACE = JSON.parse(
  fs.readFileSync(path.join(ROOT, ".claude-plugin/marketplace.json"), "utf8"),
);

const HEADER_MARK = "<!-- claude-m:premium-header:start -->";
const HEADER_END = "<!-- claude-m:premium-header:end -->";
const FOOTER_MARK = "<!-- claude-m:premium-footer:start -->";
const FOOTER_END = "<!-- claude-m:premium-footer:end -->";

const CATEGORY_META = {
  cloud: {
    label: "Cloud",
    color: "#0078D4",
    surface: "Azure ARM · Resource Graph · ARM REST · CLI",
    blurb: "Inventory, govern, and operate Azure resources at any scale.",
  },
  analytics: {
    label: "Analytics",
    color: "#107C10",
    surface: "Microsoft Fabric · Power BI · OneLake · DAX · KQL",
    blurb: "Build, mirror, and govern analytics estates on Fabric.",
  },
  security: {
    label: "Security",
    color: "#A4373A",
    surface: "Microsoft Graph · Defender · Sentinel · Purview · Entra",
    blurb: "Protect identity, endpoints, data, and information.",
  },
  devops: {
    label: "DevOps",
    color: "#5C2D91",
    surface: "Azure DevOps · GitHub · Pipelines · ALM · IaC",
    blurb: "Ship reliably with first-class CI/CD and ALM.",
  },
  productivity: {
    label: "Productivity",
    color: "#FFB900",
    surface: "Microsoft Graph · M365 · Teams · Outlook · SharePoint · Loop",
    blurb: "Automate everyday Microsoft 365 collaboration workflows.",
  },
};

function pluginFolderPath(plugin) {
  // Support both canonical relative-path string sources ("./<path>") and
  // the legacy git-subdir object form for backwards compatibility.
  if (typeof plugin.source === "string") {
    return plugin.source.replace(/^\.\//, "");
  }
  if (plugin.source && typeof plugin.source === "object" && plugin.source.path) {
    return plugin.source.path;
  }
  return plugin.name;
}

function readPluginJson(folder) {
  const p = path.join(ROOT, folder, ".claude-plugin", "plugin.json");
  if (fs.existsSync(p)) {
    try {
      return JSON.parse(fs.readFileSync(p, "utf8"));
    } catch {
      /* ignore */
    }
  }
  // Some plugins use plugins/<x>/.claude-plugin/plugin.json (already covered).
  return null;
}

function listChildren(folder, sub) {
  const dir = path.join(ROOT, folder, sub);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => !f.startsWith(".") && fs.statSync(path.join(dir, f)).isFile())
    .map((f) => f.replace(/\.md$/, ""));
}

function listSkills(folder) {
  const dir = path.join(ROOT, folder, "skills");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => fs.statSync(path.join(dir, f)).isDirectory());
}

function strip(s) {
  return (s || "").trim();
}

function escapeTable(s) {
  return strip(s).replace(/\|/g, "\\|");
}

function hero(plugin, pj, folder) {
  const cat = CATEGORY_META[plugin.category] || CATEGORY_META.productivity;
  const root = backToRoot(folder);
  const tags = (plugin.tags || [])
    .slice(0, 6)
    .map((t) => `<code>${t}</code>`)
    .join(" &nbsp;·&nbsp; ");
  const version = pj && pj.version ? pj.version : "—";
  return `<div align="center">

<a id="top"></a>

# ${plugin.name}

### ${escapeTable(plugin.description)}

<sub>${cat.blurb}</sub>

<br />

<table align="center">
<tr>
<td align="center"><b>Category</b><br /><code>${cat.label}</code></td>
<td align="center"><b>Surfaces</b><br /><sub>${cat.surface}</sub></td>
<td align="center"><b>Version</b><br /><code>${version}</code></td>
<td align="center"><b>Marketplace</b><br /><code>claude-m-microsoft-marketplace</code></td>
</tr>
</table>

${tags ? `<sub>${tags}</sub>\n\n` : ""}<a href="#install"><b>Install</b></a> &nbsp;·&nbsp;
<a href="#overview"><b>Overview</b></a> &nbsp;·&nbsp;
<a href="#architecture"><b>Architecture</b></a> &nbsp;·&nbsp;
<a href="#related-plugins"><b>Related plugins</b></a> &nbsp;·&nbsp;
<a href="${root}README.md"><b>Marketplace</b></a>

</div>

---

> [!TIP]
> **One-line install** — \`/plugin install ${plugin.name}@claude-m-microsoft-marketplace\`

`;
}

function archDiagram(plugin) {
  const cat = plugin.category;
  const name = plugin.name;
  const surfaceMap = {
    cloud: ["Azure ARM REST", "Azure Resource Graph", "Azure CLI"],
    analytics: ["Fabric REST", "Power BI XMLA", "OneLake"],
    security: ["Microsoft Graph", "Defender XDR", "Sentinel"],
    devops: ["Azure DevOps REST", "GitHub API", "Pipelines"],
    productivity: ["Microsoft Graph", "M365 Services", "Webhooks"],
  };
  const surfaces = surfaceMap[cat] || surfaceMap.productivity;
  return [
    "```mermaid",
    "%%{init: {'theme':'base','themeVariables':{'primaryColor':'#0078D4','primaryTextColor':'#FFFFFF','lineColor':'#5B9BD5','fontFamily':'Segoe UI, Arial, sans-serif'}}}%%",
    "flowchart LR",
    "    classDef user fill:#1E1E1E,stroke:#FFFFFF,color:#FFFFFF,stroke-width:2px",
    "    classDef cc fill:#D97757,stroke:#7A3E2A,color:#FFFFFF",
    "    classDef plugin fill:#0078D4,stroke:#003E6B,color:#FFFFFF,stroke-width:2px",
    "    classDef msft fill:#FFB900,stroke:#B07F00,color:#000000",
    "",
    `    U["You"]:::user`,
    `    CC["Claude Code"]:::cc`,
    `    PG["${name}<br/>(plugin)"]:::plugin`,
    "",
    "    subgraph MS[\" Microsoft surfaces \"]",
    "        direction TB",
    ...surfaces.map((s, i) => `        S${i}["${s}"]:::msft`),
    "    end",
    "",
    "    U -->|prompts| CC",
    "    CC -->|loads| PG",
    ...surfaces.map((_, i) => `    PG ==> S${i}`),
    "```",
  ].join("\n");
}

function relatedPlugins(plugin) {
  const siblings = MARKETPLACE.plugins
    .filter((p) => p.category === plugin.category && p.name !== plugin.name)
    .sort((a, b) => {
      // Prefer siblings that share at least one tag.
      const sharedA = (a.tags || []).filter((t) =>
        (plugin.tags || []).includes(t),
      ).length;
      const sharedB = (b.tags || []).filter((t) =>
        (plugin.tags || []).includes(t),
      ).length;
      if (sharedA !== sharedB) return sharedB - sharedA;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 6);
  if (siblings.length === 0) return "";
  const fromFolder = pluginFolderPath(plugin);
  let out = "<table>\n";
  out += "<tr><th>Plugin</th><th>What it does</th></tr>\n";
  for (const s of siblings) {
    const toFolder = pluginFolderPath(s);
    let rel = path.relative(fromFolder, toFolder);
    if (rel === "") rel = ".";
    const link = rel + "/README.md";
    out += `<tr><td><a href="${link}"><code>${s.name}</code></a></td><td>${escapeTable(s.description)}</td></tr>\n`;
  }
  out += "</table>\n";
  return out;
}

function inventoryTable(folder) {
  const commands = listChildren(folder, "commands");
  const agents = listChildren(folder, "agents");
  const skills = listSkills(folder);
  if (commands.length + agents.length + skills.length === 0) return "";
  let out =
    "<details>\n<summary><b>What ships in this plugin</b> (commands, agents, skills)</summary>\n\n";
  out += "| Component | Items |\n|---|---|\n";
  if (commands.length)
    out += `| **Commands** | ${commands.map((c) => "`/" + c + "`").join(" · ")} |\n`;
  if (agents.length)
    out += `| **Agents** | ${agents.map((a) => "`" + a + "`").join(" · ")} |\n`;
  if (skills.length)
    out += `| **Skills** | ${skills.map((s) => "`" + s + "`").join(" · ")} |\n`;
  out += "\n</details>\n";
  return out;
}

function backToRoot(folder) {
  // Number of levels above repo root.
  const depth = folder.split(/[\\/]+/).filter(Boolean).length;
  return "../".repeat(depth).replace(/\/$/, "/") || "./";
}

function premiumHeader(plugin, folder, pj) {
  const cat = CATEGORY_META[plugin.category] || CATEGORY_META.productivity;
  return `${HEADER_MARK}
${hero(plugin, pj, folder)}

## Overview

> ${escapeTable(plugin.description)}

${inventoryTable(folder)}

<details>
<summary><b>Quick example</b></summary>

\`\`\`text
Use ${plugin.name} to ${{
    cloud: "audit and operate Azure resources end-to-end.",
    analytics: "design, build, and govern Fabric / Power BI assets.",
    security: "investigate, contain, and harden against threats.",
    devops: "ship work through pipelines with full ALM.",
    productivity: "automate Microsoft 365 collaboration workflows.",
  }[plugin.category] || "automate this Microsoft surface."}
\`\`\`

</details>

<a id="architecture"></a>

## Architecture

${archDiagram(plugin)}

<a id="install"></a>

## Install

\`\`\`bash
/plugin marketplace add markus41/Claude-m
/plugin install ${plugin.name}@claude-m-microsoft-marketplace
\`\`\`

> [!IMPORTANT]
> This plugin operates against **${cat.surface}**. Configure credentials via environment variables — never commit secrets.

[Back to top](#top)

---

${HEADER_END}
`;
}

function premiumFooter(plugin, folder) {
  const root = backToRoot(folder);
  return `${FOOTER_MARK}

---

<a id="related-plugins"></a>

## Related plugins

${relatedPlugins(plugin) || "<sub>This plugin stands alone in its category.</sub>"}

<details>
<summary><b>Composable stacks that include <code>${plugin.name}</code></b></summary>

Combine with sibling plugins to build cross-surface runbooks. Browse the full [marketplace catalog](${root}README.md#plugin-catalog) for a tailored selection.

</details>

---

<div align="center">

<sub>Part of <a href="${root}README.md"><b>Claude-m</b></a> — the Microsoft plugin marketplace for Claude Code.</sub>

<sub>Licensed under <a href="${root}LICENSE">MIT</a>. Built for engineers, MSPs, SOC teams, and analytics leaders.</sub>

</div>

${FOOTER_END}
`;
}

function stripExistingWrappers(content) {
  // Remove an existing premium header block.
  const headerRe = new RegExp(
    `${HEADER_MARK}[\\s\\S]*?${HEADER_END}\\n?`,
    "g",
  );
  // Remove an existing premium footer block.
  const footerRe = new RegExp(
    `${FOOTER_MARK}[\\s\\S]*?${FOOTER_END}\\n?`,
    "g",
  );
  return content.replace(headerRe, "").replace(footerRe, "");
}

function stripLeadingTitle(content, name) {
  // Strip a leading "# <name>" line (and any immediately following blank line)
  // because the new header already presents the name prominently.
  const lines = content.split("\n");
  // Skip leading blank lines.
  let i = 0;
  while (i < lines.length && lines[i].trim() === "") i++;
  if (i < lines.length && /^#\s+/.test(lines[i])) {
    lines.splice(i, 1);
    while (i < lines.length && lines[i].trim() === "") {
      lines.splice(i, 1);
    }
  }
  return lines.join("\n");
}

function enhanceOne(plugin) {
  const folder = pluginFolderPath(plugin);
  const readmePath = path.join(ROOT, folder, "README.md");
  let original = "";
  if (fs.existsSync(readmePath)) {
    original = fs.readFileSync(readmePath, "utf8");
  } else {
    if (!fs.existsSync(path.join(ROOT, folder))) {
      return { folder, status: "missing-folder" };
    }
    original = `## About this plugin\n\n${plugin.description}\n`;
  }
  const stripped = stripLeadingTitle(stripExistingWrappers(original), plugin.name);
  const pj = readPluginJson(folder);
  const header = premiumHeader(plugin, folder, pj);
  const footer = premiumFooter(plugin, folder);
  const next = header + "\n" + stripped.trim() + "\n" + footer + "\n";
  fs.writeFileSync(readmePath, next);
  return { folder, status: "enhanced" };
}

function main() {
  const results = [];
  for (const plugin of MARKETPLACE.plugins) {
    results.push(enhanceOne(plugin));
  }
  const enhanced = results.filter((r) => r.status === "enhanced").length;
  const missing = results.filter((r) => r.status === "missing");
  console.log(`Enhanced ${enhanced} READMEs.`);
  if (missing.length) {
    console.log("Missing READMEs:");
    for (const m of missing) console.log(`  - ${m.folder}`);
  }
}

main();
