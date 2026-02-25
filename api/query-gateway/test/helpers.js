import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const cwd = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getFreePort(host = '127.0.0.1') {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, host, () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('failed to allocate random port')));
        return;
      }
      server.close((closeErr) => {
        if (closeErr) reject(closeErr);
        else resolve(address.port);
      });
    });
  });
}

export function startGateway(extraEnv = {}) {
  let stdout = '';
  let stderr = '';

  const child = spawn(process.execPath, ['src/index.js'], {
    cwd,
    env: {
      ...process.env,
      DATABASE_URL: 'sqlite::memory:',
      SUBGRAPH_QUERY_URL: '',
      SUBGRAPH_API_KEY: '',
      ACCESS_CHECK_MODE: 'off',
      ...extraEnv
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout?.on('data', (chunk) => {
    stdout += chunk.toString();
    if (stdout.length > 6000) stdout = stdout.slice(-6000);
  });

  child.stderr?.on('data', (chunk) => {
    stderr += chunk.toString();
    if (stderr.length > 6000) stderr = stderr.slice(-6000);
  });

  return {
    child,
    getLogs() {
      const out = `${stdout}\n${stderr}`.trim();
      return out.length > 2000 ? out.slice(-2000) : out;
    }
  };
}

export async function waitForServer(port, { child, getLogs, timeoutMs = 15000 } = {}) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (child && child.exitCode !== null) break;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/v1/health`);
      if (res.ok) return;
    } catch {}
    await sleep(150);
  }

  const state = child ? `exitCode=${child.exitCode} signal=${child.signalCode}` : 'exitCode=unknown';
  const logs = getLogs ? getLogs() : '';
  throw new Error(`server did not start on :${port} (${state})${logs ? `\n${logs}` : ''}`);
}

export async function stopChild(child) {
  if (!child || child.exitCode !== null) return;
  child.kill('SIGTERM');
  await sleep(300);
  if (child.exitCode === null) child.kill('SIGKILL');
}
