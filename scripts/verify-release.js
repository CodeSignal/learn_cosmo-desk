import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SESSION_PORT = 3000;
const args = process.argv.slice(2);
const requireSessionPort = args.includes('--require-session-port');
const tarball = path.resolve(args.find((arg) => !arg.startsWith('--')) ?? 'release.tar.gz');

function check(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`ok - ${message}`);
}

function run(dir, file, extraArgs = []) {
  return execFileSync(process.execPath, [file, ...extraArgs], { cwd: dir, encoding: 'utf8' });
}

function portIsFree(port) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.listen(port, '0.0.0.0', () => probe.close(() => resolve(true)));
  });
}

async function waitForServer(url, child) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`the server exited with code ${child.exitCode}`);
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`no answer from ${url}`);
}

async function driveSession(dir) {
  const child = spawn('npm', ['run', 'start:prod'], { cwd: dir, stdio: 'ignore' });
  try {
    const base = `http://127.0.0.1:${SESSION_PORT}`;
    const page = await (await waitForServer(`${base}/`, child)).text();
    check(page.includes('<div id="root">'), 'npm run start:prod serves the client on port 3000');
    const config = await (await fetch(`${base}/api/config`)).json();
    const first = config.cases[0];
    const response = await fetch(`${base}/api/work/cases/${first.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority: config.fields.priority.options[0].id }),
    });
    check(response.ok, 'a decision saves through the API');
    check(fs.existsSync(path.join(dir, 'solution.json')), 'the saved work lands in solution.json');
    const report = run(dir, 'scripts/report.js');
    check(
      report.includes(`| ${first.id} |`) && report.includes(config.fields.priority.options[0].label),
      'the report shows the saved decision'
    );
  } finally {
    child.kill();
  }
}

async function main() {
  check(fs.existsSync(tarball), `${path.basename(tarball)} exists`);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cosmo-desk-release-'));
  try {
    execFileSync('tar', ['-xzf', tarball, '-C', dir]);
    const listing = execFileSync('tar', ['-tzf', tarball], { encoding: 'utf8' }).split('\n');
    check(!listing.some((entry) => entry.includes('node_modules')), 'the release has no node_modules');
    check(
      !listing.some((entry) => /(^|\/)(config|solution|assertions)\.json$/.test(entry)),
      'the release carries no config.json, solution.json or assertions.json'
    );
    check(!listing.some((entry) => entry.includes('examples/')), 'the release carries no example solutions');
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    check(pkg.type === undefined && pkg.scripts['start:prod'], 'package.json runs CommonJS bundles with start:prod');

    fs.copyFileSync(path.join(ROOT, 'examples', 'it-service-desk', 'config.json'), path.join(dir, 'config.json'));
    check(run(dir, 'scripts/validate.js', ['config.json']).startsWith('OK'), 'the bundled validator accepts a task');
    check(run(dir, 'scripts/report.js').includes('# Cosmo Desk Session Report'), 'the bundled report runs');

    if (await portIsFree(SESSION_PORT)) {
      await driveSession(dir);
    } else if (requireSessionPort) {
      throw new Error(`port ${SESSION_PORT} is in use, so the session boot could not be checked`);
    } else {
      console.log(`skip - port ${SESSION_PORT} is in use here; CI checks the session boot`);
    }
    console.log('Release verified.');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`Release verification failed: ${error.message}`);
  process.exit(1);
});
