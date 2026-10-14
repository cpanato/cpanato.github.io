'use strict';

const path = require('node:path');
const { spawn } = require('node:child_process');
const http = require('node:http');
const fs = require('node:fs/promises');

async function main() {
    const { watch } = await import('chokidar');
    const root = path.resolve(__dirname, '..');
    const dist = path.join(root, 'dist');
    const clients = new Set();
    const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.map': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain' };
    const server = http.createServer(async (request, response) => {
        if (!['GET', 'HEAD'].includes(request.method)) {
            response.writeHead(405, { Allow: 'GET, HEAD' }).end();
            return;
        }
        try {
            const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
            if (pathname === '/__reload' && request.method === 'GET') {
                response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
                response.write(': connected\n\n');
                clients.add(response);
                request.on('close', () => clients.delete(response));
                return;
            }
            const file = path.resolve(dist, `.${pathname === '/' ? '/index.html' : pathname}`);
            if (!file.startsWith(dist + path.sep) || pathname.includes('\0')) {
                response.writeHead(400).end();
                return;
            }
            let content = await fs.readFile(file);
            const extension = path.extname(file);
            if (extension === '.html') {
                content = Buffer.from(content.toString().replace('</body>', '<script>new EventSource("/__reload").onmessage = () => location.reload();</script></body>'));
            }
            response.writeHead(200, { 'Content-Type': mime[extension] || 'application/octet-stream', 'Cache-Control': 'no-store' });
            response.end(request.method === 'HEAD' ? undefined : content);
        } catch (error) {
            response.writeHead(error.code === 'ENOENT' || error.code === 'EISDIR' ? 404 : 400).end();
        }
    });
    let building = false;
    let pending = false;
    let timer;
    let child;
    let closing = false;

    function rebuild() {
        if (closing) return;
        if (building) { pending = true; return; }
        building = true;
        child = spawn(process.execPath, [path.join(__dirname, 'build.js')], { cwd: root, stdio: 'inherit' });
        child.on('error', error => console.error(error));
        child.on('close', code => {
            building = false;
            if (code === 0) for (const client of clients) client.write('data: reload\n\n');
            else console.error(`Build failed (${code}); waiting for the next change.`);
            if (pending) { pending = false; rebuild(); }
        });
    }

    const watcher = watch(['src', 'CNAME', 'keybase.txt'], { cwd: root, ignoreInitial: true });
    watcher.on('all', () => {
        clearTimeout(timer);
        timer = setTimeout(rebuild, 150);
    });
    watcher.on('error', error => console.error(error));
    server.on('error', error => { console.error(error); shutdown().then(() => { process.exitCode = 1; }); });
    server.listen(Number(process.env.PORT || 3000), '127.0.0.1', () => {
        console.log(`Local preview: http://localhost:${server.address().port}`);
    });

    async function shutdown() {
        closing = true;
        clearTimeout(timer);
        child?.kill();
        await watcher.close();
        for (const client of clients) client.end();
        server.close();
    }
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
