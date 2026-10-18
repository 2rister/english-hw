const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const publishRoot = path.resolve(__dirname, '../../../../../');
const mime = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg' };

function servePublishRoot() {
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relativePath = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
    const target = path.resolve(publishRoot, relativePath.slice(1) || 'index.html');
    if (!target.startsWith(`${publishRoot}${path.sep}`)) return response.writeHead(403).end();
    fs.readFile(target, (error, body) => {
      if (error) return response.writeHead(error.code === 'ENOENT' ? 404 : 500).end();
      response.writeHead(200, { 'content-type': mime[path.extname(target)] || 'application/octet-stream' });
      response.end(body);
    });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ baseUrl: `http://127.0.0.1:${port}`, close: () => new Promise(done => server.close(done)) });
    });
  });
}

module.exports = { publishRoot, servePublishRoot };
