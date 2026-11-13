import { ConfigError, loadConfig } from '../lib/files.js';

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: npm run validate -- <config.json> [more configs]');
  process.exit(2);
}

let failed = false;
for (const file of files) {
  try {
    const config = loadConfig(file);
    const replies = config.cases.filter((item) => item.replyRequired).length;
    console.log(`OK ${file}: ${config.cases.length} cases, ${replies} needing a reply`);
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error;
    failed = true;
    console.error(`INVALID ${error.message}`);
  }
}
process.exit(failed ? 1 : 0);
