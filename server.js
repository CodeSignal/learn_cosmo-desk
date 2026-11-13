import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { CONFIG_FILE, WORK_FILE, loadConfig, loadWork, saveWork } from './lib/files.js';
import { publicConfig } from './shared/config.js';
import { applyPatch, emptyWork } from './shared/work.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const MAX_BODY_BYTES = 64 * 1024;
const CASE_ROUTE = /^\/api\/work\/cases\/([^/]+)$/;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

class BodyTooLargeError extends Error {}

function parsePathname(url) {
  try {
    return new URL(url, 'http://localhost').pathname;
  } catch {
    return null;
  }
}

function safeDecode(component) {
  try {
    return decodeURIComponent(component);
  } catch {
    return null;
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size <= MAX_BODY_BYTES) chunks.push(chunk);
    });
    req.on('end', () => {
      if (size > MAX_BODY_BYTES) {
        reject(new BodyTooLargeError(`request body is over ${MAX_BODY_BYTES} bytes`));
        return;
      }
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

function serveStatic(distDir, pathname, res) {
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const file = path.resolve(distDir, relative);
  if (path.relative(distDir, file).startsWith('..')) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }
  const target =
    fs.existsSync(file) && fs.statSync(file).isFile() ? file : path.join(distDir, 'index.html');
  fs.readFile(target, (error, data) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[path.extname(target).toLowerCase()] ?? 'application/octet-stream',
    });
    res.end(data);
  });
}

/** An invalid config still starts the server, so the browser can show the task as broken. */
export function createAppServer({ configFile, workFile, distDir = null }) {
  let config = null;
  try {
    config = loadConfig(configFile);
  } catch (error) {
    console.error(error.message);
  }
  let work = config ? loadWork(config, workFile) : emptyWork();

  async function handleApi(req, res, pathname) {
    if (!config) {
      sendJson(res, 503, { error: 'This task has no valid Cosmo Desk configuration.' });
      return;
    }
    if (req.method === 'GET' && pathname === '/api/config') {
      sendJson(res, 200, publicConfig(config));
      return;
    }
    if (req.method === 'GET' && pathname === '/api/work') {
      sendJson(res, 200, work);
      return;
    }
    const caseMatch = CASE_ROUTE.exec(pathname);
    if (req.method === 'PATCH' && caseMatch) {
      let patch;
      try {
        patch = JSON.parse(await readBody(req));
      } catch (error) {
        const status = error instanceof BodyTooLargeError ? 413 : 400;
        sendJson(res, status, { error: `invalid request body: ${error.message}` });
        return;
      }
      const caseId = safeDecode(caseMatch[1]);
      const result =
        caseId === null
          ? { error: 'invalid case id' }
          : applyPatch(config, work, caseId, patch);
      if (result.error) {
        sendJson(res, 400, { error: result.error });
        return;
      }
      saveWork(workFile, result.work);
      work = result.work;
      sendJson(res, 200, { entry: work.cases[caseId] });
      return;
    }
    if (req.method === 'POST' && pathname === '/api/reset') {
      fs.rmSync(workFile, { force: true });
      work = emptyWork();
      sendJson(res, 200, work);
      return;
    }
    sendJson(res, 404, { error: 'not found' });
  }

  return http
    .createServer((req, res) => {
      const pathname = parsePathname(req.url);
      if (pathname === null) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Bad request');
        return;
      }
      if (pathname.startsWith('/api/')) {
        handleApi(req, res, pathname).catch((error) => {
          console.error(`API error on ${req.method} ${pathname}:`, error);
          if (!res.headersSent) sendJson(res, 500, { error: 'internal error' });
        });
        return;
      }
      if (distDir && req.method === 'GET') {
        serveStatic(distDir, pathname, res);
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    })
    .on('error', (error) => console.error('Server error:', error));
}

function main() {
  const isProduction = process.env.IS_PRODUCTION === 'true';
  const distDir = path.join(ROOT, 'dist');
  if (isProduction && !fs.existsSync(distDir)) {
    throw new Error(`IS_PRODUCTION=true but ${distDir} does not exist; run npm run build first`);
  }
  // The session preview reaches port 3000 from outside the container, so production binds every interface.
  const port = isProduction ? 3000 : Number(process.env.PORT || 3000);
  const host = process.env.HOST || (isProduction ? '0.0.0.0' : '127.0.0.1');
  const stateDir = process.env.STATE_DIR || process.cwd();
  const configFile = process.env.CONFIG_FILE || path.join(stateDir, CONFIG_FILE);
  const workFile = path.join(stateDir, WORK_FILE);

  const server = createAppServer({ configFile, workFile, distDir: isProduction ? distDir : null });
  server.listen(port, host, () => {
    console.log(`Cosmo Desk on http://${host}:${port} (config ${configFile}, work ${workFile})`);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main();
}
