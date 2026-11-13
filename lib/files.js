import fs from 'node:fs';
import path from 'node:path';

import { validateConfig } from '../shared/config.js';
import { emptyWork, sanitizeWork } from '../shared/work.js';

export const CONFIG_FILE = 'config.json';
export const WORK_FILE = 'solution.json';

export class ConfigError extends Error {
  constructor(message, problems = []) {
    super(problems.length ? `${message}:\n- ${problems.join('\n- ')}` : message);
    this.name = 'ConfigError';
    this.problems = problems;
  }
}

export function readJsonFile(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function loadConfig(file) {
  if (!fs.existsSync(file)) throw new ConfigError(`no task config at ${file}`);
  let config;
  try {
    config = readJsonFile(file);
  } catch (error) {
    throw new ConfigError(`${file} is not valid JSON (${error.message})`);
  }
  const problems = validateConfig(config);
  if (problems.length) throw new ConfigError(`${file} is not a valid Cosmo Desk config`, problems);
  return config;
}

export function loadWork(config, file) {
  if (!fs.existsSync(file)) return emptyWork();
  try {
    return sanitizeWork(config, readJsonFile(file));
  } catch (error) {
    console.error(`Ignoring unreadable saved work at ${file}: ${error.message}`);
    return emptyWork();
  }
}

export function saveWork(file, work) {
  const temp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.tmp`);
  fs.writeFileSync(temp, `${JSON.stringify(work, null, 2)}\n`);
  fs.renameSync(temp, file);
}
