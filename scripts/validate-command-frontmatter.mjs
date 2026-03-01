import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const rootEntries = fs.readdirSync(rootDir, { withFileTypes: true });
const commandFiles = [];

for (const entry of rootEntries) {
  if (!entry.isDirectory() || entry.name.startsWith('.')) {
    continue;
  }

  const commandsDir = path.join(rootDir, entry.name, 'commands');
  if (!fs.existsSync(commandsDir) || !fs.statSync(commandsDir).isDirectory()) {
    continue;
  }

  const files = fs.readdirSync(commandsDir, { withFileTypes: true });
  for (const file of files) {
    if (file.isFile() && file.name.endsWith('.md')) {
      commandFiles.push(path.join(entry.name, 'commands', file.name));
    }
  }
}

let hasError = false;

for (const relativePath of commandFiles.sort()) {
  const absolutePath = path.join(rootDir, relativePath);
  const content = fs.readFileSync(absolutePath, 'utf8');

  if (!content.startsWith('---\n')) {
    hasError = true;
    console.error(`Missing leading YAML frontmatter delimiter in ${relativePath}`);
  }
}

if (hasError) {
  process.exit(1);
}

console.log(`Command frontmatter validation passed for ${commandFiles.length} files.`);
