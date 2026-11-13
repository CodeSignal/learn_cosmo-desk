import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { readJsonFile } from '../lib/files.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const EXAMPLES = ['it-service-desk', 'claims-intake'];

export function exampleFile(name, file) {
  return path.join(ROOT, 'examples', name, file);
}

export function readExample(name, file) {
  return readJsonFile(exampleFile(name, file));
}

export function exampleConfig(name = 'it-service-desk') {
  return readExample(name, 'config.json');
}
