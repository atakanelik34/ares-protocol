module.exports = {
  apps: [
    {
      name: 'ares-api',
      cwd: '/var/www/ares/ares-protocol/api/query-gateway',
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
        DATABASE_URL: 'sqlite:./data/ares.db',
        AUTH_NONCE_TTL_MS: '300000',
        CORS_ORIGIN: 'https://ares-protocol.xyz,https://www.ares-protocol.xyz,https://app.ares-protocol.xyz',
        ALLOW_UNAUTH_SEED: 'false'
      }
    },
    {
      name: 'ares-app',
      cwd: '/var/www/ares/ares-protocol/dashboard/agent-explorer',
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production',
        NEXT_PUBLIC_API_BASE: 'https://api.ares-protocol.xyz',
        NEXT_PUBLIC_BASE_RPC: 'https://sepolia.base.org'
      }
    },
    {
      name: 'ares-admin',
      cwd: '/var/www/ares/ares-protocol/dashboard/protocol-admin',
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production',
        NEXT_PUBLIC_API_BASE: 'https://api.ares-protocol.xyz'
      }
    }
  ]
};
