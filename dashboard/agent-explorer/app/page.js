'use client';

import { useEffect, useMemo, useState } from 'react';

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001').replace(/\/$/, '');
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
  const [query, setQuery] = useState('demo-1');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [leaderboard, setLeaderboard] = useState([]);
  const [lbLoading, setLbLoading] = useState(false);
  const [lbTier, setLbTier] = useState('');
  const [lbDispute, setLbDispute] = useState('');
  const [lbBucket, setLbBucket] = useState('');

  const [liveFeed, setLiveFeed] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotalItems, setHistoryTotalItems] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [liveEnabled, setLiveEnabled] = useState(true);
  const [lastLiveAt, setLastLiveAt] = useState('');

  const activeAgent = useMemo(() => {
    if (data?.found && data.address) return String(data.address).toLowerCase();
    const raw = String(query || '').trim().toLowerCase();
    if (raw.startsWith('0x') && raw.length === 42) return raw;
    if (raw.startsWith('demo-')) return raw;
    return '';
  }, [data, query]);

  async function fetchAgent(target) {
    if (!target.trim()) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/v1/agent/${target.trim()}`);
      const body = await response.json();
      setData(body);
      if (!body?.found) setError('No agent found.');
    } catch {
      setError('Failed to fetch agent');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function fetchLeaderboard() {
    setLbLoading(true);
    try {
      const qp = new URLSearchParams();
      qp.set('limit', '25');
      if (lbTier) qp.set('tier', lbTier);
      if (lbDispute) qp.set('hasDispute', lbDispute);
      if (lbBucket) qp.set('actionBucket', lbBucket);
      const res = await fetch(`${API_BASE}/v1/leaderboard?${qp.toString()}`);
      const body = await res.json();
      setLeaderboard(body.items || []);
    } catch {
      setLeaderboard([]);
    } finally {
      setLbLoading(false);
    }
  }

  async function refreshActions() {
    try {
      const qp = new URLSearchParams();
      qp.set('limit', '20');
      qp.set('page', '1');
      if (activeAgent) qp.set('agent', activeAgent);
      const res = await fetch(`${API_BASE}/v1/actions?${qp.toString()}`);
      const body = await res.json();
      const items = body.items || [];
      const pg = body.pagination || {};
      setLiveFeed(items.slice(0, 20));
      setHistory(items);
      setHistoryPage(Number(pg.page || 1));
      setHistoryTotalPages(Number(pg.totalPages || 1));
      setHistoryTotalItems(Number(pg.totalItems || items.length));
    } catch {
      setLiveFeed([]);
      setHistory([]);
      setHistoryPage(1);
      setHistoryTotalPages(1);
      setHistoryTotalItems(0);
    }
  }

  async function loadHistoryPage(targetPage) {
    if (historyLoading) return;
    const nextPage = Math.max(1, Number(targetPage || 1));
    setHistoryLoading(true);
    try {
      const qp = new URLSearchParams();
      qp.set('limit', '20');
      qp.set('page', String(nextPage));
      if (activeAgent) qp.set('agent', activeAgent);
      const res = await fetch(`${API_BASE}/v1/actions?${qp.toString()}`);
      const body = await res.json();
      const pg = body.pagination || {};
      setHistory(body.items || []);
      setHistoryPage(Number(pg.page || nextPage));
      setHistoryTotalPages(Number(pg.totalPages || 1));
      setHistoryTotalItems(Number(pg.totalItems || (body.items || []).length));
    } catch {
      setError('Failed to load history page');
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
    fetchAgent('demo-1');
  }, []);

  useEffect(() => {
    if (!liveEnabled) return undefined;
    const qp = new URLSearchParams();
    if (activeAgent) qp.set('agent', activeAgent);
    const streamUrl = `${API_BASE}/v1/stream/actions${qp.toString() ? `?${qp.toString()}` : ''}`;
    const source = new EventSource(streamUrl);

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
        setLastLiveAt(new Date().toISOString());
      } catch {}
    });

    source.onerror = () => {
      source.close();
    };

    return () => source.close();
  }, [activeAgent, liveEnabled, historyPage]);

  const historyPageButtons = useMemo(() => {
    const total = Math.max(1, Number(historyTotalPages || 1));
    const current = Math.min(Math.max(1, Number(historyPage || 1)), total);
    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + 4);
    start = Math.max(1, end - 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [historyPage, historyTotalPages]);

  const demoAgents = ['demo-1', 'demo-2', 'demo-3', 'demo-4', 'demo-5'];

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
        <div className="hero-tag">Live Demo Data · 25 Agents / 250 Actions / 10+ Disputes</div>
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
          <span>Try demo:</span>
          {demoAgents.map((addr) => (
            <button key={addr} onClick={() => { setQuery(addr); fetchAgent(addr); }}>{addr}</button>
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
