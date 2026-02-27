'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || 'https://ares-protocol.xyz/api').replace(/\/$/, '');
const SHOWCASE_AGENTS = [
  { label: 'star', address: '0x2fca0afce3181d4b3d86c18d2caa440cf628d3f5' },
  { label: 'fallen', address: '0x8f476a2669f24e64a1ffefefb1755a50d4c3efe8' },
  { label: 'grower', address: '0xf9a6c2029fcdf0371b243d19621da51f9335366d' },
  { label: 'demo-1', address: 'demo-1' },
  { label: 'demo-2', address: 'demo-2' }
];
const TIER_CLASS = {
  UNVERIFIED: 'tier-unverified',
  PROVISIONAL: 'tier-provisional',
  ESTABLISHED: 'tier-established',
  TRUSTED: 'tier-trusted',
  ELITE: 'tier-elite'
};

function shortHex(value, left = 8, right = 6) {
  const raw = String(value || '');
  if (!raw) return '-';
  if (raw.length <= left + right + 3) return raw;
  return `${raw.slice(0, left)}...${raw.slice(-right)}`;
}

export default function Page() {
  const agentReqSeq = useRef(0);
  const actionsReqSeq = useRef(0);
  const [query, setQuery] = useState(SHOWCASE_AGENTS[0].address);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [leaderboard, setLeaderboard] = useState([]);
  const [lbLoading, setLbLoading] = useState(false);
  const [lbError, setLbError] = useState('');
  const [lbTier, setLbTier] = useState('');
  const [lbDispute, setLbDispute] = useState('');
  const [lbBucket, setLbBucket] = useState('');

  const [liveFeed, setLiveFeed] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotalItems, setHistoryTotalItems] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [liveEnabled, setLiveEnabled] = useState(true);
  const [lastLiveAt, setLastLiveAt] = useState('');
  const [sseStatus, setSseStatus] = useState('idle');
  const [sseAttempt, setSseAttempt] = useState(0);

  const activeAgent = useMemo(() => {
    if (data?.found && data.address) return String(data.address).toLowerCase();
    const raw = String(query || '').trim().toLowerCase();
    if (raw.startsWith('0x') && raw.length === 42) return raw;
    if (raw.startsWith('demo-')) return raw;
    return '';
  }, [data, query]);

  async function fetchJson(path, timeoutMs = 10_000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${API_BASE}${path}`, { signal: controller.signal });
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}${detail ? `: ${detail.slice(0, 120)}` : ''}`);
      }
      return await response.json();
    } catch (err) {
      if (err?.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async function fetchJsonWithFallback(paths, timeoutMs = 10_000) {
    let lastError = null;
    for (const path of paths) {
      try {
        return await fetchJson(path, timeoutMs);
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error('All fallback requests failed');
  }

  function resolveHistoryFromBody(body) {
    const items = body?.items || [];
    const pg = body?.pagination || {};
    return {
      items,
      page: Number(pg.page || 1),
      totalPages: Number(pg.totalPages || 1),
      totalItems: Number(pg.totalItems || items.length)
    };
  }

  async function fetchAgent(target) {
    if (!target.trim()) return;
    const seq = ++agentReqSeq.current;
    setLoading(true);
    setError('');
    try {
      const body = await fetchJson(`/v1/agent/${target.trim()}`);
      if (seq !== agentReqSeq.current) return;
      setData(body);
      if (!body?.found) setError('No agent found.');
    } catch {
      if (seq !== agentReqSeq.current) return;
      setError('Failed to fetch agent. Check API connectivity and try again.');
      setData(null);
    } finally {
      if (seq === agentReqSeq.current) setLoading(false);
    }
  }

  async function fetchLeaderboard() {
    setLbLoading(true);
    setLbError('');
    try {
      const qp = new URLSearchParams();
      qp.set('limit', '100');
      if (lbTier) qp.set('tier', lbTier);
      if (lbDispute) qp.set('hasDispute', lbDispute);
      if (lbBucket) qp.set('actionBucket', lbBucket);
      const body = await fetchJsonWithFallback([
        `/v1/agents?${qp.toString()}`,
        `/v1/leaderboard?${qp.toString()}`
      ]);
      setLeaderboard(body.items || []);
    } catch {
      setLeaderboard([]);
      setLbError('Failed to load leaderboard. The API is reachable but this request did not complete.');
    } finally {
      setLbLoading(false);
    }
  }

  async function refreshActions() {
    const seq = ++actionsReqSeq.current;
    setHistoryError('');
    try {
      const qp = new URLSearchParams();
      qp.set('limit', '20');
      qp.set('page', '1');
      if (activeAgent) qp.set('agent', activeAgent);
      const body = await fetchJsonWithFallback([
        `/v1/history?${qp.toString()}`,
        `/v1/actions?${qp.toString()}`
      ]);
      if (seq !== actionsReqSeq.current) return;
      const { items, page, totalPages, totalItems } = resolveHistoryFromBody(body);
      setLiveFeed(items.slice(0, 20));
      setHistory(items);
      setHistoryPage(page);
      setHistoryTotalPages(totalPages);
      setHistoryTotalItems(totalItems);
      if (items.length > 0) {
        setLastLiveAt(items[0].timestamp || new Date().toISOString());
      }
    } catch {
      setLiveFeed([]);
      setHistory([]);
      setHistoryPage(1);
      setHistoryTotalPages(1);
      setHistoryTotalItems(0);
      setHistoryError('Failed to load actions/history feed.');
    }
  }

  async function loadHistoryPage(targetPage) {
    if (historyLoading) return;
    const nextPage = Math.max(1, Number(targetPage || 1));
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const qp = new URLSearchParams();
      qp.set('limit', '20');
      qp.set('page', String(nextPage));
      if (activeAgent) qp.set('agent', activeAgent);
      const body = await fetchJsonWithFallback([
        `/v1/history?${qp.toString()}`,
        `/v1/actions?${qp.toString()}`
      ]);
      const { items, page, totalPages, totalItems } = resolveHistoryFromBody(body);
      setHistory(items);
      setHistoryPage(page || nextPage);
      setHistoryTotalPages(totalPages);
      setHistoryTotalItems(totalItems);
    } catch {
      setHistoryError('Failed to load history page.');
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    fetchLeaderboard();
  }, [lbTier, lbDispute, lbBucket]);

  useEffect(() => {
    refreshActions();
  }, [activeAgent]);

  useEffect(() => {
    fetchAgent(SHOWCASE_AGENTS[0].address);
  }, []);

  useEffect(() => {
    if (!liveEnabled) {
      setSseStatus('paused');
      return undefined;
    }

    const qp = new URLSearchParams();
    if (activeAgent) qp.set('agent', activeAgent);
    const streamUrl = `${API_BASE}/v1/stream/actions${qp.toString() ? `?${qp.toString()}` : ''}`;
    let source = null;
    let cancelled = false;
    let reconnectTimer = null;

    const scheduleReconnect = (attempt) => {
      if (cancelled || !liveEnabled) return;
      const waitMs = Math.min(15000, 1000 * (2 ** Math.min(attempt, 4)));
      setSseStatus('reconnecting');
      setSseAttempt(attempt);
      reconnectTimer = setTimeout(() => connect(attempt), waitMs);
    };

    const connect = (attempt = 0) => {
      if (cancelled || !liveEnabled) return;
      setSseStatus(attempt === 0 ? 'connecting' : 'reconnecting');
      setSseAttempt(attempt);
      source = new EventSource(streamUrl);

      source.addEventListener('ready', (event) => {
        setSseStatus('live');
        setSseAttempt(0);
        try {
          const payload = JSON.parse(event.data || '{}');
          if (payload?.ts) setLastLiveAt(payload.ts);
        } catch {}
      });

      source.addEventListener('action', (event) => {
        try {
          const payload = JSON.parse(event.data);
          setLiveFeed((prev) => {
            const next = [payload, ...prev.filter((row) => `${row.address}:${row.actionId}` !== `${payload.address}:${payload.actionId}`)];
            return next.slice(0, 20);
          });
          if (historyPage === 1) {
            setHistory((prev) => {
              const next = [payload, ...prev.filter((row) => `${row.address}:${row.actionId}` !== `${payload.address}:${payload.actionId}`)];
              return next.slice(0, 20);
            });
          }
          setSseStatus('live');
          setSseAttempt(0);
          setLastLiveAt(payload?.timestamp || new Date().toISOString());
        } catch {}
      });

      source.onerror = () => {
        source?.close();
        scheduleReconnect(attempt + 1);
      };
    };

    connect(0);
    return () => {
      cancelled = true;
      clearTimeout(reconnectTimer);
      source?.close();
    };
  }, [activeAgent, liveEnabled, historyPage]);

  const liveStatusLabel = useMemo(() => {
    if (!liveEnabled) return 'paused';
    if (sseStatus === 'live') return 'live';
    if (sseStatus === 'reconnecting') return `reconnecting (attempt ${sseAttempt})`;
    if (sseStatus === 'connecting') return 'connecting';
    return 'waiting';
  }, [liveEnabled, sseStatus, sseAttempt]);

  const historyPageButtons = useMemo(() => {
    const total = Math.max(1, Number(historyTotalPages || 1));
    const current = Math.min(Math.max(1, Number(historyPage || 1)), total);
    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + 4);
    start = Math.max(1, end - 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [historyPage, historyTotalPages]);

  return (
    <main className="explorer-page">
      <div className="bg-grid" />
      <div className="bg-glow" />
      <nav className="top-nav">
        <a className="brand" href="https://ares-protocol.xyz">⚔ ARES <span>Agent Explorer</span></a>
        <div className="top-links">
          <a href="https://ares-protocol.xyz">Landing</a>
          <a href="https://ares-protocol.xyz/docs/">Docs</a>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-tag">Live Demo Data · 40 Agents / 500 Actions / 20 Disputes</div>
        <h1>VERIFY THE AGENT.</h1>
        <p>Search agent wallet, inspect ARI, watch real-time action feed, and browse historical records.</p>
      </section>

      <section className="panel">
        <div className="search">
          <input
            placeholder="Enter agent wallet (0x...) or demo-1"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') fetchAgent(query);
            }}
          />
          <button onClick={() => fetchAgent(query)} disabled={loading}>{loading ? 'Loading...' : 'Search'}</button>
        </div>

        <div className="demo">
          <span>Try showcase:</span>
          {SHOWCASE_AGENTS.map((item) => (
            <button key={item.label} onClick={() => { setQuery(item.address); fetchAgent(item.address); }}>{item.label}</button>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="controls-row">
          <h3>Leaderboard Filters</h3>
          <div className="filters">
            <select value={lbTier} onChange={(e) => setLbTier(e.target.value)}>
              <option value="">All tiers</option>
              <option value="UNVERIFIED">UNVERIFIED</option>
              <option value="PROVISIONAL">PROVISIONAL</option>
              <option value="ESTABLISHED">ESTABLISHED</option>
              <option value="TRUSTED">TRUSTED</option>
              <option value="ELITE">ELITE</option>
            </select>
            <select value={lbDispute} onChange={(e) => setLbDispute(e.target.value)}>
              <option value="">All dispute states</option>
              <option value="true">Has dispute</option>
              <option value="false">No dispute</option>
            </select>
            <select value={lbBucket} onChange={(e) => setLbBucket(e.target.value)}>
              <option value="">All action buckets</option>
              <option value="0-20">0-20</option>
              <option value="20-50">20-50</option>
              <option value="50+">50+</option>
            </select>
          </div>
        </div>
        <div className="table-wrap compact">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Address</th>
                <th>Tier</th>
                <th>ARI</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {lbLoading && <tr><td colSpan={5}>Loading...</td></tr>}
              {!lbLoading && lbError && <tr><td colSpan={5}>{lbError}</td></tr>}
              {!lbLoading && !lbError && leaderboard.length === 0 && <tr><td colSpan={5}>No agents found for this filter.</td></tr>}
              {!lbLoading && leaderboard.map((row, i) => (
                <tr key={row.address}>
                  <td>{i + 1}</td>
                  <td>{shortHex(row.address, 10, 8)}</td>
                  <td><span className={`tier ${TIER_CLASS[row.tier] || 'tier-unverified'}`}>{row.tier}</span></td>
                  <td>{row.ari}</td>
                  <td>{row.actions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {error && <p className="error">{error}</p>}

      {data?.found && (
        <section className="result-card">
          <div className="result-head">
            <h2>{data.address}</h2>
            <span className={`tier ${TIER_CLASS[data.tier] || 'tier-unverified'}`}>{data.tier}</span>
          </div>
          <div className="stats-grid">
            <div className="stat"><span>Agent ID</span><b>{data.agentId}</b></div>
            <div className="stat"><span>Agent ID Hex</span><b>{data.agentIdHex}</b></div>
            <div className="stat"><span>ARI</span><b>{data.ari}</b></div>
            <div className="stat"><span>Valid Actions</span><b>{data.actionsCount}</b></div>
            <div className="stat"><span>Since</span><b>{data.since || '-'}</b></div>
            <div className="stat"><span>Registered</span><b>{data.registeredAt}</b></div>
          </div>
          <h3>Recent Scorecards (5-Dimension)</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Scores [5]</th>
                  <th>Status</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {(data.actions || []).length === 0 && <tr><td colSpan={4}>No recent scorecards.</td></tr>}
                {(data.actions || []).slice(0, 5).map((row) => (
                  <tr key={`detail:${row.actionId}`}>
                    <td>{shortHex(row.actionId, 14, 10)}</td>
                    <td>{(row.scores || []).join(', ')}</td>
                    <td>{row.status || 'VALID'}</td>
                    <td>{row.timestamp || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3>Recent Disputes</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Action</th>
                  <th>Accepted</th>
                  <th>Finalized At</th>
                </tr>
              </thead>
              <tbody>
                {(data.disputes || []).length === 0 && <tr><td colSpan={4}>No disputes for this agent.</td></tr>}
                {(data.disputes || []).slice(0, 5).map((row) => (
                  <tr key={`dispute:${row.id}:${row.actionId}`}>
                    <td>{row.id}</td>
                    <td>{shortHex(row.actionId, 14, 10)}</td>
                    <td>{String(Boolean(row.accepted))}</td>
                    <td>{row.finalizedAt || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="result-card">
        <div className="controls-row">
          <h3>Live Feed (Top 20)</h3>
          <div className="filters">
            <button onClick={() => setLiveEnabled((v) => !v)}>{liveEnabled ? 'Pause Live' : 'Resume Live'}</button>
            <button onClick={refreshActions}>Refresh Snapshot</button>
          </div>
        </div>
        <p className="empty">Live status: {liveStatusLabel}</p>
        <p className="empty">Last update: {lastLiveAt ? new Date(lastLiveAt).toLocaleString() : 'waiting...'}</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Address</th>
                <th>Action</th>
                <th>Scores</th>
                <th>Status</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {liveFeed.length === 0 && <tr><td colSpan={5}>No live actions yet.</td></tr>}
              {liveFeed.map((a) => (
                <tr key={`${a.address}:${a.actionId}:${a.seq}`} className="new-row">
                  <td>{shortHex(a.address, 10, 8)}</td>
                  <td>{shortHex(a.actionId, 14, 10)}</td>
                  <td>{(a.scores || []).join(', ')}</td>
                  <td>{a.status || 'VALID'}</td>
                  <td>{a.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="result-card">
        <div className="controls-row">
          <h3>History (Page {historyPage} / {historyTotalPages})</h3>
          <div className="filters">
            <button onClick={() => loadHistoryPage(historyPage - 1)} disabled={historyLoading || historyPage <= 1}>Prev</button>
            <div className="pager">
              {historyPageButtons.map((p) => (
                <button
                  key={`page-${p}`}
                  className={p === historyPage ? 'active' : ''}
                  onClick={() => loadHistoryPage(p)}
                  disabled={historyLoading || p === historyPage}
                >
                  {p}
                </button>
              ))}
            </div>
            <button onClick={() => loadHistoryPage(historyPage + 1)} disabled={historyLoading || historyPage >= historyTotalPages}>Next</button>
          </div>
        </div>
        {historyError && <p className="error">{historyError}</p>}
        <p className="empty">Total actions in view: {historyTotalItems}</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Address</th>
                <th>Action</th>
                <th>Status</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 && <tr><td colSpan={4}>No historical actions.</td></tr>}
              {history.map((a) => (
                <tr key={`h:${a.address}:${a.actionId}:${a.seq}`}>
                  <td>{shortHex(a.address, 10, 8)}</td>
                  <td>{shortHex(a.actionId, 14, 10)}</td>
                  <td>{a.status || 'VALID'}</td>
                  <td>{a.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
