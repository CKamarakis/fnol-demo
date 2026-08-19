/**
 * Serves the built prototype over HTTP.
 *
 * The artifact is designed to open straight from the filesystem, so this is a
 * convenience rather than a requirement — useful for viewing on a phone on the
 * same network, or where a browser is strict about file:// URLs.
 *
 *   node tests/serve.mjs [port]
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = join(ROOT, 'dist', 'prototype.html');
const PORT = Number(process.argv[2]) || 5173;

if (!existsSync(FILE)) {
  console.error('dist/prototype.html not found — run `npm run build` first.');
  process.exit(1);
}

const server = createServer(async (req, res) => {
  try {
    const html = await readFile(FILE);
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      // always serve the current build, never a cached one
      'Cache-Control': 'no-store',
    });
    res.end(html);
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end(`Could not read the build: ${e.message}`);
  }
});

/** The LAN address, so the demo can be opened on a phone on the same network. */
function lanAddress() {
  for (const addrs of Object.values(networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family === 'IPv4' && !a.internal) return a.address;
    }
  }
  return null;
}

server.listen(PORT, () => {
  const lan = lanAddress();
  console.log(`\n  FNOL prototype\n`);
  console.log(`  local    http://localhost:${PORT}`);
  if (lan) console.log(`  network  http://${lan}:${PORT}   (open this on a phone)`);
  console.log(`\n  Serving dist/prototype.html. Ctrl-C to stop.`);
  console.log(`  Run \`npm run watch\` in another terminal to rebuild on change.\n`);
});
