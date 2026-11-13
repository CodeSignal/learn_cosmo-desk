import path from 'node:path';
import { parseArgs } from 'node:util';

import { CONFIG_FILE, WORK_FILE, loadConfig, loadWork } from '../lib/files.js';
import { renderReport } from '../lib/report.js';

const { values } = parseArgs({
  options: {
    dir: { type: 'string', default: process.cwd() },
    config: { type: 'string' },
    work: { type: 'string' },
  },
});

const configFile = values.config ?? path.join(values.dir, CONFIG_FILE);
const workFile = values.work ?? path.join(values.dir, WORK_FILE);

try {
  const config = loadConfig(configFile);
  process.stdout.write(renderReport(config, loadWork(config, workFile)));
} catch (error) {
  console.error(`Cosmo Desk report failed: ${error.message}`);
  process.exit(1);
}
