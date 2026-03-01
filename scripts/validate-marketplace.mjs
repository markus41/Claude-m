import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';

const marketplacePath = path.resolve('.claude-plugin/marketplace.json');
const raw = fs.readFileSync(marketplacePath, 'utf8');
const data = JSON.parse(raw);

const schema = {
  type: 'object',
  required: ['name', 'description', 'plugins'],
  additionalProperties: true,
  properties: {
    name: { type: 'string', minLength: 1 },
    description: { type: 'string', minLength: 1 },
    plugins: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['name', 'source', 'description'],
        additionalProperties: true,
        properties: {
          name: { type: 'string', minLength: 1 },
          source: { type: 'string', minLength: 1 },
          description: { type: 'string', minLength: 1 },
          tags: {
            type: 'array',
            items: { type: 'string', minLength: 1 }
          },
          category: { type: 'string', minLength: 1 }
        }
      }
    }
  }
};

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

if (!validate(data)) {
  console.error('Marketplace schema validation failed:');
  for (const error of validate.errors ?? []) {
    console.error(`- ${error.instancePath || '/'} ${error.message}`);
  }
  process.exit(1);
}

console.log('Marketplace schema validation passed.');
