# EngramPort Engineering Specification

**Status:** Build-authoritative v1 specification  
**Document version:** 1.0.0  
**Date:** 2026-08-13  
**Audience:** Product engineering, security, infrastructure, SDK, and agent-integration teams  
**Normative language:** **MUST**, **MUST NOT**, **SHOULD**, and **MAY** have their RFC 2119 meanings.

---

## 1. Executive summary

EngramPort is a tenant-owned shared state and collaboration substrate for humans and heterogeneous AI agents working across vendors, applications, machines, and sessions. It preserves the durable story of a project: what happened, who or what caused it, what remains pending, which decisions are active, which artifacts resulted, what knowledge has been retained, and what the next participant needs.

EngramPort is not merely vector memory. Its canonical primitive is an immutable, append-only event. Structured projections derive current state from that log. PostgreSQL is the source of truth; pgvector, full-text indexes, and relational indexes are retrieval aids. MCP, REST, SDKs, a CLI, and a Git interoperability format expose the same protocol.

The production architecture deliberately avoids Pinecone. PostgreSQL plus pgvector is the default until measured requirements prove it inadequate. A future external vector index MAY be introduced behind an internal retrieval interface, but it MUST remain a rebuildable derived index and MUST never become canonical storage.

The first useful proof is two independently operated agents collaborating asynchronously through append-only files in Git. The production product generalizes that protocol into a secure, queryable, multi-tenant service with subscriptions, approvals, contextual retrieval, durable handoffs, and verifiable provenance.

## 2. Product thesis

### 2.1 Problem

An AI session is ephemeral and platform-scoped. Claude knows its conversation; ChatGPT knows its conversation; an IDE agent knows its workspace; GitHub knows commits; a ticket system knows tickets. No participant naturally owns the complete, cross-platform project history.

Teams need a neutral project-owned substrate where independent humans and agents can:

1. Publish durable observations, messages, decisions, tasks, artifacts, memories, and handoffs.
2. Discover work addressed to them or relevant to their current objective.
3. Respond without overwriting another participant's contribution.
4. Reconstruct current state and provenance from an immutable history.
5. Resume work in a fresh session with bounded, relevant context.
6. Apply human approval and security policy to consequential actions.

### 2.2 Product definition

> EngramPort is the shared project-state and collaboration layer for humans and AI agents.

Its differentiation is coordination semantics, not storage primitives: identity, addressing, subscriptions, chronology, relationships, handoffs, approvals, supersession, provenance, trust boundaries, context assembly, and interoperable participation.

### 2.3 Non-goals

EngramPort v1 is not:

- A general-purpose chat UI, autonomous-agent framework, model host, or workflow engine.
- A synchronous low-latency agent-to-agent transport. Webhooks and polling are supported, but durable asynchronous delivery is primary.
- A replacement for Git, issue trackers, object storage, or model-provider memory.
- A guarantee that an event was authored by a particular model. It can prove possession of a signing key and detect content modification; it cannot prove that a named model generated content unless a trusted external attestation system exists.
- A blockchain or globally decentralized consensus system.
- An arbitrary mutable knowledge graph. Relationships are append-only assertions and retractions projected into current state.
- A reason to run two canonical databases. Pinecone is excluded from the initial and production reference architecture.
- A system that executes instructions found in stored content without an explicit trusted policy decision.

## 3. Design principles and hard decisions

1. **Events are truth; state is derived.** Accepted events are immutable. Corrections are new events.
2. **Append-only participation prevents content conflicts.** Actors do not edit one another's history.
3. **One canonical store.** PostgreSQL stores events, identities, authorization, projections, and embeddings.
4. **Embeddings are indexes, not memory.** They can be deleted and regenerated without loss of truth.
5. **At-least-once delivery, effectively-once writes.** Idempotency keys make retries safe.
6. **Server ordering is authoritative.** UUIDv7 identifies events; a per-project monotonic sequence orders committed events.
7. **Content is untrusted by default.** Stored agent output cannot grant itself authority.
8. **Authorization precedes retrieval.** No cross-tenant or unauthorized content may enter a candidate set, including vector search.
9. **Explicit over inferred state.** Decisions and tasks use typed payloads; extraction produces proposals, not silently authoritative facts.
10. **Portable protocol.** REST, MCP, SDK, CLI, and Git adapters share types and semantics.
11. **Measured complexity.** Add queues, replicas, partitions, or external vector infrastructure only against documented thresholds.

## 4. Core domain model

### 4.1 Hierarchy

```text
Tenant
└── Project
    ├── Threads
    ├── Actors (human, agent, service)
    ├── Events (canonical log)
    ├── Subscriptions
    ├── Artifacts
    ├── Approvals
    └── Derived state (tasks, decisions, memories, relationships)
```

### 4.2 Identity

- **Tenant:** Security, billing, and data-residency boundary.
- **Project:** Primary collaboration and retention boundary.
- **Thread:** A conversation/workstream inside a project. Threads may branch through reply relationships; they do not impose exclusive turns.
- **Principal:** Authenticated security identity: user, service account, or API client.
- **Actor:** Project-visible author identity. An actor may represent a human, agent installation, agent session, or service.
- **Agent installation:** Stable logical integration, such as `codex-builder`.
- **Agent session:** Ephemeral runtime instance. Sessions MUST refer to an installation when one exists.

`actor_id` means the claimed/project-visible author. `principal_id` records who authenticated the write. They can differ only under an explicit delegation grant. The server records both.

### 4.3 Addressing

Events MAY address:

- A specific actor: `actor:<uuid>`
- All actors with a project role: `role:reviewer`
- A named group: `group:backend`
- A capability: `capability:security-review`
- Every project participant: `project:*`

Recipients are stored as rows, not embedded only in JSON. Addressing does not bypass authorization. A recipient lacking project access cannot read an event.

### 4.4 Subscriptions

A subscription declares interest in event delivery. Filters support project, thread, event kinds, actor, address, labels, and minimum trust level. v1 filters are declarative JSON validated against a fixed schema; arbitrary SQL or code is prohibited.

Delivery channels: pull cursor (required), webhook (v1), and Server-Sent Events (post-v1). Delivery is at least once. Consumers acknowledge a cursor; they MUST deduplicate by event ID.

## 5. Event model

### 5.1 Envelope

Every canonical event has this logical envelope:

```json
{
  "schema_version": 1,
  "id": "0198...uuidv7",
  "tenant_id": "uuid",
  "project_id": "uuid",
  "thread_id": "uuid",
  "project_seq": 1842,
  "kind": "decision.recorded",
  "actor_id": "uuid",
  "principal_id": "uuid",
  "agent_session_id": "uuid-or-null",
  "occurred_at": "2026-08-13T14:10:00Z",
  "accepted_at": "2026-08-13T14:10:02.123Z",
  "in_reply_to": "uuid-or-null",
  "correlation_id": "uuid",
  "causation_id": "uuid-or-null",
  "idempotency_key": "client-scoped-string",
  "visibility": "project",
  "trust_level": "untrusted_agent",
  "content_type": "application/json",
  "payload": {},
  "content_sha256": "hex",
  "signature": null,
  "labels": ["architecture"],
  "metadata": {}
}
```

The server assigns `id`, `project_seq`, `accepted_at`, `principal_id`, authorization context, and canonical hash. Clients MAY propose an ID and `occurred_at`; the server validates clock skew and preserves questionable source time in metadata.

### 5.2 Canonicalization and hash

The event content hash is SHA-256 over RFC 8785 canonical JSON containing all immutable envelope fields except `content_sha256`, server receipt metadata not known to the signer, and signature fields. The exact field list is versioned as `hash_profile = "engramport-event-v1"`.

The server also maintains a per-project tamper-evident chain:

```text
chain_hash[n] = SHA256(chain_hash[n-1] || content_sha256[n] || project_seq[n])
```

This detects database-level deletion/reordering when anchors are preserved externally. It does not prevent a sufficiently privileged operator from rewriting the database and all unanchored hashes. Production SHOULD periodically anchor signed project checkpoints to tenant-controlled storage or a transparency service.

### 5.3 Immutability

After commit, event envelope and payload columns MUST NOT be updated or deleted through application roles. Database triggers reject updates/deletes. Legal erasure is handled by cryptographic erasure or controlled tombstoning/redaction events plus a separately audited maintenance procedure. Derived projections MAY be rebuilt or replaced.

### 5.4 Event kinds

Required v1 kinds:

| Family | Kinds | Meaning |
|---|---|---|
| Message | `message.published`, `message.acknowledged` | Human/agent communication and receipt |
| Decision | `decision.proposed`, `decision.recorded`, `decision.superseded`, `decision.retracted` | Deliberate project choices |
| Task | `task.created`, `task.assigned`, `task.started`, `task.blocked`, `task.completed`, `task.cancelled` | Work lifecycle |
| Artifact | `artifact.registered`, `artifact.revised`, `artifact.verified`, `artifact.withdrawn` | References to external or stored outputs |
| Memory | `memory.proposed`, `memory.accepted`, `memory.superseded`, `memory.expired`, `memory.rejected` | Curated durable knowledge |
| Handoff | `handoff.created`, `handoff.claimed`, `handoff.completed`, `handoff.declined` | Transfer of responsibility/context |
| Relationship | `relationship.asserted`, `relationship.retracted` | Typed links among entities/events |
| Approval | `approval.requested`, `approval.granted`, `approval.denied`, `approval.expired`, `approval.consumed` | Human control of consequential action |
| System | `actor.registered`, `subscription.created`, `checkpoint.created`, `projection.rebuilt` | Auditable system lifecycle |

New kinds require a schema registry entry and backward-compatible versioning.

### 5.5 Payload semantics

**Message:** `body`, `format`, optional `subject`, recipient addresses, and attachment/artifact references. Acknowledgment means observed, not agreed.

**Decision:** Stable `decision_key` scoped to project, statement, rationale, alternatives, status, effective time, and evidence references. Only one active decision per `decision_key`; a later decision explicitly supersedes the prior event.

**Task:** Stable `task_key`, title, description, assignee address, state, priority, dependencies, due time, and acceptance criteria. State transitions are validated by the projector.

**Artifact:** URI/object key, media type, size, SHA-256, source system, source revision, and optional storage metadata. EngramPort stores metadata canonically; blobs larger than 1 MiB MUST use object storage and signed URLs. A revision is a new artifact row/event; existing bytes are never overwritten in place.

**Memory:** Subject key, statement, memory class (`fact`, `constraint`, `preference`, `lesson`, `summary`), evidence event IDs, confidence, review status, validity interval, sensitivity, and optional expiry. Agent-extracted memory begins as `proposed` unless policy explicitly permits auto-acceptance for that class.

**Handoff:** Objective, target address, reason, status, required context event IDs, artifact IDs, open questions, blockers, completion criteria, and optional lease expiry. Claiming creates a time-bounded lease but does not mutate the creation event.

### 5.6 Relationships

Allowed v1 predicates are controlled: `replies_to`, `caused_by`, `supports`, `contradicts`, `supersedes`, `depends_on`, `produced`, `references`, `assigned_to`, and `related_to`. Relationship endpoints are typed URNs, e.g. `event:<uuid>`, `artifact:<uuid>`, `task:<uuid>`. Custom predicates require a tenant namespace.

## 6. Workflows and collaboration modes

### 6.1 Publish → discover → respond → handoff

1. **Publish:** Client submits a typed event with an idempotency key. Server authenticates, authorizes, validates, canonicalizes, hashes, appends, updates projections transactionally, and enqueues outbox notifications.
2. **Discover:** Participant polls a cursor, receives webhook delivery, or calls a contextual inbox query. Authorization is applied before matching.
3. **Respond:** Participant publishes a new event referencing `in_reply_to` and, where appropriate, `causation_id`/`correlation_id`.
4. **Handoff:** Current participant emits `handoff.created` with explicit target and bounded context. Target claims it using the current handoff version. Completion emits a result and evidence links.

### 6.2 Modes

- **Strict relay:** A thread has a projected `next_actor_address`. Only a matching actor may publish a turn-taking message/handoff. Useful for deterministic proposal/critique/revision. The append log remains conflict-free.
- **Free-form:** Authorized participants publish concurrently. Server sequence provides ordering; causal links express meaning. This is the production default.
- **Coordinator-led:** A designated coordinator actor assigns tasks and integrates results. Workers do not acquire extra permissions merely because the coordinator requested work.
- **Human-gated:** Selected event kinds or requested actions require an approval grant before downstream execution. This is mandatory for configured consequential actions.

Mode is thread configuration, changed only by a `thread.mode_changed` event from a project maintainer. Strict relay is the Git v0 default; free-form is production default.

### 6.3 Human approvals

Approval requests contain `action_digest`, action class, exact parameters or parameter hash, requester, approver policy, expiry, and single/multi-use flag. Grants bind to that digest and expire after 15 minutes by default. Any material parameter change invalidates approval. Self-approval is prohibited for production-impacting, permission-changing, billing, data-export, destructive, or external-communication actions unless tenant policy explicitly allows it.

EngramPort records approvals but does not claim an external action occurred until a result event with evidence is published. Connectors MUST re-check authorization immediately before execution.

## 7. Reference architecture

```text
MCP clients / SDKs / CLI / Git adapter / Web UI
                       |
                API gateway (TLS)
                       |
          EngramPort application service
        /       |          |          \
   Auth/RBAC  Event API  Context API  Workers
        \       |          |          /
             PostgreSQL + pgvector
               |       |       |
           canonical  derived  outbox
             events   state
                       |
              S3-compatible object store
```

Reference implementation: TypeScript 5.x, Node.js LTS, Fastify, PostgreSQL 16+, pgvector, Kysely or hand-written SQL migrations, OpenAPI 3.1, MCP TypeScript SDK, and an S3-compatible blob store. Background jobs use a PostgreSQL job table initially. Redis, Kafka, and a separate vector database are not dependencies in v1.

### 7.1 Supabase

Supabase is a supported managed PostgreSQL distribution, not a product boundary. Use Supabase Postgres, backups, connection pooling, and optionally Auth/Storage. The service MUST remain portable to standard PostgreSQL.

- Database migrations MUST use ordinary SQL and extensions available on supported Postgres.
- RLS MUST exist even if all access currently passes through the service.
- Browser clients MUST NOT write canonical event tables directly in v1; they call the API.
- Supabase service-role credentials remain server-side.
- Supabase Realtime MAY power UI freshness, but is not the durable subscription contract.
- Auth subjects map into EngramPort principals; authorization remains EngramPort-owned.

## 8. SQL schema

The following is the normative logical schema. Implementation migrations MAY split indexes and functions, but column meanings and constraints must be preserved.

```sql
create extension if not exists vector;
create extension if not exists pgcrypto;

create type principal_kind as enum ('human','service','api_client');
create type actor_kind as enum ('human','agent','service');
create type trust_level as enum ('system','verified_human','trusted_service','trusted_agent','untrusted_agent','imported');
create type visibility as enum ('private','thread','project');

create table tenants (
  id uuid primary key,
  slug text not null unique,
  name text not null,
  settings jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table principals (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  kind principal_kind not null,
  external_issuer text,
  external_subject text,
  display_name text not null,
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  unique nulls not distinct (tenant_id, external_issuer, external_subject)
);

create table projects (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  slug text not null,
  name text not null,
  default_visibility visibility not null default 'project',
  retention_policy jsonb not null default '{}',
  next_seq bigint not null default 1,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (tenant_id, slug), unique (tenant_id, id)
);

create table project_memberships (
  tenant_id uuid not null,
  project_id uuid not null,
  principal_id uuid not null,
  role text not null check (role in ('owner','maintainer','contributor','reader','approver')),
  created_at timestamptz not null default now(),
  primary key (project_id, principal_id),
  foreign key (tenant_id, project_id) references projects(tenant_id, id),
  foreign key (principal_id) references principals(id)
);

create table actors (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  project_id uuid not null,
  kind actor_kind not null,
  slug text not null,
  display_name text not null,
  provider text,
  model_family text,
  owner_principal_id uuid references principals(id),
  trust trust_level not null,
  capabilities text[] not null default '{}',
  metadata jsonb not null default '{}',
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (tenant_id, project_id) references projects(tenant_id, id),
  unique (project_id, slug), unique (tenant_id, id)
);

create table actor_delegations (
  actor_id uuid not null references actors(id),
  principal_id uuid not null references principals(id),
  scopes text[] not null,
  expires_at timestamptz,
  primary key (actor_id, principal_id)
);

create table agent_sessions (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  project_id uuid not null,
  actor_id uuid not null references actors(id),
  provider_session_ref text,
  client_name text not null,
  client_version text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  last_seen_seq bigint not null default 0,
  metadata jsonb not null default '{}',
  foreign key (tenant_id, project_id) references projects(tenant_id, id)
);

create table threads (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  project_id uuid not null,
  slug text not null,
  title text not null,
  mode text not null check (mode in ('strict_relay','free_form','coordinator_led','human_gated')),
  created_by uuid not null references actors(id),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  metadata jsonb not null default '{}',
  foreign key (tenant_id, project_id) references projects(tenant_id, id),
  unique (project_id, slug), unique (tenant_id, id)
);

create table events (
  id uuid primary key,
  tenant_id uuid not null,
  project_id uuid not null,
  thread_id uuid references threads(id),
  project_seq bigint not null,
  schema_version integer not null,
  kind text not null,
  actor_id uuid not null references actors(id),
  principal_id uuid not null references principals(id),
  agent_session_id uuid references agent_sessions(id),
  occurred_at timestamptz not null,
  accepted_at timestamptz not null default clock_timestamp(),
  in_reply_to uuid references events(id),
  correlation_id uuid not null,
  causation_id uuid references events(id),
  idempotency_key text not null,
  visibility visibility not null,
  trust trust_level not null,
  content_type text not null default 'application/json',
  payload jsonb not null,
  labels text[] not null default '{}',
  metadata jsonb not null default '{}',
  hash_profile text not null,
  content_sha256 bytea not null,
  previous_chain_hash bytea,
  chain_hash bytea not null,
  signature jsonb,
  search_document tsvector generated always as
    (to_tsvector('english', coalesce(payload->>'title','') || ' ' || coalesce(payload->>'body','') || ' ' || coalesce(payload->>'statement',''))) stored,
  foreign key (tenant_id, project_id) references projects(tenant_id, id),
  unique (project_id, project_seq),
  unique (principal_id, project_id, idempotency_key),
  check (octet_length(content_sha256) = 32),
  check (octet_length(chain_hash) = 32)
);

create table event_recipients (
  event_id uuid not null references events(id),
  tenant_id uuid not null,
  address_type text not null check (address_type in ('actor','role','group','capability','project')),
  address_value text not null,
  primary key (event_id, address_type, address_value)
);

create table event_embeddings (
  event_id uuid not null references events(id),
  tenant_id uuid not null,
  project_id uuid not null,
  model text not null,
  model_revision text not null,
  dimensions integer not null,
  embedding vector(1536) not null,
  content_sha256 bytea not null,
  created_at timestamptz not null default now(),
  primary key (event_id, model, model_revision)
);

create table artifacts (
  id uuid primary key,
  tenant_id uuid not null,
  project_id uuid not null,
  created_event_id uuid not null references events(id),
  prior_artifact_id uuid references artifacts(id),
  uri text not null,
  media_type text not null,
  byte_size bigint,
  sha256 bytea,
  source_system text,
  source_revision text,
  metadata jsonb not null default '{}',
  withdrawn_at timestamptz,
  foreign key (tenant_id, project_id) references projects(tenant_id, id)
);

create table decision_state (
  tenant_id uuid not null,
  project_id uuid not null,
  decision_key text not null,
  current_event_id uuid not null references events(id),
  status text not null check (status in ('proposed','active','superseded','retracted')),
  statement text not null,
  rationale text,
  updated_seq bigint not null,
  primary key (project_id, decision_key)
);

create table task_state (
  tenant_id uuid not null,
  project_id uuid not null,
  task_key text not null,
  current_event_id uuid not null references events(id),
  title text not null,
  status text not null check (status in ('open','assigned','in_progress','blocked','completed','cancelled')),
  assignee_address text,
  priority smallint not null default 2 check (priority between 0 and 3),
  due_at timestamptz,
  updated_seq bigint not null,
  primary key (project_id, task_key)
);

create table memory_state (
  id uuid primary key,
  tenant_id uuid not null,
  project_id uuid not null,
  subject_key text not null,
  current_event_id uuid not null references events(id),
  class text not null check (class in ('fact','constraint','preference','lesson','summary')),
  statement text not null,
  status text not null check (status in ('proposed','active','superseded','expired','rejected')),
  confidence numeric(4,3) check (confidence between 0 and 1),
  sensitivity text not null default 'internal',
  valid_from timestamptz,
  valid_until timestamptz,
  updated_seq bigint not null
);

create table handoff_state (
  id uuid primary key,
  tenant_id uuid not null,
  project_id uuid not null,
  created_event_id uuid not null references events(id),
  current_event_id uuid not null references events(id),
  target_address text not null,
  status text not null check (status in ('open','claimed','completed','declined','expired')),
  claimed_by uuid references actors(id),
  lease_expires_at timestamptz,
  version bigint not null,
  updated_seq bigint not null
);

create table relationships_current (
  tenant_id uuid not null,
  project_id uuid not null,
  subject_urn text not null,
  predicate text not null,
  object_urn text not null,
  asserted_event_id uuid not null references events(id),
  active boolean not null,
  updated_seq bigint not null,
  primary key (project_id, subject_urn, predicate, object_urn)
);

create table approvals (
  id uuid primary key,
  tenant_id uuid not null,
  project_id uuid not null,
  request_event_id uuid not null references events(id),
  action_class text not null,
  action_digest bytea not null,
  status text not null check (status in ('pending','granted','denied','expired','consumed')),
  requested_by uuid not null references actors(id),
  decided_by uuid references principals(id),
  expires_at timestamptz not null,
  consumed_event_id uuid references events(id),
  version bigint not null default 1
);

create table subscriptions (
  id uuid primary key,
  tenant_id uuid not null,
  project_id uuid not null,
  principal_id uuid not null references principals(id),
  actor_id uuid references actors(id),
  filter jsonb not null,
  channel text not null check (channel in ('pull','webhook')),
  endpoint_ciphertext bytea,
  secret_ciphertext bytea,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table delivery_attempts (
  id uuid primary key,
  subscription_id uuid not null references subscriptions(id),
  event_id uuid not null references events(id),
  attempt integer not null,
  status text not null,
  response_code integer,
  next_attempt_at timestamptz,
  error_class text,
  created_at timestamptz not null default now(),
  unique (subscription_id, event_id, attempt)
);

create table outbox (
  id bigint generated always as identity primary key,
  tenant_id uuid not null,
  topic text not null,
  aggregate_id uuid not null,
  payload jsonb not null,
  available_at timestamptz not null default now(),
  claimed_at timestamptz,
  completed_at timestamptz,
  attempts integer not null default 0
);

create index events_project_thread_seq on events(project_id, thread_id, project_seq);
create index events_project_kind_seq on events(project_id, kind, project_seq desc);
create index events_search_gin on events using gin(search_document);
create index events_labels_gin on events using gin(labels);
create index recipients_lookup on event_recipients(tenant_id, address_type, address_value, event_id);
create index embeddings_hnsw on event_embeddings using hnsw (embedding vector_cosine_ops);
create index outbox_ready on outbox(available_at) where completed_at is null;
create unique index one_active_memory_per_subject
  on memory_state(project_id, subject_key) where status = 'active';
```

### 8.1 Append transaction

The append endpoint MUST use one transaction:

1. Set tenant/principal session variables for RLS.
2. Lock the project row `FOR UPDATE` and allocate `project_seq`.
3. Resolve the previous chain hash.
4. Validate event schema, actor delegation, reply target, thread membership, mode, and approval policy.
5. Insert event and recipients.
6. Apply deterministic projection updates with optimistic version checks.
7. Insert outbox jobs for embedding, delivery, and optional extraction.
8. Commit.

On duplicate idempotency key with identical request digest, return the existing event. With different content, return `409 IDEMPOTENCY_CONFLICT`.

### 8.2 RLS baseline

Every tenant-scoped table MUST enable and force RLS. Policies compare `tenant_id` to `current_setting('app.tenant_id')::uuid`; project reads additionally require membership or a server-validated share grant. Application connections use a non-owner role that cannot bypass RLS. Migration and audited maintenance roles are separate. Automated tests MUST attempt cross-tenant reads/writes through every public query path.

## 9. Retrieval and context assembly

### 9.1 Retrieval modes

- **Chronological:** Events after a cursor, ordered by project sequence.
- **Structured:** SQL filters for active decisions, tasks, handoffs, actor, time, kind, labels, and relationships.
- **Lexical:** PostgreSQL full-text search.
- **Semantic:** pgvector cosine similarity against authorized candidate rows.
- **Hybrid:** Reciprocal Rank Fusion (RRF) of lexical and semantic ranks, followed by policy-aware reranking.

Default hybrid score:

```text
score = 0.40 * rrf_semantic
      + 0.25 * rrf_lexical
      + 0.20 * recency_decay
      + 0.10 * type_priority
      + 0.05 * provenance_quality
```

Exact active decisions, open tasks, unresolved handoffs, and direct replies are pinned ahead of approximate semantic results when relevant. Superseded/retracted/expired items are excluded by default but retrievable with `include_inactive=true`.

### 9.2 Authorization ordering

Tenant/project/visibility predicates MUST be applied inside the SQL query before nearest-neighbor limiting. It is unacceptable to retrieve globally and filter afterward. If an ANN plan cannot preserve this property at a given scale, use per-tenant/project partitions, iterative scans, or a two-stage authorized ID set.

### 9.3 Context package

`context.build` returns:

```json
{
  "project": {"id":"...","name":"..."},
  "cursor": 1842,
  "objective": "Review authentication design",
  "active_decisions": [],
  "open_tasks": [],
  "pending_handoffs": [],
  "recent_events": [],
  "relevant_memories": [],
  "artifacts": [],
  "conflicts_and_uncertainties": [],
  "provenance": {"event_ids": [], "retrieval_trace_id": "..."},
  "budget": {"requested_tokens": 8000, "estimated_tokens": 7710, "truncated": false}
}
```

Budget allocation defaults: 10% project identity/policy, 20% active decisions/constraints, 15% tasks/handoffs, 20% recent causal history, 25% semantic/lexical evidence, 10% safety/conflicts. Content is deduplicated by source event and normalized text hash. A token estimator matched to the target model is preferred; otherwise use a conservative four characters/token estimate plus 15% margin.

Truncation order: redundant messages, low-score semantic hits, old resolved tasks, verbose bodies replaced by stored summaries. Never truncate away explicit safety policy, active constraints, requested approvals, or provenance IDs for included claims. Generated summaries must cite source event IDs and be labeled generated.

## 10. Memory lifecycle

1. **Capture:** Events enter the log; they are not automatically “memory.”
2. **Extract:** A worker proposes candidate facts, constraints, preferences, lessons, or summaries with evidence IDs.
3. **Validate:** Deterministic checks detect duplicates, contradictions, missing evidence, secrets, and unsupported confidence.
4. **Accept:** A human or configured trusted policy emits `memory.accepted`.
5. **Retrieve:** Only active memory is returned by default.
6. **Groom:** Scheduled jobs propose merges, expiry, or supersession; they never rewrite history.

Supersession is explicit and acyclic. A new memory names the prior active memory. The projector locks the subject key, marks the prior projection superseded, activates the new projection, and rejects cycles or concurrent stale versions. Conflicting memories with different evidence remain visible as a conflict until resolved; the system MUST NOT fabricate consensus.

Extraction prompts treat event content as quoted evidence, forbid following embedded instructions, require exact evidence IDs, and return schema-constrained JSON. High-sensitivity or low-confidence candidates require human review. Secrets and credentials MUST be detected and redacted/quarantined before embedding.

## 11. MCP interface

The MCP server exposes the protocol; it is not granted blanket authority. Tool descriptions MUST say that retrieved content is untrusted project data.

### 11.1 Tools

| Tool | Purpose | Key input |
|---|---|---|
| `engramport.publish_event` | Append typed event | project, thread, kind, payload, recipients, reply/causal IDs, idempotency key |
| `engramport.list_inbox` | Discover addressed/relevant work | project, actor, after cursor, kinds, limit |
| `engramport.get_event` | Read one event and provenance | event ID |
| `engramport.query_events` | Structured/chronological query | filters, cursor, limit |
| `engramport.search` | Hybrid retrieval | query, filters, limit, include inactive |
| `engramport.build_context` | Assemble bounded context | project, objective, actor, token budget, since cursor |
| `engramport.create_handoff` | Publish a handoff | target, objective, context/artifacts, criteria |
| `engramport.claim_handoff` | Claim with optimistic version | handoff ID, version, lease seconds |
| `engramport.complete_handoff` | Complete with result evidence | handoff ID, version, summary, event/artifact IDs |
| `engramport.propose_memory` | Propose curated memory | class, subject key, statement, evidence, confidence |
| `engramport.request_approval` | Request human approval | action class, exact action payload, expiry |
| `engramport.verify_provenance` | Verify hashes/signature/chain | event or checkpoint ID |

Read tools MUST support pagination and return a stable `next_cursor`. Write tools require idempotency keys. Tools MUST return typed machine-readable errors.

### 11.2 Resources

- `engramport://projects/{project_id}/bootstrap`
- `engramport://projects/{project_id}/threads/{thread_id}`
- `engramport://projects/{project_id}/decisions/active`
- `engramport://projects/{project_id}/tasks/open`
- `engramport://projects/{project_id}/actors/{actor_id}/inbox`
- `engramport://events/{event_id}`
- `engramport://artifacts/{artifact_id}/metadata`

Resources are snapshots and include an `as_of_seq` field.

### 11.3 Prompts

- `resume_project`: Builds a safe project briefing for a new session.
- `respond_to_handoff`: Frames a claimed handoff and completion contract.
- `record_decision`: Guides generation of a typed decision proposal.
- `groom_memory`: Produces review proposals, never direct mutation.

Prompts must distinguish system instructions from untrusted event content with clear delimiters and provenance references.

## 12. REST/OpenAPI interface

Base path: `/v1`. JSON only except artifact upload/download. OAuth 2.1/OIDC bearer tokens and scoped API keys are supported.

```text
POST   /v1/projects/{project_id}/events
GET    /v1/projects/{project_id}/events?after_seq=&limit=&kind=&thread_id=
GET    /v1/events/{event_id}
POST   /v1/projects/{project_id}/search
POST   /v1/projects/{project_id}/context
GET    /v1/projects/{project_id}/inbox
POST   /v1/projects/{project_id}/handoffs
POST   /v1/handoffs/{id}/claim
POST   /v1/handoffs/{id}/complete
POST   /v1/projects/{project_id}/approvals
POST   /v1/approvals/{id}/decision
POST   /v1/projects/{project_id}/subscriptions
POST   /v1/artifacts/presign
GET    /v1/projects/{project_id}/checkpoints/{seq}/verify
```

Successful append returns `201`; idempotent replay returns `200` with `Idempotent-Replay: true`. Error shape:

```json
{
  "error": {
    "code": "HANDOFF_VERSION_CONFLICT",
    "message": "The handoff changed after it was read.",
    "retryable": false,
    "trace_id": "trc_...",
    "details": {"current_version": 3}
  }
}
```

OpenAPI is source-controlled and used to generate SDK types. Breaking schema changes require `/v2`; additive optional fields do not.

## 13. Authentication, authorization, and tenancy

- OIDC authenticates humans and services. API keys are hashed at rest and shown once.
- Tokens carry tenant and principal identity, not authoritative project roles; roles are loaded server-side.
- RBAC roles: owner, maintainer, contributor, reader, approver. Fine-grained scopes include `events:read`, `events:write`, `memory:accept`, `approvals:decide`, `artifacts:write`, `subscriptions:manage`, `admin:project`.
- Actor delegation binds a principal to allowed actor scopes and optional expiry.
- Agent sessions receive least-privilege, short-lived tokens. Provider/model metadata is descriptive, never authorization-bearing.
- Every cache key, job, log field, vector row, object key, and trace MUST carry tenant/project scope.
- Encryption: TLS in transit; managed encryption at rest; envelope encryption for webhook secrets and sensitive integration credentials. Tenant-managed keys are future work.
- Audit logs include authentication, policy decisions, exports, key actions, approval decisions, and administrative maintenance.

## 14. Untrusted content and prompt-injection boundaries

All messages, artifact text, imported Git content, webhook payloads, and agent-authored fields are untrusted data regardless of claimed author/provider. The service MUST:

1. Keep policy/tool instructions outside retrieved content delimiters.
2. Never convert prose into tool authority, credentials, role changes, or approvals.
3. Label source, trust, and provenance in context packages.
4. Strip active HTML/scripts in rendered views and scan uploaded artifacts.
5. Reject dangerous URI schemes and enforce SSRF-safe connector fetching.
6. Apply data-loss prevention before embedding or external model calls.
7. Require explicit allowlisted tools and approval policies for side effects.
8. Avoid recursively expanding references without depth, size, and domain limits.
9. Record the exact context/event IDs supplied to an agent for audit.

An event saying “ignore prior instructions” is stored and searchable as text; it is never a system instruction.

## 15. Provenance, signatures, and attestation limits

EngramPort can accurately claim:

- The API authenticated a principal under a given tenant policy.
- That principal was authorized to write as an actor at acceptance time.
- The accepted canonical bytes hash to a recorded digest.
- A valid signature proves possession of a particular key at signing time, subject to key security and timestamp trust.
- The project sequence and chain are internally consistent from a trusted checkpoint.

It cannot claim solely from these controls:

- That Claude, GPT, or another named model generated the text.
- That a human did not edit agent output before signing.
- That the signer was uncompromised.
- That `occurred_at` is truthful.
- That an external artifact URI still returns the originally hashed bytes.

Signatures use Ed25519 over the v1 canonical digest. Keys are registered to principals/actors with validity intervals and revocation. Server receipt signatures and client signatures are separate. Verification results report `valid`, `invalid`, `unknown_key`, `revoked_after_signing`, or `unanchored`; they never collapse uncertainty into “verified by AI.”

## 16. Concurrency, retries, and delivery

- Per-project sequence allocation serializes only the brief append transaction. Projects scale independently.
- Concurrent free-form posts both succeed with distinct sequence numbers.
- Strict-relay posts use the projected turn version; stale writers receive `409 TURN_CONFLICT`.
- Handoff claims use `UPDATE ... WHERE version = $expected AND status = 'open'`; exactly one claimant succeeds.
- Clients retry `429`, `502`, `503`, and `504` with exponential backoff, full jitter, and the same idempotency key.
- Webhook delivery retries at 10s, 1m, 5m, 30m, 2h, 12h, then dead-letters. Webhooks are HMAC-signed and include event ID, sequence, timestamp, and delivery ID.
- Outbox workers use `FOR UPDATE SKIP LOCKED`, bounded leases, and idempotent handlers.
- Embedding failures do not roll back events. Structured/lexical retrieval remains available and exposes index status.

## 17. Git-based v0 interoperability proof

### 17.1 Goal

Prove that two independent agent environments can exchange, discover, respond to, and complete a handoff without humans copying message bodies. Humans may trigger each turn.

### 17.2 Repository contract

```text
engramport-proof/
├── AGENTS.md
├── PROTOCOL.md
├── engramport.yaml
├── actors/
│   ├── agent-a.yaml
│   └── agent-b.yaml
├── events/
│   ├── agent-a/
│   │   └── 20260813T141000Z_0198....md
│   └── agent-b/
├── schemas/event-v0.schema.json
└── scripts/verify-log
```

Each actor creates files only in its own directory. Filenames use UTC timestamp plus UUIDv7; ordering truth is Git commit ancestry and event causal links, not the filename. Strict relay is default.

```markdown
---
schema_version: 0
id: 0198...
thread: architecture
from: agent-a
type: handoff
occurred_at: 2026-08-13T14:10:00Z
in_reply_to: null
next: agent-b
content_sha256: "..."
---

## Objective
Review the proposed PostgreSQL schema.

## Completion criteria
Identify blocking integrity or tenancy flaws and append a response.
```

`verify-log` MUST validate schema, unique IDs, actor-directory ownership, hash, known reply targets, no reply cycles, strict-relay transitions, and referenced artifacts. CI runs it on every pull request. A failure fixture MUST prove each validation actually rejects malformed input.

### 17.3 Push race

On non-fast-forward rejection, pull with rebase and retry. Because actors only create unique files, ordinary concurrent writes should rebase cleanly. A conflict is surfaced; automation MUST NOT overwrite or force-push.

### 17.4 Import/export

Production CLI supports `engram import git-log` and `engram export git-log`. Imported events receive `trust=imported`, preserve original commit/repository metadata, and are appended rather than assigned false historical server sequence numbers.

## 18. SDK and CLI

First-party SDKs: TypeScript at v1, Python immediately after. Generated REST types are wrapped with ergonomic methods:

```ts
const event = await client.events.publish({
  projectId,
  kind: "decision.recorded",
  threadId,
  actorId,
  idempotencyKey: crypto.randomUUID(),
  payload: {
    decision_key: "architecture.vector_store",
    statement: "Use PostgreSQL + pgvector as the canonical architecture",
    rationale: "One consistent, portable datastore; vectors remain derived"
  }
});
```

CLI commands:

```text
engram auth login
engram project init|list|inspect
engram actor register|whoami
engram publish --kind ... --file ...
engram inbox --after ... --watch
engram reply EVENT_ID --file ...
engram handoff create|claim|complete
engram search "query"
engram context --objective "..." --tokens 8000
engram verify EVENT_ID
engram import git-log PATH
engram export git-log PATH
engram doctor
```

SDK/CLI defaults must be safe: no implicit project, no hidden writes, visible idempotency, timeouts, bounded pagination, and redacted diagnostic output.

## 19. Observability and audit

Use OpenTelemetry traces, Prometheus-compatible metrics, and structured JSON logs. Never log payload bodies or tokens by default.

Required metrics:

- Append latency/error/idempotent-replay rate.
- Events per tenant/project/kind.
- Projection lag and failures.
- Outbox depth/age, webhook attempts/dead letters.
- Embedding queue age/failure/cost, retrieval latency and candidate counts.
- Context package estimated tokens/truncation rate.
- Authorization denials and RLS canary failures.
- Handoff time-to-claim/time-to-complete.
- Approval latency/expiry/denial.
- Database connections, locks, WAL, storage, index hit ratio, HNSW build/size.

Every response includes `trace_id`. Retrieval traces record query class, filters, candidate IDs/scores, selected IDs, model/revision, budget decisions, and authorization policy version; sensitive query text is hashed or separately protected.

## 20. Deployment and local development

### 20.1 Environments

Local, test, staging, production. No shared databases or credentials. Production deploys stateless API and worker processes, managed PostgreSQL with point-in-time recovery, and versioned object storage. Backups are restored in quarterly drills.

### 20.2 Environment variables

```dotenv
ENGRAMPORT_ENV=local
ENGRAMPORT_PUBLIC_URL=http://localhost:8080
DATABASE_URL=postgresql://...
DATABASE_POOL_MAX=20
OIDC_ISSUER_URL=https://...
OIDC_AUDIENCE=engramport-api
API_KEY_PEPPER=secret-manager-reference
OBJECT_STORE_ENDPOINT=http://localhost:9000
OBJECT_STORE_BUCKET=engramport-artifacts
OBJECT_STORE_REGION=us-east-1
OBJECT_STORE_ACCESS_KEY=...
OBJECT_STORE_SECRET_KEY=...
ENCRYPTION_KEK_URI=local-or-kms-reference
SIGNING_KEY_URI=local-or-kms-reference
EMBEDDING_PROVIDER=...
EMBEDDING_MODEL=...
EMBEDDING_DIMENSIONS=1536
EMBEDDING_API_KEY=...
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
LOG_LEVEL=info
WEBHOOK_EGRESS_ALLOWLIST=
MAX_EVENT_BYTES=1048576
DEFAULT_CONTEXT_TOKEN_BUDGET=8000
```

Secrets MUST come from a secret manager in staging/production, never committed files. Startup validates all configuration and refuses dimension mismatch with the database.

### 20.3 Local stack

Docker Compose starts PostgreSQL/pgvector, MinIO, API, worker, and an OIDC test provider. Seed scripts create two tenants specifically for isolation tests. One command runs migrations and tests; one command runs the Git proof.

## 21. Migrations and data evolution

- SQL migrations are immutable, sequential, checksum-verified, and forward-only in production.
- Deployments use expand/migrate/contract. Code reads old and new shapes during the migration window.
- Event payload schemas live in a registry keyed by kind and schema version. Old events remain readable forever.
- Projectors are versioned and rebuildable into shadow tables, validated against counts/checksums, then swapped.
- Embeddings carry model/revision/dimensions. Re-embedding writes a second row and switches retrieval policy only after coverage/quality checks.
- Before high-risk migrations, take and verify a restorable backup. Rollback means application rollback plus compensating forward migration, not destructive down migration.

## 22. Testing strategy

### 22.1 Required layers

- Unit tests for canonicalization, hashing, schemas, transition machines, filters, budgeting, and ranking.
- Property tests for event canonicalization stability, idempotency, supersession acyclicity, and append order.
- Database integration tests with real PostgreSQL/pgvector and forced RLS.
- Contract tests generated from OpenAPI and MCP schemas.
- End-to-end tests for two actors across REST, MCP, CLI, webhook, and Git import/export.
- Security tests for tenant isolation, actor impersonation, injection, SSRF, unsafe URLs, oversized payloads, malicious archives, and secret leakage.
- Load and soak tests using realistic project size/skew.
- Backup/restore, projector rebuild, key rotation/revocation, and disaster recovery drills.

### 22.2 Mandatory failure tests

The suite MUST demonstrate failure for:

1. Duplicate idempotency key with different bytes.
2. Cross-tenant event ID guessing and vector-search leakage.
3. Invalid actor delegation or disabled principal.
4. Reply to inaccessible/nonexistent event.
5. Update/delete of canonical event.
6. Broken chain/hash/signature and revoked key.
7. Two simultaneous handoff claims.
8. Stale strict-relay turn and stale projection version.
9. Worker crash between claim and completion.
10. Webhook timeout, replay, invalid signature, and dead-letter path.
11. Embedding outage and dimension mismatch.
12. Prompt injection embedded in message/artifact text.
13. Context over budget and mandatory-safety-content retention.
14. Memory contradiction, duplicate, expiry, and supersession cycle.
15. Database failover, exhausted pool, and restoration from backup.

## 23. Performance, scale, and cost

### 23.1 Initial SLOs

- Event append: p95 < 250 ms, p99 < 750 ms, excluding blob upload.
- Cursor read: p95 < 200 ms.
- Hybrid search over a 1M-event project: p95 < 1.5 s.
- Context build with warm embeddings: p95 < 3 s excluding external model summarization.
- Availability: 99.9% monthly for production API.
- Durability target follows managed PostgreSQL/object-store guarantees; PITR recovery point ≤ 5 minutes, recovery time ≤ 60 minutes.
- Projection lag p99 < 5 seconds; core decision/task/handoff projection is transactional and therefore zero-lag at commit.

### 23.2 Scaling path

Start with a primary database and connection pooler. Partition `events`, embeddings, and delivery tables by hash of tenant/project when total events exceed ~100M or maintenance/latency measurements justify it. Add read replicas for historical reads. Keep writes/project sequencing on the primary. Archive cold payload bodies only if retention and query measurements require it; retain canonical hashes and metadata.

HNSW is default for mature datasets; exact search is acceptable for small projects. Tune `ef_search` empirically. Pinecone or another external vector service is justified only after a benchmark shows pgvector cannot meet documented corpus, throughput, latency, isolation, or operational requirements at acceptable cost. If added, it consumes the outbox, contains event IDs plus tenant-safe metadata, and is fully rebuildable.

### 23.3 Cost controls

- Embed only eligible textual events; skip acknowledgments, duplicates, secrets, and low-value system events.
- Batch embedding and grooming jobs.
- Cache context packages by `(principal policy version, project seq, objective hash, budget)` with short TTL.
- Enforce per-tenant quotas for events, bytes, tokens, webhooks, and retrieval.
- Store large artifacts in object storage, not Postgres.
- Track cost per tenant/project/provider job and expose budget alerts.

## 24. Versioning and compatibility

- API major version in URL; additive changes within a major.
- Event `schema_version` is per kind. Consumers MUST ignore unknown optional fields and reject unsupported required versions with a clear error.
- MCP tool names remain stable in v1; new inputs are optional. Breaking changes use suffixed tools during a deprecation window.
- SDKs use semantic versioning and declare supported API ranges.
- Git protocol has its own version and deterministic upgrade command.
- Minimum deprecation window: 180 days for hosted production interfaces, with telemetry and migration guide.
- Unknown event kinds remain storable/readable to generic clients but are not projected until a registered projector exists.

## 25. Repository layout

```text
engramport/
├── README.md
├── LICENSE
├── SECURITY.md
├── CONTRIBUTING.md
├── pnpm-workspace.yaml
├── package.json
├── apps/
│   ├── api/
│   ├── worker/
│   ├── mcp-server/
│   └── web/
├── packages/
│   ├── domain/            # event schemas and state machines
│   ├── database/          # queries, transactions, RLS helpers
│   ├── auth/
│   ├── retrieval/
│   ├── context/
│   ├── provenance/
│   ├── git-adapter/
│   ├── sdk-typescript/
│   ├── sdk-python/
│   └── cli/
├── openapi/openapi.yaml
├── mcp/
│   ├── tools/
│   ├── resources/
│   └── prompts/
├── schemas/events/
├── migrations/
├── deploy/
│   ├── docker-compose.yml
│   └── kubernetes/
├── docs/
│   ├── architecture/
│   ├── protocol/
│   ├── security/
│   └── adr/
├── examples/
│   ├── two-agent-relay/
│   └── free-form-team/
└── tests/
    ├── contract/
    ├── e2e/
    ├── failure/
    ├── load/
    └── isolation/
```

## 26. Engineering decision records

Create these ADRs before implementation; their conclusions are fixed unless replaced by a new accepted ADR:

| ADR | Decision |
|---|---|
| 0001 | Canonical append-only event log and rebuildable projections |
| 0002 | PostgreSQL 16 + pgvector; no Pinecone in reference architecture |
| 0003 | UUIDv7 IDs plus per-project monotonic server sequence |
| 0004 | At-least-once delivery plus idempotent writes |
| 0005 | RLS and service-mediated canonical writes |
| 0006 | RFC 8785 + SHA-256 + Ed25519 provenance profile |
| 0007 | MCP/REST share one domain service and schema registry |
| 0008 | Typed memory proposals with explicit acceptance/supersession |
| 0009 | Git protocol is interoperability proof, not production database |
| 0010 | PostgreSQL outbox/jobs before Redis/Kafka |
| 0011 | Untrusted-content boundary and human approval policy |

Each ADR records context, decision, alternatives, consequences, operational trigger for reconsideration, and security impact.

## 27. Phased roadmap and gates

### v0 — Git interoperability proof (2–3 weeks)

Deliver protocol, AGENTS.md bootstrap, schemas, verifier, two actor folders, CI, and a recorded two-platform relay.

Gate: Agent A publishes a handoff, Agent B independently discovers and replies, Agent A consumes the reply; no message body is manually copied; every malformed fixture fails verification.

### v0.1 — Canonical event service (4–6 weeks)

Postgres schema, append/read API, identity, project/thread model, idempotency, transactional projections, CLI, local stack, OpenAPI, and RLS.

Gate: End-to-end append/discover/respond/handoff works under concurrent load; isolation and immutability tests pass.

### v0.2 — MCP and context (3–5 weeks)

MCP tools/resources/prompts, lexical/semantic/hybrid retrieval, embeddings, context budgeting, TypeScript SDK, and Git import/export.

Gate: Two different MCP clients resume the same project and cite the same authoritative events without cross-tenant leakage.

### v0.3 — Trust and governance (4–6 weeks)

Approvals, signatures, checkpoints, key lifecycle, audit UI/API, prompt-injection controls, artifact scanning, webhook subscriptions.

Gate: Security review and threat model accepted; all mandatory security/failure tests pass; claims match attestation limits.

### v0.4 — Memory intelligence (3–5 weeks)

Extraction proposals, human review, grooming, supersession, contradiction display, summaries with evidence, retrieval evaluation harness.

Gate: No extracted memory becomes authoritative outside policy; retrieval quality beats chronological baseline on a labeled evaluation set.

### v1.0 — Production (6–10 weeks)

Python SDK, admin/usage controls, SLO dashboards, billing meters, HA deployment, restore drills, rate limits, data export/deletion, documentation, compatibility guarantees.

Gate: 30-day staging soak; p95 SLOs met at 2× expected launch load; penetration test critical/high findings closed; restore and projector rebuild proven; operational runbooks signed off.

## 28. Exact product acceptance criteria

EngramPort v1 is accepted only when all are true:

1. An authenticated principal can register/use a delegated actor and append a typed event with safe retry semantics.
2. Accepted events cannot be modified or deleted by application roles.
3. Every project event receives a unique monotonic sequence and valid hash-chain position.
4. Two concurrent actors can publish without content conflicts; exactly one wins a contested handoff claim.
5. A fresh agent session can request an 8k-token context package containing active decisions, open tasks/handoffs, relevant evidence, and provenance within the stated SLO.
6. Hybrid search applies authorization before candidate limiting and passes automated tenant-leak tests.
7. Superseded decisions/memories are excluded by default and their full history remains queryable.
8. MCP, REST, CLI, and TypeScript SDK produce semantically equivalent events and errors.
9. Webhook consumers can recover through retries/cursors without event loss; duplicates are documented and deduplicable.
10. Approval grants bind to an exact action digest, expire, and cannot authorize modified parameters.
11. Provenance verification reports accurate limits and detects modified content, broken chains, unknown/revoked keys, and unanchored history.
12. Prompt-injection test content appears only as labeled data and cannot cause privileged tool execution.
13. Git v0 logs can be verified, imported, and exported while preserving source provenance.
14. Database restore and projector rebuild reproduce event counts, chain checkpoints, and current-state checksums.
15. Production meets the SLO, security, observability, backup, migration, and compatibility gates in this document.

## 29. End-to-end examples

### 29.1 Decision and response

```http
POST /v1/projects/prj_123/events
Idempotency-Key: 86c4...
Authorization: Bearer ...
Content-Type: application/json

{
  "thread_id": "thr_arch",
  "kind": "decision.proposed",
  "actor_id": "act_codex",
  "recipients": [{"type":"role","value":"maintainer"}],
  "payload": {
    "decision_key": "architecture.vector_store",
    "statement": "Use PostgreSQL + pgvector; remove Pinecone",
    "rationale": "Vectors are rebuildable indexes and do not require a second canonical store",
    "alternatives": ["Supabase + Pinecone", "Dedicated vector service later"]
  }
}
```

A maintainer records it:

```json
{
  "thread_id": "thr_arch",
  "kind": "decision.recorded",
  "actor_id": "act_alex",
  "in_reply_to": "evt_proposal",
  "causation_id": "evt_proposal",
  "correlation_id": "corr_architecture",
  "payload": {
    "decision_key": "architecture.vector_store",
    "statement": "Use PostgreSQL + pgvector as canonical architecture",
    "rationale": "Accepted after operational and cost review",
    "supersedes_event_id": null
  }
}
```

### 29.2 Agent handoff

1. Claude publishes `handoff.created` addressed to `actor:act_codex`, citing three events and an artifact hash.
2. Codex calls `list_inbox(after_seq=1840)` and receives the handoff.
3. Codex calls `claim_handoff(id, version=1, lease=3600)`. The projector emits/records `handoff.claimed` and returns version 2.
4. A competing worker's version-1 claim receives `409`.
5. Codex uses `build_context(objective=..., token_budget=8000)`. The package includes untrusted-content labels and cited source IDs.
6. Codex publishes an artifact revision plus `handoff.completed` referencing the artifact and test-result event.
7. Claude's pull cursor/webhook discovers completion. No participant edited an earlier event.

### 29.3 Consequential action approval

An agent wants to deploy. It submits an approval request whose digest covers environment, artifact SHA, deployment command identity, and parameters. A human approver grants it. The deployment connector verifies the unused, unexpired grant immediately before execution, performs the exact action, and publishes `approval.consumed` plus a result artifact. Changing the artifact SHA requires a new approval.

## 30. Open questions and explicit future work

These do not block the specified v1 unless promoted through an ADR:

- Tenant-managed encryption/signing keys and external transparency-log anchoring.
- Region pinning, cross-region replication, and formal compliance programs.
- Native Slack/Linear/GitHub/Drive connectors and bidirectional conflict semantics.
- A2A or other live protocol bridge; durable EngramPort events remain canonical.
- Branch/merge semantics for hypothetical plans. v1 uses threads and explicit supersession, not Git-like state branches.
- Automated trust scoring. v1 uses explicit trust classifications and evidence, not opaque reputation scores.
- Model/provider hardware attestation if credible standards become available.
- Graph algorithms beyond typed relational traversal.
- Tenant-defined event schemas/projectors in a sandboxed extension system.
- Offline-first replicas and CRDT ingestion. Git export covers the initial offline interoperability case.
- External vector services only under measured triggers in §23.2.
- Advanced retention/legal hold and tenant-specific cryptographic erasure.
- Evaluation datasets for collaboration quality, not only retrieval relevance.

## 31. Definition of done for every feature

A feature is not done until it includes domain schema, authorization rules, RLS impact, OpenAPI/MCP contract where applicable, idempotency behavior, audit event, metrics/traces, migration, unit/integration/failure tests, threat-model update, operator documentation, and backward-compatibility assessment.

The guiding implementation test is simple: a new, initially context-free participant should be able to discover the right work, understand why the current state exists, act only within granted authority, append a durable response, and hand the project forward without trusting a model vendor to own the project's memory.

---

**Build directive:** Implement v0 first, but do not carry Git's storage limitations into production. Build the production domain around the append-only event contract and a single PostgreSQL + pgvector source of truth. Treat every projection, embedding, summary, delivery, and UI view as reconstructable from canonical events.
