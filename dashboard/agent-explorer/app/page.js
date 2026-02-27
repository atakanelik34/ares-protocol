import ExplorerClient from './ExplorerClient';

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || 'https://ares-protocol.xyz/api').replace(/\/$/, '');
const STAR_AGENT = '0x2fca0afce3181d4b3d86c18d2caa440cf628d3f5';

async function fetchJson(path) {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      cache: 'no-store',
      headers: {
        accept: 'application/json'
      }
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export default async function Page() {
  const [leaderboardBody, historyBody, agentBody] = await Promise.all([
    fetchJson('/v1/agents?limit=100'),
    fetchJson('/v1/history?limit=20&page=1'),
    fetchJson(`/v1/agent/${STAR_AGENT}`)
  ]);

  const historyItems = historyBody?.items || [];
  const historyPg = historyBody?.pagination || {};

  return (
    <ExplorerClient
      initialQuery={STAR_AGENT}
      initialAgent={agentBody || null}
      initialLeaderboard={leaderboardBody?.items || []}
      initialHistory={historyItems}
      initialHistoryPage={Number(historyPg.page || 1)}
      initialHistoryTotalPages={Number(historyPg.totalPages || 1)}
      initialHistoryTotalItems={Number(historyPg.totalItems || historyItems.length)}
      initialLastLiveAt={historyItems[0]?.timestamp || ''}
    />
  );
}
