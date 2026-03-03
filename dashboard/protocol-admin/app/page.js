const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';

export default function Page() {
  return (
    <main className="admin-page">
      <nav className="top-nav">
        <a className="brand" href="https://ares-protocol.xyz">⚔ ARES <span>Protocol Admin</span></a>
        <div className="top-links">
          <a href="https://ares-protocol.xyz">Landing</a>
          <a href="https://app.ares-protocol.xyz">Explorer</a>
          <a href="https://ares-protocol.xyz/docs/">Docs</a>
        </div>
      </nav>

      <section className="hero hero-layout">
        <div className="hero-copy">
          <div className="hero-tag">Integration Control Surface · Score gating · Auth flow</div>
          <h1>OPERATE THE TRUST LAYER.</h1>
          <p>Use this surface to wire score checks, challenge-based auth, and protocol access policy around ARES indexed data.</p>
          <div className="hero-actions">
            <a className="hero-link primary" href="https://ares-protocol.xyz/api/">Open API Hub</a>
            <a className="hero-link" href="https://ares-protocol.xyz/docs/">Read Docs</a>
          </div>
          <div className="hero-metrics">
            <div className="metric-card">
              <span className="metric-label">Primary gate</span>
              <strong className="metric-value">ARI score</strong>
            </div>
            <div className="metric-card">
              <span className="metric-label">Trust bands</span>
              <strong className="metric-value">0-1000</strong>
            </div>
            <div className="metric-card">
              <span className="metric-label">Suggested min</span>
              <strong className="metric-value">300 / 600</strong>
            </div>
            <div className="metric-card">
              <span className="metric-label">Runtime</span>
              <strong className="metric-value">Base native</strong>
            </div>
          </div>
        </div>
        <div className="hero-code">
          <div className="code-card">
            <div className="panel-kicker">Canonical auth path</div>
            <pre>{`GET  ${API_BASE}/v1/auth/challenge?account=0x...
POST ${API_BASE}/v1/auth/verify { account, nonce, signature }
GET  ${API_BASE}/v1/access/:account`}</pre>
          </div>
        </div>
      </section>

      <section className="panel-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-kicker">Quickstart</div>
              <h2 className="panel-title">Integration sequence</h2>
            </div>
            <p className="panel-subtitle">Minimum path for gating access with ARI before sensitive protocol operations.</p>
          </div>
          <ol className="step-list">
            <li>Call <code>{`${API_BASE}/v1/score/:agentAddress`}</code> before sensitive operations.</li>
            <li>Set minimum threshold: <code>ESTABLISHED (&gt;=300)</code> or <code>TRUSTED (&gt;=600)</code>.</li>
            <li>Use paid API auth flow for higher rate limits and account-specific policy checks.</li>
          </ol>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-kicker">Policy</div>
              <h2 className="panel-title">Recommended threshold matrix</h2>
            </div>
            <p className="panel-subtitle">Choose a reputation floor by risk profile, not by a single universal number.</p>
          </div>
          <div className="threshold-list">
            <div className="threshold-item">
              <span className="threshold-label">Low-friction routing</span>
              <strong className="threshold-value">ESTABLISHED 300+</strong>
            </div>
            <div className="threshold-item">
              <span className="threshold-label">Capital-sensitive flow</span>
              <strong className="threshold-value">TRUSTED 600+</strong>
            </div>
            <div className="threshold-item">
              <span className="threshold-label">Privileged governance path</span>
              <strong className="threshold-value">ELITE / policy-defined</strong>
            </div>
          </div>
        </section>
      </section>

      <section className="panel-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-kicker">Reference</div>
              <h2 className="panel-title">Docs and operational links</h2>
            </div>
            <p className="panel-subtitle">Primary references for shipping a protocol integration on top of ARES.</p>
          </div>
          <ul className="link-list">
            <li><a href="https://ares-protocol.xyz/docs/integration-guide.md">Integration guide</a></li>
            <li><a href="https://ares-protocol.xyz/docs/scoring.md">Scoring model</a></li>
            <li><a href="https://ares-protocol.xyz/docs/security.md">Security model</a></li>
            <li><a href="https://ares-protocol.xyz/api/v1/health">API health</a></li>
          </ul>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-kicker">Example</div>
              <h2 className="panel-title">Score gate stub</h2>
            </div>
            <p className="panel-subtitle">Minimal gate for allowing execution only after the trust threshold is met.</p>
          </div>
          <pre>{`const score = await fetch('${API_BASE}/v1/score/0x...').then((r) => r.json());\nif ((score.ari ?? 0) < 600) throw new Error('TRUST_THRESHOLD_NOT_MET');\n// continue sensitive action`}</pre>
        </section>
      </section>
    </main>
  );
}
