import { z } from 'zod';
import { createPublicClient, http, type Address } from 'viem';

const scoreSchema = z.object({
  agentId: z.string(),
  agentIdHex: z.string(),
  ari: z.number(),
  tier: z.string(),
  actions: z.number(),
  since: z.string().nullable()
});

const agentSchema = z.object({
  found: z.boolean(),
  address: z.string().optional(),
  agentId: z.string().optional(),
  agentIdHex: z.string().optional(),
  operator: z.string().optional(),
  registeredAt: z.string().optional(),
  ari: z.number().optional(),
  tier: z.string().optional(),
  since: z.string().nullable().optional(),
  actionsCount: z.number().optional(),
  actions: z.array(z.any()).optional()
});

export type ScoreResponse = z.infer<typeof scoreSchema>;
export type AgentResponse = z.infer<typeof agentSchema>;

export class AresClient {
  constructor(private readonly baseUrl: string) {}

  async getScore(address: string): Promise<ScoreResponse> {
    const res = await fetch(`${this.baseUrl}/v1/score/${address}`);
    if (!res.ok) throw new Error(`getScore failed: ${res.status}`);
    return scoreSchema.parse(await res.json());
  }

  async getAgent(address: string): Promise<AgentResponse> {
    const res = await fetch(`${this.baseUrl}/v1/agent/${address}`);
    if (!res.ok) throw new Error(`getAgent failed: ${res.status}`);
    return agentSchema.parse(await res.json());
  }

  async getAccessStatus(account: string, token?: string): Promise<{ account: string; hasAccess: boolean; expiresAt: number | null }> {
    const res = await fetch(`${this.baseUrl}/v1/access/${account}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) throw new Error(`getAccessStatus failed: ${res.status}`);
    return (await res.json()) as { account: string; hasAccess: boolean; expiresAt: number | null };
  }
}

export function createAresReader(rpcUrl: string, aresProtocolAddress: Address, abi: readonly unknown[]) {
  const client = createPublicClient({ transport: http(rpcUrl) });

  return {
    getScore: (agent: Address) => client.readContract({ address: aresProtocolAddress, abi, functionName: 'getScore', args: [agent] }),
    getTier: (agent: Address) => client.readContract({ address: aresProtocolAddress, abi, functionName: 'getTier', args: [agent] })
  };
}
