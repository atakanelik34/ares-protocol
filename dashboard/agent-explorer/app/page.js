'use client';

import { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';

export default function Page() {
  const [query, setQuery] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  async function search() {
    setError('');
    try {
      const response = await fetch(`${API_BASE}/v1/agent/${query}`);
      const body = await response.json();
      setData(body);
    } catch (err) {
      setError('Failed to fetch agent');
      setData(null);
    }
  }

  const demoAgents = [
    '0x1a9f6f37431f6dc69832b4fdd9045269fd2d5985',
    '0x6ef2ca6d0f5f70b886cef0919df32f0e1f0f0f7f',
    '0x8c8c8f5a41153d5ad252c3f5f3e0f1edab86a75d'
  ];

  return (
    <main className="container">
      <h1>ARES Agent Explorer</h1>
      <p>Search an agent wallet to view ARI, trust tier, and recent scorecards.</p>

      <div className="search">
        <input
          placeholder="0x..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button onClick={search}>Search</button>
      </div>

      <div className="demo">
        <strong>Try demo:</strong>
        {demoAgents.map((addr) => (
          <button key={addr} onClick={() => setQuery(addr)}>{addr.slice(0, 10)}...</button>
        ))}
      </div>

      {error && <p className="error">{error}</p>}

      {data?.found && (
        <section className="card">
          <h2>{data.address}</h2>
          <p><b>Agent ID:</b> {data.agentId} ({data.agentIdHex})</p>
          <p><b>ARI:</b> {data.ari} ({data.tier})</p>
          <p><b>Actions:</b> {data.actionsCount}</p>
          <p><b>Since:</b> {data.since || '-'}</p>
          <p><b>Registered:</b> {data.registeredAt}</p>

          <h3>Recent Actions</h3>
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
        </section>
      )}

      {data && !data.found && <p>No agent found.</p>}
    </main>
  );
}
