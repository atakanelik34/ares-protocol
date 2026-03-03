const fs = require('node:fs');
const path = require('node:path');

const envOr = (key, fallback) => process.env[key] || fallback;

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function loadAppEnv(appCwd) {
  return [
    path.join(appCwd, '.env'),
    path.join(appCwd, '.env.local')
  ].reduce((acc, filePath) => Object.assign(acc, parseEnvFile(filePath)), {});
}

function buildEnv(appCwd, defaults) {
  return {
    ...defaults,
    ...loadAppEnv(appCwd),
    ...process.env
  };
}

const apiCwd = '/var/www/ares/ares-protocol/api/query-gateway';
const appCwd = '/var/www/ares/ares-protocol/dashboard/agent-explorer';

module.exports = {
  apps: [
    {
      name: 'ares-api',
      cwd: apiCwd,
      script: 'src/index.js',
      interpreter: 'node',
      env: buildEnv(apiCwd, {
        NODE_ENV: envOr('NODE_ENV', 'production'),
        HOST: envOr('HOST', '127.0.0.1'),
        PORT: envOr('PORT', '3001'),
        DATABASE_URL: envOr('DATABASE_URL', 'sqlite:./data/ares.db'),
        SUBGRAPH_QUERY_URL: envOr('SUBGRAPH_QUERY_URL', ''),
        SUBGRAPH_API_KEY: envOr('SUBGRAPH_API_KEY', ''),
        AUTH_NONCE_TTL_MS: envOr('AUTH_NONCE_TTL_MS', '300000'),
        AUTH_SESSION_TTL_MS: envOr('AUTH_SESSION_TTL_MS', '3600000'),
        ACCESS_CHECK_MODE: envOr('ACCESS_CHECK_MODE', 'required'),
        BASE_SEPOLIA_RPC_URL: envOr('BASE_SEPOLIA_RPC_URL', 'https://sepolia.base.org'),
        BASE_CHAIN_ID: envOr('BASE_CHAIN_ID', '84532'),
        ARES_API_ACCESS_ADDRESS: envOr('ARES_API_ACCESS_ADDRESS', '0xb390966a42bf073627617cde9467c36bcecdbca2'),
        CORS_ORIGIN: envOr('CORS_ORIGIN', 'https://ares-protocol.xyz,https://www.ares-protocol.xyz,https://app.ares-protocol.xyz'),
        ALLOW_UNAUTH_SEED: envOr('ALLOW_UNAUTH_SEED', 'false'),
        GOLDSKY_WEBHOOK_TOKEN: envOr('GOLDSKY_WEBHOOK_TOKEN', '')
      })
    },
    {
      name: 'ares-app',
      cwd: appCwd,
      script: 'server.js',
      interpreter: 'node',
      wait_ready: true,
      listen_timeout: 15000,
      kill_timeout: 5000,
      env: buildEnv(appCwd, {
        NODE_ENV: envOr('NODE_ENV', 'production'),
        HOST: envOr('HOST', '127.0.0.1'),
        HOSTNAME: envOr('HOSTNAME', '127.0.0.1'),
        PORT: envOr('PORT', '3003'),
        ARES_INTERNAL_API_BASE: envOr('ARES_INTERNAL_API_BASE', 'http://127.0.0.1:3001'),
        NEXT_PUBLIC_API_BASE: envOr('NEXT_PUBLIC_API_BASE', 'https://ares-protocol.xyz/api'),
        NEXT_PUBLIC_BASE_RPC: envOr('NEXT_PUBLIC_BASE_RPC', 'https://sepolia.base.org')
      })
    }
  ]
};
