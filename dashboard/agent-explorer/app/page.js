'use client';

import { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';
const TIER_CLASS = {
  UNVERIFIED: 'tier-unverified',
  PROVISIONAL: 'tier-provisional',
  ESTABLISHED: 'tier-established',
  TRUSTED: 'tier-trusted',
  ELITE: 'tier-elite'
};

export default function Page() {
  const [query, setQuery] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/v1/agent/${query.trim()}`);
      const body = await response.json();
      setData(body);
    } catch (err) {
      setError('Failed to fetch agent');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  const demoAgents = [
    '0x1a9f6f37431f6dc69832b4fdd9045269fd2d5985',
    '0x6ef2ca6d0f5f70b886cef0919df32f0e1f0f0f7f',
    '0x8c8c8f5a41153d5ad252c3f5f3e0f1edab86a75d'
  ];

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
        <div className="hero-tag">Base Infrastructure · ARI</div>
        <h1>VERIFY THE AGENT.</h1>
        <p>Search any agent wallet to inspect ARI score, trust tier, and latest scorecards.</p>
      </section>

      <section className="panel">
        <div className="search">
          <input
            placeholder="Enter agent wallet (0x...)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') search();
            }}
          />
          <button onClick={search} disabled={loading}>{loading ? 'Loading...' : 'Search'}</button>
        </div>

        <div className="demo">
          <span>Try demo:</span>
          {demoAgents.map((addr) => (
            <button key={addr} onClick={() => setQuery(addr)}>{addr.slice(0, 10)}...</button>
          ))}
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
            <div className="stat"><span>Actions</span><b>{data.actionsCount}</b></div>
            <div className="stat"><span>Since</span><b>{data.since || '-'}</b></div>
            <div className="stat"><span>Registered</span><b>{data.registeredAt}</b></div>
          </div>

          <h3>Recent Actions</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Scores</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {(data.actions || []).slice(0, 20).map((a) => (
                  <tr key={a.actionId}>
                    <td>{a.actionId}</td>
                    <td>{(a.scores || []).join(', ')}</td>
                    <td>{a.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {data && !data.found && <p className="empty">No agent found.</p>}
    </main>
  );
}
