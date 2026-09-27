import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.pdf': 'application/pdf', '.bib': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8' };
const rootFiles = new Set(['index.html', 'styles.css', 'script.js', 'README.md', 'THIRD_PARTY_NOTICES.md', '.nojekyll']);
http.createServer(async (request, response) => {
  try {
    let relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\/vlcot-paper-page(?=\/|$)/, '').replace(/^\/+/, '') || 'index.html';
    if (relative.includes('\\') || relative.split('/').some((part) => part === '..') || (!relative.startsWith('assets/') && !rootFiles.has(relative))) throw new Error('Not public');
    const location = path.join(root, relative);
    if (!(await stat(location)).isFile()) throw new Error('Not a file');
    const content = await readFile(location);
    response.writeHead(200, { 'Content-Type': types[path.extname(location)] || 'application/octet-stream', 'Content-Length': content.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`VLCoT preview: http://127.0.0.1:${port}/vlcot-paper-page/`));
