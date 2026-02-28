const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';

export default function Page() {
  return (
    <main className="container">
      <h1>ARES Protocol Admin</h1>
      <p>Use this panel to bootstrap integration with ARI score gating and API access policies.</p>

      <section className="card">
        <h2>Integration Quickstart</h2>
        <ol>
          <li>Call <code>{`${API_BASE}/v1/score/:agentAddress`}</code> before sensitive operations.</li>
          <li>Set minimum threshold: <code>ESTABLISHED (&gt;=300)</code> or <code>TRUSTED (&gt;=600)</code>.</li>
          <li>Use paid API auth flow for higher rate limits.</li>
        </ol>
      </section>

      <section className="card">
        <h2>Auth Flow</h2>
        <pre>{`GET  /v1/auth/challenge?account=0x...
POST /v1/auth/verify { account, nonce, signature }
GET  /v1/access/:account (session token)`}</pre>
      </section>

      <section className="card">
        <h2>Docs</h2>
        <ul>
          <li><a href="/docs/integration-guide.md">Integration guide</a></li>
          <li><a href="/docs/scoring.md">Scoring model</a></li>
          <li><a href="/docs/security.md">Security model</a></li>
        </ul>
      </section>
    </main>
  );
}
