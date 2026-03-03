'use client';

import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || 'https://ares-protocol.xyz/api').replace(/\/$/, '');
const DEFAULT_TAB = 'search';
const LEADERBOARD_TTL_MS = 15_000;
const REALTIME_TTL_MS = 10_000;
const SHOWCASE_AGENTS = [
  { label: 'star', address: '0x2fca0afce3181d4b3d86c18d2caa440cf628d3f5' },
  { label: 'fallen', address: '0x8f476a2669f24e64a1ffefefb1755a50d4c3efe8' },
  { label: 'grower', address: '0xf9a6c2029fcdf0371b243d19621da51f9335366d' }
];
const TIER_CLASS = {
  UNVERIFIED: 'tier-unverified',
  PROVISIONAL: 'tier-provisional',
  ESTABLISHED: 'tier-established',
  TRUSTED: 'tier-trusted',
  ELITE: 'tier-elite'
};
const TAB_META = [
  {
    id: 'search',
    label: 'Search',
    copy: 'Resolve one agent and inspect the canonical trust profile.'
  },
  {
    id: 'leaderboard',
    label: 'Leaderboard',
    copy: 'Compare ranked agents and expose the public integration surface.'
  },
  {
    id: 'realtime',
    label: 'Realtime',
    copy: 'Watch the indexed feed and browse paginated historical windows.'
  }
];

function shortHex(value, left = 8, right = 6) {
  const raw = String(value || '');
  if (!raw) return '-';
  if (raw.length <= left + right + 3) return raw;
  return `${raw.slice(0, left)}...${raw.slice(-right)}`;
}

function normalizeTab(value) {
  return TAB_META.some((tab) => tab.id === value) ? value : DEFAULT_TAB;
}

function normalizeSearchTarget(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('0x') && raw.length === 42) return raw.toLowerCase();
  return raw;
}

function buildExplorerHref(pathname, currentSearchParams, nextTab, nextAgent) {
  const params = new URLSearchParams(currentSearchParams?.toString() || '');
  params.set('tab', normalizeTab(nextTab));
  const normalizedAgent = normalizeSearchTarget(nextAgent);
  if (normalizedAgent) params.set('agent', normalizedAgent);
  else params.delete('agent');
  return `${pathname}?${params.toString()}`;
}

export default function ExplorerClient({
  initialTab = DEFAULT_TAB,
  initialQuery = SHOWCASE_AGENTS[0].address,
  initialAgent = null,
  initialLeaderboard = [],
  initialHistory = [],
  initialHistoryPage = 1,
  initialHistoryTotalPages = 1,
  initialHistoryTotalItems = 0,
  initialLastLiveAt = ''
} = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialTabFromRoute = normalizeTab(searchParams?.get('tab') || initialTab);
  const initialQueryFromRoute = normalizeSearchTarget(searchParams?.get('agent') || initialQuery || SHOWCASE_AGENTS[0].address)
    || SHOWCASE_AGENTS[0].address;
  const agentReqSeq = useRef(0);
  const actionsReqSeq = useRef(0);
  const resolvedAgentRef = useRef(
    initialTabFromRoute === DEFAULT_TAB && initialAgent ? normalizeSearchTarget(initialQueryFromRoute) : ''
  );
  const leaderboardFetchedAtRef = useRef(initialTabFromRoute === 'leaderboard' && initialLeaderboard.length > 0 ? Date.now() : 0);
  const leaderboardFilterKeyRef = useRef(initialTabFromRoute === 'leaderboard' ? '||' : '');
  const historyFetchedAtRef = useRef(initialTabFromRoute === 'realtime' && initialHistory.length > 0 ? Date.now() : 0);
  const historyScopeKeyRef = useRef(initialTabFromRoute === 'realtime' ? 'all' : '');
  const realtimeScopeRef = useRef(initialTabFromRoute === 'realtime' ? 'all' : '');
  const historyPageRef = useRef(initialHistoryPage);

  const [query, setQuery] = useState(initialQueryFromRoute);
  const [data, setData] = useState(initialAgent);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(initialTabFromRoute === DEFAULT_TAB && !initialAgent);

  const [leaderboard, setLeaderboard] = useState(initialLeaderboard);
  const [lbLoading, setLbLoading] = useState(initialTabFromRoute === 'leaderboard' && initialLeaderboard.length === 0);
  const [lbError, setLbError] = useState('');
  const [lbTier, setLbTier] = useState('');
  const [lbDispute, setLbDispute] = useState('');
  const [lbBucket, setLbBucket] = useState('');

  const [liveFeed, setLiveFeed] = useState(initialHistory.slice(0, 20));
  const [history, setHistory] = useState(initialHistory);
  const [historyError, setHistoryError] = useState('');
  const [historyPage, setHistoryPage] = useState(initialHistoryPage);
  const [historyTotalPages, setHistoryTotalPages] = useState(initialHistoryTotalPages);
  const [historyTotalItems, setHistoryTotalItems] = useState(initialHistoryTotalItems);
  const [historyLoading, setHistoryLoading] = useState(initialTabFromRoute === 'realtime' && initialHistory.length === 0);
  const [liveEnabled, setLiveEnabled] = useState(true);
  const [lastLiveAt, setLastLiveAt] = useState(initialLastLiveAt);
  const [sseStatus, setSseStatus] = useState('idle');
  const [sseAttempt, setSseAttempt] = useState(0);
  const [pageVisible, setPageVisible] = useState(true);

  const activeTab = normalizeTab(searchParams?.get('tab') || initialTabFromRoute);
  const urlAgent = normalizeSearchTarget(searchParams?.get('agent') || '');
  const activeAgent = useMemo(() => {
    if (data?.found && data.address) return normalizeSearchTarget(data.address);
    if (urlAgent) return urlAgent;
    return '';
  }, [data, urlAgent]);
  const leaderboardFilterKey = `${lbTier}|${lbDispute}|${lbBucket}`;
  const activeMetricValue = activeTab === 'leaderboard'
    ? String(leaderboard.length)
    : activeTab === 'realtime'
      ? String(historyTotalItems)
      : String(data?.ari ?? '-');

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const handleVisibility = () => setPageVisible(document.visibilityState === 'visible');
    handleVisibility();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    historyPageRef.current = historyPage;
  }, [historyPage]);

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
    const normalizedTarget = normalizeSearchTarget(target);
    if (!normalizedTarget) return;
    const seq = ++agentReqSeq.current;
    setLoading(true);
    setError('');
    try {
      const body = await fetchJson(`/v1/agent/${normalizedTarget}`);
      if (seq !== agentReqSeq.current) return;
      resolvedAgentRef.current = normalizedTarget;
      setData(body);
      if (!body?.found) setError('No agent found.');
    } catch {
      if (seq !== agentReqSeq.current) return;
      resolvedAgentRef.current = normalizedTarget;
      setError('Failed to fetch agent. Check API connectivity and try again.');
      setData(null);
    } finally {
      if (seq === agentReqSeq.current) setLoading(false);
    }
  }

  async function fetchLeaderboard({ force = false } = {}) {
    const key = `${lbTier}|${lbDispute}|${lbBucket}`;
    const cacheFresh = !force
      && leaderboardFilterKeyRef.current === key
      && Date.now() - leaderboardFetchedAtRef.current < LEADERBOARD_TTL_MS;
    if (cacheFresh) return;

    setLbLoading(true);
    setLbError('');
    try {
      const qp = new URLSearchParams();
      qp.set('limit', '25');
      if (lbTier) qp.set('tier', lbTier);
      if (lbDispute) qp.set('hasDispute', lbDispute);
      if (lbBucket) qp.set('actionBucket', lbBucket);
      const body = await fetchJsonWithFallback([
        `/v1/agents?${qp.toString()}`,
        `/v1/leaderboard?${qp.toString()}`
      ]);
      setLeaderboard(body.items || []);
      leaderboardFetchedAtRef.current = Date.now();
      leaderboardFilterKeyRef.current = key;
    } catch {
      setLbError('Failed to load leaderboard. The API is reachable but this request did not complete.');
    } finally {
      setLbLoading(false);
    }
  }

  async function refreshActions({ force = false } = {}) {
    const seq = ++actionsReqSeq.current;
    const scopeKey = activeAgent || 'all';
    const cacheFresh = !force
      && historyScopeKeyRef.current === scopeKey
      && Date.now() - historyFetchedAtRef.current < REALTIME_TTL_MS;
    if (cacheFresh) return;

    setHistoryError('');
    setHistoryLoading(true);
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
      historyFetchedAtRef.current = Date.now();
      historyScopeKeyRef.current = scopeKey;
      if (items.length > 0) {
        setLastLiveAt(items[0].timestamp || new Date().toISOString());
      }
    } catch {
      if (seq !== actionsReqSeq.current) return;
      setLiveFeed([]);
      setHistory([]);
      setHistoryPage(1);
      setHistoryTotalPages(1);
      setHistoryTotalItems(0);
      setHistoryError('Failed to load actions/history feed.');
    } finally {
      if (seq === actionsReqSeq.current) setHistoryLoading(false);
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
      if (nextPage === 1) {
        historyFetchedAtRef.current = Date.now();
        historyScopeKeyRef.current = activeAgent || 'all';
      }
    } catch {
      setHistoryError('Failed to load history page.');
    } finally {
      setHistoryLoading(false);
    }
  }

  function updateRoute(nextTab, nextAgent) {
    const nextHref = buildExplorerHref(pathname, searchParams, nextTab, nextAgent);
    const currentHref = `${pathname}?${searchParams?.toString() || ''}`;
    if (nextHref === currentHref) return;
    startTransition(() => {
      router.push(nextHref, { scroll: false });
    });
  }

  function submitSearch(target = query) {
    const normalizedTarget = normalizeSearchTarget(target);
    if (!normalizedTarget) return;
    setQuery(normalizedTarget);
    if (activeTab === DEFAULT_TAB && urlAgent === normalizedTarget) {
      fetchAgent(normalizedTarget);
      return;
    }
    updateRoute(DEFAULT_TAB, normalizedTarget);
  }

  function handleTabChange(nextTab) {
    const persistedAgent = normalizeSearchTarget(urlAgent || activeAgent || '');
    updateRoute(nextTab, persistedAgent);
  }

  useEffect(() => {
    if (activeTab !== DEFAULT_TAB) return;
    const target = normalizeSearchTarget(urlAgent || initialQuery || SHOWCASE_AGENTS[0].address);
    if (!target) return;
    setQuery((current) => (current === target ? current : target));
    if (resolvedAgentRef.current === target) return;
    fetchAgent(target);
  }, [activeTab, urlAgent, initialQuery]);

  useEffect(() => {
    if (activeTab !== 'leaderboard') return;
    fetchLeaderboard();
  }, [activeTab, leaderboardFilterKey]);

  useEffect(() => {
    if (activeTab !== 'realtime') {
      setSseStatus('idle');
      realtimeScopeRef.current = '';
      return;
    }
    const scopeKey = activeAgent || 'all';
    const enteringRealtime = realtimeScopeRef.current === '';
    const scopeChanged = realtimeScopeRef.current !== '' && realtimeScopeRef.current !== scopeKey;
    realtimeScopeRef.current = scopeKey;
    if (enteringRealtime || scopeChanged) {
      setHistoryPage(1);
      refreshActions({ force: true });
      return;
    }
    if (historyPage === 1) {
      refreshActions();
    }
  }, [activeTab, activeAgent, historyPage]);

  useEffect(() => {
    if (activeTab !== 'realtime') {
      setSseStatus('idle');
      return undefined;
    }
    if (!pageVisible) {
      setSseStatus('background');
      return undefined;
    }
    if (!liveEnabled) {
      setSseStatus('paused');
      return undefined;
    }

    const qp = new URLSearchParams();
    if (activeAgent) qp.set('agent', activeAgent);
    const streamUrl = `${API_BASE}/v1/stream/actions${qp.toString() ? `?${qp.toString()}` : ''}`;
    let cancelled = false;
    const source = new EventSource(streamUrl);

    source.onopen = () => {
      if (cancelled) return;
      setSseStatus('live');
      setSseAttempt(0);
    };

    source.addEventListener('ready', (event) => {
      setSseStatus('live');
      setSseAttempt(0);
      try {
        const payload = JSON.parse(event.data || '{}');
        if (payload?.ts) setLastLiveAt(payload.ts);
      } catch {}
    });

    source.addEventListener('heartbeat', (event) => {
      setSseStatus('live');
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
        if (historyPageRef.current === 1) {
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
      if (cancelled) return;
      setSseStatus('reconnecting');
      setSseAttempt((attempt) => Math.min(attempt + 1, 99));
    };

    return () => {
      cancelled = true;
      source.close();
    };
  }, [activeAgent, activeTab, liveEnabled, pageVisible]);

  const liveStatusLabel = useMemo(() => {
    if (activeTab !== 'realtime') return 'inactive';
    if (!pageVisible) return 'background';
    if (!liveEnabled) return 'paused';
    if (sseStatus === 'live') return 'live';
    if (sseStatus === 'reconnecting') return `reconnecting (${sseAttempt})`;
    if (sseStatus === 'connecting') return 'connecting';
    return 'waiting';
  }, [activeTab, liveEnabled, pageVisible, sseStatus, sseAttempt]);

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
      <nav className="app-nav">
        <a className="nav-logo" href="https://ares-protocol.xyz">⚔ ARES <span>On-chain trust for autonomous agents.</span></a>
        <div className="nav-right">
          <div className="nav-links">
            <a href="https://ares-protocol.xyz">Landing</a>
            <a href="https://app.ares-protocol.xyz/" className="active">Open Explorer</a>
            <a href="https://ares-protocol.xyz/docs/">Docs</a>
          </div>
          <a className="nav-cta" href="https://ares-protocol.xyz/#waitlist">Request Integration</a>
        </div>
      </nav>

      <section className="hero hero-layout">
        <div className="hero-copy">
          <div className="hero-tag">Single product surface · indexed search, ranked agents, and realtime action flow</div>
          <h1>VERIFY THE AGENT.</h1>
          <p>Search one agent, pivot into leaderboard ranking, or watch the live action stream without leaving the same dark systems shell. API contracts stay live under <code>/api/v1/*</code>, but the public surface is now a single operator page.</p>
          <div className="hero-actions">
            <button type="button" className="hero-link primary" onClick={() => handleTabChange('leaderboard')}>Open Leaderboard</button>
            <button type="button" className="hero-link" onClick={() => handleTabChange('realtime')}>Watch Realtime</button>
          </div>
          <div className="hero-metrics">
            <div className="metric-card">
              <span className="metric-label">Active view</span>
              <strong className="metric-value metric-value-small">{activeTab}</strong>
            </div>
            <div className="metric-card">
              <span className="metric-label">Stream status</span>
              <strong className="metric-value metric-value-small">{liveStatusLabel}</strong>
            </div>
            <div className="metric-card">
              <span className="metric-label">{activeTab === 'leaderboard' ? 'Visible rows' : activeTab === 'realtime' ? 'History rows' : 'Focused ARI'}</span>
              <strong className="metric-value">{activeMetricValue}</strong>
            </div>
            <div className="metric-card">
              <span className="metric-label">Focus target</span>
              <strong className="metric-value metric-value-small">{activeAgent ? shortHex(activeAgent, 10, 8) : 'all agents'}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="tab-shell">
        <div className="tab-bar" role="tablist" aria-label="Explorer sections">
          {TAB_META.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              <span className="tab-button-label">{tab.label}</span>
              <span className="tab-button-copy">{tab.copy}</span>
            </button>
          ))}
        </div>
      </section>

      {activeTab === 'search' && (
        <>
          <section className="panel">
            <div className="panel-head">
              <div>
                <div className="panel-kicker">Agent query</div>
                <h2 className="panel-title">Search the trust surface</h2>
              </div>
              <p className="panel-subtitle">Resolve a wallet or alias, then inspect its canonical scorecards and disputes. The URL keeps the focused agent as a reusable deep-link.</p>
            </div>
            <div className="search">
              <input
                placeholder="Enter agent wallet (0x...)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitSearch(query);
                }}
              />
              <button onClick={() => submitSearch(query)} disabled={loading}>{loading ? 'Loading...' : 'Search'}</button>
            </div>
          </section>

          {error && <p className="error">{error}</p>}

          {data?.found && (
            <section className="result-card">
              <div className="panel-head">
                <div>
                  <div className="panel-kicker">Agent snapshot</div>
                  <h2 className="panel-title">Canonical trust profile</h2>
                </div>
                <p className="panel-subtitle">Decoded scorecards, disputes, and registry metadata for the focused agent.</p>
              </div>
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
        </>
      )}

      {activeTab === 'leaderboard' && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-kicker">Leaderboard</div>
              <h2 className="panel-title">Filter ranked agents</h2>
            </div>
            <p className="panel-subtitle">Public ranking and integration entry points stay together here. Developer references remain compact so the explorer stays the primary product page.</p>
          </div>
          <div className="panel-grid">
            <div>
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
            </div>

            <aside className="developer-panel">
              <div className="panel-kicker">Developer</div>
              <h3 className="developer-title">Compact integration surface</h3>
              <p className="developer-note">Public UI stops at leaderboard, but the canonical API contract remains live for integrations and internal tooling.</p>
              <div className="developer-code">Base URL: https://ares-protocol.xyz/api/v1/*</div>
              <div className="developer-grid">
                <a className="developer-link" href="https://ares-protocol.xyz/api/v1/health" target="_blank" rel="noreferrer">
                  <strong>Health</strong>
                  <span>Read the gateway status payload.</span>
                </a>
                <a className="developer-link" href="https://ares-protocol.xyz/docs/integration-guide.md" target="_blank" rel="noreferrer">
                  <strong>Integration Guide</strong>
                  <span>Implementation boundary, auth, and endpoint notes.</span>
                </a>
                <a className="developer-link" href="https://ares-protocol.xyz/api/v1/agents?limit=5" target="_blank" rel="noreferrer">
                  <strong>Agents</strong>
                  <span>Sample leaderboard payload from the live index.</span>
                </a>
                <a className="developer-link" href="https://ares-protocol.xyz/api/v1/stream/actions" target="_blank" rel="noreferrer">
                  <strong>Stream</strong>
                  <span>Realtime action SSE endpoint for clients.</span>
                </a>
              </div>
            </aside>
          </div>
        </section>
      )}

      {activeTab === 'realtime' && (
        <>
          <section className="result-card">
            <div className="panel-head">
              <div>
                <div className="panel-kicker">Realtime feed</div>
                <h2 className="panel-title">Watch live indexed actions</h2>
              </div>
              <p className="panel-subtitle">Streaming action events enter here first, then roll into the paginated history below. {activeAgent ? `Current scope: ${shortHex(activeAgent, 10, 8)}.` : 'Current scope: all indexed agents.'}</p>
            </div>
            <div className="controls-row">
              <h3>Live Feed (Top 20)</h3>
              <div className="filters">
                <button onClick={() => setLiveEnabled((value) => !value)}>{liveEnabled ? 'Pause Live' : 'Resume Live'}</button>
                <button onClick={() => refreshActions({ force: true })}>Refresh Snapshot</button>
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
                  {liveFeed.map((action) => (
                    <tr key={`${action.address}:${action.actionId}:${action.seq}`} className="new-row">
                      <td>{shortHex(action.address, 10, 8)}</td>
                      <td>{shortHex(action.actionId, 14, 10)}</td>
                      <td>{(action.scores || []).join(', ')}</td>
                      <td>{action.status || 'VALID'}</td>
                      <td>{action.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="result-card">
            <div className="panel-head">
              <div>
                <div className="panel-kicker">Historical ledger</div>
                <h2 className="panel-title">Inspect older action windows</h2>
              </div>
              <p className="panel-subtitle">Paginated history mirrors the indexed action ledger and respects the current agent scope when a wallet has already been searched.</p>
            </div>
            <div className="controls-row">
              <h3>History (Page {historyPage} / {historyTotalPages})</h3>
              <div className="filters">
                <button onClick={() => loadHistoryPage(historyPage - 1)} disabled={historyLoading || historyPage <= 1}>Prev</button>
                <div className="pager">
                  {historyPageButtons.map((page) => (
                    <button
                      key={`page-${page}`}
                      className={page === historyPage ? 'active' : ''}
                      onClick={() => loadHistoryPage(page)}
                      disabled={historyLoading || page === historyPage}
                    >
                      {page}
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
                  {history.map((action) => (
                    <tr key={`h:${action.address}:${action.actionId}:${action.seq}`}>
                      <td>{shortHex(action.address, 10, 8)}</td>
                      <td>{shortHex(action.actionId, 14, 10)}</td>
                      <td>{action.status || 'VALID'}</td>
                      <td>{action.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
