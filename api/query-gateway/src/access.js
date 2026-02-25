import { createPublicClient, http } from 'viem';
import { base, baseSepolia } from 'viem/chains';

const ACCESS_ABI = [
  {
    type: 'function',
    name: 'accessExpiry',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint64' }]
  }
];

function normalizeMode(mode) {
  if (!mode) return 'optional';
  const normalized = String(mode).toLowerCase();
  if (normalized === 'off' || normalized === 'optional' || normalized === 'required') {
    return normalized;
  }
  return 'optional';
}

function parseChainId(chainId) {
  const value = Number(chainId || 84532);
  return Number.isFinite(value) && value > 0 ? value : 84532;
}

function resolveChain(chainId) {
  if (chainId === base.id) return base;
  if (chainId === baseSepolia.id) return baseSepolia;
  return {
    ...baseSepolia,
    id: chainId,
    name: `chain-${chainId}`
  };
}

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(value || ''));
}

export function createAccessChecker({ env = process.env, logger = console, readAccessExpiry } = {}) {
  const mode = normalizeMode(env.ACCESS_CHECK_MODE);
  const rpcUrl = env.BASE_RPC_URL || env.BASE_SEPOLIA_RPC_URL || '';
  const contractAddress = env.ARES_API_ACCESS_ADDRESS || '';
  const chainId = parseChainId(env.BASE_CHAIN_ID);

  if (mode === 'off') {
    return {
      mode,
      enabled: false,
      async check() {
        return { enabled: false, hasAccess: true, expiryMs: null };
      }
    };
  }

  if (!rpcUrl || !isAddress(contractAddress)) {
    const error = new Error(
      'Access check is missing BASE_RPC_URL/BASE_SEPOLIA_RPC_URL or valid ARES_API_ACCESS_ADDRESS'
    );
    if (mode === 'required') {
      throw error;
    }

    logger.warn?.(`[access-check] disabled (${error.message})`);
    return {
      mode,
      enabled: false,
      async check() {
        return { enabled: false, hasAccess: true, expiryMs: null };
      }
    };
  }

  const client =
    readAccessExpiry ||
    (() => {
      const publicClient = createPublicClient({
        chain: resolveChain(chainId),
        transport: http(rpcUrl)
      });
      return (account) =>
        publicClient.readContract({
          address: contractAddress,
          abi: ACCESS_ABI,
          functionName: 'accessExpiry',
          args: [account]
        });
    })();

  return {
    mode,
    enabled: true,
    async check(account) {
      try {
        const expiry = await client(account);
        const expiryMs = Number(expiry) * 1000;
        const hasAccess = Number.isFinite(expiryMs) && expiryMs >= Date.now();
        return { enabled: true, hasAccess, expiryMs: Number.isFinite(expiryMs) ? expiryMs : null };
      } catch (error) {
        if (mode === 'required') throw error;
        logger.warn?.(`[access-check] degraded to optional mode (${error.message || error})`);
        return { enabled: false, hasAccess: true, expiryMs: null };
      }
    }
  };
}

