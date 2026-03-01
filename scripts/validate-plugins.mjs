import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const marketplacePath = path.join(rootDir, '.claude-plugin', 'marketplace.json');
const claudeCatalogPath = path.join(rootDir, 'CLAUDE.md');

const marketplace = JSON.parse(fs.readFileSync(marketplacePath, 'utf8'));
const claudeCatalog = parseClaudeCatalog(fs.readFileSync(claudeCatalogPath, 'utf8'));

let hasError = false;

for (const pluginEntry of marketplace.plugins ?? []) {
  if (typeof pluginEntry.source !== 'string' || !pluginEntry.source.startsWith('./')) {
    continue;
  }

  const pluginDir = path.join(rootDir, pluginEntry.source.slice(2));
  const manifestPath = path.join(pluginDir, '.claude-plugin', 'plugin.json');
  const readmePath = path.join(pluginDir, 'README.md');
  const commandsDir = path.join(pluginDir, 'commands');
  const skillsDir = path.join(pluginDir, 'skills');

  if (!fs.existsSync(pluginDir) || !fs.statSync(pluginDir).isDirectory()) {
    fail(`Marketplace source directory does not exist: ${pluginEntry.source}`);
    continue;
  }

  if (!fs.existsSync(manifestPath)) {
    fail(`Missing required file ${toRepoPath(manifestPath)} for plugin ${pluginEntry.name}`);
    continue;
  }

  if (!fs.existsSync(readmePath)) {
    fail(`Missing required file ${toRepoPath(readmePath)} for plugin ${pluginEntry.name}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  if (!fs.existsSync(skillsDir) || !hasSkillFile(skillsDir)) {
    fail(`Missing required skills/*/SKILL.md in ${toRepoPath(pluginDir)} for plugin ${pluginEntry.name}`);
  }

  const commandFiles = getMarkdownFiles(commandsDir);
  if (commandFiles.length === 0) {
    fail(`Missing required commands/*.md in ${toRepoPath(pluginDir)} for plugin ${pluginEntry.name}`);
  }

  const hasReviewerSupport = Array.isArray(manifest.agents) && manifest.agents.some((agentPath) => /reviewer/i.test(agentPath));
  if (hasReviewerSupport) {
    const reviewerAgentFiles = getMarkdownFiles(path.join(pluginDir, 'agents')).filter((agentPath) => /reviewer/i.test(agentPath));
    if (reviewerAgentFiles.length === 0) {
      fail(`Plugin ${pluginEntry.name} declares reviewer support but has no agents/*.md reviewer file`);
    }
  }

  const manifestName = manifest.name;
  if (manifestName !== pluginEntry.name) {
    fail(`Name mismatch for ${pluginEntry.source}: marketplace name is "${pluginEntry.name}" but manifest name is "${manifestName}"`);
  }

  const catalogEntry = claudeCatalog.get(pluginEntry.name);
  if (!catalogEntry) {
    fail(`Plugin ${pluginEntry.name} is missing from CLAUDE.md plugin catalog table`);
  } else {
    if (catalogEntry.category !== pluginEntry.category) {
      fail(`Category drift for ${pluginEntry.name}: marketplace="${pluginEntry.category}" CLAUDE.md="${catalogEntry.category}"`);
    }

    if (!sameText(catalogEntry.description, pluginEntry.description)) {
      fail(`Description drift for ${pluginEntry.name}: marketplace and CLAUDE.md descriptions differ`);
    }
  }

  for (const commandPath of commandFiles) {
    lintCommand(commandPath);
  }
}

if (hasError) {
  process.exit(1);
}

console.log('Knowledge plugin validation passed.');

function parseClaudeCatalog(content) {
  const catalog = new Map();
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('| `') || !trimmed.endsWith('|')) {
      continue;
    }

    const cells = trimmed
      .slice(1, -1)
      .split('|')
      .map((cell) => cell.trim());

    if (cells.length < 3) {
      continue;
    }

    const slugMatch = cells[0].match(/^`([^`]+)`$/);
    if (!slugMatch) {
      continue;
    }

    catalog.set(slugMatch[1], {
      category: cells[1],
      description: cells[2]
    });
  }

  return catalog;
}

function hasSkillFile(skillsDir) {
  if (!fs.existsSync(skillsDir) || !fs.statSync(skillsDir).isDirectory()) {
    return false;
  }

  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const skillPath = path.join(skillsDir, entry.name, 'SKILL.md');
    if (fs.existsSync(skillPath)) {
      return true;
    }
  }

  return false;
}

function getMarkdownFiles(directory) {
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    return [];
  }

  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => path.join(directory, entry.name));
}

function lintCommand(commandPath) {
  const content = fs.readFileSync(commandPath, 'utf8');

  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!frontmatterMatch) {
    fail(`Missing YAML frontmatter block in ${toRepoPath(commandPath)}`);
    return;
  }

  const frontmatter = frontmatterMatch[1];
  if (!/^description:/m.test(frontmatter)) {
    fail(`Command frontmatter missing "description" in ${toRepoPath(commandPath)}`);
  }

  if (!/^allowed-tools:/m.test(frontmatter)) {
    fail(`Command frontmatter missing "allowed-tools" in ${toRepoPath(commandPath)}`);
  }

  const body = content.slice(frontmatterMatch[0].length);
  if (!/^##\s+/m.test(body)) {
    fail(`Command doc must include at least one H2 section (## ...) in ${toRepoPath(commandPath)}`);
  }

  if (!/^\d+\.\s+/m.test(body) && !/^[-*]\s+/m.test(body)) {
    fail(`Command doc should include deterministic steps/checks as a list in ${toRepoPath(commandPath)}`);
  }
}

function sameText(left, right) {
  return normalize(left) === normalize(right);
}

function normalize(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[—–]/g, '-')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function toRepoPath(absolutePath) {
  return path.relative(rootDir, absolutePath) || '.';
}

function fail(message) {
  hasError = true;
  console.error(message);
}
