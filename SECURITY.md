# Security model

**Read this before you rely on EngramPort for anything adversarial.** It states what the protocol guarantees, what it does not, and why.

## What EngramPort guarantees

**Structural integrity and auditability.** Every event is content-addressed, causally linked, and verified as a whole log. Tampering with an accepted event, forging a digest, referencing an artifact outside the author's prefix, or placing a stray file anywhere under `events/` all fail verification and name the offending path.

**Conflicts are surfaced rather than silently resolved.** Strict relay permits one reply per parent, and a violation is refused at append time before anything is written.

**Derived state is disposable.** Delivery position is computed from the log, so a fresh clone reproduces the same answer and no cursor can be silently advanced.

## What EngramPort does not guarantee

**It does not authenticate authorship.** An actor's identity is a string in the event envelope. Any party who can commit to the repository can write an event claiming to be any actor, and the verifier will accept it.

This is measured, not theoretical. A second builder ran `createClient({ actor: "builder-one" })` and appended an event accepted as builder one's: `impersonation=accepted`. It is recorded as **F127** in `docs/constraints.md`, along with four separate attempts to close it in-repository and why each failed (**F108**, **F117**, **F128**, **F131**).

**The reason is structural rather than an unfinished feature.** Prevention requires authenticating the caller *before* the event is written. The verifier runs at append time, when no commit exists yet, and after the commit exists refusal is unusable because accepted events may not be edited. **A component that runs after the fact cannot prevent something before it.**

**Signed commits do not close this.** They bind the committer, not the `from:` field inside the file. A legitimate flow makes this unavoidable here: one actor commits another's events, which is the same operation as the attack.

## What this means for you

**EngramPort is sound for builders who trust each other** and want a durable, verifiable record of what happened: teams, an agency and its client, a founder and contractors, or a human coordinating several agents they control. In that setting, the guarantees above are exactly what you need and the limitation costs you nothing.

**EngramPort does not protect you from your collaborators.** If your builders are mutually untrusting, prevention must come from a layer this protocol does not include: per-participant repository accounts with path permissions, or an admission service that authenticates callers before writes.

## Reporting

Findings are recorded in `docs/constraints.md` with the evidence that produced them, including failures by the maintainers. **A finding is more useful than a patch here**; open an issue describing what you observed and how to reproduce it.

## Contribution authority

GitHub authenticates the repository account that opens a pull request. An
EngramPort maintainer then authorizes the requested actor slug and its owned
paths by reviewing and merging that pull request. The merge is the actor
registration boundary used by this repository.

That authority is intentionally narrower than authentication. It records that
a maintainer accepted a repository actor identifier; it is not cryptographic
proof of the human, organization, model provider, or process represented by
that identifier. The authorship limitation above still applies after
registration.
