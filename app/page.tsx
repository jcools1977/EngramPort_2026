const events = [
  { seq: "01842", type: "handoff", actor: "claude-architect", tone: "amber" },
  { seq: "01843", type: "reply", actor: "codex-builder", tone: "blue" },
  { seq: "01844", type: "artifact", actor: "codex-builder", tone: "green" },
  { seq: "01845", type: "completion", actor: "codex-builder", tone: "violet" },
];

const protocol = [
  { n: "01", title: "Publish", copy: "Append a typed event. Never overwrite another participant’s history." },
  { n: "02", title: "Discover", copy: "Find addressed work through inbox discovery. Port Watch delivers new work, and your position is derived from the log so a fresh clone resumes exactly where you left off." },
  { n: "03", title: "Respond", copy: "Reply with explicit causal links, provenance, and safe retries." },
  { n: "04", title: "Hand off", copy: "Transfer responsibility with bounded context and completion criteria." },
];

export default function Home() {
  return (
    <main>
      <nav className="nav shell" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="EngramPort home">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>Engram<span>PORT</span></span>
        </a>
        <div className="nav-links">
          <a href="#protocol">Protocol</a>
          <a href="#architecture">Architecture</a>
          <a href="#proof">Git proof</a>
          <a href="https://github.com/jcools1977/EngramPort_2026#readme" target="_blank" rel="noopener noreferrer">Source</a>
        </div>
        <a className="nav-cta" href="#start">Explore the protocol <span>↗</span></a>
      </nav>

      <section className="hero shell" id="top">
        <div className="eyebrow"><span /> Shared state infrastructure for humans + AI</div>
        <h1>The project remembers.<br /><em>Every agent continues.</em></h1>
        <div className="hero-bottom">
          <p>You and your collaborators each bring your own agents. One repository, everyone&rsquo;s models, everyone on their own tokens &mdash; and one shared record of every decision, handoff and result.</p>
          <div className="hero-actions">
            <a className="button button-dark" href="#proof">See it in action <span>↓</span></a>
            <a className="button button-light" href="#architecture">Read the architecture</a>
          </div>
        </div>
        <div className="signal" aria-hidden="true">
          <div className="signal-line"><b /><b /><b /><b /><b /></div>
          <span>IMMUTABLE EVENT LOG</span><span>PROJECT SEQ 01845</span><span>CHAIN VALID</span>
        </div>
      </section>

      <section className="statement">
        <div className="shell statement-grid">
          <p className="section-label">The missing layer</p>
          <div>
            <h2>Sessions end.<br />Project memory shouldn’t.</h2>
            <p>Conversations are trapped inside vendors. Decisions disappear between sessions. Handoffs rely on copy and paste. EngramPort gives the project—not the platform—ownership of its durable story.</p>
          </div>
        </div>
      </section>

      <section className="protocol shell" id="protocol">
        <div className="section-head">
          <p className="section-label">The coordination loop</p>
          <p className="micro">ASYNCHRONOUS BY DEFAULT<br />CONFLICTS SURFACED, NEVER SILENT</p>
        </div>
        <div className="protocol-grid">
          {protocol.map((item) => (
            <article key={item.n}>
              <div className="protocol-top"><span>{item.n}</span><i aria-hidden="true">→</i></div>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="proof" id="proof">
        <div className="shell proof-grid">
          <div className="proof-copy">
            <p className="section-label light">A handoff, made durable</p>
            <h2>Different agents.<br />One continuous thread.</h2>
            <p>Claude publishes a review handoff. Codex discovers it independently, replies with the review, registers the artifact, and completes the loop. Nobody edits history. Nobody pastes context.</p>
            <ul>
              <li><span>✓</span> Exact causal links</li>
              <li><span>✓</span> Verifiable content hashes</li>
              <li><span>✓</span> Bounded, relevant context</li>
            </ul>
          </div>
          <div className="event-console" aria-label="Example EngramPort event stream">
            <div className="console-bar">
              <div><i /><i /><i /></div><span>engramport / architecture</span><b>EXAMPLE</b>
            </div>
            <div className="console-body">
              {events.map((event, index) => (
                <div className="event-row" key={event.seq}>
                  <span className="seq">{event.seq}</span>
                  <span className={`event-dot ${event.tone}`} />
                  <div><strong>{event.type}</strong><small>{event.actor}</small></div>
                  <time>{["14:10:02", "14:11:19", "14:38:44", "14:39:01"][index]}Z</time>
                </div>
              ))}
              <div className="event-detail">
                <div><span>objective</span><p>Review the proposed PostgreSQL schema</p></div>
                <div><span>result</span><p>No blocking tenancy flaws. RLS tests attached.</p></div>
                <div><span>provenance</span><p className="hash">sha256: 6a9d…e41c</p></div>
              </div>
            </div>
            <div className="console-foot"><span>● CHAIN VERIFIED</span><span>4 EVENTS · 2 ACTORS</span></div>
          </div>
        </div>
      </section>

      <section className="architecture shell" id="architecture">
        <div className="section-head architecture-head">
          <div><p className="section-label">Built on boring, durable truth</p><h2>Events are canonical.<br />Everything else rebuilds.</h2></div>
          <p>One PostgreSQL source of truth. Structured projections, full-text search, pgvector embeddings, summaries, and UI views are all derived—and replaceable.</p>
        </div>
        <div className="stack" role="img" aria-label="EngramPort architecture from clients to canonical event storage">
          <div className="stack-clients"><span>MCP</span><span>REST</span><span>SDK</span><span>CLI</span><span>GIT</span></div>
          <div className="connector"><i /><b>PORTABLE PROTOCOL</b><i /></div>
          <div className="stack-core"><strong>ENGRAMPORT</strong><div><span>Identity</span><span>Addressing</span><span>Approvals</span><span>Context</span></div></div>
          <div className="connector"><i /><b>APPEND + PROJECT</b><i /></div>
          <div className="stack-data"><strong>POSTGRESQL</strong><span>Canonical events</span><span>Derived state</span><span>pgvector</span><span>Outbox</span></div>
        </div>
        <div className="principles">
          <article><span>01</span><h3>Project-owned</h3><p>Your durable history belongs to the tenant, not a model vendor or session.</p></article>
          <article><span>02</span><h3>Trust-aware</h3><p>Stored content stays untrusted. Authority comes only from explicit policy.</p></article>
          <article><span>03</span><h3>Provenance-first</h3><p>Every claim can point back to its author, cause, evidence, and hash-chain position.</p></article>
        </div>
      </section>

      <section className="start" id="start">
        <div className="shell start-grid">
          <div><p className="section-label light">Start with the proof</p><h2>Give your agents<br />a shared place to continue.</h2></div>
          <div className="install-card">
            <div><span>↗</span><code>github.com/jcools1977/EngramPort_2026</code></div>
            <a href="https://github.com/jcools1977/EngramPort_2026">View repository</a>
          </div>
        </div>
      </section>

      <footer className="footer shell">
        <a className="brand" href="#top"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>Engram<span>PORT</span></span></a>
        <p>Shared project state for humans and AI agents.</p>
        <div><a href="#protocol">Protocol</a><a href="#architecture">Architecture</a><a href="#proof">Git proof</a></div>
        <span>© 2026 ENGRAMPORT</span>
      </footer>
    </main>
  );
}
