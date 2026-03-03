import http from 'node:http';
import next from 'next';

const port = Number(process.env.PORT || 3003);
const hostname = process.env.HOSTNAME || process.env.HOST || '127.0.0.1';
const isDev = process.env.NODE_ENV !== 'production';

const app = next({ dev: isDev, hostname, port });
const handle = app.getRequestHandler();

let server;

async function start() {
  await app.prepare();

  server = http.createServer((req, res) => handle(req, res));

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, hostname, () => resolve());
  });

  if (process.send) process.send('ready');
  console.log(`ares-app ready on http://${hostname}:${port}`);
}

async function shutdown(signal) {
  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
    process.exit(0);
  } catch (error) {
    console.error(`ares-app failed to shutdown after ${signal}`, error);
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

start().catch((error) => {
  console.error('ares-app failed to start', error);
  process.exit(1);
});
