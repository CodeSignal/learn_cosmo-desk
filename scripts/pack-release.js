import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import esbuild from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACK = path.join(ROOT, 'pack');
const TARBALL = path.join(ROOT, 'release.tar.gz');

const ENTRY_POINTS = ['server.js', 'scripts/report.js', 'scripts/validate.js'];

// The release unpacks beside the task's own config.json and solution.json, so it must never carry either.
const FILES = ['dist', 'config.example.jsonc', 'docs/authoring.md', 'README.md', 'LICENSE'];

async function bundle(entry) {
  await esbuild.build({
    absWorkingDir: ROOT,
    entryPoints: [entry],
    outfile: path.join(PACK, entry),
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node22',
    minify: true,
    keepNames: true,
    legalComments: 'none',
    // A CommonJS bundle has no import.meta.url; this banner gives it the bundle's own URL.
    define: { 'import.meta.url': '__bundleUrl' },
    banner: { js: "const __bundleUrl = require('url').pathToFileURL(__filename).href;" },
    logLevel: 'warning',
  });
}

function writePackageJson() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  // No "type": "module": the bundles are CommonJS.
  const packed = {
    name: pkg.name,
    version: pkg.version,
    private: true,
    license: pkg.license,
    scripts: {
      start: 'npm run start:prod',
      'start:prod': 'IS_PRODUCTION=true node server.js',
      report: 'node scripts/report.js',
      validate: 'node scripts/validate.js',
    },
  };
  fs.writeFileSync(path.join(PACK, 'package.json'), `${JSON.stringify(packed, null, 2)}\n`);
}

async function main() {
  if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) {
    throw new Error('dist/ is missing: run npm run build first');
  }
  fs.rmSync(PACK, { recursive: true, force: true });
  fs.mkdirSync(PACK);

  for (const entry of ENTRY_POINTS) await bundle(entry);
  for (const rel of FILES) fs.cpSync(path.join(ROOT, rel), path.join(PACK, rel), { recursive: true });
  writePackageJson();

  fs.rmSync(TARBALL, { force: true });
  execFileSync('tar', ['-czf', TARBALL, '-C', PACK, '.']);
  const kb = Math.round(fs.statSync(TARBALL).size / 1024);
  console.log(`Packed ${path.relative(ROOT, TARBALL)} (${kb} KB)`);
}

main().catch((error) => {
  console.error(`Packing failed: ${error.message}`);
  process.exit(1);
});
