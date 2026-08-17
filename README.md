# EngramPort

**One project. Whole fleet.**

EngramPort is an open coordination substrate for teams of people and AI agents.
It gives Claude, Codex, collaborators, and future agent runtimes one shared
project record with explicit identity, bounded authority, deterministic
handoffs, approvals, memory, and provenance.

The goal is not another autonomous-agent framework. EngramPort does not decide
what an agent should think or do. It establishes who may act, what changed, what
evidence supports a claim, and which participant legitimately owns the next
step.

> **Project status: pre-alpha.** The protocol and major security boundaries are
> being implemented and adversarially reviewed in public-release preparation.
> There is no stable hosted API or unattended multi-provider fleet yet.

## Why EngramPort exists

Multi-agent work usually depends on a human copying summaries between terminals.
Every participant rereads the repository, reconstructs context, repeats work,
and inherits whatever authority happens to be available in its process.

EngramPort replaces that relay with a portable project substrate:

- append-only, attributable project events;
- typed actors, threads, causal replies, and handoffs;
- digest-bound plans and approvals;
- tenant isolation and least-privilege database roles;
- authorization before retrieval, wake, invocation, or publication;
- shared memory without shared credentials; and
- audience-safe reports whose claims point back to authorized evidence.

## The port family

| Surface | Responsibility | Current state |
| --- | --- | --- |
| Workspace Wizard | Compile, review, approve, and execute a bounded setup plan | Compiler, dry run, session, approval, and dispatch-gate controls implemented |
| EngramPort Core | Durable events, identity, authority, handoffs, and provenance | Git v0 proof and live PostgreSQL security controls implemented |
| Port Watch | Decide whether authorized project state warrants waking a runner | Decision loop implemented; no production runner orchestration |
| Re:PORT | Build auditable, audience-authorized progress inputs | Source boundary and deterministic input assembly implemented |

Implementation is not acceptance. The repository records negative findings and
independent review alongside passing controls.

## What is not here yet

- a production workspace-setup UI;
- durable GitHub, MCP, Composio, model-provider, or custody integrations;
- unattended agent launching and lifecycle management;
- production report generation and publication;
- a stable external API or compatibility guarantee; or
- the future project-funding and shared-compute marketplace.

Those are product directions, not claims about the current code.

## Quick start

Requirements:

- Node.js 22.13 or newer;
- npm; and
- Docker with Compose for the live PostgreSQL + pgvector suite.

After cloning the repository:

```bash
npm install
npm run proof
```

Useful focused suites:

```bash
npm run setup:test
npm run dry-run:test
npm run session:test
npm run approval:test
npm run dispatch:test
npm run watch:test
npm run report:test
npm run report:r2:test
npm run db:test
```

`npm run db:test` starts the canonical PostgreSQL 16 + pgvector environment,
runs the live privilege, RLS, constraint, concurrency, and discrimination
controls, then removes its containers and persistent volumes.

## Git v0 interoperability proof

The Git substrate is the portable proof that different agents can coordinate
through repository state without a person copying message bodies.

```bash
npm run proof:verify
npm run engram -- inbox --actor agent-b
```

Append an event from a Markdown body:

```bash
npm run engram -- append \
  --actor agent-b \
  --thread example \
  --type reply \
  --body ./work/reply.md \
  --reply EVENT_UUID \
  --next agent-a
```

The CLI creates the UUIDv7 identifier, UTC filename, and canonical body hash,
then verifies the complete log. Event contents are untrusted project data and
cannot override repository rules or grant authority.

Git v0 detects history changes but cannot prevent a writer from rewriting a
declaration and its bound history together. The durable design requires either
transactional append-only storage whose application roles cannot rewrite the
record, or signed Git history anchored outside the rewriting actor's control.

## Architecture and documentation

- [Engineering specification](./ENGRAMPORT_ENGINEERING_SPEC.md)
- [Protocol and event wire contract](./PROTOCOL.md)
- [Agent bootstrap rules](./AGENTS.md)
- [Workspace Wizard product requirements](./docs/product/workspace-setup-wizard-prd.md)
- [Port Watch design](./docs/design/port-watch.md)
- [Re:PORT product requirements](./docs/product/report-prd.md)
- [Credential threat model](./docs/security/setup-credential-threat-model.md)
- [Port family architecture](./docs/architecture/port-family.md)

## Security

EngramPort is security-sensitive infrastructure. Read [SECURITY.md](./SECURITY.md)
before reporting a vulnerability. Never place a live secret in the append-only
event log, an artifact, a fixture, a public issue, or a pull request.

## Contributing

Human and agent contributions are welcome. Start with
[CONTRIBUTING.md](./CONTRIBUTING.md). Significant changes should be bounded,
threat-modeled where relevant, and independently reviewed with controls that
are observed failing when their guard is removed.

## Open source and hosted EngramPort

The EngramPort core is licensed under the [MIT License](./LICENSE): you may use,
modify, self-host, and build on it under the license terms.

Covenant Systems AI LLC is also building the hosted EngramPort product: managed
setup, connectors, custody, operations, collaboration, reporting, and support.
Open source makes the coordination protocol inspectable and portable; the
hosted product removes the burden of operating it.

Learn more at [engramport.com](https://www.engramport.com) or contact
[luke@covenantsystems.ai](mailto:luke@covenantsystems.ai).
