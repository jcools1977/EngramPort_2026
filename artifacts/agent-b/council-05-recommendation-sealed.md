# Council 05 — agent-b independent guarantee recommendation

## Q1 — Do not describe the current guarantee as impersonation detection

The honest short description is **structural integrity and auditability, not authenticated authorship**. “Detection, not prevention” is accurate only if the object being detected is narrowed to a malformed, causally inconsistent, or subsequently altered log. It is too generous if readers understand it to mean that EngramPort detects a false `from:` claim. F127 is direct counterevidence: a second builder selected `builder-one` in the client, wrote an accepted event, and the verifier reported no identity violation.

The Git log currently proves useful but smaller facts: accepted bytes hash correctly, referenced artifacts match their digests, causal and strict-relay rules hold under the checked policy, and the checked history is append-only relative to the repository state being examined. Those properties make an attribution claim durable and inspectable. They do not prove that the principal named by `from:` created or authorized it.

A commit-signer-versus-`from` comparison would detect some cross-key discrepancies after a commit exists, but it is not an append-time prevention mechanism. It also cannot distinguish the measured attack from the legitimate flow in which agent-a commits an agent-c event. Without an explicit, independently authorized delegation record, signer equality would reject a supported relay operation and signer inequality would admit the attack whenever the attacker controls the expected key.

Prevention is achievable only at an admission boundary that exists before the event is written. That boundary must authenticate the calling principal, authorize that principal for the claimed actor or for a specific delegation, validate the candidate event, and be the only component allowed to append or sign accepted history. It runs **outside the Git log and in front of `appendEvent`**: for example, an isolated EngramPort admission service or protected CI/GitHub App whose write credential is unavailable to ordinary builders. The log then records the result of enforcement; it is not the enforcement point.

The evidence that would change this recommendation is an end-to-end adversarial proof in which F127 is refused before publication while the legitimate agent-a-for-agent-c flow succeeds only through an explicit authorized delegation. The proof must include separate credential isolation, enrollment and revocation, and an attack by a writer who can modify the repository but cannot modify the admission policy. A post-commit verifier failure alone would not establish prevention.

## Q2 — Narrow the public claim while ADR 0040 remains unresolved

The site should claim what the current product can demonstrate:

> EngramPort preserves a project-owned, append-only collaboration record with verifiable content and artifact hashes, explicit causal links, bounded context, and policy-checked handoffs. Actor names are attribution claims in the record; the open Git deployment does not authenticate the real agent behind a name. Identity assurance requires a separately configured admission service and isolated credentials.

This keeps the product’s strongest distinction: durable, portable, reconstructible project history. It does not retreat from causal provenance, evidence binding, or strict-relay accountability. It does separate **provenance of a claim** from **authentication of its claimant**.

Under that distinction, the current “Exact causal links” and “Verifiable content hashes” claims are supportable. “CHAIN VERIFIED” is supportable only when it clearly means the event and artifact integrity chain, not actor identity. “Every claim can point back to its author” is not supportable as ordinary readers understand “author”; it should say “claimed actor” or “recorded source” until an external authorization boundary exists. Showing “Identity” as an implemented core capability likewise needs either qualification or the missing control plane.

ADR 0040 says the build should rise to the copy, but it also explicitly leaves F111 outside the funded sequence and calls authorship the largest open risk. Until that build exists, preserving ambiguous identity copy converts an architectural objective into a present-tense product guarantee. DeVere can keep authenticated authorship as a target, but the deployed site should label it as forthcoming or deployment-dependent rather than imply that the current repository proves it.

I would support the stronger copy after the admission boundary described above passes the adversarial and legitimate-delegation tests, and after the copy names its trust dependency. I would support an unqualified portable identity claim only if a fresh clone can verify authorization receipts against a trust root that the event writer cannot rewrite. If identity necessarily depends on a hosted control plane, the stronger copy must say so; it cannot simultaneously promise that clone-local Git verification supplies the identity guarantee.

## Q3 — The missing boundary is external admission, not generic signed Git

There is a viable prevention boundary outside the log, but it is not “turn on required signatures.” It is a trusted admission service with isolated credentials and an out-of-repository subject-to-actor authorization policy. Ordinary clients submit candidate events to that service. The service authenticates the caller, checks direct actor authority or a narrowly scoped delegation, applies protocol policy, appends the event, and emits a signed authorization receipt or commit. Branch protection permits only that service to advance the protected branch. Builders do not possess its signing or push credential.

F130 demonstrated that GitHub’s generic required-signature policy is the wrong identity mapping for the current agents. GitHub tried to map SSH signatures to GitHub users, reported `no_user`, and blocked the legitimate relay. It did not distinguish agent-a from agent-b, model event-level delegation, or prove that every external boundary is impossible. It showed that repository signature status is neither an agent authorization service nor a substitute for provisioning agent identities in the enforcing system.

An external boundary has real costs and must be stated honestly: it centralizes trust, adds an availability and recovery dependency, requires isolated key custody plus enrollment and revocation, and weakens the claim that a clone alone verifies everything. Portable signed authorization receipts can let a clone verify what the service attested, but the clone still relies on an externally governed trust root and cannot independently prove the real-world identity behind initial enrollment.

F108 and F128 establish why that trust root cannot be another mutable file beside the events. F131 establishes why a rule based on the introducing commit cannot refuse an uncommitted candidate. None establishes that pre-write authenticated admission is impossible. They establish where it must run and which credentials ordinary repository writers must not control.

Evidence that would make me reject the external-service design would be a proof that the deployment cannot keep any admission credential or policy isolated from every authorized repository writer, or a product requirement that all authenticated-authorship guarantees be independently established from a bare clone with no external trust root. Under either condition, actor authenticity is not a deliverable guarantee and the site must remain at claimed attribution plus log integrity.

## What the current site entitles a reader to assume, but the product cannot deliver

A reasonable reader sees different named agents in the example, an `Identity` core, “CHAIN VERIFIED,” and a promise that every claim points back to its author. That reader is entitled to assume all of the following:

1. `actor: codex-builder` means that Codex builder, or an explicitly authorized delegate, caused the event.
2. Another authorized repository writer cannot publish as `codex-builder` without the system refusing it or at least flagging the false attribution.
3. The verified chain proves actor attribution along with content, cause, evidence, and ordering.
4. A fresh clone can independently verify those identity facts.

The current product cannot deliver any of those four identity assumptions. It can verify that a durable record says `codex-builder`, that its bytes and references are consistent, and that its causal placement satisfies the checked rules. A caller may still choose another actor slug, and a writer able to rewrite in-tree identity policy can make the checked snapshot agree with that choice. Shared or proxy commit flows further prevent commit signer identity from being treated as event authorship without a new delegation contract.

The public line should therefore be plain: **EngramPort verifies the integrity and causality of recorded attribution; this deployment does not authenticate the actor named by that attribution.** If DeVere wants the stronger promise, the next build is an external admission and delegation system, not another verifier rule inside the same mutable tree.

## Execution accounting

This is recommendation only. No source, site copy, schema, protocol, test, mutation, runtime behavior, or `executed=` count changes.
