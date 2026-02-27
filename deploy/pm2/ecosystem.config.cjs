module.exports = {
  apps: [
    {
      name: 'ares-api',
      cwd: '/var/www/ares/ares-protocol/api/query-gateway',
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: '3001',
        DATABASE_URL: 'sqlite:./data/ares.db',
        SUBGRAPH_QUERY_URL: 'https://api.studio.thegraph.com/query/1742690/ares-protocol/v0.1.0-sepolia-20260224-3',
        SUBGRAPH_API_KEY: '',
        AUTH_NONCE_TTL_MS: '300000',
        AUTH_SESSION_TTL_MS: '3600000',
        ACCESS_CHECK_MODE: 'required',
        BASE_SEPOLIA_RPC_URL: 'https://sepolia.base.org',
        BASE_CHAIN_ID: '84532',
        // Demo default; override with environment on VM for future deploys.
        ARES_API_ACCESS_ADDRESS: '0xb390966a42bf073627617cde9467c36bcecdbca2',
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
        HOSTNAME: '127.0.0.1',
        NEXT_PUBLIC_API_BASE: 'https://ares-protocol.xyz/api',
        NEXT_PUBLIC_BASE_RPC: 'https://sepolia.base.org'
      }
    }
  ]
};
