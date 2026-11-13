import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

import { createAppServer } from '../server.js';
import { exampleConfig } from './helpers.js';

async function startServer(config) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cosmo-desk-'));
  const configFile = path.join(dir, 'config.json');
  const workFile = path.join(dir, 'solution.json');
  fs.writeFileSync(configFile, JSON.stringify(config));
  const server = createAppServer({ configFile, workFile });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { server, base, dir, workFile };
}

function patch(base, caseId, body) {
  return fetch(`${base}/api/work/cases/${caseId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('server API', () => {
  let app;

  before(async () => {
    const config = exampleConfig();
    config.answerKey = { 'SD-2041': { priority: 'P3' } };
    config.cases[0].expected = 'P3';
    app = await startServer(config);
  });

  after(() => {
    app.server.close();
    fs.rmSync(app.dir, { recursive: true, force: true });
  });

  it('serves the allowlisted config without author-only keys', async () => {
    const body = await (await fetch(`${app.base}/api/config`)).json();
    assert.equal(body.cases.length, 15);
    assert.equal(body.answerKey, undefined);
    assert.equal(body.cases[0].expected, undefined);
  });

  it('saves a patch to solution.json and returns it from /api/work', async () => {
    const response = await patch(app.base, 'SD-2041', { category: 'access', priority: 'P3' });
    assert.equal(response.status, 200);
    const saved = JSON.parse(fs.readFileSync(app.workFile, 'utf8'));
    assert.equal(saved.cases['SD-2041'].priority, 'P3');
    const work = await (await fetch(`${app.base}/api/work`)).json();
    assert.equal(work.cases['SD-2041'].category, 'access');
  });

  it('rejects invalid values and leaves the saved work unchanged', async () => {
    const before = fs.readFileSync(app.workFile, 'utf8');
    for (const [caseId, body] of [
      ['SD-2041', { priority: 'P9' }],
      ['SD-2041', { verdict: 'PASS' }],
      ['SD-9999', { priority: 'P1' }],
      ['SD-2041', '{not json'],
    ]) {
      const response = await patch(app.base, caseId, body);
      assert.equal(response.status, 400, `${caseId} ${JSON.stringify(body)} was accepted`);
    }
    assert.equal(fs.readFileSync(app.workFile, 'utf8'), before);
  });

  it('answers a body over 64 KB with 413', async () => {
    const response = await patch(app.base, 'SD-2045', { reply: 'x'.repeat(70 * 1024) });
    assert.equal(response.status, 413);
  });

  it('answers a malformed request line with 400 and keeps serving', async () => {
    const { port } = app.server.address();
    const reply = await new Promise((resolve, reject) => {
      const socket = net.connect(port, '127.0.0.1', () => socket.write('GET //[ HTTP/1.1\r\nHost: x\r\n\r\n'));
      let data = '';
      socket.on('data', (chunk) => {
        data += chunk;
        socket.end();
      });
      socket.on('end', () => resolve(data));
      socket.on('error', reject);
      socket.setTimeout(2000, () => {
        socket.destroy();
        reject(new Error('no response to a malformed request'));
      });
    });
    assert.match(reply, /^HTTP\/1\.1 400/);
    assert.equal((await fetch(`${app.base}/api/work`)).status, 200);
  });

  it('answers a case id with broken percent-encoding with 400', async () => {
    const response = await patch(app.base, '%E0', { priority: 'P1' });
    assert.equal(response.status, 400);
  });

  it('erases saved work on reset', async () => {
    const response = await fetch(`${app.base}/api/reset`, { method: 'POST' });
    assert.deepEqual(await response.json(), { version: 1, cases: {} });
    assert.equal(fs.existsSync(app.workFile), false);
  });
});

describe('server with an invalid config', () => {
  it('answers API calls with 503 instead of crashing', async () => {
    const app = await startServer({ version: 1 });
    try {
      const response = await fetch(`${app.base}/api/config`);
      assert.equal(response.status, 503);
    } finally {
      app.server.close();
      fs.rmSync(app.dir, { recursive: true, force: true });
    }
  });
});
