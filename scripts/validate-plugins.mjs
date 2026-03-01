import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';

const pluginsDir = path.resolve('plugins');
const pluginFolders = fs.readdirSync(pluginsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory());

const schema = {
  type: 'object',
  required: ['name', 'version', 'description', 'author', 'mcpServer'],
  additionalProperties: true,
  properties: {
    name: { type: 'string', minLength: 1 },
    version: { type: 'string', minLength: 1 },
    description: { type: 'string', minLength: 1 },
    author: { type: 'string', minLength: 1 },
    mcpServer: {
      type: 'object',
      required: ['command', 'args'],
      additionalProperties: true,
      properties: {
        command: { type: 'string', minLength: 1 },
        args: {
          type: 'array',
          minItems: 1,
          items: { type: 'string', minLength: 1 }
        }
      }
    }
  }
};

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);
let hasError = false;

for (const folder of pluginFolders) {
  const manifestPath = path.join(pluginsDir, folder.name, 'plugin.json');
  if (!fs.existsSync(manifestPath)) {
    console.error(`Missing plugin manifest: ${manifestPath}`);
    hasError = true;
    continue;
  }

  const raw = fs.readFileSync(manifestPath, 'utf8');
  const data = JSON.parse(raw);
  const valid = validate(data);

  if (!valid) {
    hasError = true;
    console.error(`Validation failed for ${manifestPath}:`);
    for (const error of validate.errors ?? []) {
      console.error(`- ${error.instancePath || '/'} ${error.message}`);
    }
  }
}

if (hasError) {
  process.exit(1);
}

console.log('Plugin manifest validation passed.');
